# Frontend Integration Guide: WebSockets and Redis-backed Realtime Flow

This backend uses STOMP over a SockJS endpoint for browser connectivity, and Redis pub/sub as the internal bridge between request handlers and connected websocket sessions.

The frontend should treat Redis as an implementation detail. It only needs to:

- authenticate with JWT over HTTP,
- open a STOMP socket to `/ws`,
- subscribe to the correct destinations,
- publish the supported actions,
- and refresh REST state when reconnecting.

## 1. High-level Flow

1. The frontend logs in through `POST /api/auth/login`.
2. The backend returns a JWT in `AuthResponse.token`.
3. The frontend opens a SockJS connection to `http://<backend-host>:8080/ws`.
4. The frontend sends the JWT in the STOMP `CONNECT` frame as `Authorization: Bearer <token>`.
5. The frontend subscribes to realtime destinations.
6. The frontend continues to use REST for initial page load, history, uploads, and recovery after reconnects.

## 2. Connection Details

### WebSocket endpoint

- SockJS endpoint: `/ws`
- Application destination prefix: `/app`
- Broker destinations: `/topic`, `/queue`

### Origin expectations

Allowed origins are currently hard-coded for:

- `http://localhost:5173`
- `http://127.0.0.1:5173`
- `http://192.168.1.19:5173`
- `https://kurakaani.me`

If your frontend runs on a different origin, websocket and REST requests may be blocked.

## 3. Authentication

HTTP requests use the standard `Authorization: Bearer <token>` header.

For STOMP, the backend also expects the same JWT on the `CONNECT` frame:

```ts
CONNECT headers:
Authorization: Bearer <jwt>
```

If the token is missing or invalid, the socket connect is rejected.

## 4. Recommended Frontend Client Setup

Use SockJS plus a STOMP client.

```ts
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export function createChatClient(token: string) {
  const client = new Client({
    webSocketFactory: () => new SockJS(`${BASE_URL}/ws`),
    connectHeaders: {
      Authorization: `Bearer ${token}`,
    },
    reconnectDelay: 5000,
    debug: () => {},
  });

  return client;
}
```

## 5. Subscriptions

### Group room messages

- Subscribe to: `/topic/chat.group.{roomId}`
- Example: `/topic/chat.group.42`

This is the current destination used for saved messages in group rooms.

### Typing events

- Subscribe to: `/topic/rooms/{roomId}/typing`
- Example: `/topic/rooms/42/typing`

### Direct messages

- Subscribe to: `/user/queue/messages`

This is the Spring user queue for DM delivery. The backend now routes DM events through Redis using the authenticated username, which matches the websocket principal.

### Notifications

- Subscribe to: `/user/queue/notifications`

Friend request updates currently arrive here as notification payloads.

## 6. Publishing Actions

### Send a text message

- Publish to: `/app/chat.send/{roomId}`
- Payload shape:

```json
{
  "roomId": 42,
  "content": "Hello"
}
```

Notes:

- `roomId` in the payload exists in the DTO, but the backend primarily uses the path variable.
- The server validates that the authenticated user is a member of the room.

### Send a typing event

- Publish to: `/app/chat.typing/{roomId}`
- Payload shape:

```json
{
  "userId": 7,
  "userName": "alice",
  "typing": true
}
```

The backend forwards this to the typing topic for that room.

### Send media

Media messages do not go through STOMP.

- Upload to: `POST /api/rooms/room/{roomId}/message/media`
- Form fields: `file`, `content` optional text caption

Supported file types are image and video uploads.

## 7. REST Endpoints You Still Need

Use REST to bootstrap and resync UI state.

- `POST /api/auth/login`
- `POST /api/auth/register`
- `GET /api/rooms`
- `GET /api/rooms/room/{roomId}/message`
- `GET /api/rooms/room/{roomId}`
- `GET /api/rooms/room/{roomId}/add/friends`
- `GET /api/rooms/{roomId}/messages/search?text=...`
- `GET /api/rooms/messages/search?text=...`
- `POST /api/friend/request/{userId}`
- `POST /api/friend/respond/{userId}/{response}`
- `POST /api/friend/{userId}/cancel`
- `POST /api/friend/{userId}/unfriend`
- `GET /api/friend/requests`
- `GET /api/friend/requests/sent`
- `GET /api/friend/friends`

Suggested frontend flow:

1. Fetch rooms and room history over REST.
2. Open the websocket.
3. Subscribe to the room topics for the active room.
4. Merge realtime updates into local state.
5. On reconnect, refetch the current room and unread counters.

## 8. Payload Shapes

### Message

The backend sends `MessageDto` for live message delivery.

Relevant fields:

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

`messageType` can be:

- `TEXT`
- `IMAGE`
- `VIDEO`

### Room message history

Room history uses `RoomMessageDto`.

Relevant fields:

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

`userInfo` contains:

- `id`
- `username`
- `profileImageUrl`

### Typing event

`TypingEvent` is:

```json
{
  "userId": 7,
  "userName": "alice",
  "typing": true
}
```

### Notification message

The notification envelope is `NotificationMessage<T>`.

Relevant fields:

- `id`
- `type`
- `timestamp`
- `read`
- `payload`

For friend requests, the payload is `FriendRequestPayload`:

- `requestId`
- `event`
- `senderName`
- `senderAvatar`

`event` can be:

- `RECEIVED`
- `ACCEPTED`
- `DECLINED`

## 9. Current Shortcomings and Risks

1. DM routing is inconsistent.
   - The websocket authentication principal is based on username.
   - DM events are now routed through Redis using username too, which is the correct shape for Spring user destinations.
   - The remaining risk is only that the frontend must keep the JWT identity and websocket principal in sync.

2. Redis key serialization is fragile.
   - The current Redis template uses JSON serialization for keys as well as values.
   - Channel names should usually be plain strings.
   - If the serializer changes the channel key format, pub/sub routing can fail silently.

3. The realtime layer is not durable.
   - Redis pub/sub does not persist missed events.
   - If a browser disconnects, events published during the gap are lost.
   - The frontend must refetch state on reconnect.

4. There is no explicit ack or retry model.
   - Messages are stored in the database, but socket delivery is best-effort.
   - The UI should not assume a message was seen just because it was emitted.

5. Subscription naming is inconsistent.
   - Group messages use `/topic/chat.group.{roomId}`.
   - Typing uses `/topic/rooms/{roomId}/typing`.
   - User queues use `/user/queue/messages` and `/user/queue/notifications`.
   - This makes client code harder to standardize.

6. Typing events are not authorized at the message-mapping layer.
   - `sendMessageToRoom` checks membership.
   - `handleTyping` only republishes the event.
   - A client can potentially emit typing events for any room ID it knows.

7. The Redis subscriber deserializes into `Object`.
   - That means event payloads lose type information before they reach the socket.
   - The frontend must defensively handle plain JSON objects rather than strongly typed envelopes.

8. Notifications are split across two approaches.
   - `NotificationService` publishes JSON strings to Redis.
   - `NotificationSubscriber` forwards raw strings to websocket users.
   - `RedisSubscriber` also has a `notification.*` branch that expects object payloads.
   - This duplication suggests the notification path is not fully normalized yet.

9. Some Redis topics are configured but unused.
   - `friend.request.*` is subscribed in Redis config, but nothing in the current code publishes to it.
   - `NotificationType.DM` and `NotificationType.ROOM` exist, but the visible producer only uses `FRIEND_REQUEST`.

10. Origin handling is narrow.
    - The backend allows only a small set of hard-coded frontend origins.
    - Any staging or preview environment must be added explicitly.

11. The websocket setup depends on SockJS.
    - Native WebSocket-only clients will not be enough if you expect parity with the browser setup.
    - Keep the frontend on SockJS unless the backend is changed.

## 10. Practical Frontend Pattern

Use this order in the UI:

1. Fetch room list.
2. Fetch the current room history.
3. Connect to STOMP with the JWT.
4. Subscribe to the active room topics and the user queues.
5. Optimistically render local sends.
6. Reconcile from server events when they come back.
7. On reconnect, reload the active room and unread counters.

## 11. Bottom Line

The integration path is workable, but the current backend implementation still has two important issues for the frontend team:

- DM delivery now uses username consistently, which matches Spring user destinations.
- The realtime transport is best-effort, so the frontend must treat REST as the source of truth and websocket as a live update channel.

## 12. Frontend Checklist

- Log in and store the JWT from `AuthResponse.token`.
- Use the same JWT for all REST calls and the STOMP `CONNECT` frame.
- Open SockJS on `/ws`.
- Subscribe to:
  - `/topic/chat.group.{roomId}`
  - `/topic/rooms/{roomId}/typing`
  - `/user/queue/messages`
  - `/user/queue/notifications`
- Publish text messages to `/app/chat.send/{roomId}`.
- Publish typing events to `/app/chat.typing/{roomId}`.
- Upload media with `POST /api/rooms/room/{roomId}/message/media`.
- Fetch room list and message history over REST before relying on live events.
- Refetch room state after reconnects.
- Treat websocket messages as live updates, not the only source of truth.

## 13. Copy-Paste Frontend Starter

This is the smallest useful client shape for a React frontend.

```ts
import SockJS from "sockjs-client";
import { Client, IMessage } from "@stomp/stompjs";

type MessageDto = {
  id: number;
  senderId: number;
  roomId: number;
  content?: string;
  messageType?: "TEXT" | "IMAGE" | "VIDEO";
  mediaUrl?: string;
  mediaContentType?: string;
  mediaFileName?: string;
  isEdited?: boolean;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type TypingEvent = {
  userId: number;
  userName: string;
  typing: boolean;
};

type NotificationMessage<T> = {
  id: string;
  type: "DM" | "ROOM" | "FRIEND_REQUEST";
  timestamp: string;
  read: boolean;
  payload: T;
};

export function createRealtimeClient(baseUrl: string, token: string) {
  return new Client({
    webSocketFactory: () => new SockJS(`${baseUrl}/ws`),
    connectHeaders: {
      Authorization: `Bearer ${token}`,
    },
    reconnectDelay: 5000,
    debug: () => {},
  });
}

export function wireRealtimeSubscriptions(
  client: Client,
  roomId: number,
  handlers: {
    onMessage: (message: MessageDto) => void;
    onTyping: (event: TypingEvent) => void;
    onNotification: <T>(message: NotificationMessage<T>) => void;
  }
) {
  client.onConnect = () => {
    client.subscribe(`/topic/chat.group.${roomId}`, (frame: IMessage) => {
      handlers.onMessage(JSON.parse(frame.body) as MessageDto);
    });

    client.subscribe(`/topic/rooms/${roomId}/typing`, (frame: IMessage) => {
      handlers.onTyping(JSON.parse(frame.body) as TypingEvent);
    });

    client.subscribe("/user/queue/messages", (frame: IMessage) => {
      handlers.onMessage(JSON.parse(frame.body) as MessageDto);
    });

    client.subscribe("/user/queue/notifications", (frame: IMessage) => {
      handlers.onNotification(JSON.parse(frame.body));
    });
  };
}
```

Recommended usage:

1. Fetch JWT from `/api/auth/login`.
2. Fetch room list and current room history over REST.
3. Create the STOMP client with the JWT.
4. Wire subscriptions for the active room.
5. Activate the client after state is ready.
6. On disconnect or reconnect, re-fetch room history before trusting the socket stream again.
