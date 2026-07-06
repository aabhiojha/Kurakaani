export type RoomType = 'GROUP' | 'DIRECT' | 'DM'

export type MessageType = 'TEXT' | 'IMAGE' | 'VIDEO'

export type RoomMemberResponse = {
	roomMemberId: number
	roomId: number
	userId: number
	username: string
	profileImageUrl: string | null
	roomRole: string
	joinedAt: string
}

export type RoomMessageResponse = {
	id: number
	roomId: number
	content?: string | null
	messageType: MessageType
	mediaUrl?: string | null
	mediaContentType?: string | null
	mediaFileName?: string | null
	isEdited: boolean
	isDeleted: boolean
	createdAt: string
	updatedAt: string
	userInfo: {
		id: number
		username: string
		profileImageUrl?: string | null
	}
}

export type SearchedMessageResponse = {
	id: number
	senderId: number
	roomId: number
	content?: string | null
	messageType: MessageType
	mediaUrl?: string | null
	mediaContentType?: string | null
	mediaFileName?: string | null
	isEdited: boolean
	isDeleted: boolean
	createdAt: string
	updatedAt: string
}

export type RecentMessageResponse = {
	id: number
	roomId: number
	content: string
	messageType: MessageType
	sentAt: string
	sender: {
		id: number
		username: string
	}
}

export type RoomSummaryResponse = {
	id: number
	name: string
	description: string
	roomImageUrl?: string | null
	type: RoomType
	memberCount: number
	recentMessage: RecentMessageResponse | null
	unreadCount: number
}

export type RoomResponse = {
	id: number
	name: string
	description: string
	roomImageUrl?: string | null
	members: RoomMemberResponse[]
	messages: RoomMessageResponse[]
	type: RoomType
	createdById: number
	createdAt: string
	updatedAt: string
}
