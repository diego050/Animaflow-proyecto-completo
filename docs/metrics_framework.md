# AnimaFlow - Growth & Metrics Framework

Este documento define la estructura de métricas clave (North Star y su desglose) para AnimaFlow, basado en un modelo SaaS B2B orientado a la productividad y creación de video (text-to-video / spec.json).

## 1. Árbol de Métricas (Metrics Tree)

Para AnimaFlow, el valor central que entregamos a nuestros usuarios (agencias, creadores) no es solo que inicien sesión, sino que logren exportar videos o proyectos para After Effects de manera exitosa. 

### 🌟 Focus Metric (North Star Metric)
**Weekly Successful Renders (WSR)**
*(Número de videos renderizados o exportados exitosamente con el pipeline de AnimaFlow por semana)*
Esta métrica captura el valor "core" del producto. Si el WSR sube, significa que los usuarios están usando la herramienta para su propósito principal y obteniendo resultados.

---

### Nivel 1 (L1 Metrics)
Estas son las palancas principales que alimentan y sostienen nuestra North Star Metric.

1. **Reach (Alcance / Marketing):** 
   - **Métrica:** Nuevos Usuarios Registrados (Weekly New Signups).
   - **Dueño:** Marketing / Growth.

2. **Activation (Activación / Onboarding):**
   - **Métrica:** Tasa de Activación (Usuarios nuevos que realizan su *primer render exitoso* en los primeros 7 días).
   - **Dueño:** Producto / UX.

3. **Engagement (Compromiso / Uso del Producto):**
   - **Métrica:** Renders por Usuario Activo (Promedio de proyectos exportados por usuario a la semana).
   - **Dueño:** Producto / Retención.

4. **Retention (Retención):**
   - **Métrica:** Retención a 1 Semana / 1 Mes (Porcentaje de usuarios que hicieron un render la semana pasada y volvieron a hacer otro esta semana).
   - **Dueño:** Producto / Customer Success.

5. **Business-Specific (Negocio / Monetización):**
   - **Métrica:** ARPU (Average Revenue Per User) o MRR (Monthly Recurring Revenue).
   - **Dueño:** Negocio / Ventas.

---

### Nivel 2 (L2 Metrics)
Métricas tácticas y de diagnóstico, altamente accionables a través de cambios técnicos o experimentos de growth.

* **Debajo de Reach:**
  * Tráfico en la Landing Page.
  * Costo de Adquisición de Clientes (CAC).
  * Tráfico Orgánico vs Pagado.

* **Debajo de Activation:**
  * *Time to first render* (Minutos desde el registro hasta obtener el primer MP4/spec.json).
  * Tasa de error en la generación del prompt LLM en usuarios nuevos.
  * Drop-off rate en la pantalla de espera de los RQ Workers.

* **Debajo de Engagement:**
  * Ratio de uso de "Dual Export" (¿Cuántos exportan solo MP4 vs. MP4 + spec.json?).
  * Tasa de edición (Usuarios que editan los boundaries/segmentos vs. los que usan el resultado por defecto).
  * Tasa de éxito del Render Worker (Pipeline reliability - fundamental que sea >95%).

* **Debajo de Retention:**
  * Churn Rate (Tasa de cancelación o abandono).
  * Usuarios Reactivados.

---

## 2. Diseño de Experimentos para AnimaFlow

Para mejorar cualquiera de las métricas L1/L2, aplicaremos un modelo de experimentación estructurado.

| Elemento | Descripción | Ejemplo para AnimaFlow |
| :--- | :--- | :--- |
| **Hipótesis** | Afirmación a comprobar | *"Añadir templates pre-diseñados en el onboarding aumentará la tasa de activación de agencias."* |
| **Variable** | Lo que modificamos (A/B Test) | Flujo de Onboarding: Pantalla en blanco vs. Selección de Template Básico. |
| **Métrica L2 impactada** | Lo que medimos para validar | Time to first render / Tasa de Activación (7 días). |
| **Meta** | Resultado esperado | Aumentar la Tasa de Activación en un 15% en el segmento B2B. |

## 3. Traction Bullseye Pipeline (Ideación B2B)

Según las reglas de producto (SaaS en fase MVP de 20 días sin presupuesto en Ads al inicio), el proceso de Growth de AnimaFlow (Ideate -> Prioritise -> Test -> Analyse) se centrará en los siguientes canales para el MVP:

1. **Direct Sales (B2B):** Contacto directo con agencias de marketing y editores de video freelance en LinkedIn. (Costo bajo, feedback directo - *Mom Test*).
2. **Content Marketing / SEO:** Documentación sobre cómo optimizar flujos de trabajo en After Effects y la ventaja de flujos basados en JSON.
3. **Engineering as a channel / Side Project:** Ofrecer una herramienta gratuita "Text-to-Prompt AE" que actúe como lead magnet para AnimaFlow.

### Ejemplo de Ideation Pipeline con ICE Score (Impact, Confidence, Ease)

| Experimento | Impact (1-10) | Confidence (1-10) | Ease (1-10) | Total ICE Score |
| :--- | :---: | :---: | :---: | :---: |
| Entrevistas directas (Mom Test) a 20 editores de AE en LinkedIn | 9 | 8 | 7 | **24** |
| Post en subreddits de AfterEffects mostrando un render 10x más rápido | 8 | 6 | 8 | **22** |
| Ads en Google Búsqueda ("alternativas a renderizado AE manual") | 7 | 5 | 5 | **17** |
