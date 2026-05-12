# Estado del Frontend

## Remotion Compositions
- **Root**: `src/remotion/Root.tsx` inicializado y registrado con `registerRoot`. Expone el ID `AnimaFlow-Main`.
- **Composición Base**: `MainComposition.tsx` implementa `useCurrentFrame` y `interpolate` para opacidad nativa (sin animaciones CSS).

## Componentes y UI
- `<PreviewPlayer>` (`components/PreviewPlayer.tsx`): Wrapper interactivo sobre `@remotion/player` para visualizar el objeto `spec`.
- `App.tsx`: Layout responsivo (TailwindCSS v4). Panel izquierdo para ingresar texto y panel derecho de Remotion Player sincronizado con botón de Exportación.

## Editor Interactivo de Escenas (Implementado)
Se construyó un **Editor Visual** en `SceneEditor.tsx` que reemplaza la vista JSON cruda:
- **UI de Escenas**: Lista de tarjetas estilo panel de control que representan cada escena (texto, duracion, media_query).
- **Edición Inline**: Las tarjetas se expanden en textareas permitiendo cambiar el texto (TTS) o el prompt visual (Gemini).
- **Regeneración Granular**: Llama al backend (`POST /api/jobs/{job_id}/scenes/{index}/regenerate`) para modificar una sola escena.
- **Actualización en Caliente**: Gracias a que el backend re-escribe el `index.ts` dinámicamente, Vite (HMR) actualiza el reproductor de Remotion en tiempo real sin recargar la página.

## Polling de Progreso en Tiempo Real (Implementado)
El frontend implementa polling automático cada **2 segundos** para trackear el progreso del pipeline:
- **Función `pollJob`** (`App.tsx:79-110`): Consulta `GET /api/jobs/{job_id}` y actualiza el estado mostrado al usuario
- **Mensajes descriptivos**: Cada estado del backend tiene un mensaje con emoji para mejor UX:
  - `📝 Segmentando guion en escenas...`
  - `🎨 Generando prompts visuales con IA...`
  - `🎬 Procesando escenas (TTS + animaciones)...`
  - `✅ ¡Timeline Generada!`
  - `⏳ En cola para renderizado...`
  - `🎥 Renderizando video MP4...`
  - `🎉 ¡Video Renderizado con Éxito!`
- **Manejo de errores**: Detecta estados `failed*` y muestra mensaje de error descriptivo
- **Auto-detención**: El polling se detiene automáticamente al llegar a `completed` o `completed_video`
