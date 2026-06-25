# Code-gen de animaciones — Lo que falta / qué sigue

**Contexto:** ver `docs/adr-012-codegen-animaciones.md`. Esto es la hoja de ruta de lo PENDIENTE
después de la Fase 3 (code-gen consciente de escena, detrás de flag, ya construido).

Estado a jun 2026: **Fase 0 (prototipo admin), Fase 2 (render mp4), Fase 3 (pipeline detrás de
flag) = HECHAS.** Lo de abajo es lo que sigue.

---

## 0. Validación inmediata (antes de seguir)
- [ ] **Probar la fuente de la Fase 2:** regenerar una animación con texto y comparar preview vs
      mp4 → deben coincidir (Inter cargada en ambos).
- [ ] **Probar la Fase 3 end-to-end:** `SCENE_ENGINE=codegen` en `backend/.env` + reiniciar api →
      generar un video completo → ver que cada escena es code-gen y suena con el audio.
- [ ] **A/B:** comparar `codegen` vs `orchestration` en el mismo guion para confirmar la mejora.

---

## 1. Calidad y consistencia (corto plazo)
- [ ] **Sync de audio fino:** hoy los `wordTimestamps` se pasan como *hint*. Validar que la IA
      sincroniza reveals con la voz; si no, reforzar el prompt o pasar el timing más estructurado.
- [ ] **Gaps preview↔render menores:** gradientes/alpha se ven algo distintos en Chromium headless.
      Opcional: pedir a la IA evitar `radial-gradient` con alpha muy baja, o aceptar el ~80%.
- [ ] **Duración exacta:** asegurar que la animación ocupa TODA la duración de la escena (que no
      termine antes/después). El prompt ya da los frames; validar en render.
- [ ] **Consistencia de calidad:** medir cuántas generaciones salen buenas vs mediocres (varianza).
      Si es alta, mejorar el few-shot / subir a un modelo más fuerte para el pipeline.

## 2. Robustez / fallback (importante para producción)
- [ ] **Cascada de fallback:** si el code-gen de una escena falla validación/compilación/render →
      reintentar, y si no, **caer a una escena del catálogo** (orquestación) o a un default seguro.
      Hoy si falla, la escena podría romper. (El catálogo SIRVE como red — otra razón para no borrarlo.)
- [ ] **Sandbox endurecido del render server-side:** el render ejecuta código generado en Chromium
      headless. Para escala/seguridad: worker aislado, límites de CPU/memoria/tiempo, sin red/fs,
      y manejo de timeouts/crashes con fallback. (El preview en navegador del admin es bajo riesgo;
      el render server-side es la superficie a endurecer.)
- [ ] **Smoke-test antes de usar:** renderizar 1 frame headless para detectar crashes antes del
      render completo / antes de guardar.

## 3. El flywheel de ejemplos (el moat de largo plazo)
- [ ] **Persistencia:** guardar cada animación generada (tabla `animaciones`: id, video_id,
      user_id, prompt/escena, code, model, status, created_at).
- [ ] **Curación:** marcar las BUENAS (aprobadas/renderizadas/rating). Solo esas entran al few-shot.
      *(Crítico: si embebes basura, el flywheel se degrada.)*
- [ ] **Vectorización:** embeber cada buena animación por lo que ES (visualizador, revelado de
      cifra, showcase…). RAG: cuando llega un prompt nuevo, recuperar 2-3 ejemplos parecidos y
      dárselos como few-shot → mejora con el tiempo, incluso con modelos baratos.
- [ ] **Reutilizar** la infra de embeddings existente (`embedding.py`/pgvector).

## 4. Export a After Effects (universal)
- [ ] **Opción 1 — Footage universal (primero):** salida ProRes (con alpha) / secuencia PNG desde
      el render → importable a AE como capa. Funciona para el 100%, NO editable. Ya tienes ~90%
      (el pipeline de render). Falta agregar el codec/salida.
- [ ] **Opción 2 — Traductor ~80% editable (después, si se necesita):** convertir el componente a
      capas nativas de AE (transforms/shapes/text/gradientes → keyframes). Mejor enfoque: **samplear
      el render frame por frame** (robusto a springs/Math.sin) + mapear apariencia de cada elemento.
      Constreñir el prompt a "estructura traducible" lo hace más fiable. Mensaje al usuario:
      *"no prometemos idéntico, pero ~80% parecido; edita el resto"* o descarga mp4.
- [ ] Documentado en ADR-012 §6; los bloques AE por-componente actuales quedan legacy.

## 5. Producto / UX
- [ ] **Flag por-video (no global):** hoy `SCENE_ENGINE` es env global. Pasarlo a **per-job desde
      el wizard** (el usuario elige "code-gen" o "catálogo" por video). Mejora fácil.
- [ ] **Edición por-escena en el editor:** llevar el loop "¿qué cambiar?" (edición quirúrgica) del
      prototipo al editor del video real, por escena.
- [ ] **Botón "hazlo distinto" / regenerar variación** por escena.
- [ ] **"Bloquear layout":** congelar el `random` procedural a literales para que sea editable
      elemento por elemento (ver discusión de determinismo en ADR-012).

## 6. Jubilación gradual del catálogo (largo plazo, solo si se prueba)
- [ ] **Desactivar** (flag off) la orquestación una vez el code-gen esté sólido en producción.
- [ ] **Borrar componentes triviales** que la IA regenera de memoria (pantalla negra, texto simple,
      formas) — primeros candidatos.
- [ ] Evaluar **iconify**: la IA dibuja íconos genéricos sola; conservar iconify solo si hace falta
      para logos/íconos muy específicos. No borrar de golpe.
- [ ] **Conservar como fallback** hasta tener confianza total. "Borrar" es puerta de un solo sentido.

## 7. Observabilidad / costo
- [ ] Ya hay log de tokens por llamada (`Tokens [LLM Animation]: in/out/total`). Falta:
- [ ] **Total por video** (acumulador por job → "video X usó N tokens ≈ $Y").
- [ ] Métricas: % de escenas code-gen que pasan validación a la primera, % que necesitan fallback,
      tiempo de render.

---

## Decisiones abiertas (a definir con el usuario)
1. ¿Modelo del code-gen **fijo fuerte** (ej. siempre 3.5-flash/pro) o configurable por video?
2. ¿AE: con footage (Opción 1) basta para los clientes, o se necesita el editable (Opción 2)?
3. ¿El flag de scene engine va por-video (wizard) o como setting global de admin?
4. ¿Cuándo se considera "probado en producción" para empezar a jubilar el catálogo?

---

## Orden sugerido
1. Validar Fase 2 + Fase 3 (sección 0).
2. **Fallback + sync de audio** (sección 2 + 1) — para que el video completo sea confiable.
3. **Flywheel de ejemplos** (sección 3) — sube la calidad de todos.
4. **Footage AE** (sección 4, Opción 1) — export universal.
5. **UX:** flag por-video + edición por-escena (sección 5).
6. Sandbox endurecido (sección 2) antes de abrirlo a todos los usuarios.
7. Jubilación del catálogo (sección 6) — al final, gradual.
