import { Client, type IMessage, type StompSubscription } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import { API_BASE_URL } from '../lib/config'
import type { FriendshipResponse } from '../types/api/friend'

export type ServerMessage = {
	id: number
	senderId: number
	roomId: number
	content?: string | null
	messageType?: 'TEXT' | 'IMAGE' | 'VIDEO'
	mediaUrl?: string | null
	mediaContentType?: string | null
	mediaFileName?: string | null
	isEdited: boolean
	isDeleted: boolean
	createdAt: string
	updatedAt: string
}

export type TypingEvent = {
	userId?: number
	senderId?: number
	roomId?: number
	userName?: string
	username?: string
	typing?: boolean
	isTyping?: boolean
}

export type FriendRequestNotificationPayload = {
	requestId?: string
	event?: 'RECEIVED' | 'ACCEPTED' | 'DECLINED' | 'REMOVED'
	senderName?: string
	senderAvatar?: string | null
	legacyFriendship?: FriendshipResponse
}

export type WebRtcSignal = {
	type: string
	targetUsername: string
	senderUsername?: string
	data: any
}

export type DmNotificationPayload = {
	messageId?: string
	roomId?: string
	preview?: string
	mediaType?: string | null
}

export type RoomNotificationPayload = {
	roomId?: string
	roomName?: string
	event?: 'NEW_MESSAGE'
	preview?: string
}

export type NotificationEvent =
	| {
			id?: string
			timestamp?: string
			type: 'FRIEND_REQUEST'
			payload: FriendRequestNotificationPayload
	  }
	| {
			id?: string
			timestamp?: string
			type: 'DM'
			payload: DmNotificationPayload
	  }
	| {
			id?: string
			timestamp?: string
			type: 'ROOM'
			payload: RoomNotificationPayload
	  }

type LegacyNotificationType =
	| 'FRIEND_REQUEST_RECEIVED'
	| 'FRIEND_REQUEST_ACCEPTED'
	| 'FRIEND_REQUEST_REJECTED'
	| 'FRIEND_REMOVED'

type RawNotificationEvent = {
	id?: string
	timestamp?: string
	type?: string
	payload?: unknown
	data?: unknown
	body?: unknown
}

type ConnectOptions = {
	onConnectChange?: (connected: boolean) => void
	onError?: (error: string) => void
}

export class ChatSocketService {
	private client: Client | null = null
	private roomSubscriptions = new Map<number, StompSubscription[]>()
	private typingSubscriptions = new Map<number, StompSubscription>()
	private directMessageSubscription: StompSubscription | null = null
	private notificationSubscription: StompSubscription | null = null
	private webRtcSubscription: StompSubscription | null = null
	private debug = false

	setDebug(enabled: boolean) {
		this.debug = enabled
	}

	private log(message: string, payload?: unknown) {
		if (!this.debug) {
			return
		}

		if (typeof payload === 'undefined') {
			console.debug(`[ChatSocket] ${message}`)
			return
		}

		console.debug(`[ChatSocket] ${message}`, payload)
	}

	private resolveWebSocketUrl(): string {
		const trimmedBase = API_BASE_URL.trim()
		if (!trimmedBase) {
			return `${window.location.origin.replace(/\/$/, '')}/ws`
		}

		try {
			const resolved = new URL(trimmedBase, window.location.origin)
			if (resolved.pathname.endsWith('/api')) {
				resolved.pathname = resolved.pathname.slice(0, -4) || '/'
			}

			return `${resolved.origin}${resolved.pathname.replace(/\/$/, '')}/ws`
		} catch {
			const normalizedBase = trimmedBase.replace(/\/$/, '')
			return `${normalizedBase}/ws`
		}
	}

	private subscribeToDestination(destination: string, onFrame: (frame: IMessage) => void) {
		if (!this.client?.connected) {
			throw new Error('WebSocket client is not connected')
		}

		return this.client.subscribe(destination, onFrame)
	}

	connect(accessToken: string, options: ConnectOptions = {}) {
		if (!accessToken) {
			options.onError?.('Missing access token for WebSocket connection')
			return
		}

		if (this.client?.active) {
			this.log('connect skipped because client is already active')
			return
		}

		this.log('activating client', {
			url: this.resolveWebSocketUrl(),
			hasAuthHeader: Boolean(accessToken),
			tokenPreview: accessToken ? `${accessToken.slice(0, 12)}...(${accessToken.length})` : null,
		})

		this.client = new Client({
			webSocketFactory: () => new SockJS(this.resolveWebSocketUrl()),
			connectHeaders: {
				Authorization: `Bearer ${accessToken}`,
			},
			reconnectDelay: 5000,
			onConnect: () => {
				this.log('connected')
				options.onConnectChange?.(true)
			},
			onDisconnect: () => {
				this.log('disconnected')
				options.onConnectChange?.(false)
			},
			onStompError: (frame) => {
				this.log('stomp error', {
					message: frame.headers.message,
					headers: frame.headers,
					body: frame.body,
				})
				options.onConnectChange?.(false)
				options.onError?.(frame.headers.message ?? 'WebSocket STOMP error')
			},
			onWebSocketError: (event) => {
				this.log('websocket error', event)
				options.onConnectChange?.(false)
				options.onError?.('WebSocket connection error')
			},
			onWebSocketClose: (event) => {
				this.log('websocket closed', {
					code: event.code,
					reason: event.reason,
					wasClean: event.wasClean,
				})
				options.onConnectChange?.(false)
			},
		})

		this.client.activate()
	}

	isConnected() {
		return Boolean(this.client?.connected)
	}

	subscribe(roomId: number, onMessage: (message: ServerMessage) => void) {
		const existing = this.roomSubscriptions.get(roomId)
		if (existing?.length) {
			this.log('replacing message subscription', { roomId })
		}

		existing?.forEach((subscription) => subscription.unsubscribe())

		const destinations = [`/topic/chat.group.${roomId}`, `/topic/rooms/${roomId}`]
		const subscriptions = destinations.map((destination) =>
			this.subscribeToDestination(destination, (frame: IMessage) => {
				this.log('incoming message frame', { roomId, destination, body: frame.body })
				onMessage(JSON.parse(frame.body) as ServerMessage)
			}),
		)

		this.log('subscribed to room messages', { roomId, destinations })

		this.roomSubscriptions.set(roomId, subscriptions)
		return subscriptions[0]
	}

	unsubscribe(roomId: number) {
		const subscriptions = this.roomSubscriptions.get(roomId)
		subscriptions?.forEach((subscription) => subscription.unsubscribe())
		this.roomSubscriptions.delete(roomId)
		this.log('unsubscribed from room messages', { roomId, destinations: [`/topic/chat.group.${roomId}`, `/topic/rooms/${roomId}`] })
	}

	subscribeToTyping(roomId: number, onTypingEvent: (event: TypingEvent) => void) {
		if (!this.client?.connected) {
			throw new Error('WebSocket client is not connected')
		}

		const existing = this.typingSubscriptions.get(roomId)
		if (existing) {
			this.log('replacing typing subscription', { roomId })
		}
		existing?.unsubscribe()

		const subscription = this.client.subscribe(`/topic/rooms/${roomId}/typing`, (frame: IMessage) => {
			this.log('incoming typing frame', { roomId, body: frame.body })
			onTypingEvent(JSON.parse(frame.body) as TypingEvent)
		})

		this.log('subscribed to typing events', { roomId, destination: `/topic/rooms/${roomId}/typing` })

		this.typingSubscriptions.set(roomId, subscription)
		return subscription
	}

	unsubscribeTyping(roomId: number) {
		const subscription = this.typingSubscriptions.get(roomId)
		subscription?.unsubscribe()
		this.typingSubscriptions.delete(roomId)
		this.log('unsubscribed from typing events', { roomId, destination: `/topic/rooms/${roomId}/typing` })
	}

	subscribeToNotifications(onNotificationEvent: (event: NotificationEvent) => void) {
		if (this.notificationSubscription) {
			this.notificationSubscription.unsubscribe()
			this.notificationSubscription = null
			this.log('replacing notifications subscription')
		}

		this.notificationSubscription = this.subscribeToDestination('/user/queue/notifications', (frame: IMessage) => {
			this.log('incoming notification frame', { body: frame.body })
			const rawEvent = JSON.parse(frame.body) as RawNotificationEvent
			const payload = rawEvent.payload ?? rawEvent.data ?? rawEvent.body

			if (!rawEvent.type || !payload) {
				return
			}

			if (rawEvent.type === 'FRIEND_REQUEST') {
				onNotificationEvent({
					id: rawEvent.id,
					timestamp: rawEvent.timestamp,
					type: 'FRIEND_REQUEST',
					payload: payload as FriendRequestNotificationPayload,
				})
				return
			}

			if (rawEvent.type === 'DM') {
				onNotificationEvent({
					id: rawEvent.id,
					timestamp: rawEvent.timestamp,
					type: 'DM',
					payload: payload as DmNotificationPayload,
				})
				return
			}

			if (rawEvent.type === 'ROOM') {
				onNotificationEvent({
					id: rawEvent.id,
					timestamp: rawEvent.timestamp,
					type: 'ROOM',
					payload: payload as RoomNotificationPayload,
				})
				return
			}

			const legacyType = rawEvent.type as LegacyNotificationType
			const legacyPayload = payload as FriendshipResponse
			const legacyEventMap: Record<LegacyNotificationType, FriendRequestNotificationPayload['event']> = {
				FRIEND_REQUEST_RECEIVED: 'RECEIVED',
				FRIEND_REQUEST_ACCEPTED: 'ACCEPTED',
				FRIEND_REQUEST_REJECTED: 'DECLINED',
				FRIEND_REMOVED: 'REMOVED',
			}

			if (!(legacyType in legacyEventMap)) {
				return
			}

			onNotificationEvent({
				type: 'FRIEND_REQUEST',
				payload: {
					requestId: String(legacyPayload.id),
					event: legacyEventMap[legacyType],
					senderName: legacyPayload.requesterName ?? legacyPayload.recipientName,
					legacyFriendship: legacyPayload,
				},
			})
		})

		this.log('subscribed to notifications', { destination: '/user/queue/notifications' })
		return this.notificationSubscription
	}

	subscribeToDirectMessages(onMessage: (message: ServerMessage) => void) {
		if (this.directMessageSubscription) {
			this.directMessageSubscription.unsubscribe()
			this.directMessageSubscription = null
			this.log('replacing direct message subscription')
		}

		this.directMessageSubscription = this.subscribeToDestination('/user/queue/messages', (frame: IMessage) => {
			this.log('incoming direct message frame', { body: frame.body })
			onMessage(JSON.parse(frame.body) as ServerMessage)
		})

		this.log('subscribed to direct messages', { destination: '/user/queue/messages' })
		return this.directMessageSubscription
	}

	unsubscribeNotifications() {
		this.notificationSubscription?.unsubscribe()
		this.notificationSubscription = null
		this.log('unsubscribed from notifications', { destination: '/user/queue/notifications' })
	}

	subscribeToWebRTC(onSignal: (signal: WebRtcSignal) => void) {
		if (this.webRtcSubscription) {
			this.webRtcSubscription.unsubscribe()
			this.webRtcSubscription = null
		}

		this.webRtcSubscription = this.subscribeToDestination('/user/queue/webrtc', (frame: IMessage) => {
			this.log('incoming webrtc frame', { body: frame.body })
			onSignal(JSON.parse(frame.body) as WebRtcSignal)
		})

		this.log('subscribed to webrtc signals', { destination: '/user/queue/webrtc' })
		return this.webRtcSubscription
	}

	unsubscribeWebRTC() {
		this.webRtcSubscription?.unsubscribe()
		this.webRtcSubscription = null
		this.log('unsubscribed from webrtc signals', { destination: '/user/queue/webrtc' })
	}

	sendWebRtcSignal(signal: WebRtcSignal) {
		if (!this.client?.connected) {
			return false
		}

		this.client.publish({
			destination: `/app/webrtc/signal`,
			body: JSON.stringify(signal),
		})
		this.log('published webrtc signal', { destination: `/app/webrtc/signal`, signal })

		return true
	}

	unsubscribeDirectMessages() {
		this.directMessageSubscription?.unsubscribe()
		this.directMessageSubscription = null
		this.log('unsubscribed from direct messages', { destination: '/user/queue/messages' })
	}

	send(roomId: number, content: string) {
		if (!this.client?.connected) {
			return false
		}

		this.client.publish({
			destination: `/app/chat.send/${roomId}`,
			body: JSON.stringify({ content }),
		})
		this.log('published room message', { roomId, destination: `/app/chat.send/${roomId}`, content })

		return true
	}

	sendTyping(roomId: number, payload: TypingEvent) {
		if (!this.client?.connected) {
			return false
		}

		this.client.publish({
			destination: `/app/chat.typing/${roomId}`,
			body: JSON.stringify(payload),
		})
		this.log('published typing event', { roomId, destination: `/app/chat.typing/${roomId}`, payload })

		return true
	}

	disconnect() {
		this.log('disconnecting client')
		this.roomSubscriptions.forEach((subscriptions) =>
			subscriptions.forEach((subscription) => subscription.unsubscribe()),
		)
		this.roomSubscriptions.clear()
		this.typingSubscriptions.forEach((subscription) => subscription.unsubscribe())
		this.typingSubscriptions.clear()
		this.unsubscribeDirectMessages()
		this.unsubscribeWebRTC()
		this.notificationSubscription?.unsubscribe()
		this.notificationSubscription = null
		this.client?.deactivate()
		this.client = null
	}
}
