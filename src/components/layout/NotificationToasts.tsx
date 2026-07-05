import { Bell, MessageSquareMore, UserPlus, Users, X } from 'lucide-react'

export type NotificationToastType = 'FRIEND_REQUEST' | 'DM' | 'ROOM'

export type NotificationToast = {
	id: string
	type: NotificationToastType
	title: string
	body: string
	createdAt: number
}

type NotificationToastsProps = {
	notifications: NotificationToast[]
	onDismiss: (id: string) => void
}

const getToastIcon = (type: NotificationToastType) => {
	switch (type) {
		case 'FRIEND_REQUEST':
			return <UserPlus size={16} />
		case 'DM':
			return <MessageSquareMore size={16} />
		case 'ROOM':
			return <Users size={16} />
		default:
			return <Bell size={16} />
	}
}

/** Tonal container pairing per notification type, following MD3 colour roles. */
const getToastAccentClass = (type: NotificationToastType) => {
	switch (type) {
		case 'FRIEND_REQUEST':
			return 'bg-md-primary-container text-md-on-primary-container'
		case 'DM':
			return 'bg-md-secondary-container text-md-on-secondary-container'
		case 'ROOM':
			return 'bg-md-tertiary-container text-md-on-tertiary-container'
		default:
			return 'bg-md-surface-container-high text-md-on-surface'
	}
}

const getToastBarClass = (type: NotificationToastType) => {
	switch (type) {
		case 'FRIEND_REQUEST':
			return 'bg-md-primary'
		case 'DM':
			return 'bg-md-secondary'
		case 'ROOM':
			return 'bg-md-tertiary'
		default:
			return 'bg-md-outline'
	}
}

const formatTime = (createdAt: number) =>
	new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

export function NotificationToasts({ notifications, onDismiss }: NotificationToastsProps) {
	if (notifications.length === 0) {
		return null
	}

	return (
		<div
			className="pointer-events-none fixed right-3 top-3 z-[60] flex w-[min(92vw,22rem)] flex-col gap-2 sm:right-4 sm:top-4"
			aria-live="polite"
			aria-relevant="additions removals"
		>
			{notifications.map((notification) => (
				<article
					key={notification.id}
					className="motion-enter-soft pointer-events-auto overflow-hidden rounded-md3-lg bg-md-surface-container-high shadow-md3-3"
					role="status"
				>
					<div className={`h-1 w-full ${getToastBarClass(notification.type)}`} aria-hidden="true" />
					<div className="flex items-start gap-3 p-3.5">
						<div
							className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${getToastAccentClass(notification.type)}`}
							aria-hidden="true"
						>
							{getToastIcon(notification.type)}
						</div>
						<div className="min-w-0 flex-1">
							<div className="flex items-start justify-between gap-2">
								<div className="min-w-0">
									<p className="truncate text-sm font-medium text-md-on-surface">{notification.title}</p>
									<p className="mt-0.5 text-sm leading-5 text-md-on-surface-variant">{notification.body}</p>
								</div>
								<button
									type="button"
									onClick={() => onDismiss(notification.id)}
									className="md-state -mr-1 -mt-1 rounded-full p-1.5 text-md-on-surface-variant"
									aria-label="dismiss notification"
								>
									<X size={16} />
								</button>
							</div>
							<div className="mt-2 flex items-center justify-between gap-2">
								<span
									className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${getToastAccentClass(notification.type)}`}
								>
									{notification.type === 'FRIEND_REQUEST' ? 'Friend' : notification.type === 'DM' ? 'Direct' : 'Room'}
								</span>
								<span className="text-[11px] text-md-outline">{formatTime(notification.createdAt)}</span>
							</div>
						</div>
					</div>
				</article>
			))}
		</div>
	)
}
