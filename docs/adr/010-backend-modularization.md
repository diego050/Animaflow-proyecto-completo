# ADR 010: Backend Modularization — From Monolith to Modular Monolith

**Fecha:** 18 de Mayo de 2026
**Estado:** Implementado
**Rol/Autor:** Backend Agent (Orquestador Técnico)
**Score de Revisión:** 9/10

## 1. Contexto

El backend de AnimaFlow creció orgánicamente desde el MVP. El archivo `services/pipeline.py` alcanzó **1,967 líneas** mezclando 7 responsabilidades distintas:

- TTS (Text-to-Speech)
- Segmentación de texto
- LLM / IA generativa
- Generación de componentes Remotion
- Renderizado de video
- Exportación After Effects
- Persistencia en base de datos

Esto creaba los siguientes problemas:
- **God Object Pattern:** Un solo archivo orquestaba todo
- **Tight Coupling:** Un cambio en TTS podía romper el renderizado
- **Sin inversión de dependencias:** Servicios llamaban directamente a `SessionLocal()` y `genai`
- **Sin contratos internos:** No había interfaces que definieran qué espera cada módulo
- **Imposible de testear unitariamente:** Todo acoplado, mocking imposible

## 2. Decisión Arquitectónica

Implementar un **Monolito Modular por Dominios** siguiendo principios de Clean Architecture:

### 2.1. Estructura de Dominios

```
backend/app/modules/
├── tts/                    # 🎤 Text-to-Speech
├── segmentation/           # ✂️ Segmentación de texto
├── llm/                    # 🧠 LLM / IA generativa
├── remotion/               # 🎬 Generación de video
├── ae_export/              # 📦 Exportación After Effects
├── parsers/                # 🔍 Parsers (SVG, TSX)
└── pipeline/               # 🔄 Orquestación
```

### 2.2. Reglas de Dependencia

```
api/ → modules/pipeline/ → modules/tts/, modules/llm/, modules/remotion/
                         → modules/ae_export/ → modules/parsers/
```

**Regla de oro:** Las dependencias fluyen hacia adentro. `modules/tts/` jamás importa de `modules/pipeline/`.

### 2.3. Límites por Archivo

- **Máximo 250 líneas** por archivo
- **Promedio objetivo:** ~100 líneas
- Archivos puras (parsers) vs archivos con side-effects (services)

### 2.4. Fases de Migración

| Fase | Dominio | Riesgo | Tiempo |
|------|---------|--------|--------|
| 1 | Parsers | 🟢 Bajo | ~3h |
| 2 | AE Export | 🟡 Medio | ~4h |
| 3 | Pipeline | 🔴 Alto | ~5h |
| 4 | Cleanup | 🟢 Bajo | ~2h |

**Regla:** Nunca mover más de un dominio por commit. Cada fase = 1 PR.

## 3. Consecuencias

### Positivas

| Métrica | Antes | Después |
|---------|-------|---------|
| Archivo más grande | 1,967 líneas | 217 líneas |
| Promedio por archivo | ~783 líneas | ~105 líneas |
| Módulos de dominio | 0 | 7 |
| Tests | 0 | 16 |
| Tiempo para entender un flujo | Horas | Minutos |
| Tiempo para agregar un shape renderer | Modificar 3 archivos | Crear 1 archivo + 1 línea |

- **Testabilidad:** Parsers son funciones puras, testeables sin mocking
- **Extensibilidad:** Registry pattern para shape renderers
- **Paralelismo:** Múltiples desarrolladores pueden tocar dominios distintos sin conflictos
- **Debugging:** Errores aislados por dominio, stack traces más cortos

### Negativas / Complejidades

- **Más archivos:** De 7 a 52 archivos. Curva de aprendizaje inicial para navegar.
- **Imports más largos:** `from app.modules.ae_export.deterministic.shapes import ...` en vez de `from app.services import ...`
- **Indirección:** Para entender el flujo completo hay que saltar entre orquestador y módulos

### Mitigaciones

- `modules/README.md` documenta cada dominio y tabla de migración
- Backward compatibility shims durante la transición
- Cada `__init__.py` exporta la API pública del módulo

## 4. Principios de Diseño Aplicados

### 4.1. Cada módulo es un dominio de negocio
```
modules/tts/     → "¿Cómo convierto texto en audio?"
modules/llm/     → "¿Cómo genero contenido visual con IA?"
modules/pipeline/ → "¿Cómo orquesto todo el flujo?"
```

### 4.2. Funciones puras vs side-effects
- **Parsers** (`svg/`, `tsx/`): Input → Output. Sin DB, sin HTTP.
- **Services** (`tts/`, `llm/`): HTTP calls, DB writes.
- **Orchestrator** (`pipeline/`): Coordina services, maneja transacciones.

### 4.3. Backward Compatibility
Durante la migración, los archivos en `services/` actuaron como shims que re-exportaban desde `modules/`. Esto permitió:
- Migrar imports gradualmente
- No romper código existente
- Verificar que cada fase funcionaba antes de continuar

## 5. Siguientes Pasos

- Monitorizar que el time-to-debug no aumente con más archivos
- Evaluar si algún dominio merece extraerse a microservicio (no ahora, posiblemente post-MVP)
- Documentar patrones de diseño para nuevos módulos
