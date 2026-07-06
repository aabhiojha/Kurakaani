# Kurakaani Frontend

React + TypeScript frontend for the Kurakaani chat backend.

## What This Project Does

- Authenticates users with JWT.
- Loads rooms, messages, friendships, and profile data over REST.
- Connects to the backend websocket for realtime room messages, typing, and notifications.
- Supports direct messages, group chats, room management, media uploads, and profile updates.

## Integration Docs

- [Backend Integration Guide](./docs/backend-integration-guide.md)
- [Frontend WebSocket and Redis Integration Guide](./docs/frontend-websocket-redis-integration.md)

Read those first if you are wiring this app to a backend or extending the contract.

## Prerequisites

- Node.js 20+.
- A backend instance that matches the documented API contract.

## Environment

Copy `.env.example` to `.env` and adjust the values for your backend.

Key variables:

- `VITE_API_BASE_URL`: backend origin used by the frontend runtime.
- `VITE_BACKEND_PROXY_TARGET`: backend target used by the Vite dev server proxy.
- `VITE_GLOBAL_ROOM_ID`: room ID that should be auto-joined after login.

## Scripts

- `npm run dev` - start the Vite dev server.
- `npm run build` - type-check and build the production bundle.
- `npm run lint` - run ESLint.
- `npm run preview` - preview the production build locally.

## Development Notes

- REST is the source of truth.
- Websocket traffic is a live update layer, not a durable store.
- The frontend now subscribes to the documented websocket destinations and keeps legacy topic support as a fallback.

## Backend Proxy

During local development the Vite server proxies:

- `/api`
- `/oauth2`
- `/ws`

The proxy target comes from `VITE_BACKEND_PROXY_TARGET` and defaults to `http://localhost:8080`.
