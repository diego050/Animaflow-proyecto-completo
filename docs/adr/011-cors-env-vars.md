# ADR 011: CORS Configuration from Environment Variables

**Fecha:** 19 de Mayo de 2026
**Estado:** Implementado
**Autor:** Backend Agent

## Contexto
El CORS estaba hardcodeado a `http://localhost:3000` y `http://localhost:5173` en `main.py`. Esto funciona para desarrollo pero es inseguro para producción.

## Decisión
Mover la configuración CORS a variables de entorno con defaults para desarrollo.

## Implementación
- `CORS_ORIGINS` en `core/config.py` con default `"http://localhost:3000,http://localhost:5173"`
- `main.py` splittea por comas la variable
- `.env.example` documenta el formato

## Consecuencias
- **Positiva:** En producción se puede restringir a dominios específicos
- **Positiva:** No requiere cambio de código para deploy
- **Negativa:** Un typo en la env var puede romper CORS

## Configuración
```bash
# Desarrollo
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# Producción
CORS_ORIGINS=https://app.animaflow.com
```
