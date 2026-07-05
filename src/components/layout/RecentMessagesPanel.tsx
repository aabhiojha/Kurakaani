import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Plus, Search } from 'lucide-react'
import type { ChatSection, Conversation } from '../../types/chat'
import type { FriendUserResponse } from '../../types/api/friend'
import { searchMessagesAcrossRooms } from '../../services/roomService'
import { resolveAssetUrl } from '../../lib/config'
import { cn } from '../../lib/cn'
import { Button, TextField } from '../ui'

type RecentMessagesPanelProps = {
	section: ChatSection
	conversations: Conversation[]
	selectedConversationId: number | null
	friends?: FriendUserResponse[]
	onSelectConversation: (conversationId: number) => void
	onCreateDirect: (name: string, description: string) => Promise<{ ok: boolean; error?: string }>
	onCreateGroup: (name: string, description: string) => Promise<{ ok: boolean; error?: string }>
	newChatTrigger: number
	className?: string
}

export function RecentMessagesPanel({
	section,
	conversations,
	selectedConversationId,
	friends = [],
	onSelectConversation,
	onCreateDirect,
	onCreateGroup,
	newChatTrigger,
	className = '',
}: RecentMessagesPanelProps) {
	const [createName, setCreateName] = useState('')
	const [createDescription, setCreateDescription] = useState('')
	const [isCreatingChat, setIsCreatingChat] = useState(false)
	const [createChatStatus, setCreateChatStatus] = useState<string | null>(null)
	const [isComposerOpen, setIsComposerOpen] = useState(false)
	const [searchQuery, setSearchQuery] = useState('')
	const [matchedRoomIds, setMatchedRoomIds] = useState<Set<number> | null>(null)
	const [isSearchingMessages, setIsSearchingMessages] = useState(false)
	const [searchStatus, setSearchStatus] = useState<string | null>(null)
	const headerTitle = section === 'groups' ? 'Groups' : 'Recent Messages'
	const searchPlaceholder = section === 'groups' ? 'Search messages in groups…' : 'Search discussions…'

	useEffect(() => {
		if (newChatTrigger > 0) {
			const timeoutId = window.setTimeout(() => setIsComposerOpen(true), 0)
			return () => window.clearTimeout(timeoutId)
		}
	}, [newChatTrigger])

	useEffect(() => {
		if (section !== 'groups') {
			const timeoutId = window.setTimeout(() => {
				setMatchedRoomIds(null)
				setSearchStatus(null)
				setIsSearchingMessages(false)
			}, 0)
			return () => window.clearTimeout(timeoutId)
		}

		const trimmed = searchQuery.trim()
		if (!trimmed) {
			const timeoutId = window.setTimeout(() => {
				setMatchedRoomIds(null)
				setSearchStatus(null)
				setIsSearchingMessages(false)
			}, 0)
			return () => window.clearTimeout(timeoutId)
		}

		let disposed = false

		const timeoutId = window.setTimeout(() => {
			if (disposed) return

			setIsSearchingMessages(true)
			setSearchStatus(null)

			searchMessagesAcrossRooms(trimmed)
				.then((results) => {
					if (disposed) return
					const groupedRoomIds = new Set(
						conversations.filter((conversation) => conversation.isGroup).map((conversation) => conversation.id),
					)
					const matched = new Set(
						results.map((message) => message.roomId).filter((roomId) => groupedRoomIds.has(roomId)),
					)
					setMatchedRoomIds(matched)
					setSearchStatus(
						matched.size > 0
							? `${matched.size} group${matched.size === 1 ? '' : 's'} with matching messages.`
							: 'No matching messages found in groups.',
					)
				})
				.catch((error: unknown) => {
					if (disposed) return
					setMatchedRoomIds(new Set())
					setSearchStatus(error instanceof Error ? error.message : 'Failed to search group messages.')
				})
				.finally(() => {
					if (!disposed) setIsSearchingMessages(false)
				})
		}, 250)

		return () => {
			disposed = true
			window.clearTimeout(timeoutId)
		}
	}, [section, searchQuery, conversations])

	const visibleConversations = useMemo(() => {
		if (section === 'groups' && searchQuery.trim()) {
			if (matchedRoomIds === null) return []
			return conversations.filter((conversation) => matchedRoomIds.has(conversation.id))
		}

		const lowered = searchQuery.trim().toLowerCase()
		if (!lowered) return conversations

		return conversations.filter(
			(conversation) =>
				conversation.name.toLowerCase().includes(lowered) ||
				conversation.preview.toLowerCase().includes(lowered),
		)
	}, [conversations, matchedRoomIds, searchQuery, section])

	const handleCreateChat = async (event: FormEvent) => {
		event.preventDefault()
		const trimmedName = createName.trim()
		const trimmedDescription = section === 'groups' ? createDescription.trim() : ''

		if (!trimmedName) {
			setCreateChatStatus(section === 'groups' ? 'Group name is required.' : 'Please select a friend.')
			return
		}

		setIsCreatingChat(true)
		const result =
			section === 'groups'
				? await onCreateGroup(trimmedName, trimmedDescription)
				: await onCreateDirect(trimmedName, '')
		setIsCreatingChat(false)

		if (result.ok) {
			setCreateName('')
			setCreateDescription('')
			setIsComposerOpen(false)
			setCreateChatStatus(
				section === 'groups' ? 'Group created successfully.' : 'Direct chat created successfully.',
			)
			return
		}

		setCreateChatStatus(result.error ?? 'Failed to create chat.')
	}

	return (
		<section
			className={cn(
				'motion-enter motion-stagger-1 flex w-full min-w-0 shrink-0 flex-col bg-md-surface md:w-[340px] lg:w-[320px]',
				className,
			)}
		>
			<div className="border-b border-md-outline-variant px-4 py-4 sm:px-5">
				<div className="mb-4 flex items-center justify-between">
					<h2 className="text-xl font-medium tracking-tight text-md-on-surface">{headerTitle}</h2>
				</div>

				<label className="relative block">
					<Search
						size={18}
						className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-md-on-surface-variant"
					/>
					<input
						type="text"
						value={searchQuery}
						onChange={(event) => setSearchQuery(event.target.value)}
						placeholder={searchPlaceholder}
						className="h-12 w-full rounded-full bg-md-surface-container-highest py-2.5 pl-11 pr-4 text-sm text-md-on-surface outline-none transition-shadow duration-200 ease-md-standard placeholder:text-md-on-surface-variant focus-visible:ring-2 focus-visible:ring-md-primary"
					/>
				</label>

				{section === 'groups' && searchQuery.trim() && (
					<p className="mt-2 px-1 text-xs text-md-on-surface-variant">
						{isSearchingMessages ? 'Searching messages…' : searchStatus ?? ' '}
					</p>
				)}

				{isComposerOpen && (
					<form
						onSubmit={handleCreateChat}
						className="motion-enter-soft mt-3 rounded-md3-md bg-md-surface-container p-4"
					>
						<div className="mb-3 flex items-center gap-2 text-sm font-medium text-md-on-surface">
							<Plus size={16} />
							{section === 'groups' ? 'Create Group' : 'Create Direct Chat'}
						</div>
						{section === 'groups' ? (
							<div className="space-y-3">
								<TextField
									label="Group name"
									value={createName}
									onChange={(event) => setCreateName(event.target.value)}
								/>
								<TextField
									label="Description (optional)"
									value={createDescription}
									onChange={(event) => setCreateDescription(event.target.value)}
								/>
							</div>
						) : (
							<select
								value={createName}
								onChange={(event) => setCreateName(event.target.value)}
								className="mb-2 h-12 w-full rounded-t-md3-sm border-b-2 border-md-outline bg-md-surface-container-highest px-4 text-sm text-md-on-surface outline-none transition-colors duration-200 focus:border-md-primary"
							>
								<option value="">Select a friend…</option>
								{friends.map((friend) => (
									<option key={friend.userId} value={String(friend.userId)}>
										{friend.username}
									</option>
								))}
							</select>
						)}
						<div className="mt-3 flex items-center justify-between gap-2">
							<Button type="submit" size="sm" isLoading={isCreatingChat}>
								{isCreatingChat ? 'Creating…' : 'Create'}
							</Button>
							{createChatStatus && (
								<span className="text-[11px] text-md-on-surface-variant">{createChatStatus}</span>
							)}
						</div>
					</form>
				)}
			</div>

			<div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 py-2">
				{visibleConversations.map((conversation, index) => {
					const avatarUrl = resolveAssetUrl(conversation.avatarImageUrl)
					const unreadCount = conversation.unreadCount ?? 0
					const isSelected = conversation.id === selectedConversationId

					return (
						<article
							key={conversation.id}
							onClick={() => onSelectConversation(conversation.id)}
							style={{ animationDelay: `${index * 35}ms` }}
							className={cn(
								'motion-message motion-interactive md-state flex min-h-11 cursor-pointer gap-3 rounded-md3-md px-3 py-3',
								'transition-colors duration-200 ease-md-standard',
								isSelected
									? 'bg-md-secondary-container'
									: 'text-md-on-surface',
							)}
						>
							<div
								className={cn(
									'relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-semibold',
									conversation.isGroup
										? 'bg-md-tertiary-container text-md-on-tertiary-container'
										: 'bg-md-primary-container text-md-on-primary-container',
								)}
							>
								{conversation.avatar}
								{avatarUrl && (
									<img
										src={avatarUrl}
										alt={conversation.name}
										className="absolute h-11 w-11 rounded-full object-cover"
										onError={(event) => {
											event.currentTarget.style.display = 'none'
										}}
									/>
								)}
							</div>
							<div className="min-w-0 flex-1">
								<div className="mb-0.5 flex items-center justify-between gap-2">
									<div className="flex min-w-0 items-center gap-2">
										<h3
											className={cn(
												'truncate text-sm',
												isSelected
													? 'font-semibold text-md-on-secondary-container'
													: 'font-medium text-md-on-surface',
											)}
										>
											{conversation.name}
										</h3>
										{unreadCount > 0 && (
											<span className="inline-flex min-w-5 shrink-0 items-center justify-center rounded-full bg-md-primary px-1.5 py-0.5 text-[10px] font-semibold leading-none text-md-on-primary">
												{unreadCount > 99 ? '99+' : unreadCount}
											</span>
										)}
									</div>
									<span
										className={cn(
											'shrink-0 text-xs',
											unreadCount > 0 ? 'font-semibold text-md-primary' : 'text-md-on-surface-variant',
										)}
									>
										{conversation.time}
									</span>
								</div>
								<p
									className={cn(
										'truncate text-sm',
										isSelected
											? 'text-md-on-secondary-container'
											: unreadCount > 0
												? 'font-medium text-md-on-surface'
												: 'text-md-on-surface-variant',
									)}
								>
									{conversation.preview}
								</p>
							</div>
						</article>
					)
				})}
				{visibleConversations.length === 0 && (
					<div className="px-3 py-10 text-center text-sm text-md-on-surface-variant">
						{section === 'groups' && searchQuery.trim()
							? 'No groups matched your message search.'
							: 'No conversations found.'}
					</div>
				)}
			</div>
		</section>
	)
}
