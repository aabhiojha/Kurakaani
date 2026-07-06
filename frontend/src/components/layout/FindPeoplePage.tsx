import { useEffect, useMemo, useState } from 'react'
import { Search, UserPlus, Users } from 'lucide-react'
import { Button, Card } from '../ui'
import { resolveAssetUrl } from '../../lib/config'
import { getUsers } from '../../services/userService'
import type { FriendUserResponse, FriendshipResponse } from '../../types/api/friend'
import type { UserSummaryResponse } from '../../types/api/user'

type FindPeoplePageProps = {
	currentUserId?: number
	friendships: {
		incoming: FriendshipResponse[]
		sent: FriendshipResponse[]
		friends: FriendUserResponse[]
	}
	onSendFriendRequest: (userId: number) => Promise<void>
}

const getAvatarLabel = (name?: string) => {
	const value = (name ?? '')
		.split(' ')
		.map((part) => part[0]?.toUpperCase())
		.filter(Boolean)
		.slice(0, 2)
		.join('')

	return value || 'US'
}

const normalize = (value?: string | null) => (value ?? '').trim().toLowerCase()

export function FindPeoplePage({ currentUserId, friendships, onSendFriendRequest }: FindPeoplePageProps) {
	const [users, setUsers] = useState<UserSummaryResponse[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [statusMessage, setStatusMessage] = useState<string | null>(null)
	const [searchTerm, setSearchTerm] = useState('')
	const [actionError, setActionError] = useState<string | null>(null)
	const [sendingUserId, setSendingUserId] = useState<number | null>(null)

	useEffect(() => {
		let isDisposed = false

		const loadUsers = async () => {
			setIsLoading(true)
			setStatusMessage(null)

			try {
				const result = await getUsers()
				if (isDisposed) {
					return
				}

				setUsers(Array.isArray(result) ? result : [])
				setStatusMessage(Array.isArray(result) ? `Loaded ${result.length} users.` : 'No user data returned.')
			} catch (error) {
				if (isDisposed) {
					return
				}

				setUsers([])
				setStatusMessage(error instanceof Error ? error.message : 'Failed to load users.')
			} finally {
				if (!isDisposed) {
					setIsLoading(false)
				}
			}
		}

		void loadUsers()

		return () => {
			isDisposed = true
		}
	}, [])

	const pendingRecipientIds = useMemo(
		() => new Set(friendships.sent.filter((item) => item.status === 'PENDING').map((item) => item.recipientId)),
		[friendships.sent],
	)

	const incomingRequesterIds = useMemo(
		() => new Set(friendships.incoming.filter((item) => item.status === 'PENDING').map((item) => item.requesterId)),
		[friendships.incoming],
	)

	const friendUserIds = useMemo(
		() => new Set(friendships.friends.map((f) => f.userId)),
		[friendships.friends],
	)

	const filteredUsers = useMemo(() => {
		const query = normalize(searchTerm)

		return users
			.filter((user) => {
				if (typeof currentUserId === 'number' && currentUserId > 0 && user.id === currentUserId) {
					return false
				}

				if (!query) {
					return true
				}

				return normalize(user.userName).includes(query)
			})
			.sort((a, b) => a.userName.localeCompare(b.userName))
	}, [currentUserId, searchTerm, users])

	const resolveFriendshipState = (userId: number) => {
		if (friendUserIds.has(userId)) {
			return 'friend' as const
		}

		if (pendingRecipientIds.has(userId)) {
			return 'sent' as const
		}

		if (incomingRequesterIds.has(userId)) {
			return 'incoming' as const
		}

		return 'none' as const
	}

	const sendRequest = async (userId: number) => {
		setActionError(null)
		setSendingUserId(userId)

		try {
			await onSendFriendRequest(userId)
		} catch (error) {
			setActionError(error instanceof Error ? error.message : 'Failed to send friend request.')
		} finally {
			setSendingUserId(null)
		}
	}

	return (
		<section className="motion-slide-in-right flex min-w-0 flex-1 overflow-y-auto bg-md-surface-container-low p-2 sm:p-3 lg:p-4">
			<Card className="mx-auto flex w-full max-w-5xl flex-col p-4 sm:p-5 lg:p-6">
				<div className="mb-3 border-b border-md-outline-variant pb-3">
					<p className="text-xs font-medium uppercase tracking-[0.12em] text-md-primary">Network</p>
					<h2 className="mt-1 text-xl font-medium tracking-tight text-md-on-surface">Find people</h2>
					<p className="mt-1 text-xs text-md-on-surface-variant">Search users by username and send friend requests.</p>
				</div>

				<label className="relative block">
					<Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-md-on-surface-variant" />
					<input
						type="text"
						value={searchTerm}
						onChange={(event) => setSearchTerm(event.target.value)}
						placeholder="Search by username…"
						className="h-12 w-full rounded-full bg-md-surface-container-highest py-2 pl-11 pr-4 text-sm text-md-on-surface outline-none transition-shadow duration-200 ease-md-standard placeholder:text-md-on-surface-variant focus-visible:ring-2 focus-visible:ring-md-primary"
					/>
				</label>

				<div className="mt-2 flex items-center justify-between px-1 text-xs text-md-outline">
					<span>{isLoading ? 'Loading users…' : `${filteredUsers.length} user${filteredUsers.length === 1 ? '' : 's'} found`}</span>
					{statusMessage ? <span>{statusMessage}</span> : null}
				</div>

				{actionError && <p className="mt-3 text-sm text-md-error">{actionError}</p>}

				<div className="mt-3 space-y-1.5">
					{filteredUsers.map((user) => {
						const avatarUrl = resolveAssetUrl(user.profileImageUrl)
						const friendshipState = resolveFriendshipState(user.id)
						const isSending = sendingUserId === user.id

						return (
							<div key={user.id} className="md-state flex items-center justify-between gap-2 rounded-md3-md bg-md-surface-container-high px-3 py-2.5">
								<div className="flex min-w-0 items-center gap-2.5">
									<div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-md-primary-container text-[11px] font-semibold text-md-on-primary-container">
										{avatarUrl ? <img src={avatarUrl} alt={user.userName} className="h-full w-full object-cover" /> : getAvatarLabel(user.userName)}
									</div>
									<div className="min-w-0">
										<p className="truncate text-[15px] font-medium leading-tight text-md-on-surface">{user.userName}</p>
										<p className="text-xs text-md-outline">User #{user.id}</p>
									</div>
								</div>

								{friendshipState === 'friend' ? (
									<span className="rounded-full bg-md-secondary-container px-3 py-1 text-[11px] font-medium text-md-on-secondary-container">Friends</span>
								) : friendshipState === 'sent' ? (
									<span className="rounded-full border border-md-outline px-3 py-1 text-[11px] font-medium text-md-on-surface-variant">Request sent</span>
								) : friendshipState === 'incoming' ? (
									<span className="rounded-full border border-md-outline px-3 py-1 text-[11px] font-medium text-md-on-surface-variant">Incoming request</span>
								) : (
									<Button
										size="sm"
										onClick={() => void sendRequest(user.id)}
										disabled={isSending}
										leadingIcon={<UserPlus size={14} />}
									>
										{isSending ? 'Sending…' : 'Add friend'}
									</Button>
								)}
							</div>
						)
					})}
				</div>

				{!isLoading && filteredUsers.length === 0 && (
					<div className="mt-8 rounded-md3-lg bg-md-surface-container-high p-6 text-center">
						<div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-md-secondary-container text-md-on-secondary-container">
							<Users size={18} />
						</div>
						<p className="text-sm font-medium text-md-on-surface">No users matched your search.</p>
						<p className="mt-1 text-xs text-md-on-surface-variant">Try a different username keyword.</p>
					</div>
				)}
			</Card>
		</section>
	)
}
