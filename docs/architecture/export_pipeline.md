# Export Pipeline - After Effects & spec.json

## Descripción General

AnimaFlow ahora soporta exportación múltiple desde un único `spec.json`:

```
spec.json → MP4 (Remotion) ✅
spec.json → .zip (After Effects + audio) ✅
spec.json → spec.json (descarga directa) ✅
```

## Flujo de Exportación

### 1. Exportación a After Effects (.zip)

**Endpoint:** `GET /api/jobs/{job_id}/export/after-effects`

**Qué incluye el .zip:**
```
animaflow_job_id.zip
├── script.jsx              # Script principal de After Effects
├── audio/
│   ├── escena_1.mp3        # TTS de Voicebox
│   └── escena_2.mp3
├── spec.json               # Metadatos completos con ae_metadata
└── README.md               # Instrucciones para el cliente
```

**Proceso:**
1. Backend lee el `result_spec` del job
2. Genera `script.jsx` con código ExtendScript para AE
3. Descarga archivos de audio de Voicebox
4. Empaqueta todo en un .zip
5. Retorna como `FileResponse` para descarga

**En el cliente:**
1. Descarga el .zip
2. Extrae los archivos
3. En After Effects: `File > Scripts > Run Script File...`
4. Selecciona `script.jsx`
5. ¡Listo! El proyecto se crea automáticamente

### 2. Exportación a spec.json

**Endpoint:** `GET /api/jobs/{job_id}/export/spec-json`

**Qué incluye:**
- `result_spec` completo con todas las escenas
- `ae_metadata` con keyframes y animaciones
- `remotion_props` con colores y estilos
- `audio_url` con referencias a TTS

**Caso de uso:**
- Cliente quiere editar manualmente en AE
- Cliente quiere importar a otra herramienta
- Backup del proyecto

### 3. Exportación a MP4 (Remotion)

**Endpoint:** `POST /api/jobs/{job_id}/render`

**Proceso:**
1. Encola tarea de renderizado en Redis
2. Worker ejecuta `npx remotion render`
3. Genera archivo MP4 en `frontend/public/videos/`
4. Frontend muestra botón de descarga

---

## Estructura de ae_metadata

Cada escena incluye metadatos específicos para After Effects:

> **Nota importante (Sesión 5 - 13 Mayo 2026):** 
> `ae_metadata` ahora se genera en una **llamada LLM separada** (`generate_ae_metadata_with_llm()`) 
> después de generar el batch de visuals. Esto evita el error `additionalProperties is not supported` 
> que ocurría cuando se incluía `Dict[str, Any]` en el schema de respuesta de Gemini.
> 
> **Flujo actual:**
> ```
> 1. generate_batch_visuals_with_llm() → media_query, backgroundColor, textColor
> 2. generate_remotion_component() → TSX generado
> 3. generate_ae_metadata_with_llm() → ae_metadata (llamada separada)
> 4. Pipeline ensambla todo en timeline_scenes
> ```
> 
> **Beneficios:**
> - 100% compatibilidad con Gemini API
> - ae_metadata populado correctamente (no más null)
> - Metadata más detallada y contextual
> 
> **Trade-off:** +1 llamada API por escena (~2-3s adicionales)

```json
{
  "scenes": [
    {
      "ae_metadata": {
        "animation_type": "collision_with_bounce",
        "elements": [
          {
            "type": "rectangle",
            "id": "block_1",
            "position_keyframes": [
              {"time": 0, "value": [400, 540], "easing": "ease_out_back"},
              {"time": 1.5, "value": [800, 540], "easing": "ease_in_out_cubic"}
            ],
            "scale_keyframes": [...],
            "opacity_keyframes": [...],
            "effects": [
              {"type": "glow", "intensity": 50, "color": "#38bdf8"}
            ]
          }
        ],
        "text_animation": "letter_by_letter",
        "audio_layer": {
          "file": "audio/escena_1.mp3",
          "start_time": 0.0,
          "volume": 100
        }
      }
    }
  ]
}
```

---

## Implementación Técnica

### Backend

**Archivos:**
- `backend/app/services/ae_export.py` - Lógica de conversión spec.json → .jsx
- `backend/app/api/exports.py` - Router con endpoints de exportación
- `backend/app/main.py` - Registro del router de exports

**Funciones clave:**
- `create_export_zip(job_id, db)` - Crea el .zip completo
- `generate_ae_script(scene, index)` - Genera código JSX para una escena
- `download_audio_files(job, audio_dir)` - Descarga audios de Voicebox

### Frontend

**Archivos:**
- `frontend/src/App.tsx` - Botones de exportación

**Funcionalidad:**
- Botón "Descargar After Effects (.zip)"
- Botón "Descargar spec.json"
- Descarga directa desde el navegador

---

## Tipos de Animación Soportados

El sistema de exportación maneja estos tipos de animación:

| Tipo | Descripción | Ejemplo |
|------|-------------|---------|
| `collision` | Formas que chocan | Dos bloques que se golpean |
| `bounce_in` | Entrada con rebote | Calendario que cae y rebota |
| `morphing` | Transformación de formas | Círculo → cuadrado |
| `particles` | Sistema de partículas | Puntos que se agrupan |
| `connection` | Conexión progresiva | Nodos que se unen con líneas |
| `reveal` | Revelación de contenido | Capas que se deslizan |
| `flash` | Destello explosivo | Flash en colisión |
| `fade_in` | Aparición suave | Texto que aparece |
| `scale_emerge` | Escala desde cero | Objeto que crece |
| `letter_by_letter` | Texto letra por letra | Títulos cinematográficos |

---

## Easing Curves en After Effects

El script .jsx incluye easing curves para movimiento natural:

### Easing disponibles:
- **ease_out_back**: Rebote al final (efecto elástico)
- **ease_in_out_cubic**: Suave entrada y salida
- **ease_out_quad**: Desaceleración progresiva
- **linear**: Movimiento constante

### Ejemplo en AE:
```jsx
var posProp = layer.property("ADBE Transform Group").property("ADBE Position");
posProp.setValueAtTime(0, [400, 540]);
posProp.setValueAtTime(1.5, [800, 540]);

// Aplicar easing
var key1 = posProp.key(1);
posProp.setTemporalEaseAtKey(1, [KeyframeEase(30, true)], [KeyframeEase(30, false)]);
```

---

## Errores Comunes y Soluciones

### Error: "Job no tiene spec.json generado"
**Causa:** El job aún no ha completado la generación del timeline.
**Solución:** Esperar a que el status sea `completed`.

### Error: "Error descargando audio"
**Causa:** Voicebox no está disponible o las URLs expiraron.
**Solución:** El script .jsx se genera igual, pero sin audio. El cliente puede agregar audio manualmente.

### Error: "Script failed to execute" en AE
**Causa:** Versión de After Effects incompatible o permisos de script.
**Solución:** 
- Habilitar scripts en `Edit > Preferences > General > Allow Scripts to Write Files and Access Network`
- Verificar que AE esté abierto al ejecutar el script

---

## Futuras Mejoras

- [ ] **Premiere Pro:** Exportar a .prproj (Premiere)
- [ ] **Final Cut Pro:** Exportar a .fcpxml (Final Cut)
- [ ] **DaVinci Resolve:** Exportar a .drp (DaVinci)
- [ ] **Plantillas AE:** Generar .mogrt (Motion Graphics Templates)
- [ ] **Batch export:** Exportar múltiples jobs simultáneamente

---

## Referencias

- **Backend:** `backend/app/services/ae_export.py`
- **API:** `backend/app/api/exports.py`
- **Frontend:** `frontend/src/App.tsx` (líneas 240-295)
- **Especificación ExtendScript:** https://www.adobe.com/devnet/aftereffects/scripting.html
