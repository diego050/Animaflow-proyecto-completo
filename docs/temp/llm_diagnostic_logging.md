# Documentación de Cambios — LLM Diagnostic Logging + Debug Files + AE Script Persistence Fix

## 14. LLM Diagnostic Logging para AE Script Generation

### Problema
El usuario notó que el dashboard de Gemini API no mostraba aumento en RPM/TPM durante la exportación AE. Los logs confirmaron que el LLM SÍ se llama y devuelve 7000+ caracteres, pero el script.jsx resultante tiene las secciones `// ELEMENTOS SVG` vacías.

### Solución
Agregar logging explícito + archivos de debug persistentes para diagnosticar qué está generando el LLM.

### Logs agregados en `pipeline.py` — `generate_ae_script_from_tsx()`

| Punto | Log | Formato |
|-------|-----|---------|
| Inicio | `[LLM AE] ✅ Iniciando generación AE script (width=X, height=Y, duration=Z)` | Info |
| SVG Parser | `[LLM AE] SVG parser encontró X elementos` | Info |
| SVG Parser vacío | `[LLM AE] ⚠️ WARNING: SVG parser no encontró elementos en el TSX` | Warning |
| Envío prompt | `[LLM AE] Enviando prompt a Gemini (longitud: X chars)` | Info |
| Intento API | `[LLM AE] Llamada a Gemini API (intento X/3)...` | Info |
| Respuesta exitosa | `[LLM AE] ✅ Respuesta recibida de Gemini (longitud: X chars)` | Info |
| Debug file | `[LLM AE] 💾 Debug guardado: {job_id}_scene_{n}_{timestamp}.txt (shapes=X, text=Y, solids=Z)` | Info |
| Error fatal | `[LLM AE] ❌ ERROR generando script AE: {type}: {message}` + traceback | Error |

### Debug Files

Cada llamada al LLM genera un archivo en `backend/storage/debug/` con:

```
=== METADATA ===
job_id: fac4ceee-...
scene_id: 0
timestamp: 2024-01-15 21:03:28
svg_elements_found: 5
prompt_length: 8811
response_raw_length: 7223
post_processed_length: 7205

=== VALIDATION ===
addShape() calls: X
addText() calls: Y
addSolid() calls: Z
createPath() detected: NO
Math.random() detected: NO
ADBE Rotation detected: NO

=== PROMPT (primeros 1000 chars) ===
...

=== RESPONSE RAW ===
(código completo del LLM)

=== POST-PROCESSED ===
(script después de fixes)
```

### Formato de nombre de archivo
`{job_id}_scene_{scene_id}_{YYYYMMDD_HHMMSS}.txt`

Ejemplo: `fac4ceee-d353-4ba9-a612-fb7ee65f1013_scene_0_20240515_210328.txt`

### Logs agregados en `ae_export.py` — `generate_ae_export_async()`

| Punto | Log | Formato |
|-------|-----|---------|
| Antes de llamar LLM | `[AE Export] 🚀 Calling LLM generate_ae_script_from_tsx for scene X...` | Info |
| Después de LLM | `[AE Export] LLM result for scene X: OK/NULL/FALLIDO (length: X chars)` | Info |
| Re-load job | `[AE Export] Re-loaded job from DB, scenes count: X` | Info |
| Per-scene check | `[AE Export]   Scene X: ae_script_code=YES/NO (len=X)` | Info |

### Logs agregados en `ae_export.py` — `create_ae_full_script()`

| Punto | Log | Formato |
|-------|-----|---------|
| Per-scena check | `[AE Full Script] Scene X: ae_script_code=PRESENT/MISSING (len=X)` | Info |
| Fallback usado | `[AE Full Script] Scene X: Using fallback generate_ae_script()` | Info |

## 15. AE Script Persistence Fix

### Problema
El LLM genera correctamente el `ae_script_code` (8000 chars con shapes), pero cuando `create_export_zip()` llama a `create_ae_full_script()`, el `ae_script_code` es MISSING. Esto causa que se use el fallback `generate_ae_script()` que genera secciones `// ELEMENTOS SVG` vacías.

### Causa
`result_spec` es una columna JSON de SQLAlchemy. Las modificaciones in-place (`scene['ae_script_code'] = ...`) no son detectadas automáticamente por SQLAlchemy. `flag_modified()` debería funcionar, pero en la práctica el job object en memoria tiene los datos actualizados mientras que la query fresh desde DB no los refleja correctamente.

### Solución
1. Después de setear `scene['ae_script_code']`, forzar la persistencia con `job.result_spec = job.result_spec`
2. Antes de `create_export_zip()`, hacer un re-query explícito: `job = db.query(JobModel).filter(JobModel.id == job_id).first()`
3. Agregar logs de verificación para confirmar que `ae_script_code` está presente en cada escena

### Archivos modificados
| Archivo | Cambio |
|---------|--------|
| `backend/app/services/pipeline.py` | Logs + debug file saving + validation metrics |
| `backend/app/services/ae_export.py` | Logs en create_ae_full_script() + persistence fix + re-query before zip |
| `backend/storage/debug/` | New directory for debug files (gitignored) |
| `.gitignore` | Added /backend/storage/debug/* |

### Cómo interpretar los logs

**Flujo exitoso:**
```
[AE Export] 🚀 Calling LLM generate_ae_script_from_tsx for scene 1...
[LLM AE] ✅ Respuesta recibida de Gemini (longitud: 8018 chars)
[LLM AE] 💾 Debug guardado: fac4ceee_scene_0_20240515_213434.txt (shapes=5, text=1, solids=1)
[AE Export] AE script generated for scene 1 (len=8000)
[AE Export] Re-loaded job from DB, scenes count: 2
[AE Export]   Scene 1: ae_script_code=YES (len=8000)
[AE Export]   Scene 2: ae_script_code=YES (len=7723)
[AE Full Script] Scene 1: ae_script_code=PRESENT (len=8000)
[AE Full Script] Scene 2: ae_script_code=PRESENT (len=7723)
```

**Flujo con problema (persistence failure):**
```
[AE Export] AE script generated for scene 1 (len=8000)
[AE Export] Re-loaded job from DB, scenes count: 2
[AE Export]   Scene 1: ae_script_code=NO (len=0)
[AE Full Script] Scene 1: ae_script_code=MISSING (len=0)
[AE Full Script] Scene 1: Using fallback generate_ae_script()
```

### Próximos pasos
1. Reiniciar backend y regenerar un job
2. Verificar que los logs muestran `ae_script_code=YES` después del re-query
3. Confirmar que el script.jsx generado tiene los elementos SVG
