"""Re-embed the iconify_icons table with gemini-embedding-2 (768 dims).

Por qué: las 43k filas de `iconify_icons` se generaron con `all-mpnet-base-v2`,
pero las búsquedas usan `gemini-embedding-2`. Son espacios vectoriales distintos
→ la similitud coseno es ruido. Este script regenera los embeddings con el MISMO
modelo que las queries.

Estrategia (MVP) para free tier (100 RPM, 1k req/día por key):
  - LOTES: BATCH_SIZE íconos por petición (no 1 a 1).
  - THROTTLE: hace REQUESTS_PER_CYCLE peticiones y PAUSA CYCLE_PAUSE segundos
    (por defecto 100 requests → pausa 60s → respeta ~100 RPM).
  - REINTENTOS: ante error reintenta con backoff hasta MAX_RETRIES (def 4).
  - ROTACIÓN DE KEYS: si una key agota su cuota (falla MAX_RETRIES veces seguidas
    por 429), cambia a la siguiente key y reintenta el MISMO lote. Sigue rotando
    hasta terminar.
  - REANUDABLE: checkpoint con el último id procesado.

Keys (en orden de preferencia):
  - `GEMINI_API_KEYS` = "key1,key2,...,key20"  (varias, separadas por coma)
  - o `GEMINI_API_KEY` = "key"                  (una sola)
  - o `--api-keys "k1,k2,..."`

Uso:
    python scripts/reembed_icons.py
    python scripts/reembed_icons.py --requests-per-cycle 100 --cycle-pause 60 --max-retries 4
    python scripts/reembed_icons.py --reset          # empieza desde cero
"""
import argparse
import json
import os
import sys
import time

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text as sql_text

from app.db.session import SessionLocal
from app.core.logging import get_logger

logger = get_logger("reembed_icons")

MODEL = "gemini-embedding-2"
DIMS = 768
CHECKPOINT = os.environ.get(
    "REEMBED_ICONS_CHECKPOINT",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), ".reembed_icons.checkpoint"),
)


def _icon_text(name: str, tags) -> str:
    """Texto semántico a embeddear para cada ícono."""
    human = (name or "").replace("-", " ").replace("_", " ").strip()
    if isinstance(tags, str):
        try:
            tags = json.loads(tags)
        except (ValueError, TypeError):
            tags = None
    if isinstance(tags, list) and tags:
        return f"{human}. {', '.join(str(t) for t in tags)}"
    return human or "icon"


def _read_checkpoint() -> str:
    try:
        with open(CHECKPOINT, "r", encoding="utf-8") as f:
            return f.read().strip()
    except FileNotFoundError:
        return ""


def _write_checkpoint(last_id: str) -> None:
    with open(CHECKPOINT, "w", encoding="utf-8") as f:
        f.write(last_id)


def _get_keys(args) -> list[str]:
    """Resuelve la lista de API keys (varias → rotación)."""
    if args.api_keys:
        keys = [k.strip() for k in args.api_keys.split(",") if k.strip()]
        if keys:
            return keys
    multi = os.environ.get("GEMINI_API_KEYS")
    if multi:
        keys = [k.strip() for k in multi.split(",") if k.strip()]
        if keys:
            return keys
    single = os.environ.get("GEMINI_API_KEY")
    return [single] if single else []


def _is_rate_limit(err: Exception) -> bool:
    msg = str(err)
    return "429" in msg or "RESOURCE_EXHAUSTED" in msg or "quota" in msg.lower()


def _embed_batch(client, types, texts: list[str]) -> list[list[float]]:
    resp = client.models.embed_content(
        model=MODEL,
        contents=texts,
        config=types.EmbedContentConfig(
            task_type="RETRIEVAL_DOCUMENT",
            output_dimensionality=DIMS,
        ),
    )
    return [e.values for e in resp.embeddings]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--batch-size", type=int, default=100, help="Íconos por petición")
    parser.add_argument("--requests-per-cycle", type=int, default=100, help="Peticiones antes de pausar")
    parser.add_argument("--cycle-pause", type=float, default=60.0, help="Pausa (s) tras cada ciclo")
    parser.add_argument("--max-retries", type=int, default=4, help="Reintentos por lote antes de rotar key")
    parser.add_argument("--api-keys", type=str, default="", help="Keys separadas por coma (override de env)")
    parser.add_argument("--limit", type=int, default=0, help="Máximo de íconos a procesar (0 = todos)")
    parser.add_argument("--reset", action="store_true", help="Ignora el checkpoint y empieza desde cero")
    args = parser.parse_args()

    keys = _get_keys(args)
    if not keys:
        print("❌ No hay API keys. Define GEMINI_API_KEYS='k1,k2,...' o GEMINI_API_KEY, o usa --api-keys.")
        sys.exit(1)

    from google import genai
    from google.genai import types

    key_idx = 0
    client = genai.Client(api_key=keys[key_idx])
    db = SessionLocal()

    if args.reset and os.path.exists(CHECKPOINT):
        os.remove(CHECKPOINT)

    last_id = "" if args.reset else _read_checkpoint()

    total_remaining = db.execute(
        sql_text("SELECT count(*) FROM iconify_icons WHERE id > :last"),
        {"last": last_id},
    ).scalar()
    print(f"🔄 Re-embeddeando íconos con {MODEL} ({DIMS} dims)")
    print(f"   Pendientes: {total_remaining}  |  Keys disponibles: {len(keys)}")
    print(f"   batch={args.batch_size}  ciclo={args.requests_per_cycle} req → pausa {args.cycle_pause}s  reintentos={args.max_retries}")
    print()

    processed = 0
    requests_in_cycle = 0

    while True:
        if args.limit and processed >= args.limit:
            print(f"⏹  Alcanzado --limit {args.limit}.")
            break

        rows = db.execute(
            sql_text(
                "SELECT id, name, tags FROM iconify_icons "
                "WHERE id > :last ORDER BY id LIMIT :lim"
            ),
            {"last": last_id, "lim": args.batch_size},
        ).fetchall()

        if not rows:
            print("✅ No quedan íconos por procesar.")
            break

        texts = [_icon_text(r.name, r.tags) for r in rows]

        # Intentar embeddear este lote; reintenta y, si la key se agota, rota.
        vectors = None
        rate_limited = False
        for attempt in range(args.max_retries):
            try:
                vectors = _embed_batch(client, types, texts)
                break
            except Exception as e:  # noqa: BLE001
                if _is_rate_limit(e):
                    rate_limited = True
                    wait = min(30, 4 * (attempt + 1))
                    print(f"   ⏳ 429 en key #{key_idx + 1}. Espera {wait}s (intento {attempt + 1}/{args.max_retries})...")
                    time.sleep(wait)
                    continue
                # Error no relacionado con cuota → no rotar; reportar y parar.
                print(f"   ⚠️  Error no-cuota en el lote: {str(e)[:160]}")
                break

        if vectors is None:
            if rate_limited and key_idx + 1 < len(keys):
                key_idx += 1
                client = genai.Client(api_key=keys[key_idx])
                requests_in_cycle = 0
                print(f"   🔁 Key agotada. Cambiando a API key #{key_idx + 1}/{len(keys)} y reintentando el lote...")
                continue  # reintenta el MISMO lote (no avanza checkpoint)
            if rate_limited:
                print("❌ Todas las keys agotadas. Checkpoint guardado. Reanuda mañana con el mismo comando.")
            else:
                print("❌ Lote falló por error no-cuota. Checkpoint guardado; revisa el error de arriba.")
            break

        # Guardar vectores
        for r, vec in zip(rows, vectors):
            emb_str = "[" + ",".join(str(v) for v in vec) + "]"
            db.execute(
                sql_text("UPDATE iconify_icons SET embedding = CAST(:emb AS vector) WHERE id = :id"),
                {"emb": emb_str, "id": r.id},
            )
        db.commit()

        last_id = rows[-1].id
        _write_checkpoint(last_id)
        processed += len(rows)
        requests_in_cycle += 1
        print(f"   ✅ {processed} procesados (key #{key_idx + 1}, último id {last_id[:8]}...)")

        # Throttle: tras REQUESTS_PER_CYCLE peticiones, pausa para respetar el RPM.
        if requests_in_cycle >= args.requests_per_cycle:
            print(f"   ⏸  {args.requests_per_cycle} peticiones hechas → pausando {args.cycle_pause}s (rate limit)...")
            time.sleep(args.cycle_pause)
            requests_in_cycle = 0

    db.close()
    print()
    print(f"📊 Listo. {processed} íconos re-embeddeados en esta corrida.")
    print("   Verifica: find_best_icons(db, 'batería sin energía', limit=3)  → scores ~0.4–0.8 y relevantes")


if __name__ == "__main__":
    main()
