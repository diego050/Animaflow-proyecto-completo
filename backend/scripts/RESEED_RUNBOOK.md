# Runbook de re-seed / re-embed (ejecutar UNA vez, AL FINAL del proyecto)

> ⚠️ NO ejecutar durante el desarrollo. Esto regenera embeddings (llama a la API de
> Gemini, consume cuota). Hacerlo cuando el catálogo de componentes esté congelado.

## Por qué
1. Se agregaron componentes nuevos (Cinematic, Branding, GradientText, NetworkNodes
   rehecho, etc.) → deben entrar a la tabla `components` **con embedding** para que el
   LLM los pueda elegir vía RAG.
2. Varias descripciones cambiaron → su embedding quedó viejo y hay que regenerarlo.
3. Los 43k `iconify_icons` se generaron con `all-mpnet-base-v2` pero las queries usan
   `gemini-embedding-2` (espacios vectoriales distintos → la búsqueda es ruido). Hay
   que re-embeberlos con el MISMO modelo. **Este es el paso largo.**

## Orden EXACTO

```bash
cd backend

# Paso 1 — Upsert de componentes desde el manifest (agrega nuevos, actualiza
#          descripciones/props cambiadas). Idempotente. SIN embeddings todavía.
python scripts/seed_components.py

# Paso 2 — (Re)genera embeddings de TODOS los componentes activos (nuevos +
#          descripciones cambiadas) con gemini-embedding-2 (768 dims).
python scripts/reembed_components.py

# Paso 3 — Re-embed de los 43k íconos (LARGO, reanudable). Configura las keys antes.
#          PowerShell:  $env:GEMINI_API_KEYS = "key1,key2,...,key20"
#          Bash:        export GEMINI_API_KEYS="key1,key2,...,key20"
python scripts/reembed_icons.py
```

## Notas por paso

- **Paso 1** (`seed_components.py`): rápido, sin API. Crea los componentes nuevos en DB
  (con `embedding = NULL` por ahora). Correrlo con `--embed` también embebe, pero el
  Paso 2 lo cubre de forma más completa (re-embebe también los que cambiaron de texto).
- **Paso 2** (`reembed_components.py`): ~118 llamadas. Minutos. Si falla por cuota,
  reintenta más tarde (re-procesa todos; es idempotente).
- **Paso 3** (`reembed_icons.py`): 43k íconos. El script:
  - va en LOTES (`--batch-size 100`), PAUSA cada `--requests-per-cycle 100` por
    `--cycle-pause 60`s (respeta ~100 RPM del free tier),
  - ROTA entre varias keys (`GEMINI_API_KEYS="k1,k2,..."`) cuando una agota cuota,
  - es REANUDABLE (checkpoint en `scripts/.reembed_icons.checkpoint`): si se corta, el
    mismo comando continúa donde quedó. `--reset` empieza de cero.
  - Con free tier (1k req/día por key) y lotes de 100 → ~430 requests para 43k íconos:
    cabe en 1 día con 1 key, o en minutos con varias keys.

## Verificación (después de correr)

```python
# En un shell de Python dentro de backend/:
from app.db.session import SessionLocal
from app.services.iconify_search import find_best_icons
db = SessionLocal()
find_best_icons(db, "diez minutos", limit=3)   # debe dar un reloj, NO "10mp"
find_best_icons(db, "batería sin energía", limit=3)  # scores ~0.4-0.8 y relevantes
```

Y en un render real: los componentes nuevos (KenBurns, Spotlight, BrandOutro,
GradientText, ...) deberían empezar a aparecer en las escenas elegidas por el LLM.
