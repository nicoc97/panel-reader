# Manga Panel Viewer

A full-stack web application for enhanced manga reading through automatic panel detection and guided view functionality.

## Project Structure

```
manga-panel-viewer/
├── frontend/          # React 18+ TypeScript with Vite
├── backend/           # Express.js with TypeScript
├── docker-compose.yml # Local development services
└── README.md
```

## Quick Start

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- npm or yarn

### Setup

1. **Quick setup (recommended):**
   ```bash
   npm run setup
   ```

2. **Start the database services:**
   ```bash
   # If Docker is available:
   docker compose up -d
   
   # Alternative: Install PostgreSQL and Redis locally
   # PostgreSQL: brew install postgresql (macOS) or apt-get install postgresql (Ubuntu)
   # Redis: brew install redis (macOS) or apt-get install redis (Ubuntu)
   ```

3. **Run database migrations (after PostgreSQL is running):**
   ```bash
   npm run db:migrate
   ```

4. **Start development servers:**
   ```bash
   npm run dev
   ```

### Manual Setup (alternative)

1. **Set up the backend:**
   ```bash
   cd backend
   npm install
   npx prisma generate
   # Note: Run this after PostgreSQL is running
   npx prisma migrate dev --name init
   npm run dev
   ```

2. **Set up the frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

### Development URLs

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- PostgreSQL: localhost:5432
- Redis: localhost:6379

### Database Management

- **Generate Prisma client:** `npx prisma generate`
- **Create migration:** `npx prisma migrate dev --name <migration_name>`
- **View database:** `npx prisma studio`
- **Reset database:** `npx prisma migrate reset`

## Technology Stack

- **Frontend:** React 18, TypeScript, Vite
  - Note: Tailwind CSS will be added in a later task
- **Backend:** Express.js, TypeScript, Prisma ORM
- **Database:** PostgreSQL, Redis
- **Development:** Docker Compose

## Next Steps

This is the minimal project structure for MVP development. See manga-panel-viewer-spec.md for the design and roadmap.