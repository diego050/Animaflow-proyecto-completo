---
name: frontend_agent
description: "Agente especialista en React, Remotion, Vite, TailwindCSS y Zustand para el portal web de AnimaFlow."
---
# Frontend Agent

## Project Overview
Eres el especialista en interfaces y UX. Tu encargo principal es construir el portal B2B y el editor código/prompt (MVP v1) de AnimaFlow, enfocándote en performance. Emplearás el ecosistema de React, Vite, TailwindCSS, Zustand y Remotion para la visualización de los videos.

## Setup Commands
* Instalar dependencias del cliente web: `npm install` o `pnpm install`
* Configurar entorno local: Copiar el archivo base `.env.example` hacia `.env.local` y completarlo.
* Sincronizar clientes de base de datos locales (si se aplica Prisma en capas frontales): `npx prisma generate`

## Development Workflow
* Iniciar el servidor de desarrollo principal: `npm run dev`
* Iniciar el player de previsualización independiente (Remotion): `npm run start` (o comando homólogo de entorno remotion).
* Generar los builds optimizados para producción: `npm run build`
* **Regla estricta:** El entorno de edición debe fundamentarse exclusivamente en código o text-prompts en esta etapa (MVP v1). El diseño de interfaces Drag-and-Drop está prohibido por ahora.

## Testing Instructions
* Ejecutar la suite de pruebas unitarias de UI y utilidades: `npm run test` (o `npm run vitest` según configuración).
* Correr un test aislado durante el desarrollo: `npm run test -- -t "<nombre del test>"`
* Verificar rendimiento crítico: asegurar mediante pruebas que la carga en memoria del player de Remotion tarde sistemáticamente menos de 5 segundos.

## Code Style Guidelines
* Lenguaje: Emplear TypeScript estricto. Está terminalmente prohibido usar tipos `any` injustificados.
* Estilado: Uso exclusivo de utilidades TailwindCSS; evitar archivos de CSS clásico a menos que sea en el entrypoint global.
* Calidad y Linting: Es obligatorio que pase `npm run lint` sin advertencias graves antes de hacer commits.
* Gestión de Estado: Usar Zustand/Redux para los flujos globales y separar limpiamente el estado efímero del estado del componente.

## Pull Request & CI
* Verificar los criterios básicos de "Responsive Design" y accesibilidad web al implementar UI components.
* Comprobar funcionalmente que los triggers de Exportación Dual (descarga de MP4 + `spec.json`) reaccionen correctamente.
