export type ChatSection = 'chats'

export type Reaction = {
	emoji: string
	userId: number
	userName: string
}

export type Message = {
	id: number
	clientId?: string
	isSent: boolean
	senderName: string
	senderAvatar: string
	senderProfileImageUrl?: string
	senderId?: number
	text: string
	timestamp: string
	messageType?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO'
	mediaUrl?: string
	mediaContentType?: string
	mediaFileName?: string
	deliveryState?: 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
	retryable?: boolean
	reactions?: Reaction[]
}

export type Conversation = {
	id: number
	section: ChatSection
	name: string
	description?: string
	subtitle: string
	time: string
	preview: string
	avatar: string
	avatarImageUrl?: string
	isGroup: boolean
	online?: boolean
	unreadCount?: number
}
