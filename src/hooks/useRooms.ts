import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
	addUsersToRoom,
	createGroupRoom,
	createOrGetDirectRoom,
	getRoomMembers,
	getRoomMessages,
	getRooms,
	removeUsersFromRoom,
	updateGroupRoom,
	upgradeRoomToGroup,
	uploadRoomMedia,
} from '../services/roomService'
import {
	getAvatarFromName,
	getErrorMessage,
	mapRoomMessagesToMessages,
	mapRoomToConversation,
} from '../lib/chatUtils'
import type { Conversation, Message, ChatSection } from '../types/chat'
import type { RoomMemberResponse } from '../types/api/room'
import type { CurrentUserResponse, SessionState } from '../types/api/session'

const CONVERSATIONS_STORAGE_KEY = 'kurakaani-conversations-state'
const MESSAGES_STORAGE_KEY = 'kurakaani-messages-state'
const SELECTED_CONVERSATION_STORAGE_KEY = 'kurakaani-selected-conversation-id'

const loadPersistedConversations = (): Record<ChatSection, Conversation[]> => {
	const empty: Record<ChatSection, Conversation[]> = { chats: [] }
	if (typeof window === 'undefined') return empty
	try {
		const raw = window.localStorage.getItem(CONVERSATIONS_STORAGE_KEY)
		if (!raw) return empty
		const parsed = JSON.parse(raw) as Record<ChatSection, Conversation[]>
		if (!Array.isArray(parsed?.chats)) return empty
		return parsed
	} catch {
		return empty
	}
}

const loadPersistedMessages = (): Record<number, Message[]> => {
	if (typeof window === 'undefined') return {}
	try {
		const raw = window.localStorage.getItem(MESSAGES_STORAGE_KEY)
		if (!raw) return {}
		return JSON.parse(raw) as Record<number, Message[]>
	} catch {
		return {}
	}
}

export function useRooms(
	session: SessionState | null,
	currentUserProfile: CurrentUserResponse | undefined,
	setBackendStatus: (status: string) => void,
	setActiveView: (view: 'chats') => void,
) {
	const [conversationsState, setConversationsState] = useState<Record<ChatSection, Conversation[]>>(
		() => loadPersistedConversations(),
	)
	const [messagesByConversation, setMessagesByConversation] = useState<Record<number, Message[]>>(
		() => loadPersistedMessages(),
	)
	const [selectedConversationId, setSelectedConversationId] = useState<number | null>(() => {
		if (typeof window === 'undefined') return null
		const saved = window.localStorage.getItem(SELECTED_CONVERSATION_STORAGE_KEY)
		if (!saved) return null
		const parsed = Number(saved)
		return Number.isNaN(parsed) ? null : parsed
	})
	const [newChatTrigger, setNewChatTrigger] = useState(0)
	const [roomMembersByConversation, setRoomMembersByConversation] = useState<
		Record<number, RoomMemberResponse[]>
	>({})
	const [roomMembersStatus, setRoomMembersStatus] = useState<string | null>(null)
	const [isRoomMembersLoading, setIsRoomMembersLoading] = useState(false)

	// Ref shared with useChatSocket to coordinate media upload deduplication.
	const pendingMediaUploadsRef = useRef<Map<number, number>>(new Map())

	// Persistence
	useEffect(() => {
		window.localStorage.setItem(CONVERSATIONS_STORAGE_KEY, JSON.stringify(conversationsState))
	}, [conversationsState])

	useEffect(() => {
		window.localStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(messagesByConversation))
	}, [messagesByConversation])

	useEffect(() => {
		if (selectedConversationId === null) {
			window.localStorage.removeItem(SELECTED_CONVERSATION_STORAGE_KEY)
		} else {
			window.localStorage.setItem(SELECTED_CONVERSATION_STORAGE_KEY, String(selectedConversationId))
		}
	}, [selectedConversationId])

	// Sync all rooms and their messages from the backend on login.
	useEffect(() => {
		if (!session?.accessToken) return
		let cancelled = false

		const syncRooms = async () => {
			try {
				const rooms = await getRooms()
				if (cancelled || !Array.isArray(rooms)) return

				const nextConversations: Record<ChatSection, Conversation[]> = { chats: [] }
				for (const room of rooms) {
					const conversation = mapRoomToConversation(room)
					nextConversations.chats.push(conversation)
				}

				const messageResults = await Promise.allSettled(
					rooms.map((room) => getRoomMessages(room.id)),
				)
				const nextMessages: Record<number, Message[]> = {}
				for (let i = 0; i < rooms.length; i++) {
					const result = messageResults[i]
					nextMessages[rooms[i].id] =
						result.status === 'fulfilled' && Array.isArray(result.value)
							? mapRoomMessagesToMessages(
									result.value,
									rooms[i].name,
									rooms[i].type,
									session.user.id,
									session.user.name,
								)
							: []
				}

				if (cancelled) return

				if (nextConversations.chats.length > 0) {
					setConversationsState(nextConversations)
					setMessagesByConversation((prev) => ({ ...prev, ...nextMessages }))
					setSelectedConversationId((prev) => {
						if (prev === null) return null
						const exists = nextConversations.chats.some((c) => c.id === prev)
						return exists ? prev : null
					})
					setBackendStatus(`Loaded ${rooms.length} rooms from backend.`)
				} else {
					setConversationsState({ chats: [] })
					setMessagesByConversation({})
					setSelectedConversationId(null)
					setBackendStatus('No backend rooms found yet. Create a room to start chatting.')
				}
			} catch {
				if (!cancelled) setBackendStatus('Failed to load rooms from backend.')
			}
		}

		void syncRooms()
		return () => { cancelled = true }
	}, [session?.accessToken, session?.user.id, session?.user.name, setBackendStatus])

	// ── Internal helpers ──────────────────────────────────────────────────────

	const loadRoomMembers = useCallback(async (roomId: number) => {
		setIsRoomMembersLoading(true)
		try {
			const members = await getRoomMembers(roomId)
			setRoomMembersByConversation((prev) => ({ ...prev, [roomId]: members }))
			setRoomMembersStatus(
				`Loaded ${members.length} member${members.length === 1 ? '' : 's'} for room ${roomId}.`,
			)
			return members
		} catch {
			setRoomMembersStatus('Failed to load room members.')
			return [] as RoomMemberResponse[]
		} finally {
			setIsRoomMembersLoading(false)
		}
	}, [])

	const updateConversationSummary = useCallback((
		roomId: number,
		updates: { name?: string; description?: string; memberCount?: number },
	) => {
		setConversationsState((prev) => {
			const apply = (c: Conversation): Conversation => {
				if (c.id !== roomId) return c
				const nextName = updates.name ?? c.name
				const nextDesc = updates.description ?? c.description
				return {
					...c,
					name: nextName,
					description: nextDesc,
					subtitle:
						c.isGroup && typeof updates.memberCount === 'number'
							? `${updates.memberCount} MEMBERS`
							: c.subtitle,
					preview: nextDesc || c.preview,
					avatar: getAvatarFromName(nextName, c.isGroup ? 'GR' : 'DM'),
					unreadCount: c.unreadCount ?? 0,
				}
			}
			return { chats: prev.chats.map(apply) }
		})
	}, [])

	const touchConversation = useCallback((
		roomId: number,
		updates: { preview?: string; time?: string; unreadDelta?: number; senderName?: string },
	) => {
		setConversationsState((prev) => {
			const updateList = (conversations: Conversation[]) => {
				const index = conversations.findIndex((conversation) => conversation.id === roomId)
				if (index < 0) {
					return conversations
				}

				const current = conversations[index]
				const nextUnreadCount = Math.max(0, (current.unreadCount ?? 0) + (updates.unreadDelta ?? 0))
				const rawPreview = updates.preview ?? current.preview
				const nextPreview = (current.isGroup && updates.senderName && updates.preview)
					? `${updates.senderName}: ${updates.preview}`
					: rawPreview

				const nextConversation: Conversation = {
					...current,
					preview: nextPreview,
					time: updates.time ?? current.time,
					unreadCount: nextUnreadCount,
				}

				return [nextConversation, ...conversations.slice(0, index), ...conversations.slice(index + 1)]
			}

			return {
				chats: updateList(prev.chats),
			}
		})
	}, [])

	const clearConversationUnread = useCallback((roomId: number) => {
		setConversationsState((prev) => {
			const resetList = (conversations: Conversation[]) =>
				conversations.map((conversation) =>
					conversation.id === roomId
						? {
								...conversation,
								unreadCount: 0,
							}
						: conversation,
				)

			return {
				chats: resetList(prev.chats),
			}
		})
	}, [])

	const buildConversation = useCallback((
		roomId: number,
		name: string,
		description: string,
		isGroup: boolean,
	): Conversation => ({
		id: roomId,
		section: 'chats',
		name,
		description,
		subtitle: isGroup ? 'NEW GROUP' : 'DIRECT MESSAGE',
		time: 'Now',
		preview: description || 'No messages yet',
		avatar: name.split(' ').map((p) => p[0]?.toUpperCase()).filter(Boolean).slice(0, 2).join('') || (isGroup ? 'GR' : 'DM'),
		isGroup,
		online: isGroup ? undefined : true,
		unreadCount: 0,
	}), [])

	const addLocalConversation = useCallback((conversation: Conversation, systemText: string) => {
		setConversationsState((prev) => ({
			chats: [conversation, ...prev.chats],
		}))
		const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
		setMessagesByConversation((prev) => ({
			...prev,
			[conversation.id]: [
				{ id: 1, isSent: false, senderName: 'System', senderAvatar: 'SYS', text: systemText, timestamp },
			],
		}))
		setSelectedConversationId(conversation.id)
	}, [])

	// ── Public handlers ───────────────────────────────────────────────────────

	const handleCreateGroup = useCallback(async (name: string, description: string) => {
		if (!session?.accessToken) {
			const id = Date.now()
			addLocalConversation(buildConversation(id, name, description, true), `Room "${name}" created.`)
			setActiveView('chats')
			setBackendStatus('Group created locally. Sign in to create groups on backend.')
			return { ok: true as const }
		}
		try {
			const room = (await createGroupRoom({ name, description, type: 'GROUP' })) as { id?: number }
			const id = typeof room?.id === 'number' ? room.id : Date.now()
			addLocalConversation(buildConversation(id, name, description, true), `Room "${name}" created.`)
			setActiveView('chats')
			setBackendStatus(`Group "${name}" created on backend.`)
			return { ok: true as const }
		} catch {
			return { ok: false as const, error: 'Backend room creation failed. Please try again.' }
		}
	}, [addLocalConversation, buildConversation, setActiveView, session?.accessToken, setBackendStatus])

	const handleCreateDirect = useCallback(async (name: string, description?: string) => {
		const nextDescription = description?.trim() ?? ''
		if (!session?.accessToken) {
			const id = Date.now()
			addLocalConversation(
				buildConversation(id, name, nextDescription, false),
				`Direct chat with "${name}" created.`,
			)
			setActiveView('chats')
			setBackendStatus('Direct chat created locally. Sign in to create DMs on backend.')
			return { ok: true as const }
		}
		const userId = Number(name.trim())
		if (!Number.isInteger(userId) || userId <= 0) {
			return { ok: false as const, error: 'Enter a valid user ID to create a direct chat.' }
		}
		try {
			const room = (await createOrGetDirectRoom(userId)) as { id?: number }
			const id = typeof room?.id === 'number' ? room.id : Date.now()
			addLocalConversation(
				buildConversation(id, `User #${userId}`, nextDescription, false),
				`Direct chat with "User #${userId}" created.`,
			)
			setActiveView('chats')
			setBackendStatus(`Direct chat with user ${userId} created on backend.`)
			return { ok: true as const }
		} catch {
			return { ok: false as const, error: 'Backend direct chat creation failed. Use a valid target user ID.' }
		}
	}, [addLocalConversation, buildConversation, setActiveView, session?.accessToken, setBackendStatus])

	const handleAddUsersToRoom = useCallback(async (conversationId: number, userIds: number[]) => {
		const conversation =
			conversationsState.chats.find((c) => c.id === conversationId)

		if (conversation && !conversation.isGroup) {
			await upgradeRoomToGroup(conversationId, userIds)
			setConversationsState((prev) => {
				const existing = prev.chats.find((c) => c.id === conversationId)
				if (!existing) return prev
				return {
					chats: prev.chats.map(c => c.id === conversationId ? { ...c, isGroup: true, subtitle: 'GROUP' } : c),
				}
			})
			setActiveView('chats')
		}

		await addUsersToRoom(conversationId, userIds)
		const members = await loadRoomMembers(conversationId)
		updateConversationSummary(conversationId, { memberCount: members.length })
		setBackendStatus(
			`Added ${userIds.length} user${userIds.length === 1 ? '' : 's'} to room ${conversationId}.`,
		)
	}, [loadRoomMembers, updateConversationSummary, setActiveView, conversationsState, setBackendStatus])

	const handleUpdateRoomDetails = useCallback(async (
		conversationId: number,
		updates: { name?: string; description?: string },
	) => {
		const payload = {
			...(updates.name ? { name: updates.name } : {}),
			...(typeof updates.description === 'string' ? { description: updates.description } : {}),
		}
		const updatedRoom = await updateGroupRoom(conversationId, payload)
		updateConversationSummary(conversationId, {
			name: updatedRoom.name,
			description: updatedRoom.description,
			memberCount: updatedRoom.members.length,
		})
		setRoomMembersByConversation((prev) => ({ ...prev, [conversationId]: updatedRoom.members }))
		setBackendStatus(`Updated room ${conversationId} settings.`)
	}, [updateConversationSummary, setBackendStatus])

	const handleRemoveMembersFromRoom = useCallback(async (conversationId: number, memberIds: number[]) => {
		await removeUsersFromRoom(conversationId, memberIds)
		const members = await loadRoomMembers(conversationId)
		updateConversationSummary(conversationId, { memberCount: members.length })
		setBackendStatus(
			`Removed ${memberIds.length} member${memberIds.length === 1 ? '' : 's'} from room ${conversationId}.`,
		)
	}, [loadRoomMembers, updateConversationSummary, setBackendStatus])

	const handleUploadMedia = useCallback(async (conversationId: number, file: File, caption?: string) => {
		if (!session?.accessToken) {
			setBackendStatus('Sign in to upload images or videos.')
			return
		}
		pendingMediaUploadsRef.current.set(
			conversationId,
			(pendingMediaUploadsRef.current.get(conversationId) ?? 0) + 1,
		)
		try {
			const uploaded = await uploadRoomMedia(conversationId, file, caption)
			const count = pendingMediaUploadsRef.current.get(conversationId) ?? 0
			if (count <= 1) pendingMediaUploadsRef.current.delete(conversationId)
			else pendingMediaUploadsRef.current.set(conversationId, count - 1)

			setMessagesByConversation((prev) => {
				const current = prev[conversationId] ?? []
				if (current.some((m) => m.id === uploaded.id)) return prev
				const timestamp = uploaded.createdAt
					? new Date(uploaded.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
					: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
				const preview =
					uploaded.messageType === 'IMAGE'
						? 'Shared an image'
						: uploaded.messageType === 'VIDEO'
							? 'Shared a video'
							: uploaded.content ?? ''
				touchConversation(conversationId, { preview: preview || 'New message', time: timestamp })
				return {
					...prev,
					[conversationId]: [
						...current,
						{
							id: uploaded.id,
							isSent: true,
							senderName: 'You',
							senderAvatar: 'YO',
							senderProfileImageUrl:
								currentUserProfile?.profileImageUrl ?? session.user.profileImageUrl,
							senderId: session.user.id,
							text: uploaded.content ?? '',
							timestamp,
							messageType: uploaded.messageType,
							mediaUrl: uploaded.mediaUrl ?? undefined,
							mediaContentType: uploaded.mediaContentType ?? undefined,
							mediaFileName: uploaded.mediaFileName ?? undefined,
						},
					],
				}
			})
			setBackendStatus(
				`Uploaded ${file.type.startsWith('video/') ? 'video' : 'image'} to room ${conversationId}.`,
			)
		} catch (error) {
			const count = pendingMediaUploadsRef.current.get(conversationId) ?? 0
			if (count <= 1) pendingMediaUploadsRef.current.delete(conversationId)
			else pendingMediaUploadsRef.current.set(conversationId, count - 1)
			setBackendStatus(getErrorMessage(error, 'Media upload failed. Please try again.'))
		}
	}, [currentUserProfile?.profileImageUrl, pendingMediaUploadsRef, session?.accessToken, session?.user.id, session?.user.profileImageUrl, setBackendStatus, setMessagesByConversation, touchConversation])

	const clearRooms = useCallback(() => {
		setConversationsState({ chats: [] })
		setMessagesByConversation({})
		setSelectedConversationId(null)
		setRoomMembersByConversation({})
		pendingMediaUploadsRef.current.clear()
	}, [pendingMediaUploadsRef, setMessagesByConversation])

	return useMemo(() => ({
		conversationsState,
		setConversationsState,
		messagesByConversation,
		setMessagesByConversation,
		selectedConversationId,
		setSelectedConversationId,
		newChatTrigger,
		setNewChatTrigger,
		roomMembersByConversation,
		roomMembersStatus,
		isRoomMembersLoading,
		pendingMediaUploadsRef,
		loadRoomMembers,
		handleCreateGroup,
		handleCreateDirect,
		handleAddUsersToRoom,
		handleUpdateRoomDetails,
		handleRemoveMembersFromRoom,
		handleUploadMedia,
		touchConversation,
		clearConversationUnread,
		clearRooms,
	}), [
		conversationsState,
		messagesByConversation,
		selectedConversationId,
		newChatTrigger,
		roomMembersByConversation,
		roomMembersStatus,
		isRoomMembersLoading,
		loadRoomMembers,
		handleCreateGroup,
		handleCreateDirect,
		handleAddUsersToRoom,
		handleUpdateRoomDetails,
		handleRemoveMembersFromRoom,
		handleUploadMedia,
		touchConversation,
		clearConversationUnread,
		clearRooms,
		pendingMediaUploadsRef,
	])
}
