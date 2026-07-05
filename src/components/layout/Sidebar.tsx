import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { MessageSquare, PanelLeftClose, Plus, Search, Settings, UserPlus, Users } from 'lucide-react'
import type { ChatSection } from '../../types/chat'
import { resolveAssetUrl } from '../../lib/config'
import { cn } from '../../lib/cn'
import { IconButton } from '../ui'

export type SidebarView = ChatSection | 'people' | 'friend-requests' | 'profile' | 'settings'

type SidebarProps = {
	activeView: SidebarView
	onSectionChange: (section: SidebarView) => void
	onNewChat: (section: ChatSection) => void
	currentUserName?: string
	currentUserProfileImageUrl?: string
	className?: string
	onToggleCollapse?: () => void
	showCollapseButton?: boolean
}

type NavItemProps = {
	icon: ReactNode
	label: string
	active: boolean
	onClick: () => void
}

/**
 * MD3 navigation item: a pill-shaped row whose active state is a
 * secondary-container "indicator" (not a colour swap), with a state-layer on
 * hover/press. Consolidates six near-identical buttons into one primitive.
 */
function NavItem({ icon, label, active, onClick }: NavItemProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			aria-current={active ? 'page' : undefined}
			className={cn(
				'md-state flex min-h-11 w-full items-center gap-3 rounded-full px-4 py-2.5 text-sm',
				'transition-colors duration-200 ease-md-standard',
				'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-md-primary focus-visible:ring-offset-2 focus-visible:ring-offset-md-surface-container-low',
				active
					? 'bg-md-secondary-container font-medium text-md-on-secondary-container'
					: 'font-medium text-md-on-surface-variant',
			)}
		>
			<span className="shrink-0">{icon}</span>
			<span className="truncate">{label}</span>
		</button>
	)
}

export function Sidebar({
	activeView,
	onSectionChange,
	onNewChat,
	currentUserName,
	currentUserProfileImageUrl,
	className = '',
	onToggleCollapse,
	showCollapseButton = false,
}: SidebarProps) {
	const [isNewChatMenuOpen, setIsNewChatMenuOpen] = useState(false)
	const newChatMenuRef = useRef<HTMLDivElement | null>(null)

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (!newChatMenuRef.current) return
			if (!newChatMenuRef.current.contains(event.target as Node)) {
				setIsNewChatMenuOpen(false)
			}
		}
		document.addEventListener('mousedown', handleClickOutside)
		return () => document.removeEventListener('mousedown', handleClickOutside)
	}, [])

	useEffect(() => {
		const handleEscape = (event: KeyboardEvent) => {
			if (event.key === 'Escape') setIsNewChatMenuOpen(false)
		}
		document.addEventListener('keydown', handleEscape)
		return () => document.removeEventListener('keydown', handleEscape)
	}, [])

	const handleNewChatOption = (section: ChatSection) => {
		onNewChat(section)
		setIsNewChatMenuOpen(false)
	}

	const profileAvatarUrl = resolveAssetUrl(currentUserProfileImageUrl)
	const profileName = (currentUserName ?? 'Profile').trim() || 'Profile'
	const profileInitials =
		profileName
			.split(' ')
			.map((part) => part[0]?.toUpperCase())
			.filter(Boolean)
			.slice(0, 2)
			.join('') || 'PR'

	const profileActive = activeView === 'profile'

	return (
		<aside
			className={cn(
				'motion-enter flex w-full shrink-0 flex-col bg-md-surface-container-low px-3 py-5 md:w-[280px] lg:w-[248px]',
				className,
			)}
		>
			<div className="flex h-full flex-col">
				<div className="mb-6 flex items-center justify-between gap-2 px-3">
					<div className="flex items-center gap-2">
						<span className="text-2xl font-medium tracking-tight text-md-on-surface">Kurakaani</span>
						<span className="h-2.5 w-2.5 rounded-full bg-[var(--status-online)]" aria-label="online" />
					</div>
					{showCollapseButton && onToggleCollapse && (
						<IconButton
							size="sm"
							variant="standard"
							label="Collapse sidebar"
							icon={<PanelLeftClose size={18} />}
							onClick={onToggleCollapse}
						/>
					)}
				</div>

				<p className="mb-2 px-4 text-[11px] font-medium uppercase tracking-[0.11em] text-md-outline">
					Navigation
				</p>
				<nav className="space-y-1">
					<NavItem icon={<Users size={18} />} label="Groups" active={activeView === 'groups'} onClick={() => onSectionChange('groups')} />
					<NavItem icon={<MessageSquare size={18} />} label="Direct Messages" active={activeView === 'direct'} onClick={() => onSectionChange('direct')} />
					<NavItem icon={<Search size={18} />} label="Find People" active={activeView === 'people'} onClick={() => onSectionChange('people')} />
					<NavItem icon={<UserPlus size={18} />} label="Friend Requests" active={activeView === 'friend-requests'} onClick={() => onSectionChange('friend-requests')} />
					<NavItem icon={<Settings size={18} />} label="Settings" active={activeView === 'settings'} onClick={() => onSectionChange('settings')} />
					<button
						type="button"
						onClick={() => onSectionChange('profile')}
						aria-current={profileActive ? 'page' : undefined}
						className={cn(
							'md-state flex min-h-11 w-full items-center gap-3 rounded-full px-3 py-2 text-sm',
							'transition-colors duration-200 ease-md-standard',
							'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-md-primary focus-visible:ring-offset-2 focus-visible:ring-offset-md-surface-container-low',
							profileActive
								? 'bg-md-secondary-container font-medium text-md-on-secondary-container'
								: 'font-medium text-md-on-surface-variant',
						)}
					>
						<span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-md-tertiary-container text-[11px] font-semibold text-md-on-tertiary-container">
							{profileAvatarUrl ? (
								<img src={profileAvatarUrl} alt={profileName} className="h-full w-full object-cover" />
							) : (
								profileInitials
							)}
						</span>
						<span className="truncate">{profileName}</span>
					</button>
				</nav>

				<div className="mt-auto pt-4">
					<div ref={newChatMenuRef} className="relative">
						{isNewChatMenuOpen && (
							<div className="motion-popover absolute bottom-full left-0 mb-2 w-full rounded-md3-md bg-md-surface-container-high p-2 shadow-md3-3">
								<button
									type="button"
									onClick={() => handleNewChatOption('direct')}
									className="md-state flex w-full items-center gap-2 rounded-full px-3 py-2.5 text-left text-sm font-medium text-md-on-surface"
								>
									<MessageSquare size={16} />
									New DM
								</button>
								<button
									type="button"
									onClick={() => handleNewChatOption('groups')}
									className="md-state mt-1 flex w-full items-center gap-2 rounded-full px-3 py-2.5 text-left text-sm font-medium text-md-on-surface"
								>
									<Users size={16} />
									New Group
								</button>
							</div>
						)}
						<button
							type="button"
							onClick={() => setIsNewChatMenuOpen((previous) => !previous)}
							aria-expanded={isNewChatMenuOpen}
							className={cn(
								'md-state flex min-h-14 w-full items-center justify-center gap-2 rounded-md3-md bg-md-tertiary-container px-4 text-sm font-medium text-md-on-tertiary-container',
								'shadow-md3-1 transition-shadow duration-[240ms] ease-md-standard hover:shadow-md3-2',
								'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-md-primary focus-visible:ring-offset-2 focus-visible:ring-offset-md-surface-container-low active:scale-95',
							)}
						>
							<Plus size={18} />
							New Chat
						</button>
					</div>
				</div>
			</div>
		</aside>
	)
}
