# Reglas Críticas y Restricciones (AnimaFlow)

## Reglas de Validación de Producto
* Cero sesgo de solución en la validación del producto.
* Las entrevistas y métricas de validación deben seguir el framework "Mom Test" rigurosamente.
* Está estrictamente prohibido mencionar herramientas específicas (como After Effects), detalles técnicos internos (como spec.json) o la exportación dual en conversaciones iniciales con usuarios.

## Priorización de Funcionalidades (MVP)
* MVP funcional requerido en 20 días como máxima prioridad.
* Desarrollo enfocado en "MVP primero, UI visual después": el editor inicial será basado exclusivamente en código y prompts.
* La interfaz gráfica compleja (UI drag-and-drop) queda estrictamente asignada para el roadmap de la versión 2 (v2).
* El "Dual export" (generación simultánea de MP4 y archivo spec.json) es una característica obligatoria y debe ser funcional entre el Sprint 1 y el Sprint 2.
* Estabilidad sobre Características ("Stability > Features"): Es mandatorio lograr y mantener un 95% de éxito en los renderizados antes de intentar escalar con nuevos canales o integraciones masivas.

## Desarrollo y Deuda Técnica
* Evitar la sobre-ingeniería en las etapas tempranas: es obligatorio el uso de servicios gestionados (managed services) hasta que se logre validar satisfactoriamente la disposición a pagar de los clientes (WTP).
* Mantener "Documentación Viva": cada decisión de diseño técnico, cambio de arquitectura o ajuste de pricing debe ser registrada inmediatamente, incluyendo la fecha de la decisión y la persona responsable.

## Go-To-Market y Estrategia de Monetización
* Prohibido solicitar pagos o suscripciones antes de alcanzar el Sprint 5.
* Fases de adopción definidas: Incorporar y nutrir primero a los usuarios pilotos, recopilar su feedback detallado, iterar sobre la solución y solo entonces proceder a la fase de conversión comercial.
