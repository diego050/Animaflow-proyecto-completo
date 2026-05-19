# Documentación de Cambios — SQLAlchemy JSON Persistence Fix

## 16. SQLAlchemy JSON Column Persistence Failure

### Problema Original
El LLM generaba correctamente los AE scripts (7000+ chars con shapes), pero el `script.jsx` resultante tenía las secciones `// ELEMENTOS SVG` completamente vacías. El `ae_script_code` se generaba en memoria pero **nunca llegaba a PostgreSQL**.

### Evidencia de diagnóstico
```
[AE Export] AE script persisted to DB for scene 1 (len=6440)
[AE Export] Re-loaded job from DB, scenes count: 2
[AE Export]   Scene 1: ae_script_code=NO (len=0)
[AE Export]   Scene 2: ae_script_code=NO (len=0)
[AE Full Script] Scene 1: ae_script_code=MISSING (len=0)
[AE Full Script] Scene 1: Using fallback generate_ae_script()
```

Query directa a PostgreSQL confirmó:
```sql
SELECT result_spec->'scenes'->0->>'ae_script_code' IS NOT NULL as scene1_has_ae
FROM jobs WHERE id = 'fac4ceee-...';
-- Result: scene1_has_ae = f
```

### Root Cause
SQLAlchemy `Column(JSON)` **no detecta mutaciones anidadas**. Cuando se modifica un dict anidado:
```python
scene = job.result_spec['scenes'][i]  # Plain Python dict, not tracked
scene['ae_script_code'] = ae_script    # SQLAlchemy doesn't know this changed
db.commit()                             # No UPDATE is generated
```

La columna JSON almacena el valor como un dict Python plano. SQLAlchemy solo detecta cambios de **nivel superior** (`job.result_spec['key'] = value`), no mutaciones anidadas como `scene['ae_script_code'] = value`.

### Intentos fallidos (en orden cronológico)

#### Intento 1: `flag_modified()` con `Column(JSON)`
```python
scene['ae_script_code'] = ae_script
flag_modified(job, 'result_spec')
db.commit()
```
**Por qué falló:** `flag_modified()` está diseñado para la extensión `Mutable` de SQLAlchemy. Con columnas `JSON` puras, SQLAlchemy ignora silenciosamente `flag_modified()` porque no sabe que la columna es mutable.

#### Intento 2: `MutableDict.as_mutable(JSON)`
```python
# models.py
result_spec = Column(MutableDict.as_mutable(JSON), nullable=True)
```
**Por qué falló:** `MutableDict` solo trackea mutaciones de **nivel superior**. Los dicts anidados (`scene`) son dicts Python planos, no `MutableDict`. Las mutaciones `scene['ae_script_code'] = ...` no se detectan.

#### Intento 3: `flag_modified()` + `MutableDict`
```python
scene['ae_script_code'] = ae_script
flag_modified(job, 'result_spec')
db.commit()
```
**Por qué falló:** Los dos sistemas de tracking (MutableDict interno + flag_modified) interfieren entre sí. `MutableDict` ya tiene su propio mecanismo que no se activa con mutaciones anidadas.

#### Intento 4: Raw SQL en la misma sesión ORM
```python
spec_json = json.dumps(job.result_spec)
db.execute(text("UPDATE jobs SET result_spec = :spec::json WHERE id = :id"),
           {"spec": spec_json, "id": job_id})
db.commit()
```
**Por qué falló:** `InFailedSqlTransaction` — la sesión ORM entra en estado corrupto. `db.rollback()` descarta los cambios en memoria. La transacción ORM y el raw SQL comparten la misma conexión, causando conflictos.

#### Intento 5: `json.loads(json.dumps())` para crear nuevo objeto
```python
job.result_spec = json.loads(json.dumps(job.result_spec))
flag_modified(job, 'result_spec')
db.commit()
```
**Por qué falló:** SQLAlchemy compara el valor serializado antes y después. Aunque el objeto Python es nuevo, el JSON serializado puede ser considerado "igual" por el mecanismo de comparación interno.

#### Intento 6: `db.rollback()` antes de raw SQL
```python
db.rollback()
db.execute(text("UPDATE jobs SET result_spec = :spec::json WHERE id = :id"), ...)
db.commit()
```
**Por qué falló:** `db.rollback()` descarta **todos** los cambios pendientes de la sesión ORM, incluyendo las mutaciones que acabamos de hacer. El `scene['ae_script_code']` se pierde.

### Solución Final: Conexión psycopg2 Independiente

#### Implementación
Nueva función `_persist_job_spec()` en `backend/app/services/ae_export.py`:
```python
def _persist_job_spec(job_id: str, spec_dict: dict):
    """
    Persist job.result_spec using a separate psycopg2 connection.
    Bypasses SQLAlchemy ORM entirely to avoid JSON change detection issues.
    """
    import psycopg2
    from sqlalchemy.engine.url import make_url
    
    try:
        url = make_url(settings.sqlalchemy_database_uri)
        conn = psycopg2.connect(
            host=url.host,
            port=url.port or 5432,
            user=url.username,
            password=url.password,
            database=url.database
        )
        cur = conn.cursor()
        cur.execute(
            "UPDATE jobs SET result_spec = %s WHERE id = %s",
            (json.dumps(spec_dict), job_id)
        )
        conn.commit()
        print(f"[AE Persist] ✅ result_spec persisted for job {job_id}")
    except Exception as e:
        print(f"[AE Persist] ❌ Failed to persist result_spec for job {job_id}: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        if 'conn' in locals():
            conn.close()
```

#### Por qué funciona
| Aspecto | Explicación |
|---------|-------------|
| **Conexión separada** | psycopg2 abre su propia conexión, completamente independiente de la sesión ORM |
| **Sin ORM** | No hay detección de cambios, no hay snapshots, no hay transacciones ORM |
| **Raw SQL directo** | `UPDATE jobs SET result_spec = %s WHERE id = %s` se ejecuta directamente en PostgreSQL |
| **Funciona en cualquier entorno** | Parsea `DATABASE_URL` automáticamente → `localhost` en local, `postgres` en Docker |
| **Sin interferencia** | La sesión ORM sigue su curso, la conexión psycopg2 hace su trabajo |

### Archivos modificados

| Archivo | Cambios |
|---------|---------|
| `backend/app/services/ae_export.py` | Nueva función `_persist_job_spec()`, reemplazados todos los `flag_modified()` + `db.commit()` |
| `backend/app/api/exports.py` | Reemplazado `flag_modified()` con `_persist_job_spec()` en `trigger_ae_export()` |
| `backend/app/db/models.py` | Revertido a `Column(JSON)` (sin MutableDict) |

### Logs de verificación (éxito)
```
[AE Persist] ✅ result_spec persisted for job fac4ceee-d353-4ba9-a612-fb7ee65f1013
[AE Export] AE script persisted to DB for scene 1 (len=8348)
[AE Persist] ✅ result_spec persisted for job fac4ceee-d353-4ba9-a612-fb7ee65f1013
[AE Export] AE script persisted to DB for scene 2 (len=7318)
[AE Persist] ✅ result_spec persisted for job fac4ceee-d353-4ba9-a612-fb7ee65f1013
[AE Export] Re-loaded job from DB, scenes count: 2
[AE Export]   Scene 1: ae_script_code=YES (len=8348)
[AE Export]   Scene 2: ae_script_code=YES (len=7318)
[AE Full Script] Scene 1: ae_script_code=PRESENT (len=8348)
[AE Full Script] Scene 2: ae_script_code=PRESENT (len=7318)
[AE Persist] ✅ result_spec persisted for job fac4ceee-d353-4ba9-a612-fb7ee65f1013
```

### Lecciones aprendidas

1. **SQLAlchemy JSON no trackea mutaciones anidadas** — siempre usar `flag_modified()` o mejor, bypass total
2. **`MutableDict` no es mágico** — solo funciona para nivel superior, no recursivo
3. **`db.rollback()` descarta cambios** — no usar cuando se necesitan preservar mutaciones en memoria
4. **Raw SQL en misma sesión ORM = riesgo** — `InFailedSqlTransaction` es difícil de debuggear
5. **Conexión separada = garantía** — psycopg2 directo bypassa todos los problemas de SQLAlchemy
6. **Logging es esencial** — sin los logs de debug, nunca hubiéramos encontrado el problema

### Impacto en arquitectura

| Capa | Antes | Después |
|------|-------|---------|
| **Modelo** | `Column(JSON)` | `Column(JSON)` (sin cambios) |
| **Persistencia** | ORM `db.commit()` | psycopg2 directo |
| **Transacciones** | ORM session | Conexión independiente |
| **Docker** | Funciona | Funciona (parsea DATABASE_URL) |
| **Producción** | Funciona | Funciona (parsea DATABASE_URL) |

### Riesgos conocidos
- **psycopg2 no instalado** → `ImportError` (ya está en requirements.txt)
- **PostgreSQL no accesible** → `OperationalError` (manejado con try/except)
- **JSON no serializable** → `TypeError` en `json.dumps()` (manejado con try/except)
