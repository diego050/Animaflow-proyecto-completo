# Análisis de Causa Raíz: Posicionamiento y Motion Graphics Dinámicos en Producción

**Fecha:** 2026-06-03
**Objetivo:** Analizar los fallos estructurales que impiden a la IA generar motion graphics avanzados dinámicamente y los errores crónicos de posicionamiento de elementos (cajas de texto solapadas, elementos fuera de pantalla).

---

## 1. El Fallo de Raíz en la Arquitectura de Posicionamiento

El problema catastrófico de posicionamiento no es simplemente que la IA "no sepa" colocar los elementos. El problema de raíz es una **colisión destructiva entre tres sistemas de layout distintos** que intentan controlar el mismo elemento a la vez:

1. **El solver precalculado en el Backend (`layout_solver.py`):** 
   Este script convierte coordenadas relativas o reglas de diseño (`flex`) en posiciones absolutas globales (`top-left`) relativas al canvas (ej. calcula que un cuadro debe ir en `x=400`). Al ser ciego a las propiedades reales del DOM, asume tamaños fijos (`200x100`) para componentes que en la realidad varían de tamaño según su texto, generando solapamientos graves cuando el texto es largo.
2. **La suposición de los componentes React en Frontend:** 
   Componentes como `AnimaText` o `AnimaRect` asumen que las propiedades `x` e `y` que reciben son un desplazamiento relativo al *centro* de la pantalla. En el código aplican reglas CSS como `left: calc(50% + ${x}px)` junto con un `translate(-50%, -50%)`.
3. **El motor Flexbox roto del DOM:** 
   Cuando el LLM usa un grupo con `layout: flex`, `AnimaComposer` crea un contenedor con `display: flex`. Sin embargo, al renderizar los hijos dentro de este contenedor, les inyecta las coordenadas absolutas calculadas erróneamente por `layout_solver` y les aplica `position: absolute`. Como resultado, los elementos hijos "escapan" del flujo natural de Flexbox y se posicionan erróneamente relativos a su contenedor anidado, resultando en un doble o triple desplazamiento que los saca de la pantalla.

> [!WARNING]
> La combinación de cálculo absoluto ciego en Backend + centrado relativo en Frontend + anidación de Flexbox en el DOM es lo que causa que los elementos salgan volando fuera del canvas o se aplasten.

## 2. Por qué la Creación Dinámica de Motion Graphics está Limitada

Actualmente, el sistema no puede escalar porque el LLM tiene **estrictamente prohibido** construir gráficos a partir de primitivas (figuras básicas):

- **Reglas del Prompt Restrictivas:** El archivo `component_strategy.py` contiene instrucciones imperativas (hardcoded) para el LLM: *"REGLA CRÍTICA: SOLO usa type: "component" [...] NO uses type: "path", "rect", "circle". Esos tipos están PROHIBIDOS."* 
- **Cuello de Botella Estático:** Al no poder usar rectángulos o formas vectoriales base, el LLM está atrapado y solo puede invocar componentes pre-construidos que existan en el diccionario estático (`COMPONENT_REGISTRY`) de `registry.ts`.
- **Coreografía Limitada:** Las animaciones están severamente restringidas a selectores básicos (ej. `entry: "slide-up"`). La IA no tiene manera de controlar *keyframes* personalizados; cualquier animación compleja tiene que estar codeada "a mano" por un desarrollador en un componente nuevo en modo `dev`.

## 3. Cambios Arquitectónicos Necesarios para Producción (Visión Escalable)

Para permitir que la IA funcione con la libertad de herramientas como **Claude Artifacts** y construya motion graphics dinámicos en producción sin tener que compilar nuevo código React, se requieren las siguientes refactorizaciones:

### A. Eliminar por Completo el Layout Engine Secundario
Debemos destruir toda la lógica de cálculo de coordenadas espaciales absolutas en Python y JS (`layout_solver`). 
La responsabilidad de distribuir el layout debe delegarse **100% al motor CSS del navegador (DOM)**. 
- El JSON (`spec.json`) debe describir la estructura de forma declarativa (nodos padre con `display: flex`, y propiedades de alineamiento) y **no inyectar coordenadas en `position: absolute`** a los hijos.

### B. Abolir la Restricción de Primitivas Vectoriales
Actualizar las reglas del `component_strategy.py` para permitir y fomentar el uso de tipos básicos (`group`, `rect`, `text`, `path`). Esto permitirá a la IA "dibujar" y componer libremente tarjetas complejas, botones y dashboards juntando estas piezas, sin tener que pedirle a un programador que cree `<PremiumCardWidget />` en el frontend.

### C. Implementar un Intérprete de Animación Basado en Keyframes (Virtual DOM)
El modelo del spec debe evolucionar de tener simples strings `"entry": "fade"` a soportar interpolaciones.
Ejemplo del nuevo formato JSON que la IA podría generar:
```json
"animations": {
  "opacity": { "keyframes": [0, 1, 1, 0], "times": [0, 0.2, 0.8, 1] },
  "scale": { "keyframes": [0, 1.1, 1], "times": [0, 0.15, 0.3] }
}
```
En el frontend, `AnimaComposer.tsx` procesaría estos arreglos dinámicamente y los conectaría al método `interpolate()` de Remotion. De esta forma, el LLM podría orquestar motion graphics frame a frame desde el backend.

### D. Extraer Coordenadas para After Effects (Adaptador Inverso)
Dado que el objetivo es exportar para Adobe After Effects (el cual sí usa un lienzo estático de coordenadas absolutas), el cálculo no debe simularse fallidamente en Python. 
En cambio, el sistema debe primero renderizar en el navegador (Remotion) delegando al motor CSS. Luego, en un pase post-render o pre-render, el Frontend puede ejecutar `getBoundingClientRect()` para extraer las coordenadas reales, tamaños y márgenes de los elementos. Esas coordenadas fiables se envían de regreso (o se empaquetan en el `spec.json` final) para conformar el proyecto de AE, cerrando la brecha entre el CSS web y el software de video.

---

### Siguientes Pasos (Decisión de Producto)

Podemos:
1. Proceder con el **Plan v6** actual como un "parche" crítico para tapar las fugas inmediatas (los componentes ausentes y silencios en el audio).
2. Abortar los parches superficiales y comenzar un **Plan v7 Arquitectónico** enfocado en reformar el sistema de posicionamiento (eliminando el `layout_solver`) y abriendo el registro a primitivas dinámicas.
