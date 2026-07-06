# Kurakaani Backend

A real-time chat application backend built with Spring Boot 3. Supports direct messaging, group chat, friend requests, media uploads, and live typing indicators — all over WebSocket with STOMP and Redis pub/sub.

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Environment Variables](#environment-variables)
  - [Running Locally](#running-locally)
- [Architecture](#architecture)
- [Authentication](#authentication)
- [Project Structure](#project-structure)
- [API Docs (Swagger)](#api-docs-swagger)

---

## Overview

**Kurakaani** (Nepali for "conversation") is a monolithic Spring Boot chat backend. It provides:

- JWT-based stateless authentication
- 1-to-1 direct messaging (DM) and group rooms
- Real-time messaging and typing indicators over WebSocket (STOMP + SockJS)
- Redis pub/sub for scalable message fan-out
- A friend request system (send, accept, reject, cancel, unfriend)
- Media upload (images, videos) to S3-compatible storage (MinIO)
- Full-text message search within and across rooms
- Password reset via email

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Spring Boot 3.5, Java 21 |
| Database | PostgreSQL + Flyway |
| Cache / Pub-Sub | Redis |
| Real-time | WebSocket, STOMP, SockJS |
| Auth | JWT (jjwt 0.13) + Spring Security |
| Storage | AWS S3 SDK v2 (MinIO-compatible) |
| Email | Spring Mail (SMTP / Gmail) |
| Docs | SpringDoc OpenAPI (Swagger UI) |
| Build | Maven |
| Mapping | MapStruct |

---

## Getting Started

### Prerequisites

- Java 21+
- PostgreSQL 14+
- Redis 7+
- MinIO (or any S3-compatible store) — required only for media uploads
- An SMTP account — required only for password reset emails

### Environment Variables

| Variable | Description | Default |
|---|---|---|
| `JWT_SECRET` | Base64-encoded HMAC-SHA256 secret | (hardcoded dev default) |
| `JWT_EXPIRATION_SECONDS` | Token TTL in seconds | `864000` (10 days) |
| `MAIL_USERNAME` | SMTP sender address | `aojha6822@gmail.com` |
| `MAIL_PASSWORD` | SMTP password / app-password | — |
| `STORAGE_ENDPOINT` | S3/MinIO endpoint URL | `http://127.0.0.1:9000` |
| `STORAGE_BUCKET` | Bucket name | `kurakaani` |
| `STORAGE_REGION` | Bucket region | `rustfs` |
| `STORAGE_ACCESS_KEY` | S3 access key | — |
| `STORAGE_SECRET_KEY` | S3 secret key | — |

Database connection is configured in `application-dev.yaml`:

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/chat-app-db
    username: postgres
    password: postgres
```

Override these via environment variables or a local `application-local.yaml`.

### Running Locally

```bash
# Clone the repo
git clone https://github.com/<your-org>/kurakaani-backend.git
cd kurakaani-backend

# Start dependencies (requires Docker)
docker compose up -d   # or start PostgreSQL, Redis, MinIO manually

# Build and run with the dev profile
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

The server starts on `http://localhost:8080`.  
Swagger UI is available at `http://localhost:8080/docs`.

---

## Architecture

```
Client (browser / mobile)
        |
        |  HTTP (REST)         WebSocket (STOMP over SockJS)
        v                               v
  Spring MVC Controllers       WebSocket Message Broker
        |                               |
  Service Layer  <------- Redis Pub/Sub subscriber
        |                               |
  JPA Repositories           Redis Pub/Sub publisher
        |
  PostgreSQL
```

**Request flow for a chat message:**

1. Client sends STOMP frame to `/app/chat.send/{roomId}`.
2. `ChatController` publishes the message to a Redis channel (`chat.group.{roomId}` or `chat.dm.user.{username}`).
3. `RedisSubscriber` receives the event and broadcasts it to connected WebSocket subscribers.
4. The message is also persisted in PostgreSQL via `MessageService`.

---

## Authentication

All REST endpoints (except `/api/auth/**`) require a Bearer token in the `Authorization` header.

```
Authorization: Bearer <jwt-token>
```

Tokens are obtained via `POST /api/auth/login` or `POST /api/auth/register`.

**Token format:** JWT signed with HS256, containing `sub` (username), `jti` (unique ID), `roles`, and expiry.

**WebSocket authentication:** Pass the JWT in the STOMP `connect` headers:

```javascript
const headers = { Authorization: `Bearer ${token}` };
stompClient.connect(headers, onConnected);
```

---

## Project Structure

```
src/main/java/com/abhishekojha/kurakanimonolith/
├── common/
│   ├── config/           # Security, WebSocket, Redis, CORS, async, OpenAPI
│   ├── exception/        # Global exception handler and custom exceptions
│   ├── helpers/          # Shared utilities
│   ├── mail/             # Email service (password reset, registration)
│   ├── objectStorage/    # S3 / MinIO operations
│   ├── redis/            # Redis pub/sub subscriber
│   └── security/         # JWT filter, JWT service, UserDetailsService
└── modules/
    ├── auth/             # Register, login, password reset
    ├── user/             # Profile management
    ├── room/             # Room CRUD, DM/group logic
    ├── room_member/      # Membership management
    ├── message/          # Message persistence, media upload, search
    ├── friendRequest/    # Friend request workflow
    └── notification/     # Real-time notification dispatch

src/main/resources/
├── application.yaml          # Base config (active profile: dev)
├── application-dev.yaml      # Dev overrides
├── application-prod.yaml     # Prod overrides
├── logback-spring.xml        # Logging config
└── db/                       # Flyway SQL migration scripts
```

---

## API Docs (Swagger)

Interactive Swagger UI is served at:

```
http://localhost:8080/docs
```

Raw OpenAPI JSON is at:

```
http://localhost:8080/v3/api-docs
```

---