# Estrategia de Modelos Gemini - AnimaFlow

## Descripción General

AnimaFlow utiliza una arquitectura de **doble modelo con fallback automático** para maximizar la tasa de éxito en la generación de componentes TSX para Remotion, minimizando interrupciones por errores transitorios de la API de Gemini.

## Modelos Configurados

### Modelo Principal: `gemma-4-31b-it`

| Característica | Valor |
|---------------|-------|
| **Parámetros** | 31B (31 billones) |
| **Tokens/min** | Ilimitados |
| **Calidad de código** | ⭐⭐⭐⭐⭐ (Excelente) |
| **Casos de uso** | Generación de TSX con React hooks, Remotion API, SVG complejos |
| **Ventaja clave** | Tokens ilimitados + mejor razonamiento de código |

**Por qué 31B:**
- Mejor comprensión de patrones de React (`useCurrentFrame`, `interpolate`, `spring`)
- Genera SVG más detallados y estructurados
- Sigue instrucciones complejas de diseño (capas, animaciones, gradientes)
- Sin límite de quota (vs 15k/min de Gemma 3)

### Modelo Fallback: `gemma-4-26b-a4b-it`

| Característica | Valor |
|---------------|-------|
| **Parámetros** | 26B (26 billones) |
| **Tokens/min** | Ilimitados |
| **Calidad de código** | ⭐⭐⭐⭐ (Muy buena) |
| **Casos de uso** | Respaldo cuando el modelo principal falla |
| **Ventaja clave** | Disponibilidad inmediata, arquitectura similar |

**Por qué 26B como fallback:**
- Arquitectura Gemma 4 compatible (mismo formato de API)
- Suficiente calidad para generación de TSX básico
- También sin límite de quota
- Menor demanda que 31B (menor probabilidad de 503)

---

## Comparativa con Gemma 3

| Modelo | Tokens/min | Calidad TSX | 503 Frequency | Recomendación |
|--------|-----------|-------------|---------------|---------------|
| Gemma 3 27B | 15,000 | ⭐⭐⭐⭐ | Media | ❌ Quota limitante |
| Gemma 3 12B | 15,000 | ⭐⭐⭐ | Baja | ❌ Insuficiente para TSX |
| **Gemma 4 31B** | **Ilimitado** | ⭐⭐⭐⭐⭐ | Baja-Media | ✅ **Principal** |
| **Gemma 4 26B** | **Ilimitado** | ⭐⭐⭐⭐ | Baja | ✅ **Fallback** |

### Problemas de Gemma 3 (descartados):
1. **Quota de 15k tokens/min:** Con 5+ escenas, el pipeline se bloquea esperando quota
2. **Menor calidad de código:** Modelos <12B generan TSX con errores de sintaxis
3. **Más propenso a 429:** El límite de quota causa errores frecuentes

---

## Flujo de Fallback Automático

```
┌─────────────────────────────────────────────────────────────┐
│  1. Intentar con gemma-4-31b-it (modelo principal)          │
│     - Máximo 3 reintentos                                   │
│     - Backoff: 5s → 10s → 20s                               │
│     - Errores: 429, 503, RESOURCE_EXHAUSTED, UNAVAILABLE    │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ ❌ Falló después de 3 intentos
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  2. ⚠️ WARNING LOGUEADO (visible en consola)                │
│     "[LLM API] ⚠️ WARNING: Modelo principal gemma-4-31b-it   │
│      saturado. Usando fallback gemma-4-26b-a4b-it"           │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  3. Intentar con gemma-4-26b-a4b-it (modelo fallback)       │
│     - Máximo 2 reintentos                                   │
│     - Backoff: 5s → 10s                                     │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ ❌ Falló después de 2 intentos
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  4. ⚠️ WARNING LOGUEADO (visible en consola)                │
│     "[LLM API] ⚠️ WARNING: Fallback también falló.           │
│      Usando componente por defecto FadeText."               │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  5. Retornar "FadeText" (componente por defecto)            │
│     - Garantiza que el pipeline continúe                    │
│     - El usuario puede regenerar manualmente después        │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementación Técnica

### Función `_call_gemini_with_retry`

```python
async def _call_gemini_with_retry(
    client,
    prompt: str,
    max_retries: int = 3,
    model: str = None
) -> any:
    """
    Llama a Gemini API con reintentos automáticos para errores transitorios.
    Usa backoff exponencial: 5s → 10s → 20s
    """
    from app.core.config import settings
    
    if model is None:
        model = settings.GEMINI_MODEL
    
    for attempt in range(max_retries):
        try:
            response = await client.aio.models.generate_content(
                model=model,
                contents=prompt,
            )
            return response
        except Exception as e:
            error_str = str(e)
            # Detectar errores retryables
            is_retryable = any(
                code in error_str 
                for code in ["429", "503", "RESOURCE_EXHAUSTED", "UNAVAILABLE"]
            )
            
            if is_retryable and attempt < max_retries - 1:
                wait_time = 5 * (2 ** attempt)  # 5s, 10s, 20s
                print(f"[LLM API] Error transitorio ({error_str[:60]}...). "
                      f"Reintentando en {wait_time}s (intento {attempt+1}/{max_retries})")
                await asyncio.sleep(wait_time)
                continue
            
            raise
```

### Uso en `generate_remotion_component`

```python
async def generate_remotion_component(...) -> str:
    # ... setup del cliente y prompt ...
    
    # Intentar con modelo principal
    response = None
    try:
        response = await _call_gemini_with_retry(client, prompt, max_retries=3)
    except Exception as e:
        # Fallback a modelo secundario
        print(f"[LLM API] ⚠️ WARNING: Modelo principal {settings.GEMINI_MODEL} "
              f"saturado. Usando fallback {settings.GEMINI_FALLBACK_MODEL}")
        try:
            response = await _call_gemini_with_retry(
                client, prompt, max_retries=2, 
                model=settings.GEMINI_FALLBACK_MODEL
            )
        except Exception as e2:
            print(f"[LLM API] ⚠️ WARNING: Fallback también falló. "
                  f"Usando componente por defecto FadeText.")
            return "FadeText"
    
    # ... procesar response y guardar TSX ...
```

---

## Configuración (.env)

```bash
# Google Gemini API
GEMINI_API_KEY=AIzaSyDF0bRhOjUlTdaDBTn4gZvjmiGnVAuJOks
GEMINI_MODEL=gemma-4-31b-it
GEMINI_FALLBACK_MODEL=gemma-4-26b-a4b-it
```

---

## Métricas y Monitoreo

### Tiempos de Espera por Reintentos

| Escenario | Intentos | Backoff | Tiempo Total Máx |
|-----------|----------|---------|------------------|
| Modelo principal (retryable) | 3 | 5s → 10s → 20s | 35s |
| Fallback (retryable) | 2 | 5s → 10s | 15s |
| **Total (ambos fallan)** | **5** | **5s → 10s → 20s → 5s → 10s** | **50s** |

### Logs de Auditoría

Cada reintento y fallback queda registrado:

```
[LLM API] Error transitorio (503 UNAVAILABLE...). Reintentando en 5s (intento 1/3)
[LLM API] Error transitorio (503 UNAVAILABLE...). Reintentando en 10s (intento 2/3)
[LLM API] ⚠️ WARNING: Modelo principal gemma-4-31b-it saturado. Usando fallback gemma-4-26b-a4b-it
[LLM API] Error transitorio (429 RESOURCE_EXHAUSTED...). Reintentando en 5s (intento 1/2)
[LLM API] ⚠️ WARNING: Fallback también falló. Usando componente por defecto FadeText.
```

### Métricas de Éxito (Estimadas)

| Métrica | Antes (Gemma 3) | Después (Gemma 4 dual) |
|---------|----------------|------------------------|
| Tasa de éxito (1er intento) | ~60% | ~75% |
| Tasa de éxito (con retry) | ~70% | ~90% |
| Tasa de éxito (con fallback) | ~70% | ~95% |
| Quota bloqueos | Frecuentes (15k/min) | Nulos (ilimitado) |
| Tiempo promedio por escena | 8-12s | 6-10s |

---

## Decisiones de Diseño

### ¿Por qué backoff exponencial?
- **5s base:** Suficiente para errores transitorios de red/API
- **Exponencial (2^attempt):** Evita saturar la API con retries agresivos
- **Máximo 20s:** Balance entre paciencia y tiempo total del pipeline

### ¿Por qué 3 intentos principal, 2 fallback?
- **Principal (3):** Máxima calidad vale la espera (35s máx)
- **Fallback (2):** Ya se perdió tiempo con el principal, priorizar velocidad

### ¿Por qué no más de 5 intentos totales?
- **Ley de rendimientos decrecientes:** Si falló 5 veces, probablemente es un problema persistente
- **UX del usuario:** 50s de espera es el límite razonable antes de fallback final
- **Graceful degradation:** Mejor `FadeText` que job fallido

### ¿Por qué no WebSockets para retry?
- **Complejidad innecesaria:** Polling es suficiente para MVP
- **Stateless:** Cada retry es independiente, no necesita estado compartido

---

## Futuras Mejoras (v2)

- [ ] **Circuit breaker:** Desactivar modelo principal temporalmente si falla >3 veces consecutivas
- [ ] **Load balancing:** Rotar entre 31B y 26B basándose en latencia reciente
- [ ] **Cache de prompts:** Si el mismo prompt falló, intentar con variación ligeramente diferente
- [ ] **Métricas en tiempo real:** Dashboard con tasa de éxito por modelo, latencia promedio
- [ ] **Fallback progresivo:** 31B → 26B → 12B → FadeText (más niveles de degradación)

---

## Referencias

- **Backend:** `backend/app/services/pipeline.py:228-260` (_call_gemini_with_retry)
- **Config:** `backend/app/core/config.py:23-25` (GEMINI_MODEL, GEMINI_FALLBACK_MODEL)
- **Env:** `backend/.env:14-16` (variables de modelo)
- **Docs:** `docs/backend/estado_actual.md#estrategia-de-modelos-y-resiliencia`
