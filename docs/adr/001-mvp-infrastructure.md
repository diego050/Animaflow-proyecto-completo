# ADR 001: Configuración de Infraestructura MVP e Integración Remotion-FastAPI

**Fecha:** 11 de Mayo de 2026
**Estado:** Implementado
**Rol/Autor:** Architecture Agent (Orquestador Técnico)

## 1. Contexto
AnimaFlow requiere una infraestructura capaz de traducir solicitudes de texto/audio en videos deterministas y editables. Era crítico configurar un esqueleto inicial que respetara la separación de capas: 
- El frontend debe poder previsualizar videos basándose en JSON (sin rendering asíncrono backend obligatorio).
- El backend debe manejar peticiones pesadas (IA y Voicebox) de manera asíncrona y transaccional sin caerse ni dejar peticiones bloqueadas.

## 2. Decisión Arquitectónica y Ejecución

Se ha implementado el MVP Fundacional con las siguientes piezas técnicas integradas:

### 2.1. El Contrato Maestro (`spec.json`)
- Se creó el esquema principal en `/specs/spec_schema.json`. 
- Este JSON es la "única fuente de verdad". Para proteger este contrato, se implementó un modelo de validación estricto en Python (Pydantic: `backend/app/schemas/spec.py`) y una interfaz de TypeScript (`frontend/src/types/spec.ts`).

### 2.2. Capa Backend (FastAPI + PostgreSQL + RQ)
- **API (FastAPI):** Se levantó el endpoint `POST /api/jobs` y `GET /api/jobs/{job_id}`.
- **Persistencia (PostgreSQL):** Se configuraron SQLAlchemy y Alembic. La tabla `jobs` registra cada petición asegurando trazabilidad de errores y tiempos.
- **Asincronía (Redis + RQ):** Se conectó e inicializó exitosamente el sistema de colas. FastAPI inserta la petición en DB, la delega a la cola `default` de Redis, y el worker (`worker.py`) la ejecuta en background, protegiendo el hilo principal de la aplicación.
- Se ha generado un simulador temporal en `app/services/pipeline.py` para verificar el flujo completo de vida de un Job hasta completarse.

### 2.3. Capa Frontend (React + Vite + Remotion)
- Se inicializó una App en Vite y React 18, actualizando y solucionando conflictos del entorno de estilos a **TailwindCSS v4**.
- Se embebió el motor de `<Player>` de Remotion dentro de la aplicación interactiva principal (`App.tsx`).
- Se creó la composición dinámica `MainComposition.tsx` capaz de interpolar frames a 30fps usando el motor base sin CSS nativo que pudiese romper renders futuros.

## 3. Consecuencias
- **Positivas:** La infraestructura cumple con los requisitos del MVP de manera modular. La caída del modelo de IA o de Voicebox no tirará la base de datos ni bloqueará a otros usuarios, y los errores se pueden rastrear mediante `status="failed"`.
- **Negativas/Complejidades Adquiridas:** Múltiples entornos a levantar para el desarrollo (FastAPI, React, Redis, Postgres, RQ Worker), lo cual requiere correr 3 ventanas de terminal paralelamente, tal como se refleja en el actual flujo de trabajo.

## 4. Siguientes Pasos Planificados
- Integrar la clonación del repo de `voicebox` real dentro del worker asíncrono para generar los timestamps de palabras de manera determinista.
- Conectar la capa de Corrección LLM para parsear la respuesta en el `spec.json`.
