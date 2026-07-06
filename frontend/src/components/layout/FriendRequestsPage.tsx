import { useState } from 'react'
import { UserPlus, UserCheck, UserMinus, Clock } from 'lucide-react'
import type { FriendshipResponse } from '../../types/api/friend'
import { Button } from '../ui'

type FriendRequestsPageProps = {
	friendships: {
		incoming: FriendshipResponse[]
		sent: FriendshipResponse[]
	}
	friendshipStatus: string | null
	isFriendshipsLoading: boolean
	onRespondToFriendRequest: (userId: number, response: 'ACCEPT' | 'REJECT') => Promise<void>
	onCancelFriendRequest: (userId: number) => Promise<void>
}

const getAvatarLabel = (name?: string) => {
	const value = (name ?? '')
		.split(' ')
		.map((part) => part[0]?.toUpperCase())
		.filter(Boolean)
		.slice(0, 2)
		.join('')
	return value || 'KU'
}

export function FriendRequestsPage({
	friendships,
	friendshipStatus,
	isFriendshipsLoading,
	onRespondToFriendRequest,
	onCancelFriendRequest,
}: FriendRequestsPageProps) {
	const [actionError, setActionError] = useState<string | null>(null)
	const [actionLoadingId, setActionLoadingId] = useState<number | null>(null)

	const runAction = async (userId: number, action: () => Promise<void>) => {
		setActionError(null)
		setActionLoadingId(userId)
		try {
			await action()
		} catch (error) {
			setActionError(error instanceof Error ? error.message : 'Request action failed.')
		} finally {
			setActionLoadingId(null)
		}
	}

	return (
		<section className="motion-slide-in-right flex min-w-0 flex-1 flex-col overflow-y-auto bg-md-surface p-4 sm:p-6 lg:p-10">
			<div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
				{/* Header */}
				<div className="flex flex-col gap-2 border-b border-md-outline-variant pb-6">
					<div className="flex items-center gap-3">
						<div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-md-primary-container text-md-on-primary-container">
							<UserPlus size={24} />
						</div>
						<div>
							<h1 className="text-3xl font-bold tracking-tight text-md-on-surface">Friend Requests</h1>
							<p className="text-sm text-md-on-surface-variant mt-1">Manage your pending connections and outgoing invites.</p>
						</div>
					</div>
					{actionError && (
						<div className="motion-enter-soft mt-4 rounded-xl bg-md-error-container p-3 text-sm font-medium text-md-on-error-container">
							{actionError}
						</div>
					)}
					{friendshipStatus && (
						<div className="motion-enter-soft mt-4 rounded-xl bg-md-secondary-container p-3 text-sm font-medium text-md-on-secondary-container">
							{friendshipStatus}
						</div>
					)}
				</div>

				<div className="grid gap-8 lg:grid-cols-2">
					{/* Incoming Requests */}
					<div className="flex flex-col gap-4">
						<div className="flex items-center justify-between">
							<h2 className="text-xl font-semibold text-md-on-surface">Incoming</h2>
							<span className="flex h-6 items-center justify-center rounded-full bg-md-primary px-3 text-xs font-medium text-md-on-primary">
								{friendships.incoming.length} pending
							</span>
						</div>
						
						<div className="flex flex-col gap-3">
							{isFriendshipsLoading ? (
								<div className="flex items-center justify-center rounded-3xl bg-md-surface-container-low p-8">
									<p className="text-sm font-medium text-md-on-surface-variant">Loading requests…</p>
								</div>
							) : friendships.incoming.length === 0 ? (
								<div className="flex flex-col items-center justify-center rounded-3xl bg-md-surface-container-low p-10 text-center">
									<div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-md-surface text-md-outline">
										<UserCheck size={32} />
									</div>
									<p className="text-base font-semibold text-md-on-surface">You're all caught up!</p>
									<p className="mt-1 text-sm text-md-on-surface-variant">No pending friend requests.</p>
								</div>
							) : (
								friendships.incoming.map((friendship) => {
									const displayName = friendship.requesterName ?? `User #${friendship.requesterId}`
									const avatarLabel = getAvatarLabel(displayName)
									const isLoading = actionLoadingId === friendship.requesterId
									return (
										<div key={friendship.id} className="group flex items-center justify-between gap-4 rounded-3xl bg-md-surface-container-low p-4 shadow-sm transition-all hover:bg-md-surface-container hover:shadow-md">
											<div className="flex min-w-0 flex-1 items-center gap-4">
												<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-md-primary to-md-tertiary text-sm font-bold text-white shadow-sm">
													{avatarLabel}
												</div>
												<div className="min-w-0">
													<p className="truncate text-base font-semibold text-md-on-surface">{displayName}</p>
													<p className="truncate text-xs text-md-on-surface-variant">Wants to connect with you</p>
												</div>
											</div>
											<div className="flex shrink-0 items-center gap-2">
												<Button
													size="sm"
													onClick={() => void runAction(friendship.requesterId, () => onRespondToFriendRequest(friendship.requesterId, 'ACCEPT'))}
													disabled={isLoading}
													className="bg-md-primary hover:bg-md-primary/90"
												>
													Accept
												</Button>
												<Button
													size="sm"
													variant="outlined"
													onClick={() => void runAction(friendship.requesterId, () => onRespondToFriendRequest(friendship.requesterId, 'REJECT'))}
													disabled={isLoading}
													className="text-md-error hover:bg-md-error-container hover:text-md-on-error-container"
												>
													Decline
												</Button>
											</div>
										</div>
									)
								})
							)}
						</div>
					</div>

					{/* Sent Requests */}
					<div className="flex flex-col gap-4">
						<div className="flex items-center justify-between">
							<h2 className="text-xl font-semibold text-md-on-surface">Sent</h2>
							<span className="flex h-6 items-center justify-center rounded-full bg-md-secondary-container px-3 text-xs font-medium text-md-on-secondary-container">
								{friendships.sent.length} sent
							</span>
						</div>

						<div className="flex flex-col gap-3">
							{isFriendshipsLoading ? (
								<div className="flex items-center justify-center rounded-3xl bg-md-surface-container-low p-8">
									<p className="text-sm font-medium text-md-on-surface-variant">Loading requests…</p>
								</div>
							) : friendships.sent.length === 0 ? (
								<div className="flex flex-col items-center justify-center rounded-3xl bg-md-surface-container-low p-10 text-center">
									<div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-md-surface text-md-outline">
										<UserMinus size={32} />
									</div>
									<p className="text-base font-semibold text-md-on-surface">No sent requests</p>
									<p className="mt-1 text-sm text-md-on-surface-variant">You haven't sent any friend requests recently.</p>
								</div>
							) : (
								friendships.sent.map((friendship) => {
									const displayName = friendship.recipientName ?? `User #${friendship.recipientId}`
									const avatarLabel = getAvatarLabel(displayName)
									const isLoading = actionLoadingId === friendship.recipientId
									return (
										<div key={friendship.id} className="group flex items-center justify-between gap-4 rounded-3xl bg-md-surface-container-low p-4 shadow-sm transition-all hover:bg-md-surface-container hover:shadow-md">
											<div className="flex min-w-0 flex-1 items-center gap-4">
												<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-md-surface-variant text-sm font-bold text-md-on-surface-variant">
													{avatarLabel}
												</div>
												<div className="min-w-0">
													<p className="truncate text-base font-semibold text-md-on-surface">{displayName}</p>
													<div className="flex items-center gap-1.5 text-xs text-md-on-surface-variant">
														<Clock size={12} />
														<span>Awaiting response</span>
													</div>
												</div>
											</div>
											<Button
												size="sm"
												variant="outlined"
												onClick={() => void runAction(friendship.recipientId, () => onCancelFriendRequest(friendship.recipientId))}
												disabled={isLoading}
												className="shrink-0 text-md-on-surface-variant hover:bg-md-surface-variant hover:text-md-on-surface"
											>
												Cancel
											</Button>
										</div>
									)
								})
							)}
						</div>
					</div>
				</div>
			</div>
		</section>
	)
}
