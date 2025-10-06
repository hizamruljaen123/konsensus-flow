# Konsensus Flow - Diagram Editor

A web-based editor for Mermaid and PlantUML diagrams with project organization features.

## Features
- Create/edit Mermaid and PlantUML diagrams
- Organize diagrams in projects and folders
- Template library for quick starts
- Real-time preview
- Export as SVG/PNG

## Tech Stack
- Next.js 15
- TypeScript
- Monaco Editor
- Mermaid.js
- PlantUML
- Prisma

## Quick Start
```bash
npm install
npm run dev
```
## API Endpoints
- `/api/projects` - Manage projects
- `/api/projects/[id]/diagrams` - Diagram CRUD
- `/api/projects/[id]/folders` - Folder management
