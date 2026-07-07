import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Plus, Search } from 'lucide-react'
import type { ChatSection, Conversation } from '../../types/chat'
import type { FriendUserResponse } from '../../types/api/friend'
import { resolveAssetUrl } from '../../lib/config'
import { cn } from '../../lib/cn'
import { Button } from '../ui'

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
	const [groupName, setGroupName] = useState('')
	const [groupDescription, setGroupDescription] = useState('')
	const [composerMode, setComposerMode] = useState<'direct' | 'group'>('direct')
	const [isCreatingChat, setIsCreatingChat] = useState(false)
	const [createChatStatus, setCreateChatStatus] = useState<string | null>(null)
	const [isComposerOpen, setIsComposerOpen] = useState(false)
	const [searchQuery, setSearchQuery] = useState('')
	const headerTitle = 'Recent Messages'
	const searchPlaceholder = 'Search discussions…'

	useEffect(() => {
		if (newChatTrigger > 0) {
			const timeoutId = window.setTimeout(() => setIsComposerOpen(true), 0)
			return () => window.clearTimeout(timeoutId)
		}
	}, [newChatTrigger])

	const visibleConversations = useMemo(() => {
		const lowered = searchQuery.trim().toLowerCase()
		if (!lowered) return conversations

		return conversations.filter(
			(conversation) =>
				conversation.name.toLowerCase().includes(lowered) ||
				conversation.preview.toLowerCase().includes(lowered),
		)
	}, [conversations, searchQuery])

	const handleCreateChat = async (event: FormEvent) => {
		event.preventDefault()

		if (composerMode === 'group') {
			const trimmedGroupName = groupName.trim()
			if (!trimmedGroupName) {
				setCreateChatStatus('Please enter a group name.')
				return
			}

			setIsCreatingChat(true)
			const result = await onCreateGroup(trimmedGroupName, groupDescription.trim())
			setIsCreatingChat(false)

			if (result.ok) {
				setGroupName('')
				setGroupDescription('')
				setIsComposerOpen(false)
				setCreateChatStatus('Group created successfully.')
				return
			}

			setCreateChatStatus(result.error ?? 'Failed to create group.')
			return
		}

		const trimmedName = createName.trim()

		if (!trimmedName) {
			setCreateChatStatus('Please select a friend.')
			return
		}

		setIsCreatingChat(true)
		const result = await onCreateDirect(trimmedName, '')
		setIsCreatingChat(false)

		if (result.ok) {
			setCreateName('')
			setIsComposerOpen(false)
			setCreateChatStatus('Direct chat created successfully.')
			return
		}

		setCreateChatStatus(result.error ?? 'Failed to create chat.')
	}

	return (
		<aside
			className={cn(
				'motion-enter motion-stagger-1 flex w-full flex-col border-r border-md-outline-variant bg-md-surface sm:w-80 lg:w-[22rem]',
				className,
			)}
		>
			<div className="border-b border-md-outline-variant px-4 py-4 sm:px-5">
				<div className="mb-4 flex items-center justify-between">
					<h2 className="text-xl font-medium tracking-tight text-md-on-surface">{headerTitle}</h2>
					<button
						onClick={() => setIsComposerOpen(!isComposerOpen)}
						className="flex h-10 w-10 items-center justify-center rounded-full bg-md-secondary-container text-md-on-secondary-container transition-colors hover:bg-md-secondary-container/80"
					>
						<Plus size={20} />
					</button>
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

				{isComposerOpen && (
					<div className="motion-enter-soft mt-3 rounded-md3-md bg-md-surface-container p-4">
						<div className="mb-4 flex items-center justify-between">
							<h3 className="flex-1 text-[17px] font-medium text-md-on-surface">
								{composerMode === 'group' ? 'Create Group Chat' : 'Create Direct Chat'}
							</h3>
							<button
								type="button"
								onClick={() => {
									setIsComposerOpen(false)
									setCreateChatStatus(null)
								}}
								className="md-state flex h-8 w-8 items-center justify-center rounded-full text-md-on-surface-variant"
								aria-label="Cancel"
							>
								<Plus size={18} className="rotate-45" />
							</button>
						</div>
						<div className="mb-3 flex gap-1 rounded-full bg-md-surface-container-highest p-1">
							{(['direct', 'group'] as const).map((mode) => (
								<button
									key={mode}
									type="button"
									onClick={() => {
										setComposerMode(mode)
										setCreateChatStatus(null)
									}}
									className={cn(
										'flex-1 rounded-full px-3 py-1.5 text-sm font-medium transition-colors duration-200',
										composerMode === mode
											? 'bg-md-secondary-container text-md-on-secondary-container'
											: 'text-md-on-surface-variant',
									)}
								>
									{mode === 'direct' ? 'Direct' : 'Group'}
								</button>
							))}
						</div>
						<form onSubmit={handleCreateChat} className="flex flex-col gap-3">
							{composerMode === 'group' ? (
								<>
									<input
										type="text"
										value={groupName}
										onChange={(event) => setGroupName(event.target.value)}
										placeholder="Group name"
										className="h-12 w-full rounded-md3-sm border border-md-outline bg-md-surface-container-highest px-3 text-sm text-md-on-surface outline-none transition-colors duration-200 placeholder:text-md-on-surface-variant focus:border-md-primary"
									/>
									<input
										type="text"
										value={groupDescription}
										onChange={(event) => setGroupDescription(event.target.value)}
										placeholder="Description (optional)"
										className="h-12 w-full rounded-md3-sm border border-md-outline bg-md-surface-container-highest px-3 text-sm text-md-on-surface outline-none transition-colors duration-200 placeholder:text-md-on-surface-variant focus:border-md-primary"
									/>
								</>
							) : (
								<select
									value={createName}
									onChange={(event) => setCreateName(event.target.value)}
									className="h-12 w-full rounded-md3-sm border border-md-outline bg-md-surface-container-highest px-3 text-sm text-md-on-surface outline-none transition-colors duration-200 focus:border-md-primary"
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
					</div>
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
						No conversations found.
					</div>
				)}
			</div>
		</aside>
	)
}
