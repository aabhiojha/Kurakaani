import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent, KeyboardEvent } from 'react'
import { CircleEllipsis, Image as ImageIcon, Loader2, Plus, Search, SendHorizontal, Smile, UserPlus, Users, Video, Phone, Mic, Square } from 'lucide-react'
import { ChatMessage } from './ChatMessage'

// Lazy-loaded so the emoji widget + its index stay out of the initial bundle.
const EmojiPickerPanel = lazy(() => import('./EmojiPickerPanel'))
import { Button } from '../ui'
import { resolveAssetUrl } from '../../lib/config'
import { getAddableFriends, addUsersToRoom, searchMessagesInRoom } from '../../services/roomService'
import { mapSearchedMessagesToMessages } from '../../lib/chatUtils'
import type { Conversation, Message } from '../../types/chat'
import type { RoomMemberResponse } from '../../types/api/room'
import type { FriendUserResponse } from '../../types/api/friend'

const RIGHT_PANEL_MODE_STORAGE_KEY = 'kurakaani-chat-right-panel-mode'
const RIGHT_PANEL_WIDTH_STORAGE_KEY = 'kurakaani-chat-right-panel-width'
const DRAFTS_STORAGE_KEY = 'kurakaani-chat-drafts'

type ChatViewProps = {
	conversation?: Conversation
	messages: Message[]
	typingUsers?: Array<{ userName: string }>
	currentUserId?: number
	roomMembers?: RoomMemberResponse[]
	isRoomMembersLoading?: boolean
	roomMembersStatus?: string | null
	onSendMessage: (conversationId: number, text: string) => void
	onTypingStart?: (conversationId: number) => void
	onTypingStop?: (conversationId: number) => void
	onUploadMedia?: (conversationId: number, file: File, caption?: string) => void | Promise<void>
	onAddUsersToRoom?: (conversationId: number, userIds: number[]) => Promise<void>
	onUpdateRoomDetails?: (conversationId: number, updates: { name?: string; description?: string }) => Promise<void>
	onRemoveMembersFromRoom?: (conversationId: number, memberIds: number[]) => Promise<void>
	onRetryMessage?: (conversationId: number, messageId: number) => void
	onSendReaction?: (conversationId: number, messageId: number, emoji: string) => void
	onStartVideoCall?: () => void
	onStartAudioCall?: () => void
	isSendDisabled?: boolean
	isDarkMode?: boolean
}

export function ChatView({
	conversation,
	messages,
	typingUsers = [],
	currentUserId,
	roomMembers = [],
	isRoomMembersLoading = false,
	roomMembersStatus = null,
	onSendMessage,
	onTypingStart,
	onTypingStop,
	onUploadMedia,
	onAddUsersToRoom,
	onUpdateRoomDetails,
	onRemoveMembersFromRoom,
	onRetryMessage,
	onSendReaction,
	onStartVideoCall,
	onStartAudioCall,
	isSendDisabled = false,
	isDarkMode = false,
}: ChatViewProps) {
	const conversationId = conversation?.id
	const conversationName = conversation?.name ?? 'Conversation'
	const conversationDescription = conversation?.description ?? ''
	const conversationIsGroup = conversation?.isGroup ?? false

	const [draftsByConversation, setDraftsByConversation] = useState<Record<number, string>>(() => {
		if (typeof window === 'undefined') {
			return {}
		}

		try {
			const raw = window.sessionStorage.getItem(DRAFTS_STORAGE_KEY)
			if (!raw) {
				return {}
			}
			return JSON.parse(raw) as Record<number, string>
		} catch {
			return {}
		}
	})
	const [isEmojiOpen, setIsEmojiOpen] = useState(false)
	const [rightPanelMode, setRightPanelMode] = useState<'settings' | 'info' | null>(() => {
		if (typeof window === 'undefined') {
			return null
		}

		const saved = window.localStorage.getItem(RIGHT_PANEL_MODE_STORAGE_KEY)
		return saved === 'settings' || saved === 'info' ? saved : null
	})
	const [rightPanelWidth, setRightPanelWidth] = useState(() => {
		if (typeof window === 'undefined') {
			return 360
		}

		const saved = Number(window.localStorage.getItem(RIGHT_PANEL_WIDTH_STORAGE_KEY))
		if (Number.isNaN(saved)) {
			return 360
		}

		return Math.max(320, Math.min(560, saved))
	})
	const [isResizingRightPanel, setIsResizingRightPanel] = useState(false)
	const [roomNameInput, setRoomNameInput] = useState(conversationName)
	const [roomDescriptionInput, setRoomDescriptionInput] = useState(conversationDescription)
	const [roomSettingsError, setRoomSettingsError] = useState<string | null>(null)
	const [isUpdatingRoom, setIsUpdatingRoom] = useState(false)
	const [removingMemberId, setRemovingMemberId] = useState<number | null>(null)
	const [addableFriends, setAddableFriends] = useState<FriendUserResponse[]>([])
	const [isLoadingAddable, setIsLoadingAddable] = useState(false)
	const [isSearchOpen, setIsSearchOpen] = useState(false)
	const [searchText, setSearchText] = useState('')
	const [searchedMessages, setSearchedMessages] = useState<Message[]>([])
	const [searchStatus, setSearchStatus] = useState<string | null>(null)
	const [isSearching, setIsSearching] = useState(false)
	const [hasSearched, setHasSearched] = useState(false)
	const [showJumpToLatest, setShowJumpToLatest] = useState(false)
	const layoutRef = useRef<HTMLElement | null>(null)
	const messagesContainerRef = useRef<HTMLDivElement | null>(null)
	const messagesContentRef = useRef<HTMLDivElement | null>(null)
	const emojiPickerRef = useRef<HTMLDivElement | null>(null)
	const fileInputRef = useRef<HTMLInputElement | null>(null)
	
	// Voice Recording State
	const [isRecording, setIsRecording] = useState(false)
	const [recordingTime, setRecordingTime] = useState(0)
	const mediaRecorderRef = useRef<MediaRecorder | null>(null)
	const audioChunksRef = useRef<Blob[]>([])
	const recordingIntervalRef = useRef<number | null>(null)

	const typingStopTimeoutRef = useRef<number | null>(null)
	const isTypingBurstActiveRef = useRef(false)
	const shouldStickToBottomRef = useRef(true)
	const isCurrentUserAdmin = conversationIsGroup && typeof currentUserId === 'number'
		? roomMembers.some((member) => member.userId === currentUserId && member.roomRole.toUpperCase() === 'ADMIN')
		: false
	const isRightPanelOpen = rightPanelMode !== null
	const displayedMessages = hasSearched ? searchedMessages : messages
	const draft = conversationId ? draftsByConversation[conversationId] ?? '' : ''
	const typingAvatar =
		typingUsers[0]?.userName
			?.split(' ')
			.map((part) => part[0]?.toUpperCase())
			.filter(Boolean)
			.slice(0, 2)
			.join('') || 'TY'

	const getSenderKey = (message: Message) => {
		if (typeof message.senderId === 'number' && message.senderId > 0) {
			return `${message.isSent ? 'sent' : 'received'}:${message.senderId}`
		}

		return `${message.isSent ? 'sent' : 'received'}:${message.senderName}`
	}

	const isGroupedWith = (left?: Message, right?: Message) => {
		if (!left || !right) {
			return false
		}

		return getSenderKey(left) === getSenderKey(right)
	}

	const scrollMessagesToBottom = () => {
		const container = messagesContainerRef.current
		if (!container) {
			return
		}

		container.scrollTop = container.scrollHeight
	}

	const setDraftForConversation = (value: string) => {
		if (!conversationId) {
			return
		}

		setDraftsByConversation((previous) => ({
			...previous,
			[conversationId]: value,
		}))
	}

	const clearTypingStopTimeout = useCallback(() => {
		if (typingStopTimeoutRef.current === null) {
			return
		}

		window.clearTimeout(typingStopTimeoutRef.current)
		typingStopTimeoutRef.current = null
	}, [])

	const stopTyping = useCallback(() => {
		clearTypingStopTimeout()

		if (!isTypingBurstActiveRef.current) {
			return
		}

		isTypingBurstActiveRef.current = false
		if (!conversationId) {
			return
		}

		onTypingStop?.(conversationId)
	}, [clearTypingStopTimeout, conversationId, onTypingStop])

	const startTyping = useCallback(() => {
		if (isSendDisabled || !onTypingStart || !onTypingStop || !conversationId) {
			return
		}

		if (!isTypingBurstActiveRef.current) {
			onTypingStart(conversationId)
			isTypingBurstActiveRef.current = true
		}

		clearTypingStopTimeout()
		typingStopTimeoutRef.current = window.setTimeout(() => {
			isTypingBurstActiveRef.current = false
			onTypingStop(conversationId)
			typingStopTimeoutRef.current = null
		}, 2000)
	}, [conversationId, isSendDisabled, onTypingStart, onTypingStop, clearTypingStopTimeout])

	useEffect(() => {
		const container = messagesContainerRef.current
		if (!container) {
			return
		}

		const handleScroll = () => {
			const distanceToBottom = container.scrollHeight - container.scrollTop - container.clientHeight
			shouldStickToBottomRef.current = distanceToBottom <= 24
			setShowJumpToLatest(distanceToBottom > 120)
		}

		handleScroll()
		container.addEventListener('scroll', handleScroll)

		return () => {
			container.removeEventListener('scroll', handleScroll)
		}
	}, [conversationId])

	const startRecording = async () => {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
			const mediaRecorder = new MediaRecorder(stream)
			mediaRecorderRef.current = mediaRecorder
			audioChunksRef.current = []

			mediaRecorder.ondataavailable = (event) => {
				if (event.data.size > 0) {
					audioChunksRef.current.push(event.data)
				}
			}

			mediaRecorder.onstop = async () => {
				const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
				const file = new File([audioBlob], 'voice-message.webm', { type: 'audio/webm' })
				if (onUploadMedia && conversation) {
					try {
						await onUploadMedia(conversation.id, file)
					} catch (e) {
						console.error('[WebRTC] Voice message upload failed', e)
					}
				}
				stream.getTracks().forEach((track) => track.stop())
				setRecordingTime(0)
			}

			mediaRecorder.start()
			setIsRecording(true)
			setRecordingTime(0)
			recordingIntervalRef.current = window.setInterval(() => {
				setRecordingTime(prev => prev + 1)
			}, 1000)
		} catch (e) {
			console.error('[WebRTC] Failed to start recording', e)
			alert('Could not access microphone for voice message.')
		}
	}

	const stopRecording = () => {
		if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
			mediaRecorderRef.current.stop()
		}
		setIsRecording(false)
		if (recordingIntervalRef.current) {
			window.clearInterval(recordingIntervalRef.current)
			recordingIntervalRef.current = null
		}
	}

	const formatRecordingTime = (seconds: number) => {
		const mins = Math.floor(seconds / 60)
		const secs = seconds % 60
		return `${mins}:${secs.toString().padStart(2, '0')}`
	}

	useEffect(() => {
		shouldStickToBottomRef.current = true
		setShowJumpToLatest(false)
		scrollMessagesToBottom()
		requestAnimationFrame(() => {
			scrollMessagesToBottom()
		})
		window.setTimeout(() => {
			scrollMessagesToBottom()
		}, 80)
	}, [conversationId])

	useEffect(() => {
		if (!shouldStickToBottomRef.current) {
			return
		}
		setShowJumpToLatest(false)

		scrollMessagesToBottom()
		requestAnimationFrame(() => {
			scrollMessagesToBottom()
		})
	}, [messages])

	useEffect(() => {
		const container = messagesContainerRef.current
		const content = messagesContentRef.current
		if (!container || !content) {
			return
		}

		const observer = new ResizeObserver(() => {
			if (!shouldStickToBottomRef.current) {
				return
			}

			scrollMessagesToBottom()
		})

		observer.observe(content)

		return () => {
			observer.disconnect()
		}
	}, [conversationId])

	useEffect(() => {
		if (typeof window === 'undefined') {
			return
		}

		window.sessionStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(draftsByConversation))
	}, [draftsByConversation])

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (!emojiPickerRef.current) {
				return
			}

			if (!emojiPickerRef.current.contains(event.target as Node)) {
				setIsEmojiOpen(false)
			}
		}

		document.addEventListener('mousedown', handleClickOutside)
		return () => {
			document.removeEventListener('mousedown', handleClickOutside)
		}
	}, [])

	useEffect(() => {
		setRoomNameInput(conversationName)
		setRoomDescriptionInput(conversationDescription)
		setRoomSettingsError(null)
		setAddableFriends([])
		setIsSearchOpen(false)
		setSearchText('')
		setSearchedMessages([])
		setSearchStatus(null)
		setHasSearched(false)
	}, [conversationId, conversationName, conversationDescription])

	useEffect(() => {
		if (rightPanelMode !== 'settings' || !conversationId) return
		let disposed = false

		setIsLoadingAddable(true)
		getAddableFriends(conversationId)
			.then((data) => { if (!disposed) setAddableFriends(data) })
			.catch(() => { if (!disposed) setAddableFriends([]) })
			.finally(() => { if (!disposed) setIsLoadingAddable(false) })

		return () => { disposed = true }
	}, [rightPanelMode, conversationId])

	useEffect(() => {
		if (!isCurrentUserAdmin) {
			setRightPanelMode((previous) => (previous === 'settings' ? null : previous))
		}
	}, [isCurrentUserAdmin])

	useEffect(() => {
		return () => {
			stopTyping()
		}
	}, [conversationId, stopTyping])

	useEffect(() => {
		if (typeof window === 'undefined') {
			return
		}

		if (rightPanelMode) {
			window.localStorage.setItem(RIGHT_PANEL_MODE_STORAGE_KEY, rightPanelMode)
			return
		}

		window.localStorage.removeItem(RIGHT_PANEL_MODE_STORAGE_KEY)
	}, [rightPanelMode])

	useEffect(() => {
		if (typeof window === 'undefined') {
			return
		}

		window.localStorage.setItem(RIGHT_PANEL_WIDTH_STORAGE_KEY, String(rightPanelWidth))
	}, [rightPanelWidth])

	useEffect(() => {
		if (!isResizingRightPanel) {
			return
		}

		const minWidth = 320
		const maxWidth = 560

		const handleMouseMove = (event: MouseEvent) => {
			if (!layoutRef.current) {
				return
			}

			const bounds = layoutRef.current.getBoundingClientRect()
			const nextWidth = bounds.right - event.clientX
			const clamped = Math.max(minWidth, Math.min(maxWidth, nextWidth))
			setRightPanelWidth(clamped)
		}

		const handleMouseUp = () => {
			setIsResizingRightPanel(false)
		}

		document.addEventListener('mousemove', handleMouseMove)
		document.addEventListener('mouseup', handleMouseUp)

		return () => {
			document.removeEventListener('mousemove', handleMouseMove)
			document.removeEventListener('mouseup', handleMouseUp)
		}
	}, [isResizingRightPanel])

	const sendMessage = () => {
		if (isSendDisabled) {
			return
		}

		const cleaned = draft.trim()
		if (!cleaned) {
			return
		}

		stopTyping()
		if (!conversationId) return
		onSendMessage(conversationId, cleaned)
		setDraftForConversation('')
	}

	const onSubmit = (event: FormEvent) => {
		event.preventDefault()
		sendMessage()
	}

	const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault()
			sendMessage()
		}
	}

	const onSelectEmoji = (emoji: string) => {
		// Keep the picker open so several emoji can be added in one go.
		setDraftForConversation(`${draft}${emoji}`)
		startTyping()
	}

	const onSelectMedia = async (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0]
		if (!file || isSendDisabled || !onUploadMedia) {
			return
		}

		if (!conversationId) return
		await onUploadMedia(conversationId, file, draft)
		stopTyping()
		setDraftForConversation('')
		event.target.value = ''
	}

	const handleUpdateRoomSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()

		if (!onUpdateRoomDetails) {
			return
		}

		const nextName = roomNameInput.trim()
		const nextDescription = roomDescriptionInput.trim()

		if (!nextName) {
			setRoomSettingsError('Room name cannot be empty.')
			return
		}

		setRoomSettingsError(null)
		setIsUpdatingRoom(true)

		try {
			if (!conversationId) return
			await onUpdateRoomDetails(conversationId, {
				name: nextName,
				description: nextDescription,
			})
		} catch (error) {
			setRoomSettingsError(error instanceof Error ? error.message : 'Failed to update room settings.')
		} finally {
			setIsUpdatingRoom(false)
		}
	}

	const handleRemoveMember = async (memberId: number) => {
		if (!onRemoveMembersFromRoom) {
			return
		}

		setRoomSettingsError(null)
		setRemovingMemberId(memberId)

		try {
			if (!conversationId) return
			await onRemoveMembersFromRoom(conversationId, [memberId])
		} catch (error) {
			setRoomSettingsError(error instanceof Error ? error.message : 'Failed to remove member.')
		} finally {
			setRemovingMemberId(null)
		}
	}

	const handleAddFriend = async (userId: number) => {
		// Let parent handle the room members refresh (it owns roomMembers prop)
		if (onAddUsersToRoom) {
			if (!conversationId) return
			await onAddUsersToRoom(conversationId, [userId])
		} else {
			if (!conversationId) return
			await addUsersToRoom(conversationId, [userId])
		}
		// Refresh our local addable list so the added friend disappears from it
		if (!conversationId) return
		const updatedAddable = await getAddableFriends(conversationId)
		setAddableFriends(updatedAddable)
	}

	const clearSearch = () => {
		setSearchText('')
		setSearchedMessages([])
		setSearchStatus(null)
		setHasSearched(false)
	}

	const handleSearchSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()

		const trimmed = searchText.trim()
		if (!trimmed) {
			clearSearch()
			return
		}

		setIsSearching(true)
		setSearchStatus(null)

		try {
			if (!conversationId) return
			const results = await searchMessagesInRoom(conversationId, trimmed)
			const mapped = mapSearchedMessagesToMessages(results, currentUserId, roomMembers)
			setSearchedMessages(mapped)
			setSearchStatus(
				mapped.length > 0
					? `${mapped.length} result${mapped.length === 1 ? '' : 's'} found in this room.`
					: 'No matching messages found in this room.',
			)
			setHasSearched(true)
		} catch (error) {
			setSearchedMessages([])
			setHasSearched(false)
			setSearchStatus(error instanceof Error ? error.message : 'Failed to search messages.')
		} finally {
			setIsSearching(false)
		}
	}

	if (!conversation) {
		return (
			<section className="motion-slide-in-right motion-stagger-2 flex min-w-0 flex-1 flex-col items-center justify-center bg-md-surface">
				<div className="flex flex-col items-center gap-4 text-center">
					<h2 className="text-lg font-semibold text-[var(--text-primary)]">Click on a group to start chatting</h2>
					<p className="text-[var(--text-secondary)]">Pick a group from the list to open the conversation.</p>
				</div>
			</section>
		)
	}

	return (
		<section ref={layoutRef} className="motion-slide-in-right motion-stagger-2 flex min-h-0 min-w-0 flex-1 bg-md-surface">
			<div className="flex min-h-0 min-w-0 flex-1 flex-col">
				<header className="flex items-center justify-between border-b border-md-outline-variant px-3 py-3 sm:px-5 lg:px-6">
					<div className="flex items-center gap-3">
						<div className={`flex h-11 w-11 items-center justify-center overflow-hidden rounded-full text-[15px] font-semibold ${conversation.isGroup ? 'bg-md-tertiary-container text-md-on-tertiary-container' : 'bg-md-primary-container text-md-on-primary-container'}`}>
							{conversation.avatar}
						</div>
						<div>
							<h2 className="max-w-[46vw] truncate text-[15px] font-medium tracking-tight text-md-on-surface sm:max-w-none sm:text-[17px]">{conversation.name}</h2>
							<p className="text-[11px] font-medium uppercase tracking-[0.12em] text-md-outline">{conversation.subtitle}</p>
						</div>
					</div>

					<div className="flex items-center gap-2 sm:gap-4 lg:gap-6">
						<nav className="hidden items-center gap-2 text-sm md:flex">
							<button className="md-state rounded-full bg-md-secondary-container px-4 py-1.5 font-medium text-md-on-secondary-container">Messages</button>
							<button className="md-state rounded-full px-4 py-1.5 font-medium text-md-on-surface-variant">Shared Files</button>
						</nav>
						<div className="flex items-center gap-1 sm:gap-1.5">
							{isCurrentUserAdmin && (
								<button
									type="button"
									onClick={() => setRightPanelMode((previous) => (previous === 'settings' ? null : 'settings'))}
									className={`md-state inline-flex h-10 w-10 items-center justify-center rounded-full ${rightPanelMode === 'settings' ? 'bg-md-secondary-container text-md-on-secondary-container' : 'text-md-on-surface-variant'}`}
									aria-label="manage room settings"
									aria-pressed={rightPanelMode === 'settings'}
								>
									<Users size={18} />
								</button>
							)}
							{(!conversation.isGroup) && (
								<>
									<button
										type="button"
										onClick={onStartAudioCall}
										className="md-state inline-flex h-10 w-10 items-center justify-center rounded-full text-md-on-surface-variant hover:bg-md-secondary-container hover:text-md-on-secondary-container"
										aria-label="start audio call"
									>
										<Phone size={18} />
									</button>
									<button
										type="button"
										onClick={onStartVideoCall}
										className="md-state inline-flex h-10 w-10 items-center justify-center rounded-full text-md-on-surface-variant hover:bg-md-secondary-container hover:text-md-on-secondary-container"
										aria-label="start video call"
									>
										<Video size={18} />
									</button>
								</>
							)}
							<button
								type="button"
								onClick={() => setIsSearchOpen((previous) => {
									if (previous) {
										clearSearch()
									}
									return !previous
								})}
								className={`md-state inline-flex h-10 w-10 items-center justify-center rounded-full ${isSearchOpen ? 'bg-md-secondary-container text-md-on-secondary-container' : 'text-md-on-surface-variant'}`}
								aria-label="search in conversation"
								aria-pressed={isSearchOpen}
							>
								<Search size={18} />
							</button>
							<button
								type="button"
								onClick={() => setRightPanelMode((previous) => (previous === 'info' ? null : 'info'))}
								className={`md-state inline-flex h-10 w-10 items-center justify-center rounded-full ${rightPanelMode === 'info' ? 'bg-md-secondary-container text-md-on-secondary-container' : 'text-md-on-surface-variant'}`}
								aria-label="conversation info"
								aria-pressed={rightPanelMode === 'info'}
							>
								<CircleEllipsis size={18} />
							</button>
						</div>
					</div>
				</header>

				{isSearchOpen && (
					<form onSubmit={handleSearchSubmit} className="border-b border-md-outline-variant bg-md-surface px-3 py-2 sm:px-5 lg:px-6">
						<div className="flex items-center gap-2">
							<input
								type="text"
								value={searchText}
								onChange={(event) => setSearchText(event.target.value)}
								placeholder="Search messages in this room"
								className="h-11 flex-1 rounded-full bg-md-surface-container-highest px-4 text-sm text-md-on-surface outline-none transition-shadow duration-200 ease-md-standard placeholder:text-md-on-surface-variant focus-visible:ring-2 focus-visible:ring-md-primary"
							/>
							<Button type="submit" size="sm" isLoading={isSearching}>
								{isSearching ? 'Searching…' : 'Search'}
							</Button>
							<button
								type="button"
								onClick={clearSearch}
								className="md-state h-9 rounded-full border border-md-outline px-4 text-sm font-medium text-md-on-surface-variant"
							>
								Clear
							</button>
						</div>
						{searchStatus && <p className="mt-1.5 text-xs text-[var(--text-secondary)]">{searchStatus}</p>}
					</form>
				)}

				<div className="relative min-h-0 flex-1">
				<div ref={messagesContainerRef} className="h-full min-h-0 overflow-y-auto bg-md-surface-container-low px-3 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
				<div ref={messagesContentRef}>
					{displayedMessages.length > 0 ? (
						<>
							<div className="mb-7 flex items-center gap-3">
								<div className="h-px flex-1 bg-md-outline-variant" />
								<span className="text-xs font-medium tracking-[0.1em] text-[var(--text-muted)]">OCTOBER 24, 2023</span>
								<div className="h-px flex-1 bg-md-outline-variant" />
							</div>

							<div>
								{displayedMessages.map((message, index) => (
									<ChatMessage
										key={message.id}
										message={message}
										isGroupedWithPrevious={isGroupedWith(displayedMessages[index - 1], message)}
										isGroupedWithNext={isGroupedWith(message, displayedMessages[index + 1])}
										onRetry={(messageId) => {
											if (conversationId) {
												onRetryMessage?.(conversationId, messageId)
											}
										}}
										onReaction={(messageId, emoji) => {
											if (conversationId) {
												onSendReaction?.(conversationId, messageId, emoji)
											}
										}}
									/>
								))}
							</div>
							{typingUsers.length > 0 && (
								<div className="motion-enter-soft mt-1.5 flex justify-start">
									<div className="flex max-w-[78%] items-start gap-2.5">
										<div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-md-tertiary-container text-[11px] font-semibold text-md-on-tertiary-container">
											{typingAvatar}
										</div>
										<div className="rounded-md3-lg rounded-bl-md bg-md-bubble-received px-3.5 py-2 text-sm text-md-on-bubble-received">
											<div className="flex items-center gap-2.5">
												<div className="flex items-center gap-1.5 pt-0.5" aria-hidden="true">
													<span className="typing-dot" />
													<span className="typing-dot typing-dot-delay-1" />
													<span className="typing-dot typing-dot-delay-2" />
												</div>
												<p className="truncate text-xs font-medium leading-none text-md-on-surface-variant">
													{typingUsers.length === 1 ? (
														<>
															<span className="font-semibold text-md-on-surface">{typingUsers[0].userName}</span> is typing
														</>
													) : (
														<>
															<span className="font-semibold text-md-on-surface">
																{typingUsers.slice(0, -1).map((user) => user.userName).join(', ')}
															</span>{' '}
															and{' '}
															<span className="font-semibold text-md-on-surface">
																{typingUsers[typingUsers.length - 1].userName}
															</span>{' '}
															are typing
														</>
													)}
												</p>
											</div>
										</div>
									</div>
								</div>
							)}
						</>
					) : (
						<div className="rounded-md3-lg bg-md-surface-container p-6 text-center">
							<p className="text-sm font-medium text-md-on-surface">
								{hasSearched ? 'No matching messages in this room.' : 'No messages yet.'}
							</p>
							<p className="mt-1 text-xs text-md-on-surface-variant">
								{hasSearched ? 'Try a different search phrase.' : 'Start the conversation by sending the first message.'}
							</p>
						</div>
					)}
				</div>
				</div>
				{showJumpToLatest && (
					<button
						type="button"
						onClick={() => {
							shouldStickToBottomRef.current = true
							setShowJumpToLatest(false)
							scrollMessagesToBottom()
						}}
						className="md-state motion-interactive absolute bottom-4 right-4 rounded-full bg-md-secondary-container px-4 py-2 text-xs font-medium text-md-on-secondary-container shadow-md3-2"
					>
						Jump to latest
					</button>
				)}
				</div>

				<form onSubmit={onSubmit} className="border-t border-md-outline-variant bg-md-surface px-3 py-3 sm:px-5 sm:py-4 lg:px-6">
					<div className="rounded-md3-xl bg-md-surface-container-high p-2">
						<div className="flex items-center gap-1">
							<button type="button" className="md-state inline-flex min-h-11 min-w-11 items-center justify-center rounded-full p-2 text-md-on-surface-variant" aria-label="add">
								<Plus size={18} />
							</button>
							<input
								ref={fileInputRef}
								type="file"
								accept="image/*,video/*"
								className="hidden"
								onChange={onSelectMedia}
							/>
							<button
								type="button"
								onClick={() => fileInputRef.current?.click()}
								disabled={isSendDisabled || !onUploadMedia}
								className="md-state inline-flex min-h-11 min-w-11 items-center justify-center rounded-full p-2 text-md-on-surface-variant disabled:pointer-events-none disabled:opacity-40"
								aria-label="upload image or video"
							>
								<ImageIcon size={18} />
							</button>

							<div className="relative min-h-11 flex-1 flex items-center">
								{isRecording ? (
									<div className="motion-enter-soft flex w-full items-center justify-between px-4 text-md-error font-medium">
										<div className="flex items-center gap-2">
											<Mic size={18} className="animate-pulse" />
											<span>Recording...</span>
										</div>
										<span className="font-mono tabular-nums">{formatRecordingTime(recordingTime)}</span>
									</div>
								) : (
									<textarea
										value={draft}
										onChange={(event) => {
											setDraftForConversation(event.target.value)
											if (event.target.value.trim().length === 0) {
												stopTyping()
												return
											}
											startTyping()
										}}
										onKeyDown={onKeyDown}
										disabled={isSendDisabled}
										rows={1}
										style={{ fieldSizing: 'content', minHeight: '44px', maxHeight: '160px' } as any}
										placeholder={`Type your message to ${conversation.name}…`}
										className="motion-enter-soft w-full resize-none bg-transparent px-2 py-3 text-sm text-md-on-surface outline-none transition-all duration-200 ease-md-standard placeholder:text-md-on-surface-variant disabled:cursor-not-allowed disabled:opacity-60"
									/>
								)}
							</div>

							{!isRecording && (
								<div ref={emojiPickerRef} className="relative">
									<button
										type="button"
										onClick={() => setIsEmojiOpen((prev) => !prev)}
										className={`md-state inline-flex min-h-11 min-w-11 items-center justify-center rounded-full p-2 ${isEmojiOpen ? 'bg-md-secondary-container text-md-on-secondary-container' : 'text-md-on-surface-variant'}`}
										aria-label="emoji"
										aria-expanded={isEmojiOpen}
									>
										<Smile size={18} />
									</button>
									{isEmojiOpen && (
										<div className="motion-popover absolute bottom-12 right-0 z-20 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-md3-lg bg-md-surface-container-high shadow-md3-3">
											<Suspense
												fallback={
													<div className="flex h-[380px] items-center justify-center text-md-on-surface-variant">
														<Loader2 className="animate-spin" size={22} aria-label="loading emoji picker" />
													</div>
												}
											>
												<EmojiPickerPanel isDarkMode={isDarkMode} onSelect={onSelectEmoji} />
											</Suspense>
										</div>
									)}
								</div>
							)}
							
							{draft.trim().length > 0 ? (
								<button
									type="submit"
									disabled={isSendDisabled}
									className="md-state inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-md-primary text-md-on-primary shadow-md3-1 transition-shadow duration-200 ease-md-standard hover:shadow-md3-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-md-primary focus-visible:ring-offset-2 focus-visible:ring-offset-md-surface-container-high active:scale-95 disabled:pointer-events-none disabled:opacity-40"
									aria-label="send message"
								>
									<SendHorizontal size={18} />
								</button>
							) : (
								<button
									type="button"
									disabled={isSendDisabled}
									onClick={isRecording ? stopRecording : startRecording}
									className={`md-state inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full shadow-md3-1 transition-all duration-200 ease-md-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-md-surface-container-high active:scale-95 disabled:pointer-events-none disabled:opacity-40 ${isRecording ? 'bg-md-error text-md-on-error animate-recording' : 'bg-md-primary text-md-on-primary hover:shadow-md3-2'}`}
									aria-label={isRecording ? "stop recording" : "record voice message"}
								>
									{isRecording ? <Square size={18} /> : <Mic size={18} />}
								</button>
							)}
						</div>
					</div>
					<p className="mt-2 text-right text-xs text-[var(--text-muted)]">
						{isSendDisabled ? 'Disconnected. Reconnecting…' : ''}
					</p>
				</form>
			</div>

			{isRightPanelOpen && (
				<aside
					className="relative hidden shrink-0 border-l border-[var(--border)] bg-md-surface-container-low xl:flex xl:flex-col"
					style={{ width: `${rightPanelWidth}px` }}
				>
					<div
						className="absolute left-0 top-0 h-full w-1 -translate-x-1/2 cursor-col-resize"
						onMouseDown={(event) => {
							event.preventDefault()
							setIsResizingRightPanel(true)
						}}
					/>

					{rightPanelMode === 'info' && (
						<>
							<div className="border-b border-[var(--border)] px-5 py-4">
								<h3 className="text-sm font-semibold text-[var(--text-primary)]">Conversation Info</h3>
								{/* <p className="mt-1 text-xs text-[var(--text-muted)]">Visible to everyone in this conversation.</p> */}
							</div>

							<div className="flex-1 overflow-y-auto p-4">
								<div className="rounded-2xl border border-[var(--border)] bg-md-surface p-4">
									<h4 className="text-sm font-semibold text-[var(--text-primary)]">Details</h4>
									<div className="mt-3 space-y-2 text-sm text-[var(--text-secondary)]">
										<p><span className="font-medium text-[var(--text-primary)]">Name:</span> {conversation.name}</p>
										<p><span className="font-medium text-[var(--text-primary)]">Type:</span> {conversation.isGroup ? 'Group' : 'Direct'}</p>
										<p><span className="font-medium text-[var(--text-primary)]">Participants:</span> {roomMembers.length}</p>
										{conversation.description ? <p><span className="font-medium text-[var(--text-primary)]">Description:</span> {conversation.description}</p> : null}
									</div>
								</div>

								<div className="mt-4 rounded-2xl border border-[var(--border)] bg-md-surface p-4">
									<div className="mb-3 flex items-center justify-between gap-3">
										<h4 className="text-sm font-semibold text-[var(--text-primary)]">Participants</h4>
										<span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--accent)]">{roomMembers.length}</span>
									</div>
									{isRoomMembersLoading ? (
										<p className="text-sm text-[var(--text-secondary)]">Loading room members…</p>
									) : roomMembers.length > 0 ? (
										<div className="space-y-2">
											{roomMembers.map((member) => {
												const avatarUrl = resolveAssetUrl(member.profileImageUrl)
												const initials = member.username.slice(0, 2).toUpperCase()
												return (
													<div key={member.roomMemberId} className="rounded-lg border border-[var(--border)] bg-[var(--bg-soft)] px-2.5 py-2">
														<div className="flex items-center justify-between gap-2">
															<div className="flex min-w-0 items-center gap-2.5">
																<div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--avatar-neutral-bg)] text-[10px] font-semibold text-white">
																	{avatarUrl ? (
																		<img src={avatarUrl} alt={member.username} className="h-full w-full object-cover" />
																	) : (
																		initials
																	)}
																</div>
																<p className="truncate text-sm font-semibold text-[var(--text-primary)]">{member.username}</p>
															</div>
															{member.roomRole.toUpperCase() === 'ADMIN' ? (
																<span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">
																	{member.roomRole}
																</span>
															) : null}
														</div>
													</div>
												)
											})}
										</div>
									) : (
										<p className="text-sm text-[var(--text-secondary)]">No members were returned for this room.</p>
									)}
									{roomMembersStatus && <p className="mt-3 text-sm text-[var(--text-secondary)]">{roomMembersStatus}</p>}
								</div>
							</div>
						</>
					)}

					{rightPanelMode === 'settings' && isCurrentUserAdmin && (
						<>
							<div className="border-b border-[var(--border)] px-5 py-4">
								<h3 className="text-sm font-semibold text-[var(--text-primary)]">Room Settings</h3>
								<p className="mt-1 text-xs text-[var(--text-muted)]">Modify room name, description, and members.</p>
							</div>

							<div className="flex-1 overflow-y-auto p-4">
								<form onSubmit={handleUpdateRoomSubmit} className="rounded-2xl border border-[var(--border)] bg-md-surface p-4">
									<h4 className="text-sm font-semibold text-[var(--text-primary)]">Update Group Details</h4>
									<label className="mt-3 block text-xs font-medium text-[var(--text-secondary)]">
										Name
										<input
											type="text"
											value={roomNameInput}
											onChange={(event) => setRoomNameInput(event.target.value)}
											className="motion-focus mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
										/>
									</label>
									<label className="mt-3 block text-xs font-medium text-[var(--text-secondary)]">
										Description
										<input
											type="text"
											value={roomDescriptionInput}
											onChange={(event) => setRoomDescriptionInput(event.target.value)}
											placeholder="Optional description"
											className="motion-focus mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
										/>
									</label>
									<div className="mt-4 flex justify-end">
										<button
											type="submit"
											disabled={isUpdatingRoom}
											className="motion-interactive rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--bg-page)] shadow-[var(--shadow-accent)] hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-70"
										>
											{isUpdatingRoom ? 'Updating…' : 'Update Room'}
										</button>
									</div>
								</form>

								<div className="mt-4 rounded-2xl border border-[var(--border)] bg-md-surface p-4">
									<div className="mb-3 flex items-center justify-between gap-3">
										<div>
											<h4 className="text-sm font-semibold text-[var(--text-primary)]">Current Members</h4>
											{/* <p className="text-xs text-[var(--text-muted)]">Loaded from the backend.</p> */}
										</div>
										<span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--accent)]">{roomMembers.length}</span>
									</div>

									{isRoomMembersLoading ? (
										<p className="text-sm text-[var(--text-secondary)]">Loading room members…</p>
									) : roomMembers.length > 0 ? (
										<div className="space-y-2">
											{roomMembers.map((member) => {
												const avatarUrl = resolveAssetUrl(member.profileImageUrl)
												const initials = member.username.slice(0, 2).toUpperCase()
												return (
													<div key={member.roomMemberId} className="rounded-lg border border-[var(--border)] bg-[var(--bg-soft)] px-2.5 py-2">
														<div className="flex items-center justify-between gap-2">
															<div className="flex min-w-0 items-center gap-2.5">
																<div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--avatar-neutral-bg)] text-[10px] font-semibold text-white">
																	{avatarUrl ? (
																		<img src={avatarUrl} alt={member.username} className="h-full w-full object-cover" />
																	) : (
																		initials
																	)}
																</div>
																<div className="min-w-0">
																	<p className="truncate text-sm font-semibold text-[var(--text-primary)]">{member.username}</p>
																	{member.roomRole.toUpperCase() === 'ADMIN' ? (
																		<span className="inline-flex rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">
																			{member.roomRole}
																		</span>
																	) : null}
																</div>
															</div>
															{member.roomRole.toUpperCase() !== 'ADMIN' && (
																<button
																	type="button"
																	onClick={() => void handleRemoveMember(member.roomMemberId)}
																	disabled={removingMemberId === member.roomMemberId}
																	className="motion-interactive rounded-lg border border-[var(--border)] px-2 py-1 text-[11px] font-medium text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-70"
																>
																	{removingMemberId === member.roomMemberId ? 'Removing…' : 'Remove'}
																</button>
															)}
														</div>
													</div>
												)
											})}
										</div>
									) : (
										<p className="text-sm text-[var(--text-secondary)]">No members were returned for this room.</p>
									)}
								</div>

								{!conversation.isGroup && (
									<div className="mt-4 rounded-2xl border border-[var(--border)] bg-md-surface p-4">
										<div className="mb-3 flex items-center gap-2">
											<div className="rounded-xl bg-[var(--accent-soft)] p-2 text-[var(--accent)]">
												<UserPlus size={16} />
											</div>
											<div>
												<h4 className="text-sm font-semibold text-[var(--text-primary)]">Add from Friends</h4>
												<p className="text-xs text-[var(--text-muted)]">Friends not yet in this room.</p>
											</div>
										</div>
										{isLoadingAddable ? (
											<p className="text-sm text-[var(--text-secondary)]">Loading friends…</p>
										) : addableFriends.length === 0 ? (
											<p className="text-sm text-[var(--text-secondary)]">No friends to add.</p>
										) : (
											<div className="space-y-2">
												{addableFriends.map((friend) => {
													const avatarUrl = resolveAssetUrl(friend.profilePicUrl)
													const initials = friend.username.slice(0, 2).toUpperCase()
													return (
														<div key={friend.userId} className="flex items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-2">
															<div className="flex min-w-0 items-center gap-2.5">
																<div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--avatar-neutral-bg)] text-[10px] font-semibold text-white">
																	{avatarUrl
																		? <img src={avatarUrl} alt={friend.username} className="h-full w-full object-cover" />
																		: initials}
																</div>
																<p className="truncate text-sm font-semibold text-[var(--text-primary)]">{friend.username}</p>
															</div>
															<button
																type="button"
																onClick={() => void handleAddFriend(friend.userId)}
																className="motion-interactive rounded-lg bg-[var(--accent)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--bg-page)] hover:bg-[var(--accent-strong)]"
															>
																Add
															</button>
														</div>
													)
												})}
											</div>
										)}
									</div>
								)}

								{roomSettingsError && <p className="mt-3 text-sm text-red-500">{roomSettingsError}</p>}
								{roomMembersStatus && <p className="mt-3 text-sm text-[var(--text-secondary)]">{roomMembersStatus}</p>}
							</div>
						</>
					)}
				</aside>
			)}
		</section>
	)
}
