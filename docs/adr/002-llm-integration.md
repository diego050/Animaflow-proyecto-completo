# ADR 002: Integración de LLM (Gemini) para Generación de Arte

**Fecha:** 11 de Mayo de 2026
**Estado:** Implementado
**Rol/Autor:** Backend Agent / Architecture Agent

## 1. Contexto
Una vez superado el desafío de la cola asíncrona (Redis/RQ) y la simulación del TTS con Voicebox, el pipeline requería inteligencia visual. Para que Remotion pueda renderizar el video, necesitamos que una IA decida qué colores y contexto visual (media_query) asignar en base al texto narrado y a la duración calculada.

## 2. Decisión Arquitectónica
- Se integró el SDK oficial moderno **`google-genai`**.
- Se optó por el modelo **`gemini-3.1-flash-lite-preview`** por indicación explícita, ideal por su velocidad de respuesta para workflows en tiempo real.
- **Validación Estricta:** En lugar de recibir texto libre, se utiliza `response_schema` (Structured Outputs) enviando el esquema Pydantic `VisualSpecResult`. Esto previene roturas en el JSON que corromperían la lectura por parte de Remotion.

## 3. Consecuencias
- **Positivas:** Ahora el Backend devuelve el `spec.json` semánticamente adaptado a cada frase. El flujo ya no es tonto, es dinámico. Se incluyó manejo de variables de entorno explícitas con `python-dotenv`.
- **Negativas:** Se suma un punto único de fallo adicional (caída de la API de Google). Por ello, el pipeline mantiene un "fallback" que escupirá un color estático si la API falla o la key falta.

## 4. Siguientes Pasos
- Concluir la integración de descarga de audio asíncrono con Voicebox.
- Escalar a generación multi-frame (chunks segmentados de 7s).
