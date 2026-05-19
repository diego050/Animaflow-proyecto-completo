# Resultados de Tests — AnimaFlow

> **Última actualización:** 2026-05-19 | **Total tests:** 32 | **Status:** ✅ Todos pasando

---

## Resumen

| Suite | Tests | Estado | Tiempo |
|-------|-------|--------|--------|
| Pipeline Integration | 3 | ✅ | ~90s |
| Parsers SVG | 9 | ✅ | ~5s |
| Parsers TSX | 3 | ✅ | ~3s |
| Parsers Idempotency | 1 | ✅ | ~1s |
| Auth / JWT | 9 | ✅ | ~10s |
| Shape Renderers | 7 | ✅ | ~5s |
| **Total** | **32** | **✅ 32/32** | **~107s** |

---

## Pipeline Integration Tests

**Archivo:** `tests/test_pipeline_integration.py`

| Test | Descripción |
|------|-------------|
| `test_pipeline_produces_valid_spec` | Pipeline produce spec.json válido |
| `test_pipeline_spec_snapshot` | Output coincide con snapshot guardado |
| `test_rerun_pipeline_same_output` | Pipeline es idempotente |

---

## Parser Tests

**Archivo:** `tests/test_parsers_svg.py`

| Test | Descripción |
|------|-------------|
| `test_parse_simple_rect` | Parsea rectángulo simple |
| `test_parse_circle` | Parsea círculo |
| `test_parse_multiple_shapes` | Parsea múltiples shapes |
| `test_parse_empty_svg` | SVG vacío retorna lista vacía |
| `test_parse_with_gradient` | Parsea con gradientes |
| `test_parse_paths` | Parsea paths |
| `test_parse_rects_private` | Función privada `_parse_rects` |
| `test_parse_circles_private` | Función privada `_parse_circles` |
| `test_parse_gradients_private` | Función privada `_parse_gradients` |

**Archivo:** `tests/test_parsers_tsx.py`

| Test | Descripción |
|------|-------------|
| `test_analyze_simple_tsx` | Analiza TSX simple |
| `test_analyze_empty_tsx` | TSX vacío retorna estructura válida |
| `test_extract_group_transforms` | Extrae transforms de grupos |

**Archivo:** `tests/test_parsers_idempotency.py`

| Test | Descripción |
|------|-------------|
| `test_parse_svg_is_idempotent` | Parsear mismo input 2 veces = mismo output |

---

## Auth / JWT Tests

**Archivo:** `tests/test_auth.py`

| Test | Descripción |
|------|-------------|
| `test_register_success` | Registro con datos válidos |
| `test_register_duplicate_email` | Rechaza email duplicado |
| `test_login_success` | Login con credenciales correctas |
| `test_login_wrong_password` | Rechaza password incorrecto |
| `test_login_inactive_user` | Rechaza usuario inactivo |
| `test_protected_route_without_token` | Ruta protegida sin token → 401 |
| `test_protected_route_with_invalid_token` | Token inválido → 401 |
| `test_protected_route_with_expired_token` | Token expirado → 401 |
| `test_me_endpoint` | Endpoint /me retorna perfil correcto |

---

## Shape Renderer Tests

**Archivo:** `tests/test_shape_renderers.py`

| Test | Descripción |
|------|-------------|
| `test_registry_has_all_shapes` | Registry contiene todos los shapes |
| `test_rectangle_generates_valid_script` | Rectangle genera ExtendScript válido |
| `test_circle_generates_valid_script` | Circle genera ExtendScript válido |
| `test_flash_generates_valid_script` | Flash genera ExtendScript válido |
| `test_each_renderer_returns_list_of_strings` | Todos retornan lista de strings |
| `test_rectangle_with_effects` | Rectangle con efectos |
| `test_circle_with_keyframes` | Circle con keyframes |

---

## Cómo Correr los Tests

```bash
cd backend
pytest tests/ -v

# Solo tests de auth
pytest tests/test_auth.py -v

# Solo tests de parsers
pytest tests/test_parsers_*.py -v

# Con coverage
pytest tests/ --cov=app --cov-report=html
```

---

## Cobertura Actual

| Módulo | Cobertura |
|--------|-----------|
| `modules/parsers/` | ✅ Alta (funciones puras, fáciles de testear) |
| `modules/ae_export/shape_renderers/` | ✅ Media-Alta |
| `core/security.py` | ✅ Media (auth JWT) |
| `modules/pipeline/` | 🟡 Baja (requiere mocking de LLM/TTS) |
| `modules/llm/` | 🟡 Baja (requiere mocking de API externas) |
| `modules/tts/` | 🟡 Baja (requiere mocking de Voicebox) |

**Próximos pasos para cobertura:**
- Tests de integración para LLM client (con mocking)
- Tests de integración para TTS service (con mocking)
- Tests E2E con Playwright (frontend)
