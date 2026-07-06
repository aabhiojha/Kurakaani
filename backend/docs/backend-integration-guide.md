# Backend Integration Guide

This document describes how the backend is structured, how its main subsystems interact, and how a frontend or another client should integrate with it safely.

The backend is a Spring Boot monolith with:

- JWT-based stateless authentication,
- REST APIs for bootstrap and CRUD flows,
- STOMP over SockJS for realtime transport,
- Redis pub/sub as the internal bridge between business logic and websocket delivery,
- PostgreSQL for persistence,
- S3-compatible object storage for media and profile assets.

## 1. Runtime Overview

The main runtime path is:

1. A client authenticates with `POST /api/auth/login`.
2. The backend returns a JWT in `AuthResponse.token`.
3. The client uses the JWT on all REST calls.
4. The client opens a websocket connection to `/ws`.
5. The client sends the JWT in the STOMP `CONNECT` frame.
6. The backend authenticates the websocket session and attaches a Spring security principal.
7. Message and notification events are written to Redis.
8. Redis subscribers forward those events to websocket destinations.

## 2. Technology Stack

The project uses:

- Spring Web
- Spring Security
- Spring WebSocket
- Spring Data JPA
- Spring Data Redis
- Flyway
- PostgreSQL
- S3-compatible object storage
- JWT via JJWT

## 3. Application Entry Points

### Auth

Base path: `/api/auth`

- `POST /login`
- `POST /register`
- `POST /password-reset`
- `POST /password-reset-confirm`

### Rooms

Base path: `/api/rooms`

- `GET /`
- `GET /room/{roomId}/message`
- `GET /room/{roomId}`
- `GET /room/{roomId}/add/friends`
- `POST /group`
- `POST /dm?userId=...`
- `POST /room/{room_id}/add`
- `POST /room/{roomId}/group/create`
- `PATCH /room/{roomId}`
- `POST /room/{room_id}/remove`

### Messages

- `GET /api/rooms/{roomId}/messages/search?text=...`
- `GET /api/rooms/messages/search?text=...`
- `POST /api/rooms/room/{roomId}/message/media`

Websocket message mappings:

- `/app/chat.send/{roomId}`
- `/app/chat.typing/{roomId}`

### Friendships

Base path: `/api/friend`

- `POST /request/{userId}`
- `POST /respond/{userId}/{response}`
- `POST /{userId}/cancel`
- `POST /{userId}/unfriend`
- `GET /requests`
- `GET /requests/sent`
- `GET /friends`

## 4. Authentication Model

The backend is stateless.

- REST authentication uses `Authorization: Bearer <jwt>`.
- JWT is generated on login and includes the username as the subject.
- The token expiration is controlled by `app.jwt.expiration-seconds`.
- No server session is stored.

### JWT service behavior

`JwtService`:

- generates tokens,
- extracts the username,
- validates expiration and signature,
- and is used by both HTTP and websocket authentication.

### HTTP request authentication

`JwtAuthenticationFilter`:

- reads the `Authorization` header,
- validates the bearer token,
- loads user details,
- populates the Spring Security context.

### Websocket authentication

`WebSocketAuthChannelInterceptor`:

- intercepts STOMP `CONNECT`,
- reads the `Authorization` native header,
- validates the JWT,
- attaches a Spring authentication object to the websocket session.

## 5. Websocket Configuration

The websocket broker is configured in [`WebSocketConfig.java`](/home/abhishek/IdeaProjects/kurakaani/kurakaani-backend/src/main/java/com/abhishekojha/kurakanimonolith/common/config/WebSocketConfig.java).

### Endpoint

- STOMP endpoint: `/ws`
- SockJS is enabled

### Broker

- Application destination prefix: `/app`
- Simple broker destinations: `/topic`, `/queue`

### Current allowed origins

- `http://localhost:5173`
- `http://127.0.0.1:5173`
- `https://kurakaani.me`
- `http://192.168.1.19:5173`

If the frontend runs elsewhere, the origin must be added in both websocket and CORS config.

## 6. Redis Integration

Redis is used as a pub/sub relay, not as the system of record.

### Configured channels

`RedisConfig` subscribes to these patterns:

- `chat.group.*`
- `chat.dm.*`
- `chat.typing.*`
- `friend.request.*`
- `notification.*`

### Subscriber behavior

`RedisSubscriber` forwards Redis messages into websocket destinations:

- `chat.dm.user.{username}` -> `/user/queue/messages`
- `chat.group.{roomId}` -> `/topic/chat.group.{roomId}`
- `chat.typing.{roomId}` -> `/topic/rooms/{roomId}/typing`
- `notification.{username}` -> `/user/queue/notifications`

There is also a separate `NotificationSubscriber` that forwards `notifications.{username}` to `/user/queue/notifications`.

## 7. Messaging Flow

### Text messages

When a client sends a STOMP message to `/app/chat.send/{roomId}`:

1. `MessageController.sendMessageToRoom` delegates to `MessageService`.
2. The service checks that the user is a member of the room.
3. The service persists the message to the database.
4. The service maps the entity to `MessageDto`.
5. The service publishes to Redis.
6. `RedisSubscriber` forwards the message to websocket subscribers.

### Media messages

Media messages are handled through REST instead of STOMP:

- `POST /api/rooms/room/{roomId}/message/media`

Process:

1. Validate file presence and media type.
2. Upload to object storage.
3. Persist the message with media metadata.
4. Publish the resulting `MessageDto` to Redis.
5. Forward the event to websocket subscribers.

### Typing events

Typing is published through:

- `/app/chat.typing/{roomId}`

The backend republishes the event to Redis at `chat.typing.{roomId}` and then forwards it to the room typing topic.

## 8. Notification Flow

Friend request actions trigger notifications.

### Producer

`FriendRequestServiceImpl` calls `NotificationService.notify(...)` after:

- sending a request,
- accepting a request,
- rejecting a request.

### Redis channel

`NotificationService` publishes JSON to:

- `notifications.{recipientUsername}`

### Websocket delivery

`NotificationSubscriber` forwards the payload to:

- `/user/queue/notifications`

The current system is username-based, which matches the websocket principal.

## 9. Data Contracts

### AuthResponse

```json
{
  "token": "jwt",
  "username": "alice",
  "roles": ["ROLE_USER"]
}
```

### MessageDto

Used for live message delivery.

Fields:

- `id`
- `senderId`
- `roomId`
- `content`
- `messageType`
- `mediaUrl`
- `mediaContentType`
- `mediaFileName`
- `isEdited`
- `isDeleted`
- `createdAt`
- `updatedAt`

### RoomMessageDto

Used for room history REST responses.

Fields:

- `id`
- `roomId`
- `userInfo`
- `content`
- `messageType`
- `mediaUrl`
- `mediaContentType`
- `mediaFileName`
- `isEdited`
- `isDeleted`
- `createdAt`
- `updatedAt`

### RoomListDto

Used for room list bootstrap.

Fields:

- `id`
- `name`
- `description`
- `type`
- `memberCount`
- `recentMessage`
- `unreadCount`

### TypingEvent

```json
{
  "userId": 7,
  "userName": "alice",
  "typing": true
}
```

### NotificationMessage<T>

Fields:

- `id`
- `type`
- `recipientId`
- `senderId`
- `timestamp`
- `read`
- `payload`

For friend requests, the payload is `FriendRequestPayload`:

- `requestId`
- `event`
- `senderName`
- `senderAvatar`

## 10. Storage and Media

Object storage is used for:

- profile images,
- room media uploads,
- generated media URLs for message history.

Important behavior:

- The database stores object keys, not public URLs.
- DTO mappers resolve access URLs when needed.
- Frontend clients should treat media URLs as backend-generated access links, not permanent stable URLs.

## 11. Database and Migrations

Flyway migrations live in:

- `src/main/resources/db/migration`

Current migrations include:

- initial schema,
- friendships,
- media support,
- message type support,
- full text search support,
- trigram search support.

The application runs with:

- `ddl-auto: validate`
- `flyway.baseline-on-migrate: true`

That means schema changes should be made through migrations, not by relying on Hibernate to create tables.

## 12. Security and CORS

### Security rules

Public endpoints include:

- `/`
- `/error`
- `/v3/api-docs/**`
- `/swagger-ui/**`
- `/swagger-ui.html`
- `/docs`
- `/docs/**`
- `/api/auth/**`
- `/oauth2/**`
- `/login/oauth2/**`
- `OPTIONS /**`
- `/ws/**`

Most application endpoints require authentication.

### CORS

The CORS config allows credentials and exposes the `Authorization` header.

Frontend and websocket origins should be kept in sync with:

- `CustomCorsConfiguration`
- `WebSocketConfig`
- `RoomController` and other controller-level `@CrossOrigin` annotations

## 13. Error Handling

The backend uses custom exceptions such as:

- `BadRequestException`
- `UnauthorizedException`
- `ResourceNotFoundException`
- `DuplicateResourceException`

There is also a global exception handler.

Integration guidance:

- treat 401 as auth failure,
- treat 403 as permission failure,
- treat 404 as missing resource,
- treat 409 as duplicate/conflict,
- do not rely on websocket delivery as confirmation that data was persisted.

## 14. Current Shortcomings

These are the most important limitations in the current backend shape.

1. Redis pub/sub is not durable.
   - Missed events are lost if a client is disconnected.
   - The frontend must refetch authoritative state after reconnect.

2. Socket delivery is best-effort.
   - There is no ack/retry layer for websocket delivery.

3. Destination naming is uneven.
   - Group messages, typing, DMs, and notifications do not follow one uniform topic convention.

4. Notification publishing is split across two patterns.
   - `notifications.{username}` and `notification.{username}` both exist in the codebase.
   - That creates room for drift.

5. `RedisSubscriber` deserializes to `Object`.
   - This loses type safety before delivery to the websocket layer.

6. Typing events are not protected like message sends.
   - Room membership is checked for messages.
   - Typing currently just republishes the payload.

7. Origin lists are hard-coded.
   - Every new frontend origin requires a backend update.

8. Media URLs are generated server-side.
   - Clients should not assume direct object storage URLs are stable or public.

## 15. Recommended Integration Pattern

For the frontend or any external consumer:

1. Authenticate and store the JWT.
2. Fetch initial state over REST.
3. Connect to `/ws` with the same JWT.
4. Subscribe only after the websocket connection is established.
5. Treat websocket updates as incremental changes.
6. Reconcile with REST after reconnects or page refreshes.
7. Use REST for uploads, search, and recovery.

## 16. Operational Notes

### Logging

The dev profile enables debug logging for:

- application code,
- Spring Security,
- Spring WebSocket,
- Hibernate SQL,
- Hibernate bind parameters.

### Environment defaults

The dev profile currently points to local services:

- PostgreSQL on `localhost:5432`
- Redis on the default local connection
- object storage on `http://127.0.0.1:9000`

### Build assumption

The application expects:

- Java 21,
- Maven wrapper support,
- PostgreSQL schema already managed by Flyway.

## 17. Summary

The backend is structured well enough for a realtime chat application, but the integration contract is only reliable if the client respects the split between:

- REST as the source of truth,
- websocket as the live update path,
- Redis as an internal relay,
- JWT username as the identity boundary for websocket user destinations.

