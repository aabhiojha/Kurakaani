# Kurakaani

Real-time chat application. Monorepo containing the Spring Boot backend and the React
frontend, previously split across two repositories and now merged with full history preserved.

## Structure

```
kurakaani/
├── backend/     Spring Boot 3.5 · Java 21 · Maven  (REST + WebSocket/STOMP, JPA/Postgres, Redis, S3 storage)
├── frontend/    React 19 · Vite · TypeScript · Tailwind
├── docker-compose.yml
└── .env.example
```

## Quick start (Docker)

Everything is wired through `docker-compose.yml` with working local defaults, so no `.env`
is required to boot:

```bash
docker compose up --build
```

Services:

| Service   | Exposed on host        | Notes                                       |
|-----------|------------------------|---------------------------------------------|
| frontend  | http://localhost:5173  | Vite build served via `vite preview`        |
| backend   | http://localhost:8080  | Swagger UI at `/docs`, health at `/actuator/health` |
| postgres  | internal only          | db `chat-app-db`, `postgres`/`postgres`     |
| redis     | internal only          |                                             |
| storage   | internal only          | RustFS (S3-compatible)                       |

Postgres/Redis/storage are **not** published to the host by default (so they don't clash with
services you already run locally). The app reaches them over the compose network by service
name. To connect from the host, add a `docker-compose.override.yml` mapping e.g. `"5432:5432"`.

To customise credentials/secrets, copy `.env.example` to `.env` and edit. Switch the backend
to strict production config with `SPRING_PROFILES_ACTIVE=prod` (requires all secrets set,
including `MAIL_USERNAME` / `MAIL_PASSWORD`). With mail configured, remove
`MANAGEMENT_HEALTH_MAIL_ENABLED=false` to re-enable the mail health check.

## Local development (without Docker)

**Backend**
```bash
cd backend
./mvnw spring-boot:run          # needs Postgres, Redis, and S3 storage running locally
```

**Frontend**
```bash
cd frontend
cp .env.example .env
npm install
npm run dev                     # http://localhost:5173, proxies /api and /ws to :8080
```

## Notes

- The frontend Docker image is **nginx-free** — the production build is served by
  `vite preview`, which reuses the same proxy config as the dev server
  (`/api`, `/oauth2`, `/ws`, `/storage`).
- Backend and frontend retain their individual commit histories from before the merge.
