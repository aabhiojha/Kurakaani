import type { RoomMemberResponse, RoomMessageResponse, RoomSummaryResponse, SearchedMessageResponse } from '../types/api/room'
import type { Conversation, Message, ChatSection } from '../types/chat'
import type { SidebarView } from '../components/layout/Sidebar'

export const isChatSection = (view: SidebarView): view is ChatSection =>
	view === 'chats'

export const getAvatarFromName = (name: string, fallback: string): string => {
	const avatar = name
		.split(' ')
		.map((part) => part[0]?.toUpperCase())
		.filter(Boolean)
		.slice(0, 2)
		.join('')
	return avatar || fallback
}

export const toConversationTime = (timestamp?: string): string => {
	if (!timestamp) return 'Now'
	const parsed = new Date(timestamp)
	if (Number.isNaN(parsed.getTime())) return 'Now'
	return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export const normalizeMessageContent = (value?: string | null): string =>
	(value ?? '').trim().replace(/\s+/g, ' ').toLowerCase()

export const normalizeUserName = (value?: string): string =>
	(value ?? '').trim().toLowerCase()

export const getErrorMessage = (error: unknown, fallback: string): string => {
	if (typeof error !== 'object' || error === null) return fallback
	const maybeError = error as { message?: string }
	return typeof maybeError.message === 'string' && maybeError.message.length > 0
		? maybeError.message
		: fallback
}

const isMessageFromCurrentUser = (
	message: RoomMessageResponse,
	currentUserId: number | undefined,
	currentUserName: string | undefined,
): boolean => {
	if (typeof message.userInfo?.id === 'number' && typeof currentUserId === 'number' && currentUserId > 0) {
		return message.userInfo.id === currentUserId
	}
	const senderName = normalizeUserName(message.userInfo?.username)
	const userName = normalizeUserName(currentUserName)
	return Boolean(senderName && userName && senderName === userName)
}

export const mapRoomToConversation = (room: RoomSummaryResponse): Conversation => {
	const isGroup = room.type === 'GROUP'
	const preview =
		room.recentMessage?.messageType === 'IMAGE'
			? 'Shared an image'
			: room.recentMessage?.messageType === 'VIDEO'
				? 'Shared a video'
				: room.recentMessage?.content || room.description || 'No messages yet'
	return {
		id: room.id,
		section: 'chats',
		name: room.name,
		description: room.description,
		subtitle: isGroup ? `${room.memberCount} MEMBERS` : 'DIRECT MESSAGE',
		time: room.recentMessage ? toConversationTime(room.recentMessage.sentAt) : '',
		preview,
		avatar: getAvatarFromName(room.name, isGroup ? 'GR' : 'DM'),
		avatarImageUrl: room.roomImageUrl ?? undefined,
		isGroup,
		online: isGroup ? undefined : false,
		unreadCount: 0,
	}
}

export const mapRoomMessagesToMessages = (
	messages: RoomMessageResponse[],
	roomName: string,
	roomType: string,
	currentUserId?: number,
	currentUserName?: string,
): Message[] =>
	messages.map((message) => {
		const fromCurrentUser = isMessageFromCurrentUser(message, currentUserId, currentUserName)
		const senderName = message.userInfo?.username || roomName
		return {
			id: message.id,
			isSent: fromCurrentUser,
			senderName: fromCurrentUser ? 'You' : senderName,
			senderAvatar: fromCurrentUser
				? 'YO'
				: getAvatarFromName(senderName, roomType === 'GROUP' ? 'GR' : 'DM'),
			senderProfileImageUrl: message.userInfo?.profileImageUrl ?? undefined,
			senderId: message.userInfo?.id,
			text: message.content ?? '',
			timestamp: toConversationTime(message.createdAt),
			messageType: message.messageType,
			mediaUrl: message.mediaUrl ?? undefined,
			mediaContentType: message.mediaContentType ?? undefined,
			mediaFileName: message.mediaFileName ?? undefined,
		}
	})

export const mapSearchedMessagesToMessages = (
	messages: SearchedMessageResponse[],
	currentUserId?: number,
	roomMembers: RoomMemberResponse[] = [],
): Message[] =>
	messages.map((message) => {
		const fromCurrentUser = typeof currentUserId === 'number' && currentUserId > 0
			? message.senderId === currentUserId
			: false
		const member = roomMembers.find((candidate) => candidate.userId === message.senderId)
		const senderName = fromCurrentUser ? 'You' : (member?.username ?? `User #${message.senderId}`)
		return {
			id: message.id,
			isSent: fromCurrentUser,
			senderName,
			senderAvatar: fromCurrentUser
				? 'YO'
				: getAvatarFromName(senderName, 'DM'),
			senderId: message.senderId,
			senderProfileImageUrl: member?.profileImageUrl ?? undefined,
			text: message.content ?? '',
			timestamp: toConversationTime(message.createdAt),
			messageType: message.messageType,
			mediaUrl: message.mediaUrl ?? undefined,
			mediaContentType: message.mediaContentType ?? undefined,
			mediaFileName: message.mediaFileName ?? undefined,
		}
	})

export const getKnownSenderName = (messages: Message[], senderId?: number, fallback?: string): string => {
	if (typeof senderId !== 'number' || senderId <= 0) return fallback ?? 'Unknown user'
	for (let i = messages.length - 1; i >= 0; i--) {
		const message = messages[i]
		if (message.senderId === senderId && message.senderName && message.senderName !== 'You') {
			return message.senderName
		}
	}
	return fallback ?? `User #${senderId}`
}

export const getKnownSenderProfileImageUrl = (messages: Message[], senderId?: number): string | undefined => {
	if (typeof senderId !== 'number' || senderId <= 0) return undefined
	for (let i = messages.length - 1; i >= 0; i--) {
		const message = messages[i]
		if (message.senderId === senderId && message.senderProfileImageUrl) {
			return message.senderProfileImageUrl
		}
	}
	return undefined
}
