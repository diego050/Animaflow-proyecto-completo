import React from 'react';

/**
 * UniversalTransform — Aplica transformaciones ATÓMICAS (scale, rotation,
 * opacity, zIndex) a CUALQUIER componente, sin que este tenga que implementarlas.
 *
 * Problema que resuelve (Fase 1, v8): antes `scale`/`rotation`/`opacity` solo
 * funcionaban en las primitivas (rect/text/...) porque las capas tipo `component`
 * descartaban esas props en AnimaComposer, y en el Playground se pasaban al
 * componente pero este las ignoraba. Ahora un único wrapper las aplica para todos.
 *
 * Contrato de coordenadas:
 * - `x`/`y` siguen siendo la posición ABSOLUTA del componente (no cambia): el
 *   propio componente se posiciona en (x,y) vía left/top. Aquí solo se usan como
 *   ANCLA del `transform-origin`, para que scale/rotate ocurran alrededor del
 *   punto donde vive el componente (no del centro del lienzo).
 * - El contenedor es un overlay a pantalla completa y posicionado, así el hijo
 *   absoluto resuelve su left:x/top:y igual que antes (sin regresión).
 *
 * Si no hay ninguna transformación activa, devuelve los hijos tal cual (no
 * introduce un stacking context ni un nodo extra).
 */
export interface UniversalTransformProps {
  scale?: number;
  rotation?: number;
  opacity?: number;
  zIndex?: number;
  /** Ancla del transform-origin (px). Normalmente la posición del componente. */
  anchorX?: number;
  anchorY?: number;
  children: React.ReactNode;
}

export const UniversalTransform: React.FC<UniversalTransformProps> = ({
  scale,
  rotation,
  opacity,
  zIndex,
  anchorX,
  anchorY,
  children,
}) => {
  const hasScale = scale !== undefined && scale !== 1;
  const hasRotation = rotation !== undefined && rotation !== 0;
  const hasOpacity = opacity !== undefined && opacity !== 1;
  const hasZ = zIndex !== undefined;

  // Sin transformaciones → no envolver (evita stacking context y nodo extra).
  if (!hasScale && !hasRotation && !hasOpacity && !hasZ) {
    return <>{children}</>;
  }

  const transforms: string[] = [];
  if (hasScale) transforms.push(`scale(${scale})`);
  if (hasRotation) transforms.push(`rotate(${rotation}deg)`);

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        transform: transforms.length > 0 ? transforms.join(' ') : undefined,
        transformOrigin:
          anchorX !== undefined && anchorY !== undefined
            ? `${anchorX}px ${anchorY}px`
            : 'center center',
        opacity: hasOpacity ? opacity : undefined,
        zIndex: hasZ ? zIndex : undefined,
        // El wrapper no debe capturar eventos; deja pasar al contenido.
        pointerEvents: 'none',
      }}
    >
      {children}
    </div>
  );
};
