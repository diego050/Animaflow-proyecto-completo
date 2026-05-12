# Estado de QA y Testing

*(Pendiente de inicio)*

**Estrategias planificadas:**
- **Unit Tests:** Validar que los esquemas Pydantic rechacen inputs inválidos.
- **E2E Tests:** Validar visualización de `<Player>` en UI con mock objects.
- **Pipeline de RQ:** Asegurar que los cambios de estado (`pending` -> `processing` -> `completed`/`failed`) se registren correctamente en DB bajo concurrencia.
