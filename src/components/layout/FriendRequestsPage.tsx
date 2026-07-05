import { useState } from 'react'
import { UserPlus } from 'lucide-react'
import type { FriendshipResponse } from '../../types/api/friend'
import { Button, Card } from '../ui'

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

export function FriendRequestsPage({
	friendships,
	friendshipStatus,
	isFriendshipsLoading,
	onRespondToFriendRequest,
	onCancelFriendRequest,
}: FriendRequestsPageProps) {
	const [actionError, setActionError] = useState<string | null>(null)
	const [actionLoading, setActionLoading] = useState(false)

	const runAction = async (action: () => Promise<void>) => {
		setActionError(null)
		setActionLoading(true)
		try {
			await action()
		} catch (error) {
			setActionError(error instanceof Error ? error.message : 'Request action failed.')
		} finally {
			setActionLoading(false)
		}
	}

	return (
		<section className="motion-enter flex min-w-0 flex-1 overflow-y-auto bg-md-surface-container-low p-3 sm:p-4 lg:p-6">
			<Card className="mx-auto w-full max-w-5xl p-5 sm:p-6">
				<div className="mb-6 border-b border-md-outline-variant pb-4">
					<p className="text-xs font-medium uppercase tracking-[0.12em] text-md-primary">Friendships</p>
					<h2 className="mt-1 text-2xl font-medium tracking-tight text-md-on-surface">Friend requests</h2>
					<p className="mt-1 text-sm text-md-on-surface-variant">Manage incoming and sent friend requests.</p>
				</div>

				{actionError && <p className="mb-4 text-sm text-md-error">{actionError}</p>}
				{friendshipStatus && <p className="mb-4 text-sm text-md-on-surface-variant">{friendshipStatus}</p>}

				<div className="grid gap-4 xl:grid-cols-2">
					<div className="rounded-md3-md bg-md-surface-container-high p-4">
						<div className="mb-3 flex items-center justify-between">
							<h3 className="text-sm font-medium text-md-on-surface">Incoming</h3>
							<span className="rounded-full bg-md-secondary-container px-2.5 py-0.5 text-xs font-medium text-md-on-secondary-container">
								{friendships.incoming.length}
							</span>
						</div>
						<div className="space-y-3">
							{friendships.incoming.map((friendship) => (
								<div key={friendship.id} className="rounded-md3-sm bg-md-surface p-3">
									<p className="text-sm font-medium text-md-on-surface">
										From {friendship.requesterName ?? `User #${friendship.requesterId}`}
									</p>
									<p className="mt-1 text-xs text-md-outline">Pending request</p>
									<div className="mt-3 flex gap-2">
										<Button
											size="sm"
											onClick={() => void runAction(() => onRespondToFriendRequest(friendship.requesterId, 'ACCEPT'))}
											disabled={actionLoading}
										>
											Accept
										</Button>
										<Button
											size="sm"
											variant="outlined"
											onClick={() => void runAction(() => onRespondToFriendRequest(friendship.requesterId, 'REJECT'))}
											disabled={actionLoading}
										>
											Reject
										</Button>
									</div>
								</div>
							))}
							{isFriendshipsLoading && <p className="text-sm text-md-on-surface-variant">Loading incoming requests…</p>}
							{!isFriendshipsLoading && friendships.incoming.length === 0 && (
								<p className="text-sm text-md-on-surface-variant">No incoming requests.</p>
							)}
						</div>
					</div>

					<div className="rounded-md3-md bg-md-surface-container-high p-4">
						<div className="mb-3 flex items-center justify-between">
							<div className="flex items-center gap-2">
								<UserPlus size={16} className="text-md-on-surface-variant" />
								<h3 className="text-sm font-medium text-md-on-surface">Sent</h3>
							</div>
							<span className="rounded-full bg-md-secondary-container px-2.5 py-0.5 text-xs font-medium text-md-on-secondary-container">
								{friendships.sent.length}
							</span>
						</div>
						<div className="space-y-3">
							{friendships.sent.map((friendship) => (
								<div key={friendship.id} className="rounded-md3-sm bg-md-surface p-3">
									<p className="text-sm font-medium text-md-on-surface">
										To {friendship.recipientName ?? `User #${friendship.recipientId}`}
									</p>
									<p className="mt-1 text-xs text-md-outline">Awaiting response</p>
									<div className="mt-3">
										<Button
											size="sm"
											variant="outlined"
											onClick={() => void runAction(() => onCancelFriendRequest(friendship.recipientId))}
											disabled={actionLoading}
										>
											Cancel
										</Button>
									</div>
								</div>
							))}
							{isFriendshipsLoading && <p className="text-sm text-md-on-surface-variant">Loading sent requests…</p>}
							{!isFriendshipsLoading && friendships.sent.length === 0 && (
								<p className="text-sm text-md-on-surface-variant">No sent requests.</p>
							)}
						</div>
					</div>
				</div>
			</Card>
		</section>
	)
}
