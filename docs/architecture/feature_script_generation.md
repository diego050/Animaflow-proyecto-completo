# Documentación de Funcionalidad: Generación de Guion con IA

## 📝 Descripción
Esta funcionalidad añade un paso previo y opcional en el flujo de creación de videos en AnimaFlow. Permite a los usuarios que no tienen un guion listo ingresar información clave, ideas o detalles de su producto/servicio para que la IA (Gemini) redacte un guion narrativo optimizado para video.

## 🛠️ Implementación en el Backend

### 1. Esquemas de Datos (`backend/app/schemas/job.py`)
Se agregaron dos nuevos modelos Pydantic para manejar la solicitud y respuesta de la generación de guiones:
```python
class ScriptGenerateRequest(BaseModel):
    info: str

class ScriptGenerateResponse(BaseModel):
    script_text: str
```

### 2. Servicio de Pipeline (`backend/app/services/pipeline.py`)
Se implementó la función `generate_script_from_info` que se conecta con la API de Google GenAI:
*   **Modelo Utilizado**: `gemini-3.1-flash-lite-preview`
*   **Prompt**: Diseñado para actuar como un guionista experto de videos B2B y SaaS, generando un guion dinámico, conciso y directo de máximo 6 oraciones, sin incluir acotaciones de escena.

### 3. API Router (`backend/app/api/jobs.py`)
Se creó el endpoint:
*   **Ruta**: `POST /generate-script`
*   **Función**: Recibe la información del usuario, invoca el servicio de generación de guiones y devuelve el texto puro.

---

## 🎨 Implementación en el Frontend

### Archivo Modificado: `frontend/src/App.tsx`

Se realizaron las siguientes adiciones en la interfaz y lógica:

1.  **Estados de React**:
    *   `scriptTopic`: Almacena la información/idea ingresada por el usuario.
    *   `generatingScript`: Booleano para manejar el estado de carga del botón de generación de guion.

2.  **Función `generateScriptIA`**:
    *   Realiza una petición `POST` al endpoint `/api/jobs/generate-script`.
    *   Al recibir la respuesta exitosa, actualiza el estado de `inputText` (el área de texto del guion principal).

3.  **Interfaz de Usuario (UI)**:
    *   Se agregó una tarjeta visual encima del área de texto principal con el título: *"Paso Opcional: ¿No tienes guion? Deja que la IA lo cree"*.
    *   Contiene un área de texto secundaria para que el usuario describa su idea y un botón con efectos de gradiente y estados deshabilitados durante la carga.

## 🚀 Flujo de Usuario
1.  **Con Guion**: El usuario ignora la caja superior, escribe directamente su guion en el Paso 1 y genera el proyecto visual.
2.  **Sin Guion**: El usuario introduce su idea en la caja superior opcional, presiona "Generar Guion Mágico", la IA rellena el cuadro del Paso 1, el usuario lo revisa/edita y luego procede a generar el proyecto visual.
