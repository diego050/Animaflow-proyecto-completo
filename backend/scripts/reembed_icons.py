"""Re-embed the iconify_icons table with gemini-embedding-2 (768 dims).

Por qué: las 43k filas de `iconify_icons` se generaron con `all-mpnet-base-v2`,
pero las búsquedas usan `gemini-embedding-2`. Son espacios vectoriales distintos
→ la similitud coseno es ruido (scores ~0.1, resultados irrelevantes). Este
script regenera los embeddings de íconos con el MISMO modelo que las queries.

Características pensadas para free tier:
  - LOTES: manda BATCH_SIZE íconos por petición (no 1 a 1). 43k / 100 ≈ 430
    peticiones → entra en el límite diario en vez de tardar semanas.
  - REANUDABLE: guarda un checkpoint con el último id procesado. Si lo cortas
    (o agotas la cuota del día), vuelves a correrlo y continúa donde quedó.
  - RATE-LIMIT: pausa configurable entre peticiones; ante 429 espera y reintenta.

Requisitos:
  - GEMINI_API_KEY en el entorno (tu key, en el .env del VPS).

Uso (dentro del contenedor api):
    python scripts/reembed_icons.py                  # corre/continúa
    python scripts/reembed_icons.py --batch-size 100 --sleep 0.5
    python scripts/reembed_icons.py --reset          # empieza desde cero
    python scripts/reembed_icons.py --limit 200       # prueba con pocos

El task_type es RETRIEVAL_DOCUMENT (documentos); las queries usan RETRIEVAL_QUERY
en iconify_search.py — es el emparejamiento asimétrico correcto de Gemini.
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
    # tags puede venir como list (psycopg lo decodifica) o como str JSON.
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


def _embed_batch(client, types, texts: list[str]) -> list[list[float]]:
    """Embeddea un lote; devuelve lista de vectores alineada con texts."""
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
    parser.add_argument("--batch-size", type=int, default=100, help="Íconos por petición a la API")
    parser.add_argument("--sleep", type=float, default=0.5, help="Pausa (s) entre peticiones")
    parser.add_argument("--limit", type=int, default=0, help="Máximo de íconos a procesar (0 = todos)")
    parser.add_argument("--reset", action="store_true", help="Ignora el checkpoint y empieza desde cero")
    args = parser.parse_args()

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("❌ GEMINI_API_KEY no está en el entorno. Ponla en el .env del VPS.")
        sys.exit(1)

    from google import genai
    from google.genai import types

    client = genai.Client(api_key=api_key)
    db = SessionLocal()

    if args.reset and os.path.exists(CHECKPOINT):
        os.remove(CHECKPOINT)

    last_id = "" if args.reset else _read_checkpoint()

    total_remaining = db.execute(
        sql_text("SELECT count(*) FROM iconify_icons WHERE id > :last"),
        {"last": last_id},
    ).scalar()
    print(f"🔄 Re-embeddeando íconos con {MODEL} ({DIMS} dims)")
    print(f"   Pendientes: {total_remaining} (desde id > '{last_id[:8]}...')")
    print(f"   batch_size={args.batch_size}  sleep={args.sleep}s")
    print()

    processed = 0
    failed_batches = 0

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

        # Embeddear con reintento ante 429
        vectors = None
        for attempt in range(5):
            try:
                vectors = _embed_batch(client, types, texts)
                break
            except Exception as e:  # noqa: BLE001
                msg = str(e)
                if "429" in msg or "RESOURCE_EXHAUSTED" in msg:
                    wait = min(60, 5 * (attempt + 1))
                    print(f"   ⏳ 429 rate limit. Esperando {wait}s (intento {attempt+1}/5)...")
                    time.sleep(wait)
                    continue
                print(f"   ⚠️  Error en lote: {msg[:160]}")
                break

        if vectors is None or len(vectors) != len(rows):
            failed_batches += 1
            if failed_batches >= 3:
                print("❌ Demasiados lotes fallidos seguidos. Guardando checkpoint y saliendo.")
                print(f"   Reanuda más tarde con: python scripts/reembed_icons.py")
                break
            time.sleep(10)
            continue

        failed_batches = 0

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
        print(f"   ✅ {processed} procesados (último id {last_id[:8]}...)")

        if args.sleep:
            time.sleep(args.sleep)

    db.close()
    print()
    print(f"📊 Listo. {processed} íconos re-embeddeados en esta corrida.")
    print("   Verifica con: find_best_icons(db, 'batería sin energía', limit=3)")
    print("   (los scores deberían subir a ~0.4–0.8 y ser relevantes)")


if __name__ == "__main__":
    main()
