# Plan de Mejora de Calidad — AnimaFlow

> Documento de análisis y plan de acción para llevar la calidad de los videos
> generados a un nivel profesional (objetivo: igualar o superar plantillas tipo
> Remotion / motion-graphics de agencia).
>
> Este documento es **teórico y descriptivo**. No contiene implementación, solo
> el diagnóstico de causa raíz de cada problema y la estrategia detallada para
> resolverlo. Cada sección explica **por qué pasa**, **dónde pasa** (archivos
> involucrados) y **cómo lo vamos a cambiar**.

---

## 0. Cómo funciona hoy el sistema (mapa mental)

Antes de los problemas, hay que entender el flujo, porque casi todos los
defectos visuales nacen de una decisión tomada en alguna etapa de esta cadena:

1. **Guion → bloques de texto.** El texto del video se parte en "chunks", uno
   por escena.
2. **Director de Arte (LLM #1).** `backend/app/modules/llm/visual_spec.py`
   genera, para cada escena, un `media_query` (descripción de mood en inglés),
   un `backgroundColor` y un `textColor`. Es una llamada a Gemini con un prompt
   de "Director de Arte Senior".
3. **Director de Escena (LLM #2).** `backend/app/modules/llm/component_strategy.py`
   recibe el texto + el `media_query` + los colores sugeridos y produce el
   **spec.json** de la escena: un `background` y una lista de `layers`. Cada
   layer es texto, un componente de la librería, un grupo flex/grid, etc.
4. **Post-proceso del spec (backend).** Sobre ese JSON se aplican reglas
   automáticas: auto-fit de `fontSize`, asignación de `width` por defecto,
   reemplazo de componentes inexistentes, limpieza de grupos vacíos, etc.
   (en `component_strategy.py`, ~líneas 1600-1716).
5. **Layout solver.** `frontend/src/remotion/utils/layoutSolver.ts` (y su gemelo
   en backend `app/services/layout_solver.py`) convierte coordenadas relativas
   al centro en coordenadas absolutas, resolviendo flex/grid/absolute.
6. **Render.** `frontend/src/remotion/composer/AnimaComposer.tsx` interpreta el
   spec y monta los componentes React de `registry.ts` (112 componentes) dentro
   de un canvas Remotion (por defecto 1080×1920).
7. **Admin / Playground.** `frontend/src/pages/admin/AnimationsGallery.tsx` y
   `AnimationPlayground.tsx` permiten previsualizar componentes sueltos con un
   panel de inputs.

**Conclusión clave del mapa:** la calidad final es el producto de (a) la calidad
intrínseca de cada componente React, (b) las decisiones del LLM, y (c) las
reglas determinísticas de post-proceso. Hoy las tres capas tienen huecos. El
plan ataca las tres.

Un dato estructural muy importante que condiciona TODO el documento:

> **No existe una única fuente de verdad de las props ni de los nombres de los
> componentes.** El conocimiento de "qué componentes existen y qué props acepta
> cada uno" está **disperso y CUADRUPLICADO** en cuatro lugares que ya divergen
> entre sí: (1) la interfaz TypeScript de cada archivo `.tsx`; (2) `sanitizeProps.ts`
> (solo 8 de 112 componentes tienen whitelist); (3) el prompt gigante de
> `component_strategy.py` como texto plano; y (4) el **enum de Pydantic del backend**
> que valida el JSON del LLM. El Playground no lee ninguna de las cuatro: tiene los
> inputs **hardcodeados**.
>
> Que estas listas estén desincronizadas **no es teórico**: en el log de un render
> real (ver Sección 10) el componente `WordHighlight` —que SÍ existe en el registry
> del frontend y en `sanitizeProps`— fue **rechazado por el enum de Pydantic** del
> backend, obligando a regenerar toda la escena. Esta ausencia de un "manifest"
> único de componentes es la causa raíz del problema #4 y un multiplicador de casi
> todos los demás.

---

## 1. Problema: las animaciones/componentes no se ven profesionales

### 1.1 Síntoma
Las animaciones prehechas se sienten "básicas" comparadas con plantillas
Remotion de calidad. Falta pulido: las entradas/salidas son genéricas, faltan
microinteracciones, y el conjunto no transmite intención de diseño.

### 1.2 Diagnóstico de causa raíz

**A) Vocabulario de animación pobre y uniforme.**
En `AnimaComposer.tsx` cada layer se envuelve en `AnimatedWrapper` con un set
fijo y pequeño de entradas (`fade-in`, `slide-up`, `scale-in`, `spring-in`...)
y salidas equivalentes. El problema no es que existan, sino que:
- Son **transformaciones de una sola propiedad** (opacidad O posición O escala),
  cuando el motion-graphics profesional combina varias a la vez con curvas
  distintas (ej: entrar con escala 0.8→1 + opacidad + un leve overshoot + blur
  que se disipa).
- Las curvas de easing por defecto son lineales o cúbicas estándar. Remotion de
  calidad vive de **springs bien tuneados** (masa, stiffness, damping) y de
  curvas custom, no de `Easing.out(Easing.cubic)` genérico.
- El `entryDuration`/`exitDuration` por defecto es 30 frames para todo. No hay
  noción de "este elemento es un acento, debe entrar rápido y enérgico" vs
  "este es el fondo, debe entrar lento y sutil".

**B) Las animaciones internas de cada componente son simplistas.**
Revisando componentes como `APIRequestFlow.tsx` o `StyleTextBlock.tsx`, la
animación se reduce a un `spring` de escala + un `interpolate` de opacidad. No
hay:
- **Staging / secuenciación interna** (que los sub-elementos de un componente
  entren escalonados, no todos juntos).
- **Anticipación y settle** (el principio de animación clásico: un pequeño
  movimiento contrario antes del movimiento principal, y un asentamiento al
  final en vez de frenar en seco).
- **Movimiento residual / idle** (un elemento que ya entró no debería quedar
  100% estático; un drift sutil, un breathing, un parallax mantiene vida).

**C) No hay un sistema de diseño compartido entre componentes.**
Cada componente define sus propios colores, sombras, radios y tipografías
"a mano" (ej: APIRequestFlow tiene `#0f172a`, `#334155`, `#38bdf8` hardcodeados;
StyleTextBlock tiene su propio `variantMap`). El resultado es que dos componentes
en la misma escena pueden no compartir lenguaje visual → se ve "ensamblado", no
"diseñado".

### 1.3 Estrategia de solución

**Paso 1 — Crear una librería de "presets de movimiento" (motion tokens).**
En vez de animaciones de una propiedad, definir un set curado de presets
profesionales (por ejemplo: `softRise`, `popIn`, `dramaticZoom`, `blurFocus`,
`slideSettle`) donde cada preset combine 2-3 propiedades con springs tuneados y
con fases de anticipación/settle. `AnimatedWrapper` pasaría a consumir estos
presets en lugar de su switch actual de transformaciones simples. Esto eleva la
calidad de TODOS los componentes de golpe sin tocarlos uno por uno.

**Paso 2 — Introducir staging interno reutilizable.**
Crear un helper de "stagger" (escalonado) que cualquier componente con
sub-elementos pueda usar: el cliente entra, luego la flecha avanza, luego la
respuesta aparece (esto APIRequestFlow ya lo hace a mano; hay que generalizarlo
para que todos los componentes compuestos lo hereden de forma consistente).

**Paso 3 — Movimiento residual sutil.**
Añadir, como capacidad opcional del wrapper, un "idle motion" muy leve (drift de
±4px, breathing de escala ±1%, parallax ligado al frame) que se active cuando el
elemento ya está visible. Es lo que separa un video "que se mueve" de uno "vivo".
Debe ser configurable e idéntico en cada render (determinista, como ya exige el
proyecto — ver nota sobre `Math.random()` más abajo).

**Paso 4 — Sistema de diseño central (design tokens).**
Extraer a un módulo único los colores base, escalas de sombra (elevación),
radios, y familias tipográficas. Cada componente consumiría tokens en vez de
hex sueltos. Beneficio doble: coherencia visual entre componentes de la misma
escena y un único lugar para "subir el nivel" estético global.

**Paso 5 — Auditoría componente por componente, priorizada.**
No los 112 a la vez. Priorizar los que más aparecen en videos reales (texto,
iconos, fondos, badges, cards) y los "hero" como APIRequestFlow. Para cada uno:
revisar timing, easing, staging, profundidad (sombras/blur), y coherencia con
tokens. Los componentes de relleno raramente usados quedan en una segunda ola.

**Nota técnica crítica para todo el plan:** el render de Remotion DEBE ser
determinista (mismo frame → mismo pixel) porque se renderiza en paralelo por
workers. Ya hubo un bug por esto: `StyleScrambleText` usaba `Math.random()` y se
corrigió a una función pura de `(frame, índice)`. Cualquier animación nueva
(idle motion, partículas, etc.) tiene que seguir esta regla: nada de `Math.random()`
ni de `Date.now()`; todo derivado del `frame`.

---

## 2. Problema: el TEXTO es el protagonista en vez de las animaciones

### 2.1 Síntoma
En varias escenas (ver `imagenes/escena1.png`, `escena3.png`, `escena5.png`) el
texto ocupa media pantalla y es lo único que se ve; el elemento visual (icono,
fondo) queda relegado. En otras escenas sí está balanceado, pero es inconsistente.

### 2.2 Diagnóstico de causa raíz

**A) Los tamaños base de texto son enormes por diseño.**
En `StyleTextBlock.tsx`, el `variantMap` define `heading: 88px`, `body: 56px`,
`quote: 60px`. Hay un comentario explícito ("v7: defaults grandes para video
vertical") que subió estos valores. Y el prompt del backend
(`component_strategy.py`, ~líneas 541-552) **instruye al LLM**: *"El texto hablado
SIEMPRE debe ser fontSize >= 80. Si dudas, usa 96"*. O sea, el sistema está
sesgado intencionalmente a texto grande.

**B) El auto-fit solo ACHICA, nunca define jerarquía.**
La función `_auto_fit_layer_text` (backend, ~línea 1636) hace binary search para
que el texto quepa, con `min_font_size = 64` y permitiendo que ocupe hasta el
**50% de la altura del canvas** (`max_text_height = canvas_height * 0.5`). Es
decir: el suelo es 64px y el techo es media pantalla. Un texto largo se queda en
~64px (sigue siendo grande) y uno corto se infla hasta llenar medio frame. No
existe ninguna lógica que diga "este texto es soporte de la animación, no el
protagonista".

**C) La instrucción anti-muro-de-texto existe pero es débil.**
El prompt SÍ tiene una regla 4.1 ("EVITA EL MURO DE TEXTO", "NO uses fontSize
enorme para rellenar", "deja aire"). Pero es una recomendación en lenguaje
natural que **compite contra otra instrucción dura y numérica** ("fontSize >= 80",
"si dudas usa 96"). Cuando un prompt tiene una guía suave ("deja aire") y una
regla dura y cuantificada ("siempre >= 80"), el modelo obedece la dura. Las
instrucciones se contradicen entre sí.

**D) No hay un "presupuesto de composición".**
El sistema nunca razona sobre el reparto del lienzo. No existe el concepto de
"el texto puede ocupar como máximo X% del frame y debe coexistir con un visual
que ocupe Y%". Cada escena se decide aislada, sin un contrato de balance.

### 2.3 Estrategia de solución

**Paso 1 — Redefinir la escala tipográfica por ROL, no por tamaño absoluto.**
En lugar de "el texto hablado es >= 80px", introducir roles de composición:
- *Protagonista textual*: escenas donde el mensaje ES el contenido (una frase
  de impacto sobre fondo limpio). Aquí el texto grande está bien.
- *Texto de soporte*: escenas donde hay un visual protagonista (un gráfico, un
  componente animado, un mockup). Aquí el texto debe ser deliberadamente más
  chico (subtítulo/caption) para no competir.

La clave es que el sistema **decida el rol primero** y de ahí derive el tamaño,
en vez de aplicar 80px universal.

**Paso 2 — Resolver la contradicción en el prompt.**
Eliminar la regla dura "siempre >= 80 / si dudas 96" y reemplazarla por una
tabla condicionada al rol (protagonista vs soporte). El prompt debe dar UN solo
mensaje coherente sobre tamaño, no dos que se pelean. La regla "deja aire" deja
de ser un consejo y pasa a ser una restricción cuantificada (ver paso 4).

**Paso 3 — Bajar el techo del auto-fit y hacerlo rol-consciente.**
El `max_text_height` del 50% es demasiado permisivo para texto de soporte. Para
escenas con visual protagonista, el texto no debería pasar de ~25-30% de la
altura. El auto-fit debe recibir el rol del texto y aplicar techos distintos.

**Paso 4 — Introducir un "presupuesto de composición" como regla determinística.**
Tras generar el spec, un paso de post-proceso evalúa: ¿esta escena tiene un
elemento visual relevante además del texto? Si NO lo tiene, se fuerza a añadir
uno (icono/fondo animado) — el prompt ya lo pide pero no se valida. Si lo tiene,
se verifica que el texto no esté invadiendo la zona del visual y, si es así, se
reduce el texto o se reubica. Esto convierte la "buena intención" del prompt en
una garantía verificable.

**Paso 5 — Sesgar el sistema hacia "show, don't tell".**
A nivel de dirección de escena, empujar que el concepto se exprese
visualmente (un icono de corazón latiendo para "amor", un gráfico para un dato)
y que el texto **refuerce**, no que **sea** el contenido. Esto es trabajo de
prompt + de tener buenos componentes (lo cual conecta con el problema #1: si
los componentes visuales fueran mejores, el LLM se apoyaría más en ellos).

---

## 3. Problema: posiciones (mejor que antes, pero con defectos)

### 3.1 Síntoma
Elementos que se solapan o quedan mal ubicados. El caso más claro es
`imagenes/escena2.png` y `escena1-transicion2.png`: el badge "CONEXIÓN
EMOCIONAL" se monta ENCIMA del texto "...de cuidado...". Reconoces que ya mejoró,
pero quedan casos.

### 3.2 Diagnóstico de causa raíz

**A) El contrato de coordenadas es "centro + translate(-50%,-50%)" pero el
solver no conoce el tamaño real de los elementos.**
El layout solver (`layoutSolver.ts`) emite el **centro absoluto** de cada
elemento y cada componente se autocentra con `translate(-50%,-50%)`. El comentario
en `applyDefault` lo dice explícitamente: no se resta `width/2` porque "width
suele ser un default inventado". El problema: como el solver **no sabe el alto/
ancho real** que tendrá un texto multilínea o un componente que crece con su
contenido, **no puede detectar colisiones**. Dos elementos con centros cercanos
se solapan porque nadie midió sus cajas.

**B) El posicionamiento depende de que el LLM elija buenas coordenadas a mano.**
El prompt (`component_strategy.py`, regla 5 y "REGLAS DE POSICIONAMIENTO")
instruye al modelo a poner `x/y` manualmente (`y: -200` arriba, `y: 200` abajo,
etc.) y a "NO apilar elementos en el centro". Pero es el modelo quien decide los
números sin ninguna noción de cuánto mide cada cosa. El badge de escena2 quedó
con una `y` muy cercana a la del texto y, como el texto era de 3 líneas, lo
invadió. El sistema no tenía forma de saberlo.

**C) Coexisten dos paradigmas de layout (flex/grid vs x/y manual) y se mezclan.**
El sistema soporta flex/grid (que SÍ evita solapamientos automáticamente,
porque distribuye) y también posicionamiento manual x/y. El prompt empuja x/y
manual en la mayoría de reglas y solo sugiere flex "para múltiples elementos".
Resultado: el modelo a veces apila a mano elementos que deberían haber estado en
un contenedor flex que los hubiera separado solo.

**D) Las "safe zones" están descritas pero no se validan.**
El prompt menciona zona segura de texto, pero igual que el balance, es una
indicación textual sin verificación posterior.

### 3.3 Estrategia de solución

**Paso 1 — Estimar la caja real de cada elemento (bounding box) en el solver.**
Ya existe `fitText.ts` que estima líneas y alto del texto. Hay que usar esa misma
estimación dentro del flujo de layout para conocer la altura/anchura aproximada
de cada layer ANTES de posicionarlo. Con cajas estimadas, el solver (o un paso
posterior) puede detectar solapamientos.

**Paso 2 — Detección y resolución de colisiones determinística.**
Un paso de post-proceso que, con las cajas estimadas, detecte pares de elementos
que se intersectan y los separe (empujando el de menor prioridad fuera de la caja
del de mayor prioridad, o aumentando el gap). La prioridad se deriva del rol:
el texto protagonista manda, un badge decorativo cede. Esto habría resuelto
escena2 automáticamente.

**Paso 3 — Preferir layout por flujo (flex/stack) sobre x/y manual.**
Cambiar el sesgo del prompt y del post-proceso para que, cuando hay varios
elementos en la misma región vertical, se agrupen en un contenedor de columna
con `gap`, que por construcción no se solapa. El x/y manual queda para overlays
intencionales (esquinas, marcas de agua). Esto ataca la causa C de raíz: menos
posicionamiento "a ojo" del modelo, más layout calculado.

**Paso 4 — Validar safe zones como restricción dura.**
Definir márgenes seguros (arriba/abajo para no chocar con UI de TikTok/Reels, y
laterales) y, en post-proceso, recolocar cualquier elemento que se salga. Hoy
es solo texto en el prompt; debe ser una verificación geométrica.

**Paso 5 — Mantener sincronizados los dos layout solvers.**
Existe `layoutSolver.ts` (frontend) y `layout_solver.py` (backend) — son
implementaciones gemelas del mismo algoritmo. Cualquier mejora de colisiones
debe aplicarse a ambos o, idealmente, consolidarse para que no diverjan (una
fuente de bugs sutiles: que frontend y backend posicionen distinto).

---

## 4. Problema: inputs del admin `/admin/animations/` hardcodeados

### 4.1 Síntoma
En el Playground, al abrir un componente como **APIRequestFlow**, el panel
muestra inputs que no corresponden (ej: un campo **Width** que el componente ni
siquiera usa) y NO muestra los que sí importan (`method`, `endpoint`,
`responseCode`, y el contenido del request/response). Los inputs no reflejan lo
que cada componente realmente puede editar.

### 4.2 Diagnóstico de causa raíz (este es claro y 100% confirmado en el código)

En `AnimationPlayground.tsx`, el estado de props se inicializa con un objeto
**fijo y universal** (`text`, `color`, `bgColor`, `textColor`, `fontSize`,
`width`, `delay`, `theme`) y el panel renderiza **exactamente esos mismos campos
para los 112 componentes**, sin importar cuál estés viendo. El bloque de inputs
(líneas ~1253-1314) está escrito a mano: un textarea de "Texto de Prueba", tres
inputs de color, uno de fontSize y uno de Width. Punto.

Por eso APIRequestFlow muestra "Width": **es un input global que se pinta para
todos**, aunque ese componente no tenga prop `width` (su interfaz solo declara
`method`, `endpoint`, `responseCode` + props universales). Y por eso no puedes
editar `method`/`endpoint`: **no existe ningún input para ellos**.

La causa profunda ya la adelantamos en la sección 0: **no hay un manifest de
componentes**. El Playground no tiene de dónde leer "qué props tiene
APIRequestFlow", así que su autor optó por hardcodear un set genérico. Además,
muchas props de APIRequestFlow están de todos modos **hardcodeadas dentro del
propio componente**: el cuerpo del JSON del request ("Epic sci-fi scene") y de
la response ("job_id 8f92a") son strings fijos en el `.tsx`, no son props. Así
que ni editándolas en un panel cambiarían — primero hay que exponerlas como props.

### 4.3 Estrategia de solución

**Paso 1 — Crear un "manifest de componentes" (la pieza central de todo).**
Definir, para cada componente, un esquema de sus props editables: nombre, tipo
(`string`, `number`, `color`, `boolean`, `select`, `text-largo`, `lista`...),
valor por defecto, rango/mín-máx para números, opciones para selects, y una
etiqueta legible + descripción. Este manifest es **la única fuente de verdad**
que hoy no existe y que resuelve transversalmente:
- El Playground (genera inputs automáticamente).
- `sanitizeProps.ts` (deja de tener whitelists parciales de 8 componentes).
- El prompt del LLM (puede generarse desde el manifest en vez de mantenerse a
  mano, evitando que el modelo invente props o use nombres viejos).

Sobre **dónde vive el manifest**: lo ideal es derivarlo lo más posible de las
interfaces TypeScript que ya existen en cada `.tsx` (para no duplicar y no
desincronizar), complementado con metadatos que el tipo no captura (rangos,
etiquetas, si es color, etc.). Hay que decidir si se mantiene a mano, se genera
con un script de build que parsea los tipos, o un híbrido. Esa decisión es parte
de la implementación, pero el principio es: **una sola definición, consumida por
todos**.

**Paso 2 — Playground con formulario dinámico (schema-driven UI).**
Reescribir el panel del Playground para que lea el manifest del componente
seleccionado y **genere los inputs automáticamente**: un color picker para props
de color, un slider para números con rango, un dropdown para selects, un
textarea para texto largo, un toggle para booleanos. Resultado: APIRequestFlow
mostraría `method` (select GET/POST/...), `endpoint` (texto), `responseCode`
(número), y dejaría de mostrar `width`. Cada componente muestra SUS inputs reales.

**Paso 3 — Exponer como props lo que hoy está hardcodeado dentro de componentes.**
Caso APIRequestFlow: el cuerpo del request y de la response deben pasar a ser
props (con defaults sensatos) para que sean editables. Esto aplica a otros
componentes "hero" que tengan contenido incrustado. Es un trabajo de revisión
componente por componente, guiado por el manifest (si un componente tiene texto
de ejemplo quemado, es candidato a convertirlo en prop).

**Paso 4 — Validación y defaults centralizados.**
Con el manifest, el Playground puede inicializar props con los defaults reales
de cada componente (no con un objeto genérico) y validar entradas (que un color
sea hex válido, que un número esté en rango). Esto elimina el estado global
`useState` con campos inventados.

**Beneficio colateral grande:** una vez exista el manifest, construir un editor
visual de escenas para el usuario final (no solo admin) se vuelve factible,
porque ya tendrías la metadata para generar formularios de cualquier componente.

---

## 5. Problema: las animaciones no son responsivas / no se optimizan por pantalla

### 5.1 Síntoma
En `imagenes/apirequestflow.png` el componente se ve chico, descentrado hacia
abajo-izquierda y con mucho espacio vacío alrededor. No se adapta al formato.
En general, los componentes asumen un canvas fijo y no se reacomodan para
distintos aspect ratios (9:16, 1:1, 16:9, 4:5...).

### 5.2 Diagnóstico de causa raíz

**A) Dimensiones absolutas hardcodeadas en píxeles dentro de los componentes.**
APIRequestFlow es el ejemplo perfecto: las dos cajas miden `width: 300px` fijo,
la flecha `200px`, el `fontSize` base 24px, el `gap` 30px. En total el bloque
mide ~830px de ancho. En un canvas de 1080px de ancho eso "cabe", pero:
- En vertical (9:16) ese layout horizontal de 830px deja franjas enormes
  arriba y abajo (de ahí el "se ve chico con espacio vacío").
- En 1:1 o 16:9 las proporciones cambian y el bloque queda desbalanceado.
- El `fontSize: 24` es diminuto para un video móvil (el resto del sistema usa
  64-96 para texto); por eso el JSON del request casi no se lee.

**B) Layout horizontal en un mundo mayormente vertical.**
APIRequestFlow coloca cliente → flecha → respuesta en **fila**. Para 9:16
(el formato dominante de Reels/TikTok/Shorts) lo natural sería **apilar en
columna** (request arriba, flecha hacia abajo, response abajo). El componente no
tiene noción de orientación.

**C) Los componentes no reciben el tamaño del canvas.**
El `AnimaComposer` conoce `width`/`height` vía `useVideoConfig()`, pero **no se
los pasa a los componentes hijos** (solo les pasa `x`, `y`, `durationInFrames`,
`wordTimestamps`, `text`). Así que un componente no puede adaptar su tamaño al
canvas aunque quisiera: no sabe en qué lienzo está. Trabaja siempre con sus
píxeles fijos.

**D) El descentrado de la captura.**
El que se vea abajo-izquierda viene de la combinación de: el LLM eligió una
`x/y` para el centro del bloque, pero como el bloque mide 830px de ancho y se
ancla por su centro con `translate(-50%,-50%)`, cualquier `x` que no sea
exactamente el centro lo descoloca mucho (un error de posición se amplifica con
elementos anchos). Conecta con el problema #3: el solver no sabe el tamaño real,
así que no pudo corregir.

### 5.3 Estrategia de solución

**Paso 1 — Pasar el contexto de canvas a todos los componentes.**
`AnimaComposer` debe inyectar el tamaño del lienzo (ancho, alto, aspect ratio,
orientación) a cada componente, igual que ya inyecta `durationInFrames`. Sin
esa información, ningún componente puede ser responsivo. Es el habilitador de
todo lo demás de esta sección.

**Paso 2 — Dimensiones relativas en vez de absolutas.**
Reemplazar los px fijos por tamaños derivados del canvas: anchos como fracción
del ancho disponible, fontSize escalado a la resolución, gaps proporcionales.
La meta es que un mismo componente se vea bien sin reescribirlo para cada
formato. Donde haya un tamaño "de UI web" (como el `fontSize: 24` de
APIRequestFlow) hay que reescalarlo a la escala de video.

**Paso 3 — Layouts adaptativos por orientación.**
Componentes con disposición espacial (APIRequestFlow, comparativas, grids)
deben elegir fila vs columna según la orientación del canvas: columna en
vertical, fila en horizontal. Esto es lo que hará que APIRequestFlow llene bien
un 9:16 (apilado) y un 16:9 (en fila).

**Paso 4 — Auto-escalado de seguridad ("fit to safe area").**
Como red de seguridad, envolver componentes complejos en una lógica que mida su
tamaño natural y lo escale para que quepa dentro de la zona segura del canvas
sin desbordar ni quedar minúsculo. Es el equivalente del `fitText` pero para
componentes enteros, no solo texto.

**Paso 5 — Probar la matriz de formatos.**
Definir los aspect ratios soportados (ya están en `visual_spec.py`:
9:16, 4:5, 3:4, 1:1, 16:9) y verificar cada componente "hero" en cada uno. El
Playground (una vez tenga el manifest del problema #4) es el lugar ideal para
añadir un selector de aspect ratio y revisar responsividad visualmente.

---

## 6. Problemas transversales detectados (no estaban en tu lista, pero afectan la calidad)

Durante el análisis aparecieron tres defectos concretos visibles en tus
capturas que conviene resolver porque rompen la sensación de "profesional":

### 6.1 Contraste insuficiente / texto ilegible (ver `escena4.png`)
En esa escena el texto ("La ciencia confirma que nos controlan con ternura")
es **azul oscuro sobre fondo azul-violeta oscuro**: casi no se lee.
- **Causa:** el `textColor` lo elige libremente el LLM #1 (`visual_spec.py`) con
  una instrucción suave ("contrastante y vibrante"). No hay **ninguna validación
  de contraste** (WCAG/luminancia) en todo el pipeline (lo confirmé buscando:
  no existe lógica de contraste). Si el modelo elige mal, nada lo corrige.
- **Solución:** añadir un paso determinístico que calcule el contraste real
  entre `textColor` y `backgroundColor` y, si está por debajo de un umbral
  legible, ajuste automáticamente el color de texto (aclarar/oscurecer o forzar
  blanco/negro) o añada una sombra/halo de texto. Esto debe correr SIEMPRE,
  independientemente de lo que diga el LLM. Es barato y elimina una clase entera
  de escenas feas.

### 6.2 Uso indebido del efecto "scramble" (ver `escena1.png`)
El texto "¿SABIAS QUE TU PERRO TE MANIPU#&=0$ *^%!+~#" no es un bug de fuente:
es el componente `StyleScrambleText` a mitad de su animación, reemplazando
letras por caracteres tipo "hacker" (`#$%&@!?*+=^~01`) en fuente monoespaciada.
- **Causa:** el efecto scramble (pensado para estética tech/hacker) se está
  aplicando a contenido tierno (perros). Tonalmente no encaja y, congelado en un
  frame intermedio, parece texto roto/corrupto. El LLM lo eligió porque está en
  el catálogo sin una guía de "cuándo NO usarlo".
- **Solución:** (a) restringir en el prompt/estrategia cuándo es apropiado el
  scramble (solo moods tech/glitch, nunca contenido emocional/orgánico);
  (b) asegurar que el scramble resuelva a texto limpio bien antes del final de
  la escena (que no quede atrapado en estado ilegible); (c) considerar que para
  texto hablado normal el default debe ser un reveal limpio (fade/slide/karaoke),
  no scramble.

### 6.3 La fuente monoespaciada en mayúsculas para texto narrativo
Relacionado con lo anterior: `StyleScrambleText` fuerza `JetBrains Mono` +
`textTransform: uppercase`. Para una frase narrativa eso se ve técnico y
agresivo. Forma parte de la solución 6.2: el componente de texto por defecto
para narración debe usar la tipografía de marca (Inter/Inter Tight) en caja
normal, reservando mono/mayúsculas para contextos de código/tech.

---

## 7. Expansión del catálogo de animaciones (referencia: ReactVideoEditor / Remotion Templates)

### 7.1 Objetivo
Tomar como vara de calidad y de cobertura el catálogo público de
[reactvideoeditor.com/remotion-templates](https://www.reactvideoeditor.com/remotion-templates),
que organiza sus plantillas en estas categorías: **Charts & Data, Text, Content
Animation, Background, Cinematic, Transition, Logo & Branding, Intro & Outro,
Image & Media**. La meta es doble:
1. **Cubrir los huecos** del catálogo (categorías donde hoy tenemos poco o nada).
2. **Adoptar su nivel de pulido** (estas plantillas son la referencia "tipo
   Remotion / mejor" que mencionaste en el problema #1).

Importante: AnimaFlow **ya tiene 112 componentes** en `registry.ts`, así que esto
NO es empezar de cero. Es (a) llenar categorías débiles y (b) subir la calidad de
lo que ya existe usando estas plantillas como benchmark. Conecta directamente con
la **Fase 4** (calidad de animación) y la **Fase 1** (cada componente nuevo nace
ya con su entrada en el manifest).

### 7.2 Análisis de cobertura (qué tenemos vs. qué falta)

La siguiente tabla cruza cada categoría de referencia con lo que ya existe en
`frontend/src/remotion/components/`, para priorizar dónde invertir.

| Categoría | Qué YA tenemos (ejemplos en el repo) | Estado | Huecos a crear |
|---|---|---|---|
| **Charts & Data** | `BarChartReveal`/`StyleBarChart`, `PieChartReveal`/`StylePieChart`, `StyleLineChart`, `FunnelChart`, `RadarSpiderChart`, `HorizontalBarRace`, `CounterNumber`/`StyleAnimateNumber`, `PercentageRing`, `StockCandlestick`, `TrendLine` | **Fuerte** | Donut/ring con métrica central, Area chart con relleno degradado, Comparison chart lado a lado |
| **Text** | `Typewriter`, `TextReveal`, `SplitText`, `TextSwap`, `WordHighlight`, `HighlightText`, `GlitchTitle`, `StyleScrambleText`, `StrikethroughText`, `UnderlineReveal`, `StyleTextBlock` | **Fuerte** | Popping scale text (spring pop), Bubble pop text, Pulsing text, Bounce text — variantes de *energía* que hoy no existen |
| **Content Animation** | `ParticleField`, `AudioSpectrumBars`/`SoundWaveCircle`/`WaveformVisualizer`, `FeatureChecklist`, `NotificationToast`, `NetworkNodes`, `RippleEffect` | **Media** | Liquid wave, Matrix rain, Geometric patterns, Particle explosion (burst), Animated list genérica |
| **Background** | `KineticBackground`, `FloatingBlobs`, `AbstractWave`, `GradientOverlay`, `RaysOfLight`, `GridPerspective` | **Media** | Starfield, Bokeh circles, Noise grain (textura film), Grid pulse, Gradient shift animado |
| **Cinematic** | `GlobalVFX`, `LightLeakTransition`, `GlitchTransition`, `ZoomBlurTransition` | **Débil** | Ken Burns (zoom+pan foto), Camera shake, Film burn, Vignette pulse, Spotlight reveal, Letterbox reveal, Parallax pan, Whip pan, Zoom pulse |
| **Transition** | `WipeTransition`, `GlitchTransition`, `ZoomBlurTransition`, `LightLeakTransition`, `MaskedReveal` | **Media** | Pixel transition, Card flip, Clock wipe, Blinds, Morph, Push, Iris, Zoom through, Cross dissolve, Fade through black |
| **Logo & Branding** | — (no hay una categoría dedicada) | **Inexistente** | TODA la categoría: Logo Fade/Spin/Glitch/Bounce/Stroke-draw/Scale-rotate/Split/Typewriter/Blur reveal |
| **Intro & Outro** | `LowerThird`, `QuoteBlock`, `YouTubeEndScreen`, `CountdownTimer`, `SubscribeButton`, `FeatureUnlock` | **Media** | Cinematic title intro, End card, Chapter title, Credits roll, Title split, Countdown intro pulido |
| **Image & Media** | `MediaFrame`, `PhoneMockup`, `BrowserWindow`, `SplitScreenGrid`, `InstagramPost`/`TweetCard`/`TikTokOverlay` | **Media** | Ken Burns image, Gallery grid, Polaroid frame, Image carousel, Picture-in-picture, Comparison slider, Masonry, Photo stack, Progress steps |

**Lecturas del análisis:**
- **Charts y Text están sólidos** — aquí el trabajo es de *pulido* (Fase 4), no de
  creación. Faltan pocas variantes (donut, area, comparison; y variantes de texto
  con más "energía" como pop/bounce/pulse).
- **Logo & Branding es el hueco grande**: no existe ninguna animación de logo.
  Es una categoría de alto valor comercial (intros de marca, outros) y vale la
  pena como bloque propio.
- **Cinematic es el segundo hueco**: Ken Burns, camera shake, film burn, vignette,
  spotlight y letterbox son justo los efectos que dan sensación "profesional /
  de cine" que pediste, y casi no existen.
- **Image & Media** está a medias: tenemos mockups, pero faltan las galerías y
  los tratamientos de foto (Ken Burns, polaroid, carrusel, comparador).

### 7.3 Estrategia de implementación

**Paso 1 — No clonar, adaptar al sistema AnimaFlow.**
Cada plantilla nueva debe nacer respetando los contratos que ya existen:
- Recibir `x`, `y`, `delay`, `durationInFrames` y autocentrarse con
  `translate(-50%,-50%)` (contrato del solver, sección 3).
- Ser **determinista** (función pura del `frame`, nada de `Math.random()` —
  igual que se corrigió en `StyleScrambleText`).
- Ser **responsiva** desde el día 1 (recibir el contexto de canvas de la
  Fase 2; nada de px fijos como el error de APIRequestFlow).
- Consumir los **design tokens** y **presets de movimiento** (Fase 4) para que
  se vean coherentes con el resto, no como piezas sueltas.
- Registrarse en `registry.ts` **y** en el **manifest** (Fase 1) para que el
  Playground genere sus inputs automáticamente y el LLM pueda elegirlas.

**Paso 2 — Tratar Transitions y Cinematic como una capa, no como layers sueltos.**
Las transiciones (pixel, iris, clock wipe, fade-through-black...) y varios efectos
cinematic (camera shake, vignette, film grain) NO son un "elemento más" de la
escena: operan **sobre toda la escena o entre dos escenas**. El sistema ya tiene
un mecanismo de crossfade de fondo en `AnimaComposer` y wrappers de transición.
Conviene formalizar una **capa de transición/efecto de escena** separada de la
capa de contenido, para aplicarlas sin ensuciar la lógica de layers. Esto también
mejora el problema de "transiciones entre escenas" que se ve flojo en tus
capturas de transición (`escena1-transicion*.png`, `escen3parte.png`).

**Paso 3 — Crear la categoría Logo & Branding como bloque nuevo.**
Definir un componente base de "logo reveal" parametrizable (recibe un
SVG/imagen/texto de marca) con variantes de animación: fade, spin, glitch,
bounce-drop, stroke-draw (dibujado de trazo), scale-rotate, split, typewriter,
blur. El stroke-draw (animar el `stroke-dashoffset` de un SVG) es el más
distintivo y el que más "profesional" se ve. Es una categoría autocontenida y de
alto impacto para usuarios que hacen contenido de marca.

**Paso 4 — Añadir taxonomía de categorías al catálogo y al admin.**
Hoy `registry.ts` es una lista plana de 112 nombres. Conviene etiquetar cada
componente con su **categoría** (Charts, Text, Background, Cinematic, etc.).
Beneficios: (a) el Playground/galería puede filtrar por categoría igual que la
web de referencia; (b) el LLM puede recibir los componentes **agrupados por rol**
(ya lo hace parcialmente, "organizados por rol") de forma más fiable; (c) mide el
avance de cobertura por categoría. Esta taxonomía encaja de forma natural dentro
del **manifest** de la Fase 1 (un campo `category` por componente).

**Paso 5 — Priorizar por valor y por hueco.**
No crear las ~40 plantillas faltantes de golpe. Orden sugerido dentro de la
expansión:
1. **Cinematic esenciales** (Ken Burns, camera shake, vignette, film grain,
   spotlight) — máximo retorno en "sensación profesional".
2. **Logo & Branding** (bloque base + 4-5 variantes) — categoría inexistente y
   muy demandada.
3. **Transiciones clave** (pixel, iris, clock wipe, push, fade-through-black) —
   mejoran el pegado entre escenas, que hoy se ve flojo.
4. **Image & Media** (gallery grid, polaroid, carrusel, comparison slider).
5. **Variantes de Text/Charts** que faltan (pop/bounce/pulse text; donut, area,
   comparison chart) — son los más rápidos porque ya hay base.

### 7.4 Cómo se conecta con el resto del plan
- Cada componente nuevo **depende de la Fase 1** (manifest) para ser editable y
  seleccionable, y de la **Fase 2** (canvas context) para ser responsivo.
- La **calidad** de cada componente nuevo se rige por la **Fase 4** (tokens +
  presets + staging + idle motion). Las plantillas de ReactVideoEditor son el
  *benchmark visual* contra el que comparar.
- Por eso la expansión del catálogo se programa como **Fase 5**, después de tener
  la infraestructura — si no, crearíamos 40 componentes nuevos con los mismos
  defectos (no responsivos, no editables, sin coherencia) que estamos arreglando.

---

## 8. Roadmap sugerido (orden de ataque)

El orden está pensado para maximizar impacto temprano y porque algunas piezas
habilitan a otras.

**Fase 0a — Correcciones de infraestructura/pipeline (URGENTE, ver Sección 10):**
Esto va PRIMERO porque son bugs que degradan el sistema entero, no decisiones de
diseño. Sin esto, mejorar la parte visual da rendimientos pobres.
0. **Arreglar la API key de embeddings de Gemini** (10.1). Hoy está inválida y el
   selector de componentes colapsa a los mismos ~5 componentes en cada escena:
   es la causa #1 de que todos los videos se vean iguales y pobres.
1. **Unificar las listas de componentes válidos** (10.2): hoy el enum de Pydantic
   del backend rechaza componentes que sí existen en el frontend (`WordHighlight`).
   Sincronizar las cuatro listas (parche puente hasta el manifest de la Fase 1).
2. **Robustez de parseo del LLM** (10.3): props basura masivas, valores
   malformados (`"size": ",180"`), JSON roto por los `thought_signature` de
   Gemini 3.x. Endurecer el parseo/reparación y la validación por componente.
3. **Timing adaptativo para escenas ultracortas** (10.6): que entry+exit nunca
   excedan la duración real de la escena.

**Fase 0b — Arreglos visuales rápidos de alto impacto (días, no semanas):**
4. Guardia de contraste automático (6.1). Elimina escenas ilegibles ya.
5. Resolver la contradicción del prompt sobre tamaño de texto (2.3 paso 2) y
   bajar el techo del auto-fit (2.3 paso 3). Baja el "texto protagonista".
6. Restringir el uso de scramble y arreglar su fuente por defecto (6.2, 6.3).
7. Deduplicar elementos repetidos (icono en grupo + icono suelto, ver 10.5).

**Fase 1 — El manifest de componentes (la palanca central):**
8. Crear el manifest (4.3 paso 1).
9. Playground dinámico que lo consume (4.3 paso 2) + exponer props hardcodeadas
   (4.3 paso 3). Resuelve el problema #4 por completo.
10. Conectar `sanitizeProps`, el enum de Pydantic del backend Y la generación de
    prompt al manifest (deja de haber **cuatro** fuentes de verdad
    desincronizadas — convierte el parche de la Fase 0a items 1-2 en definitivo).

**Fase 2 — Responsividad:**
11. Inyectar contexto de canvas a los componentes (5.3 paso 1).
12. Reescribir los componentes "hero" (empezando por APIRequestFlow) a
    dimensiones relativas y layout adaptativo por orientación (5.3 pasos 2-3).
13. Selector de aspect ratio en el Playground para validar (5.3 paso 5).

**Fase 3 — Posicionamiento robusto:**
14. Estimación de bounding boxes en el solver (3.3 paso 1).
15. Detección/resolución de colisiones + safe zones duras (3.3 pasos 2 y 4).
16. Sesgo hacia layout por flujo y consolidación de los dos solvers (3.3 pasos 3 y 5).

**Fase 4 — Calidad de animación (el pulido fino):**
17. Librería de presets de movimiento + tokens de diseño (1.3 pasos 1 y 4).
18. Staging interno e idle motion (1.3 pasos 2 y 3).
19. Auditoría componente por componente priorizada (1.3 paso 5).
19b. **Cablear `exitDelay` en `AnimatedWrapper`** (ver 10.9). Hoy el renderer
    ignora `exitDelay`: la salida SIEMPRE termina en el corte de escena
    (`exitStart = durationInFrames − exitDuration`), así que no se puede controlar
    *cuándo empieza* la salida. Para timing fino (escalonar salidas, salidas
    tempranas) hay que añadir `exitDelay` como prop y consumirlo en
    `AnimatedWrapper.tsx` + pasarlo desde `AnimaComposer.tsx`. Mientras tanto, el
    único control de salida es `exitDuration` (frames).

**Fase 5 — Expansión del catálogo (referencia ReactVideoEditor / sección 7):**
20. Taxonomía de categorías en el manifest/registry (7.3 paso 4).
21. Cinematic esenciales: Ken Burns, camera shake, vignette, film grain,
    spotlight (7.3 paso 5, prioridad 1).
22. Categoría Logo & Branding desde cero (7.3 paso 3).
23. Transiciones clave como capa de escena (7.3 paso 2) + Image & Media.
24. Variantes faltantes de Text y Charts (las más rápidas, sobre base existente).
25. **Re-embed de iconos (43k)** con `reembed_icons.py` — una sola vez (datos
    estáticos). Es el ítem más diferible: puede hacerse aquí al final o antes si
    se quiere ver selección de iconos realista durante el desarrollo (ver 10.1).
    Nota: los componentes NO necesitan re-embed (ya están en Gemini-768); solo
    re-sembrar/re-embedear si el manifest cambia sus descripciones.

**Por qué este orden:** Fase 0 son parches baratos que el usuario nota de
inmediato. La Fase 1 (manifest) es la inversión de infraestructura que abarata
TODO lo demás (responsividad, validación, editor, prompt). Las fases 2-4 son
progresivamente más profundas y se apoyan en las anteriores. La Fase 5 (catálogo
nuevo) va al final **a propósito**: crear ~40 componentes nuevos solo vale la
pena cuando ya nacen responsivos (Fase 2), editables (Fase 1) y con el lenguaje
de movimiento pulido (Fase 4); hacerlo antes sería multiplicar los defectos
actuales por 40.

---

## 9. Resumen de archivos clave por problema

| Problema | Archivos principales involucrados |
|---|---|
| #1 Calidad animación | `frontend/src/remotion/AnimatedWrapper.tsx`, los 112 `frontend/src/remotion/components/*.tsx`, (nuevo) módulo de tokens/presets |
| #2 Texto protagonista | `frontend/src/remotion/components/StyleTextBlock.tsx`, `backend/app/modules/llm/component_strategy.py` (prompt y auto-fit ~1636), `frontend/src/remotion/utils/fitText.ts` |
| #3 Posicionamiento | `frontend/src/remotion/utils/layoutSolver.ts`, `backend/app/services/layout_solver.py`, `frontend/src/remotion/composer/AnimaComposer.tsx` |
| #4 Inputs admin | `frontend/src/pages/admin/AnimationPlayground.tsx`, `frontend/src/remotion/registry.ts`, `frontend/src/remotion/utils/sanitizeProps.ts`, (nuevo) manifest |
| #5 Responsividad | `frontend/src/remotion/composer/AnimaComposer.tsx`, componentes con px fijos (`APIRequestFlow.tsx` y similares) |
| #6.1 Contraste | `backend/app/modules/llm/visual_spec.py`, (nuevo) paso de validación de contraste |
| #6.2/6.3 Scramble/fuente | `frontend/src/remotion/components/StyleScrambleText.tsx`, prompt en `component_strategy.py` |
| #7 Expansión catálogo | `frontend/src/remotion/registry.ts` (+ taxonomía/categoría), `frontend/src/remotion/components/*.tsx` (nuevos), (nuevo) capa de transición/efecto de escena en `AnimaComposer.tsx`, manifest (Fase 1) |
| #10 Pipeline/infra | `backend/app/modules/llm/resolver.py` y config de API keys, enum Pydantic en `component_strategy.py`/`spec_validator.py`, parseo LLM en `client.py`, embeddings/vector search, `sanitizeProps.ts` |

---

## 10. Validación con un render real (log de producción del video de perros)

Esta sección documenta lo que reveló el log de una generación real (3 escenas,
~13s, tema "perros"). El log **confirma** los problemas de diseño ya descritos y,
sobre todo, **destapa fallos de infraestructura/pipeline** que no se ven en el
código en reposo pero que degradan severamente la calidad. Son la razón por la
que se añadió la **Fase 0a** al roadmap: si no se arreglan estos, el trabajo
visual de las demás fases rinde mucho menos.

### 10.1 [CRÍTICO] El embedding lee la API key del `.env`, no de la base de datos → catálogo reducido a ~8 componentes fijos
En el log, en CADA escena aparece:
`Failed to generate Gemini embedding: 400 ... API key not valid` seguido de
`No embedding available ... Using CURATED fallback set` y
`Vector search returned 8 relevant components: ['KineticBackground',
'ParticleField', 'IconifyIcon', 'StyleBadge', 'StyleButton']`.
- **Qué significa:** la selección inteligente de componentes (RAG por similitud
  semántica entre el texto de la escena y los 112 componentes) **no funciona**.
  Cae a un set "curado" fijo. Resultado: el Director de Escena (LLM) solo ve
  ~5 componentes, **los mismos en todas las escenas de todos los videos**.
- **Impacto:** es probablemente la causa #1 de que "todo se vea igual y básico".
  Tienes 112 componentes pero el sistema en la práctica usa 5
  (fondo + icono + texto + badge/botón). Los problemas #1 (animaciones pobres) y
  #2 (texto protagonista) se amplifican: si el único recurso visual disponible es
  un icono, el texto SIEMPRE termina siendo el protagonista por falta de
  alternativas. Lo mismo pasa con la búsqueda de iconos
  (`Failed to generate icon search embedding` → `Returning defaults`, solo 1 icono).
- **CAUSA RAÍZ EXACTA (confirmada en código):** hay **dos fuentes de API key
  distintas** en el pipeline y los embeddings usan la equivocada.
  - Las llamadas LLM normales (guion, visuales, compositor) resuelven la key con
    `resolve_llm_credentials(user_id)`, que la lee de la **base de datos** (tabla
    `ApiKey` del usuario). Por eso en el log el compositor SÍ funcionó.
  - Pero `embedding.py::generate_embedding` hace
    `api_key = api_key or os.getenv("GEMINI_API_KEY")` y `get_relevant_components`
    lo llama **sin pasar key ni `user_id`** → siempre usa la key del **`.env`**.
    Lo mismo ocurre en `iconify_search.py` (búsqueda de iconos) y en los scripts
    `reembed_components.py` / `reembed_icons.py`.
  - Resultado: la key del usuario está bien (en la DB), pero la `GEMINI_API_KEY`
    del `.env` está vacía/inválida → **solo** fallan los embeddings y la búsqueda
    de iconos, no el resto. Justo lo observado en el log.
- **MATIZ IMPORTANTE — separar componentes de iconos:**
  - **Componentes (112):** ya están embebidos correctamente en Gemini-768. Por lo
    tanto, **arreglar la key es suficiente** para que el retrieval de componentes
    vuelva a funcionar al instante; **no requieren re-embed.** (En el log fallaron
    no por sus vectores, sino porque el *query embedding* por escena fallaba con la
    key inválida → fallback a 8.)
  - **Iconos (~43.000, tabla `iconify_icons`):** estos SÍ siguen en el modelo viejo
    `all-mpnet-base-v2`, mientras la query usa Gemini. Comparar mpnet (guardado)
    contra Gemini (query) es **ruido puro** — el propio `reembed_icons.py` y el
    ADR-010 (Fase A.3) lo documentan. Por eso, aun con la key arreglada, la
    búsqueda de iconos seguirá devolviendo defaults hasta correr `reembed_icons.py`.
  - Verificación rápida recomendada: confirmar en la DB que los componentes tienen
    embeddings de 768 dims (si no, sí habría que re-embedearlos también).
- **Modelo de embedding:** el código usa `gemini-embedding-2` con
  `output_dimensionality=768`. El SDK reconoce `gemini-embedding-2-preview`; el
  modelo GA estable es `gemini-embedding-001` (también soporta `output_dimensionality`).
  Verificar en Google AI Studio qué ID está habilitado para la key. **Regla de oro:
  el MISMO modelo + mismas dimensiones para sembrar (reembed) y para consultar; no
  mezclar nunca.**
- **Acción (Fase 0a, item 0):**
  1. Arreglo inmediato: poner una `GEMINI_API_KEY` válida en `.env` (los embeddings
     y el fallback admin/founder ya leen de ahí).
  2. Arreglo correcto: pasar la credencial resuelta (DB) hacia
     `get_relevant_components` → `generate_embedding` (y a `iconify_search`), para
     que usen la misma key que el resto y funcionen por-usuario.
  3. Re-embed SOLO de iconos (`reembed_icons.py`), una vez. Los componentes NO lo
     necesitan (ver matiz arriba). Este es el ítem **más aplazable** del plan:
     ver "Sobre el timing del re-embed de iconos" abajo.
  4. Mientras tanto, mejorar el fallback "curado" para que varíe por tipo de escena
     en vez de devolver siempre los mismos 8.

> **Sobre el timing del re-embed de iconos (43k) — se puede dejar para el final:**
> Como los componentes se arreglan con solo la key (ya están en Gemini-768), NO
> hay riesgo de "desarrollar a ciegas": el RAG de componentes funciona desde la
> Fase 0a. El re-embed de los ~43.000 iconos es independiente, es **datos
> estáticos** (los nombres de Iconify no cambian al expandir tu catálogo, así que
> se corre **una sola vez**, sin pasada final que repetir) y solo afecta la
> variedad de iconos. Por eso es el ítem **más diferible**: el único costo de
> posponerlo es que durante el desarrollo la búsqueda de iconos devuelve defaults.
> Si la calidad de iconos no es tu foco inmediato, déjalo para el final; si quieres
> ver escenas realistas antes, córrelo temprano (es un batch reanudable de una vez).

### 10.2 [CRÍTICO] Listas de componentes válidos desincronizadas (4 fuentes)
El log muestra: `Pydantic parse failed: ... layers.3.componentName Input should be
'APIRequestFlow', ... 'VersusScreen', 'WaveformVisualizer', ... [input_value='WordHighlight']`.
- **Qué significa:** `WordHighlight` existe en el registry del frontend y tiene
  whitelist en `sanitizeProps`, pero **no está en el enum de Pydantic** del
  backend que valida el JSON del LLM. El enum tampoco incluye `KeywordPop`. Como
  el LLM eligió `WordHighlight`, la validación falló y se **regeneró toda la
  escena** (reintento 1/3), gastando una llamada y, en la regeneración, el modelo
  lo reemplazó por `StyleTextBlock` (otra vez texto plano en vez de un efecto
  de palabra resaltada más rico).
- **Impacto:** componentes válidos quedan inaccesibles; se desperdician llamadas;
  se degradan escenas a su versión más aburrida. Y demuestra en vivo el problema
  de las "4 fuentes de verdad" descrito en la Sección 0.
- **Acción:** sincronizar el enum del backend con el registry (parche inmediato)
  y, definitivamente, derivar las 4 listas del manifest único (**Fase 1, item 10**).

### 10.3 [ALTO] Alucinación masiva de props y valores malformados
El log está lleno de: `Removed 23 garbage props from WordHighlight`,
`Removed 26 garbage props from StyleTextBlock`, con props como `showGrid`,
`showDots`, `barHeight`, `explodeSlice`, `visibleItems`, `decimals`, `maxValue`...
(props que pertenecen a CHARTS, no a un bloque de texto). Además:
`Removed invalid size value: ',180'` y valores tipo `"size": "160"` (string en
vez de número, y a veces partido raro en el JSON).
- **Qué significa:** el LLM no sabe qué props acepta cada componente, así que
  mezcla props de todos. El sanitizer los limpia (band-aid), pero (a) cuando un
  valor crítico llega malformado como `size: ",180"`, se **descarta** y el icono
  cae a su tamaño por defecto (perdiendo la intención de diseño), y (b) se gastan
  tokens y fiabilidad en basura.
- **Causa raíz:** el prompt describe las props como un texto plano global, sin un
  esquema por componente. Es exactamente lo que resuelve el manifest.
- **Causa raíz SECUNDARIA (anti-patrón de diseño):** los propios componentes sufren
  **proliferación de props booleanas** (`showBadge`, `showLabel`, `showGrid`,
  `showDots`, `showValues`, `showScrollbar`, `showRipple`, `showPercentages`,
  `fillArea`, `loop`, `muted`, `deletable`...). La skill `composition-patterns`
  (`architecture-avoid-boolean-props`) marca esto como anti-patrón: superficies de
  API enormes y ambiguas que (a) el LLM mezcla entre componentes y (b) son difíciles
  de mantener. La auditoría de la Fase 4 debe **reducir estas booleanas** a
  variantes explícitas / composición, achicando la superficie que el modelo puede
  alucinar.
- **Acción:** schema por componente en la salida estructurada del LLM + parseo
  robusto que repare/valide tipos numéricos. **Fase 0a item 2 (parche) → Fase 1.**

### 10.4 [MEDIO] `thought_signature` de Gemini 3.x ensucia el parseo del JSON
Decenas de: `Warning: there are non-text parts in the response:
['thought_signature'], returning concatenated text result from text parts`.
- **Qué significa:** el modelo `gemini-3.1-flash-lite` devuelve partes de
  "pensamiento" además del texto; el cliente concatena solo las partes de texto.
  Esto coincide con los JSON partidos/malformados que se ven en el log
  (ej: `"size":\n"160"`). El manejo actual de la respuesta del modelo de
  "thinking" es frágil.
- **Acción:** actualizar el manejo de la respuesta (usar el accessor correcto de
  parts / pedir salida estructurada estricta) para que el "thinking" no contamine
  el JSON. Revisar en `client.py`. **Fase 0a item 2.**

### 10.5 [MEDIO] Elementos duplicados (icono en grupo + icono suelto) y grupos fantasma
En la escena 1 el LLM generó un `group` con `items: [{icon: 'mdi:dog-side'}]`
**y además** un `IconifyIcon` suelto con el mismo `mdi:dog-side`. Igual en la
escena 3 (heart-pulse en grupo + heart suelto). Además el `group` traía una
estructura inventada (`items`, `animation: 'bouncy'`, `labelPosition`,
`iconPosition`) que no corresponde a ningún esquema real; el sistema convierte
`items`→`children` pero esos children no tienen `type`/`componentName`, así que
probablemente **no renderizan nada** (un grupo fantasma) mientras el icono
aparece duplicado/encimado.
- **Impacto:** iconos repetidos o superpuestos, capas vacías, composición sucia.
- **Acción:** (a) deduplicar elementos idénticos en post-proceso; (b) prohibir/
  normalizar la estructura `group + items` inventada; (c) el manifest evita que
  el modelo invente esa forma. **Fase 0a/0b.**

### 10.6 [MEDIO] Timing no adaptado a escenas ultracortas
La escena 3 dura **1.73s** (6 palabras, ~52 frames a 30fps), pero el sistema
añade `entry` (por defecto ~30 frames) + `exit` (~30 frames) = ~60 frames de
animación en una escena de 52. Entrada y salida se solapan o el elemento nunca
llega a estar quieto. Además el modelo puso `duration: 0.5` (un valor sin
sentido que se ignora).
- **Impacto:** en videos cortos (los que mencionaste), los elementos "entran y ya
  se están yendo": se siente apresurado y poco profesional.
- **Acción:** calcular `entryDuration`/`exitDuration` como fracción de la
  duración REAL de la escena, con un mínimo de tiempo "asentado" visible.
  **Fase 0a item 3.** (Conecta con el timing de la Sección 1.)

### 10.7 [BAJO] Inconsistencia de nombres de props (`color` vs `textColor`)
La escena 2 generó `StyleTextBlock` con `"textColor": "#ffd9b3"`, pero
`StyleTextBlock` lee la prop `color`, no `textColor` (ver su interfaz). Resultado:
el color cálido pretendido se descarta y el texto usa el color por defecto del
variant. Es un caso pequeño pero ilustra por qué el manifest (nombres canónicos
de props por componente) elimina esta clase de errores silenciosos.

### 10.8 Resumen: lo que el log cambia en el plan
- Añade la **Fase 0a** (infra/pipeline) ANTES de todo lo visual.
- Eleva la prioridad y urgencia del **manifest** (Fase 1): no es solo para el
  Playground; es lo que arregla la alucinación de props (10.3), la
  desincronización (10.2) y los nombres de props (10.7).
- Refuerza que el problema "texto protagonista" (#2) tiene una causa oculta
  adicional: con solo ~8 componentes disponibles (10.1), el texto gana por
  descarte. Arreglar embeddings es, en parte, arreglar #2.

### 10.9 [contrato] Unidades de timing y `exitDelay` no cableado (descubierto al revisar Fase 0a)
Al revisar la implementación de timing salió a la luz el contrato real del
renderer (`frontend/src/remotion/AnimatedWrapper.tsx`), que hay que respetar en
cualquier post-proceso o componente futuro:
- **`entryDelay` está en SEGUNDOS** (AnimatedWrapper hace `delay * fps`). NO
  convertir a frames en el backend (hacerlo causaba que el elemento apareciera
  ~30× más tarde — regresión detectada y corregida en la revisión de Fase 0a).
- **`entryDuration` / `exitDuration` están en FRAMES.**
- **`exitDelay` NO lo usa el renderer.** La salida siempre TERMINA en el corte de
  la escena (`exitStart = durationInFrames − exitDuration`); `AnimaComposer` ni
  siquiera se lo pasa a `AnimatedWrapper`. Por tanto cualquier lógica que ajuste
  `exitDelay` es inerte. El único control de salida disponible hoy es
  `exitDuration`. → Para control fino del INICIO de la salida, ver Fase 4, item 19b.
- **Ambigüedad pre-existente a vigilar:** el prompt pide al LLM las duraciones en
  *segundos* (ej. `exitDuration: 0.5`) mientras el renderer las trata como
  *frames*. Conviene unificar (decidir una unidad canónica y alinear prompt +
  post-proceso + renderer) como parte de la Fase 4.

### 10.10 Hallazgos del render de prueba (post-Fase 0a/0b) — bugs visuales pendientes
Render real de validación tras 0a+0b (video de perros, 3 escenas). **Las Fases 0a
y 0b se confirmaron funcionando** en el log: RAG devuelve 15 componentes variados
por escena (no 8 fijos), 5 iconos relevantes, `WordHighlight` ya no se rechaza,
garbage props solo se limpian en componentes de texto, validación de contraste
limpia. La escena 1 quedó decente (texto legible, icono, centrado). Pero las
escenas 2 y 3 mostraron defectos **visuales** que pertenecen a fases posteriores.
Se registran aquí para no perderlos (NO se arreglan en 0a/0b; van en su fase):

- **[Fase 4 — bug de componente] `WordHighlight` se renderiza roto:** la palabra
  resaltada sale más grande y **encima** del texto atenuado (superposición
  ilegible). El componente estaba "dormido" (lo bloqueaba el enum) y al usarse
  por fin afloran sus bugs. Auditar/arreglar en la auditoría de componentes.
- **[Fase 4 — bug de componente] Alineación de texto:** `Typewriter` (y a vigilar
  `StyleTextBlock`) alinea el texto a la **izquierda** dentro de su caja centrada
  → el texto se ve corrido a la izquierda en vez de centrado. Revisar `textAlign`/
  `width` del componente.
- **[Fase 3 — posicionamiento] Colisiones de capas:** fondos/adornos quedan
  **encima o detrás chocando** con el texto (ej. `SoundWaveCircle` y `NetworkNodes`
  superpuestos al texto; adorno sobre una palabra). Falta z-order coherente +
  detección de colisiones (bounding boxes).
- **[Fase 3 / prompt] CTA duplicado:** "¡Sígueme!" apareció a la vez en el texto
  hablado y en un `StyleBadge` aparte → redundante. Deduplicar CTA / guía de prompt.
- **[Fase 4 — contraste] Contraste del texto secundario:** la guardia de contraste
  revisa el color principal, pero las **palabras atenuadas** de `WordHighlight`
  (amarillo oscuro sobre verde oscuro) quedan poco legibles. Extender el check al
  color atenuado/secundario.
- **[Fase 5 / prompt] Elección de iconos floja:** `tabler:heart-cog` (corazón con
  engranaje) para un mensaje emocional. Mejor curaduría semántica de iconos.

Conclusión: el estado es **el esperado** tras 0a/0b (correctitud + wins rápidos).
El salto de calidad visual viene en Fases 2 (responsividad), 3 (posicionamiento)
y 4 (calidad de animación + auditoría de componentes), que es donde estos ítems
se resuelven.

---

## 11. Estrategia de selección de componentes y economía de tokens

Esta sección responde una duda de diseño importante: **¿cómo se evita mandarle al
LLM los 112 componentes (mañana miles) en cada escena, sin disparar el consumo de
tokens?** La conclusión clave es que **la arquitectura para esto YA EXISTE y es la
correcta**; solo está rota por el bug de embeddings (10.1).

### 11.1 Cómo funciona hoy (RAG con shortlist, NO se manda todo)
El flujo real por escena (`backend/app/services/embedding.py` →
`component_strategy.py`, `get_relevant_components(..., top_k=15)`):

1. **Embeddings precalculados una sola vez.** Cada componente tiene su descripción,
   rol, categoría y `props_schema` guardados en la tabla `ComponentModel` de la
   base de datos, junto con su vector de embedding (columna `embedding`, estilo
   pgvector). Esto se calcula **al sembrar el catálogo**, no por video.
2. **Una sola llamada de embedding barata por escena:** se vectoriza únicamente el
   *texto de la escena + media_query* (`generate_embedding(query_text)`).
3. **Recuperación local (sin LLM):** se calcula similitud coseno en Python entre la
   query y los componentes, y se eligen los **top 15**, pero con **cuotas de
   diversidad por rol** (background:2, text:3, ui:4, decorative:3, dataviz:2,
   social:1) para que la shortlist sea balanceada, no 15 textos.
4. **Solo esos ~15 entran al prompt** del compositor (nombre + rol + categoría +
   descripción + props). Ese es el único costo en tokens ligado al catálogo.

Es decir: **el sistema ya manda ~15 componentes, no 112.** Lo que se vio en el log
(siempre los mismos ~8) es exclusivamente el **fallback curado fijo** que se activa
cuando el embedding falla (key inválida). Con la key arreglada, el RAG vuelve a
entregar 15 componentes *relevantes y variados* por escena.

### 11.2 Por qué esto escala a miles de componentes sin subir el costo
**El costo de tokens por escena NO depende del tamaño del catálogo.** Con 112 o con
10.000 componentes, siempre se manda `top_k` (≈15) al LLM, porque el RAG filtra
ANTES de llamar al modelo. Lo único que crece con miles es:
- La base de datos (trivial).
- El cálculo de similitud local. Si con miles se volviera lento, la solución es un
  **índice ANN de pgvector (HNSW/IVFFlat)** — optimización de base de datos que
  **no afecta el costo del LLM**.

### 11.3 ¿Cuántos componentes conviene mandar?
- **Punto dulce: 12–18** (hoy 15). Suficiente variedad con la diversidad por rol,
  costo bajo (~750–1.500 tokens para las 15 descripciones).
- **Mandar 100 con descripción: no.** Más opciones = más tokens y, peor, el modelo
  elige peor (se satura). No aporta calidad.
- **Un modelo "tonto" que lea todo el catálogo: no.** Es justo lo que se quiere
  evitar: meter miles de componentes como input en cada escena = consumo masivo.
  RAG (embeddings + similitud local) es **más barato y más preciso** que eso.
- **Determinismo:** la similitud coseno ya es determinista (misma query + misma DB
  → mismo resultado). No hay azar; el único azar era el fallback roto. Si se quiere
  aún más control, `get_relevant_components` ya acepta `category_filter`, lo que
  permite un **prefiltro determinista por categoría/rol** y luego embeddings dentro
  de esa categoría (enfoque híbrido).

### 11.4 Dónde está el gasto real de tokens (lo que SÍ conviene recortar)
El número de componentes apenas mueve la aguja. Lo caro o desperdiciado hoy es:
1. **El prompt estático gigante** del compositor (`component_strategy.py` arma un
   prompt enorme: todas las reglas + la referencia completa del "Style System" +
   ejemplos). Es costo fijo por escena y probablemente varias veces mayor que la
   lista de 15 componentes. **Recortarlo y/o usar prompt caching** (cachear la
   parte estática del prompt) es el mayor ahorro disponible.
2. **Regeneraciones por listas desincronizadas** (el rechazo de `WordHighlight`,
   10.2): cada rechazo es **otra llamada completa** al compositor (hasta 3
   intentos). Sincronizar listas elimina ese 2x–3x de gasto.
3. **Reparseos por `thought_signature`** (10.4) y props basura (10.3) que obligan a
   limpiar/reintentar.

### 11.5 La 5ª fuente de verdad: la base de datos
Importante para el **manifest** (Fase 1): la metadata de componentes
(`description`, `role`, `category`, `props_schema`, `embedding`) vive **también en
la tabla `ComponentModel`**. Esto suma una **quinta** fuente de verdad a las cuatro
de la Sección 0 (interfaz TS, `sanitizeProps`, prompt, enum Pydantic). El manifest
debe ser la fuente única desde la cual se **siembra la DB** (descripciones y
`props_schema`), se genera el enum, se construye el prompt y se valida en el
frontend. Así, añadir un componente nuevo (o miles) es: definirlo una vez en el
manifest → se re-siembra la DB con su embedding → queda automáticamente disponible
para el RAG, el validador, el prompt y el Playground.

### 11.6 Acciones concretas (encajan en las fases existentes)
- **Fase 0a:** arreglar la key de embeddings (resucita el RAG → vuelve a mandar 15
  variados, no 8 fijos). Es el cambio de mayor impacto/menor esfuerzo.
- **Fase 0a/0b:** recortar el prompt estático del compositor y evaluar prompt
  caching de su parte fija.
- **Fase 1:** manifest como fuente única que siembra la DB (`ComponentModel`),
  evitando que descripciones/props se desincronicen al escalar a miles.
- **Escalado futuro:** índice ANN en pgvector cuando el catálogo crezca; mantener
  `top_k` en ~15 independientemente del tamaño del catálogo.

---

## 12. Alineación con la arquitectura existente (ADR-010, roadmap, docs/)

Al revisar `docs/` se confirma que varias de estas conclusiones ya estaban
documentadas o decididas. Este plan **se alinea** con ellas (no las reinventa) y
las extiende. Resumen de lo relevante y cómo encaja:

### 12.1 Decisiones canónicas que este plan RESPETA (no tocar)
- **"La IA es orquestadora, no dibujante."** ADR-010 y `coordinate-contract.md`
  fijan que el LLM NO genera geometría: los tipos `path`/`rect`/`circle` libres
  están **PROHIBIDOS** (los modelos dibujan basura: "un corazón sale como el borde
  de un boomerang"). El vocabulario de formas son **íconos pre-hechos (Iconify) +
  componentes**. Esto **rechaza** explícitamente la propuesta de
  `analisis_raiz_arquitectura.md` de "abolir la restricción de primitivas". → Todo
  lo que propone este plan (incluida la expansión de catálogo de la Sección 7) va
  por la vía de **más/mejores componentes e íconos**, nunca por dejar que la IA
  dibuje. Coherente.
- **Contrato de coordenadas "centro absoluto" (v7).** Ya es el contrato vigente
  (`layoutSolver` emite el centro; cada componente aplica `translate(-50%,-50%)`).
  La Sección 3 de este plan **no cambia ese contrato**; ataca lo que el propio ADR
  dejó pendiente como **Fase C3**: que el solver es ciego al tamaño real → por eso
  hay colisiones. Mi propuesta de bounding boxes + delegar flex/grid al CSS real
  del navegador es exactamente la dirección de la Fase C3 y de
  `analisis_raiz_arquitectura.md` (sección A), aplicada de forma incremental.

### 12.2 Cosas que el plan ya intuía y los docs CONFIRMAN
- **Manifest de componentes = Fase B1/B2 del ADR-010** ("fuente única de verdad de
  componentes y de props, derivada de los tipos, con check de CI"). Mi Fase 1 es
  exactamente eso. Además el log demuestra que el test `test_component_registry_sync.py`
  que debía evitar el desfase **no está cubriendo el enum real** (dejó pasar el
  rechazo de `WordHighlight`): el manifest debe alimentar TODAS las listas
  (registry, enum Pydantic, `sanitizeProps`, prompt, seed de la DB) y el CI debe
  validar contra el manifest, no contra una lista manual paralela.
- **`thought_signature` rompe el JSON = Fase B5 del ADR-010** (ya identificado como
  causa de `size:"color1"` y capas duplicadas). Refuerza el item 2 de la Fase 0a.
- **Embeddings cross-model (mpnet vs gemini) = Fase A.3 del ADR-010.** Ya se decidió
  "todo Gemini 768d" y se escribieron los `reembed_*`; lo que faltaba era correrlos
  con una key válida (ver 10.1).

### 12.3 Herramientas concretas que el roadmap propone y que este plan adopta
El `strategic-roadmap.md` define pilares técnicos que dan sustancia a las fases de
calidad y catálogo de este plan. Conviene adoptarlos:
- **`@remotion/animated` (animación declarativa).** Es la implementación concreta de
  los "presets de movimiento" de la Sección 1 / Fase 4: en vez de escribir
  `interpolate(...)` a mano en cada componente, se declara el estado objetivo y la
  librería resuelve springs/curvas. Reduce el código de animación ~60-70% y
  estandariza la física → menos defectos de timing y componentes más legibles.
- **dotLottie (no Lottie clásico).** Es el camino para animaciones "nivel Remotion o
  superior" que pediste y para categorías como **Logo & Branding** y **Cinematic**
  (Sección 7): animaciones complejas (personajes, motion intrincado) renderizadas en
  un único `<canvas>` vía WebAssembly/ThorVG, ~80% más livianas y sin explosión de
  DOM que tumbe el render. Encaja como un **tipo de componente** nuevo (un
  reproductor de `.lottie` parametrizable) dentro del registry.
- **`@remotion/skia` (VFX pesado).** Para fondos/efectos con miles de partículas,
  fluidos o blurs en tiempo real (categorías **Background** y **Content Animation**)
  sin colapsar el DOM. Es la capa "premium" para cuando un `ParticleField` en CSS
  se queda corto. Adoptar de forma selectiva, solo en los componentes que lo
  necesiten por rendimiento.

> Nota de encuadre: ignorar en `docs/` lo referido al "MVP de 20 días" y a estados
> antiguos (conteos de componentes 33/109/112 que ya cambiaron). Lo vigente y útil
> es lo de ADR-010 (v7), `coordinate-contract.md` y `strategic-roadmap.md`, que es
> lo que esta sección integra. El objetivo declarado por el usuario es dejarlo
> **listo y bien hecho**, no parchar para una demo.

---

## 13. Skills del repositorio a aplicar en cada fase

El repo trae skills en `.agents/skills/` con conocimiento de dominio. Quien
implemente cada fase (sea yo, sea otro modelo como Qwen) **debe cargar la skill
correspondiente en su contexto** antes de tocar el código, para que el resultado
siga las mejores prácticas en vez de improvisar. Mapa skill → fase:

| Fase / tarea | Skills a usar | Por qué / qué aportan |
|---|---|---|
| **0a** Embeddings, key, parseo LLM | `pydantic`, `fastapi-python`, `sqlalchemy`, `sqlalchemy-alembic...`, `python-testing-patterns` | Resolución de credenciales, validación de specs, modelo `ComponentModel`/migraciones, arreglar el test de sincronía |
| **0b** Contraste, texto, scramble, dedupe | `remotion-best-practices` (`text-animations.md`, `google-fonts.md`, `local-fonts.md`, `timing.md`), `accessibility`, `web-design-guidelines` | Carga correcta de fuentes (arregla 6.3), contraste WCAG (6.1), timing de texto |
| **1** Manifest + Playground dinámico | `typescript-advanced-types`, `composition-patterns`, `react-best-practices`, `pydantic`, `ui-ux-pro-max`, `frontend-design`, `tailwind-css-patterns` | Tipos del manifest, **reducir props booleanas**, UI del formulario schema-driven del admin |
| **2** Responsividad | `remotion-best-practices` (`measuring-dom-nodes.md`, `get-video-dimensions.md`, `parameters.md`, `calculate-metadata.md`), `remotion` | Medir tamaño real, leer dimensiones del lienzo, props/orientación |
| **3** Posicionamiento / colisiones | `remotion-best-practices` (`measuring-text.md`, `measuring-dom-nodes.md`) | **Técnica canónica de Remotion** para medir texto/nodos = base de bounding boxes y detección de colisiones |
| **4** Calidad de animación | `remotion-best-practices` (`text-animations.md`, `transitions.md`, `timing.md`, `sequencing.md`, `audio-visualization.md`), `composition-patterns`, `react-best-practices` | Animación declarativa, staging/sequencing, transiciones; refactor de componentes sin prop-bloat |
| **5** Catálogo nuevo + transiciones | `remotion-best-practices` (`transitions.md`, `light-leaks.md`, `images.md`, `videos.md`, `gifs.md`), `remotion`, `frontend-design`, `ui-ux-pro-max` | Patrones para Cinematic/Transition/Image&Media; dirección estética para Logo&Branding |
| Cualquier fase frontend | `react-best-practices`, `vite` | Rendimiento React, build |

Skills transversales de calidad para usar en la **revisión** de cada fase:
`code-review` (bugs), `verify` / `run` (renderizar y comprobar de verdad, no solo
leer código), `security-review` si toca auth/keys. Para descubrir skills nuevas:
`find-skills`.

> Nota: estas skills `.agents/skills/` son archivos de conocimiento. Si la
> implementación la hace un modelo externo (Qwen), hay que **pasarle el contenido
> de la skill relevante + `docs/coordinate-contract.md` + `docs/adr-010...`** en su
> contexto, porque no tiene el sistema de skills de este harness.

---

## 14. ¿Puede otro modelo (p. ej. Qwen) implementar esto? Cómo orquestarlo

**Respuesta corta:** sí para buena parte, con la estrategia adecuada y revisión por
fase. El plan está deliberadamente escrito como especificación (causa raíz +
archivos exactos + teoría), que es justo lo que un modelo de código necesita para
ejecutar bien sin alucinar arquitectura.

**Qué es de bajo riesgo para delegar a Qwen (alta tasa de éxito):**
- Fase **0a** y **0b**: son cambios concretos y verificables — arreglar la fuente
  de la key, sincronizar el enum Pydantic, guardia de contraste, edición de prompt,
  dedupe, timing adaptativo. Hay un "correcto" objetivo.
- Fase **1** (manifest + Playground dinámico + sanitizeProps): muy mecánica una vez
  definida la forma del manifest. Ideal para delegar.
- Variantes de componentes y charts faltantes (Fase 5, parte baja): patrón repetido.

**Qué es de mayor riesgo (requiere revisión humana/visual fuerte):**
- Fase **3** (matemática de colisiones / contrato de coordenadas): sutil; un error
  descoloca todo. Acotar bien y revisar con render real.
- Fase **4** (calidad estética de animación): el "se ve profesional" es juicio
  visual; el modelo produce código plausible pero hay que **renderizar y mirar**.
- Componentes "hero" nuevos (Logo&Branding, Cinematic): taste-dependent.

**Cómo orquestarlo (recomendado):**
1. **Una fase a la vez.** No darle el plan entero; darle UNA fase con su sección del
   plan + las skills mapeadas (Sección 13) + `coordinate-contract.md` y `adr-010`.
2. **Definición de "hecho" por fase:** tests pasan (incl. el de sincronía de
   componentes), `lint`/`typecheck` limpios, y **un video de muestra renderizado**
   sin regresiones. Sin render, la calidad visual no se puede afirmar.
3. **Determinismo como regla dura** en cada componente (sin `Math.random`/`Date.now`)
   — recordárselo explícitamente; es el error clásico en Remotion.
4. **Revisión por fase (tu propuesta):** cuando termines una fase, la reviso con
   `code-review` + `verify`/`run` (render real) contra el plan y las skills, y te
   devuelvo hallazgos antes de pasar a la siguiente. Esto acota el riesgo de que
   errores se acumulen entre fases.

**Conclusión:** Qwen puede cargar el grueso del trabajo mecánico (Fases 0-1 y partes
de 5) aprovechando tus tokens, mientras que las fases de juicio visual (3, 4 y
componentes hero) conviene hacerlas con más cuidado y siempre con render + revisión.
El cuello de botella de calidad no es el modelo: es **verificar visualmente** cada
fase, y para eso el flujo "implementa Qwen → reviso yo con render" es sólido.

---

*Fin del plan. Cada fase puede convertirse en su propio documento de
implementación con tareas concretas cuando decidas por dónde empezar.*
