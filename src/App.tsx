import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LayoutPanelLeft, MessageSquare, MessagesSquare, PanelLeftClose } from 'lucide-react'
import { LoginPage } from './components/auth/LoginPage'
import { PasswordResetPage } from './components/auth/PasswordResetPage'
import { SignupPage } from './components/auth/SignupPage'
import { TokenResetPage } from './components/auth/TokenResetPage'
import { ChatView } from './components/chat/ChatView'
import { FindPeoplePage } from './components/layout/FindPeoplePage'
import { FriendRequestsPage } from './components/layout/FriendRequestsPage'
import { ProfilePage } from './components/layout/ProfilePage'
import { NotificationToasts } from './components/layout/NotificationToasts'
import { RecentMessagesPanel } from './components/layout/RecentMessagesPanel'
import { SettingsPage } from './components/layout/SettingsPage'
import { Sidebar } from './components/layout/Sidebar'
import type { SidebarView } from './components/layout/Sidebar'
import {
	buildSessionFromAuth,
	getCurrentUser,
	loginWithPassword,
	logout,
	confirmPasswordReset,
	requestPasswordReset,
	registerWithPassword,
	updateCurrentUser,
	saveSession,
	uploadProfileImage,
} from './services/authService'
import { addUsersToRoom, getRooms } from './services/roomService'
import { GLOBAL_ROOM_ID } from './lib/config'
import { getSession } from './lib/session'
import { getErrorMessage, isChatSection, toConversationTime } from './lib/chatUtils'
import { useTheme } from './hooks/useTheme'
import { useLayout } from './hooks/useLayout'
import { useFriendships } from './hooks/useFriendships'
import { useRooms } from './hooks/useRooms'
import { useChatSocket } from './hooks/useChatSocket'
import type { ChatSection } from './types/chat'
import type { CurrentUserResponse, SessionState } from './types/api/session'
import type { NotificationEvent } from './services/chatSocketService'
import type { NotificationToast } from './components/layout/NotificationToasts'

type AuthActionResult = { ok: true; message?: string } | { ok: false; error: string }

const ACTIVE_VIEW_STORAGE_KEY = 'kurakaani-active-view'

const isSidebarView = (value: string | null): value is SidebarView =>
	value === 'direct' ||
	value === 'groups' ||
	value === 'people' ||
	value === 'friend-requests' ||
	value === 'settings' ||
	value === 'profile'

function App() {
	const [authView, setAuthView] = useState<'login' | 'signup' | 'password-reset' | 'token-reset'>('login')
	const [activeView, setActiveView] = useState<SidebarView>(() => {
		if (typeof window === 'undefined') return 'direct'
		const saved = window.localStorage.getItem(ACTIVE_VIEW_STORAGE_KEY)
		return isSidebarView(saved) ? saved : 'direct'
	})
	const [session, setSession] = useState<SessionState | null>(() => getSession())
	const [backendStatus, setBackendStatus] = useState('Checking backend connection...')
	const [isAuthSubmitting, setIsAuthSubmitting] = useState(false)
	const [currentUserProfile, setCurrentUserProfile] = useState<CurrentUserResponse | undefined>(undefined)
	const [notifications, setNotifications] = useState<NotificationToast[]>([])
	const attemptedGlobalJoinIdsRef = useRef(new Set<number>())
	const notificationTimersRef = useRef<Map<string, number>>(new Map())

	const { themeMode, isDarkMode, setThemeMode } = useTheme()

	const layout = useLayout(activeView)
	const { isMobile, isDesktop, mobilePane, setMobilePane, isSidebarDrawerOpen, setIsSidebarDrawerOpen, isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed } = layout

	const {
		incomingFriendRequests,
		sentFriendRequests,
		friends,
		isFriendshipsLoading,
		friendshipStatus,
		loadFriendships,
		clearFriendships,
		handleFriendshipNotification,
		handleSendFriendRequest,
		handleRespondToFriendRequest,
		handleCancelFriendRequest,
	} = useFriendships()

	const rooms = useRooms(session, currentUserProfile, setBackendStatus, (view) =>
		setActiveView(view),
	)
	const {
		conversationsState,
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
	} = rooms

	const activeSection: ChatSection = isChatSection(activeView) ? activeView : 'direct'
	const activeConversations = conversationsState[activeSection]

	const activeConversation = useMemo(() => {
		if (selectedConversationId === null) return undefined
		return (
			conversationsState[activeSection].find((c) => c.id === selectedConversationId) ??
			conversationsState.direct.find((c) => c.id === selectedConversationId) ??
			conversationsState.groups.find((c) => c.id === selectedConversationId)
		)
	}, [activeSection, conversationsState, selectedConversationId])

	const activeMessages = activeConversation ? (messagesByConversation[activeConversation.id] ?? []) : []
	const activeRoomMembers = activeConversation ? (roomMembersByConversation[activeConversation.id] ?? []) : []

	const chatSocket = useChatSocket({
		session,
		activeConversation,
		activeView,
		currentUserProfile,
		messagesByConversation,
		pendingMediaUploadsRef,
		setMessagesByConversation,
		onNotification: (event) => handleSocketNotification(event),
		onConversationActivity: touchConversation,
		setBackendStatus,
	})
	const {
		isSocketConnected,
		typingUsersByConversation,
		handleTypingStart,
		handleTypingStop,
		handleSendMessage,
		handleRetryMessage,
		disconnectAndCleanup,
	} = chatSocket

	const activeTypingUsers = activeConversation ? (typingUsersByConversation[activeConversation.id] ?? []) : []
	const sidebarUserName = currentUserProfile?.userName ?? session?.user.name
	const sidebarUserProfileImageUrl = currentUserProfile?.profileImageUrl ?? session?.user.profileImageUrl

	const dismissNotification = useCallback((id: string) => {
		const timerId = notificationTimersRef.current.get(id)
		if (typeof timerId === 'number') {
			window.clearTimeout(timerId)
			notificationTimersRef.current.delete(id)
		}
		setNotifications((prev) => prev.filter((notification) => notification.id !== id))
	}, [])

	const pushNotification = useCallback((notification: Omit<NotificationToast, 'id' | 'createdAt'>) => {
		const id =
			typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
				? crypto.randomUUID()
				: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
		const createdAt = Date.now()

		setNotifications((prev) => {
			const nextNotifications = [{ id, createdAt, ...notification }, ...prev]
			const overflow = nextNotifications.slice(4)
			overflow.forEach((item) => {
				const timerId = notificationTimersRef.current.get(item.id)
				if (typeof timerId === 'number') {
					window.clearTimeout(timerId)
					notificationTimersRef.current.delete(item.id)
				}
			})
			return nextNotifications.slice(0, 4)
		})

		const timerId = window.setTimeout(() => {
			dismissNotification(id)
		}, 7000)
		notificationTimersRef.current.set(id, timerId)
	}, [dismissNotification])

	useEffect(() => {
		const timers = notificationTimersRef.current
		return () => {
			timers.forEach((timerId) => window.clearTimeout(timerId))
			timers.clear()
		}
	}, [])

	// ── Persistence ───────────────────────────────────────────────────────────

	useEffect(() => {
		window.localStorage.setItem(ACTIVE_VIEW_STORAGE_KEY, activeView)
	}, [activeView])

	useEffect(() => {
		setBackendStatus(
			session?.accessToken
				? 'Authenticated requests enabled.'
				: 'Sign in to enable protected endpoints.',
		)
	}, [session?.accessToken])

	// Sync current user profile on login
	useEffect(() => {
		if (!session?.accessToken) {
			setCurrentUserProfile(undefined)
			return
		}
		let cancelled = false
		getCurrentUser()
			.then((user) => { if (!cancelled) setCurrentUserProfile(user) })
			.catch(() => { if (!cancelled) setCurrentUserProfile(undefined) })
		return () => { cancelled = true }
	}, [session?.accessToken])

	// Load friendships on login
	useEffect(() => {
		if (!session?.accessToken) {
			clearFriendships()
			return
		}
		void loadFriendships()
	}, [clearFriendships, loadFriendships, session?.accessToken])

	// Load room members only when the *selected room* changes. Depending on the
	// whole activeConversation object would re-run this on every preview/unread
	// update (a new object reference per incoming message), refetching the member
	// list on each message. Keying on the id refetches only on an actual room switch.
	const activeConversationId = activeConversation?.id
	useEffect(() => {
		if (!session?.accessToken || !activeConversationId) return
		void loadRoomMembers(activeConversationId)
	}, [activeConversationId, loadRoomMembers, session?.accessToken])

	useEffect(() => {
		if (!activeConversation?.id) {
			return
		}

		clearConversationUnread(activeConversation.id)
	}, [activeConversation?.id, clearConversationUnread])

	// Refresh friendship data when opening friendship-related sections.
	useEffect(() => {
		if (!session?.accessToken) {
			return
		}

		if (activeView === 'friend-requests' || activeView === 'people' || activeView === 'profile') {
			void loadFriendships()
		}
	}, [activeView, loadFriendships, session?.accessToken])

	// Ensure global room membership when user profile resolves
	useEffect(() => {
		if (!session?.accessToken) return
		void ensureGlobalRoomMembership(session, currentUserProfile)
	}, [currentUserProfile, session])

	// ── Auth helpers ──────────────────────────────────────────────────────────

	const ensureGlobalRoomMembership = async (
		sessionState: SessionState,
		profile?: CurrentUserResponse,
	) => {
		const userId = profile?.id ?? sessionState.user.id
		if (!userId || attemptedGlobalJoinIdsRef.current.has(userId)) return false
		attemptedGlobalJoinIdsRef.current.add(userId)
		try {
			const roomList = await getRooms()
			if (roomList.some((r) => r.id === GLOBAL_ROOM_ID)) return false
		} catch {
			// Fall back to add attempt.
		}
		try {
			await addUsersToRoom(GLOBAL_ROOM_ID, [userId])
			return true
		} catch {
			return false
		}
	}

	const completeAuthenticatedSession = async (authResponse: {
		token: string
		username: string
		roles: string[]
	}) => {
		let profile: CurrentUserResponse | undefined
		try { profile = await getCurrentUser() } catch { /* */ }

		const nextSession = buildSessionFromAuth(authResponse, profile)
		saveSession(nextSession)
		setSession(nextSession)
		setCurrentUserProfile(profile)

		const joined = await ensureGlobalRoomMembership(nextSession, profile)
		setBackendStatus(
			joined
				? `Signed in as ${nextSession.user.name}. Joined global room ${GLOBAL_ROOM_ID}.`
				: `Signed in as ${nextSession.user.name}. Authenticated requests enabled.`,
		)

		setActiveView('groups')
		setSelectedConversationId(null)
		if (isMobile) setMobilePane('list')
	}

	const handleLogin = async (username: string, password: string): Promise<AuthActionResult> => {
		setIsAuthSubmitting(true)
		try {
			const authResponse = await loginWithPassword({ username, password })
			await completeAuthenticatedSession(authResponse)
			return { ok: true }
		} catch (error) {
			return { ok: false, error: getErrorMessage(error, 'Login failed. Please check your credentials.') }
		} finally {
			setIsAuthSubmitting(false)
		}
	}

	const handleRegister = async (
		username: string,
		email: string,
		password: string,
		confirmPassword: string,
	): Promise<AuthActionResult> => {
		setIsAuthSubmitting(true)
		try {
			await registerWithPassword({ username, email, password, confirmPassword })
			setAuthView('login')
			return {
				ok: true,
				message: 'Registration successful. You can now log in with your new account.',
			}
		} catch (error) {
			return { ok: false, error: getErrorMessage(error, 'Registration failed. Please try again.') }
		} finally {
			setIsAuthSubmitting(false)
		}
	}

	const handlePasswordResetRequest = async (email: string): Promise<AuthActionResult> => {
		setIsAuthSubmitting(true)
		try {
			await requestPasswordReset(email)
			return { ok: true, message: 'If the email exists, a reset token has been sent.' }
		} catch (error) {
			return { ok: false, error: getErrorMessage(error, 'Password reset request failed. Please try again.') }
		} finally {
			setIsAuthSubmitting(false)
		}
	}

	const handlePasswordResetConfirm = async (token: number, password: string): Promise<AuthActionResult> => {
		setIsAuthSubmitting(true)
		try {
			await confirmPasswordReset(token, password)
			return { ok: true, message: 'Password reset successful. You can now log in.' }
		} catch (error) {
			return { ok: false, error: getErrorMessage(error, 'Password reset confirmation failed. Please check the token and try again.') }
		} finally {
			setIsAuthSubmitting(false)
		}
	}

	const handleLogout = () => {
		logout()
		disconnectAndCleanup()
		clearFriendships()
		clearRooms()
		attemptedGlobalJoinIdsRef.current.clear()
		notificationTimersRef.current.forEach((timerId) => window.clearTimeout(timerId))
		notificationTimersRef.current.clear()
		setNotifications([])
		setAuthView('login')
		setSession(null)
		setCurrentUserProfile(undefined)
		setBackendStatus('Logged out. API requests now run without JWT.')
	}

	const handleUploadProfileImage = async (file: File) => {
		if (!session?.accessToken) throw new Error('Sign in to upload a profile image.')
		await uploadProfileImage(file)
		const refreshed = await getCurrentUser()
		setCurrentUserProfile(refreshed)
		setSession((prev) => {
			if (!prev) return prev
			const next: SessionState = {
				...prev,
				user: {
					...prev.user,
					id: refreshed.id,
					email: refreshed.email,
					name: refreshed.userName,
					roles: refreshed.roles,
					profileImageUrl: refreshed.profileImageUrl,
				},
			}
			saveSession(next)
			return next
		})
		setBackendStatus('Profile image updated successfully.')
	}

	const handleUpdateProfile = async (updates: { userName?: string; email?: string }) => {
		if (!session?.accessToken) {
			throw new Error('Sign in to update your profile.')
		}

		const refreshed = await updateCurrentUser(updates)
		setCurrentUserProfile(refreshed)
		setSession((prev) => {
			if (!prev) {
				return prev
			}

			const next: SessionState = {
				...prev,
				user: {
					...prev.user,
					id: refreshed.id,
					email: refreshed.email,
					name: refreshed.userName,
					roles: refreshed.roles,
					profileImageUrl: refreshed.profileImageUrl,
				},
			}
			saveSession(next)
			return next
		})

		setBackendStatus('Profile updated successfully.')
	}

	function handleSocketNotification(event: NotificationEvent) {
		const getNotificationRoomId = () => {
			const rawRoomId =
				'roomId' in event.payload ? event.payload.roomId : undefined

			if (typeof rawRoomId === 'number') {
				return rawRoomId > 0 ? rawRoomId : null
			}

			if (typeof rawRoomId === 'string') {
				const parsed = Number(rawRoomId)
				return Number.isFinite(parsed) && parsed > 0 ? parsed : null
			}

			return null
		}

		const applyRoomPreview = (roomId: number | null, preview?: string) => {
			if (!roomId) {
				return
			}

			const nextPreview = preview?.trim()
			const nextTime = toConversationTime(event.timestamp)
			touchConversation(roomId, {
				preview: nextPreview && nextPreview.length > 0 ? nextPreview : 'New message',
				time: nextTime,
				unreadDelta: activeConversation?.id === roomId ? 0 : 1,
			})
		}

		if (event.type === 'FRIEND_REQUEST') {
			handleFriendshipNotification(event.payload)
			const senderName = event.payload.senderName?.trim()
			const title = senderName ? `${senderName} sent a friend request` : 'New friend request'
			const body =
				event.payload.event === 'ACCEPTED'
					? senderName
						? `${senderName} accepted your friend request.`
						: 'Your friend request was accepted.'
					: event.payload.event === 'DECLINED'
						? senderName
							? `${senderName} declined your friend request.`
							: 'A friend request was declined.'
						: event.payload.event === 'REMOVED'
							? 'A friendship was removed.'
							: 'Open friend requests to respond.'

			pushNotification({
				type: 'FRIEND_REQUEST',
				title,
				body,
			})
			return
		}

		if (event.type === 'DM') {
			const preview = event.payload.preview?.trim()
			const title = 'New direct message'
			applyRoomPreview(getNotificationRoomId(), preview)
			setBackendStatus(preview ? `New direct message: ${preview}` : 'New direct message received.')
			pushNotification({
				type: 'DM',
				title,
				body: preview ?? 'You have a new direct message.',
			})
			return
		}

		if (event.type === 'ROOM') {
			const roomName = event.payload.roomName?.trim()
			const preview = event.payload.preview?.trim()
			applyRoomPreview(getNotificationRoomId(), preview)
			setBackendStatus(
				roomName
					? `New message in ${roomName}${preview ? `: ${preview}` : '.'}`
					: 'New room message received.',
			)
			pushNotification({
				type: 'ROOM',
				title: roomName ? `${roomName}` : 'New room message',
				body: preview ? preview : roomName ? 'A new message arrived in this room.' : 'A new room message arrived.',
			})
		}
	}

	// ── Navigation handlers ───────────────────────────────────────────────────

	const handleSectionChange = (section: SidebarView) => {
		setActiveView(section)
		if (isMobile) setMobilePane(isChatSection(section) ? 'list' : 'detail')
		setIsSidebarDrawerOpen(false)
	}

	const handleNewChat = (section: ChatSection) => {
		setActiveView(section)
		setNewChatTrigger((prev) => prev + 1)
		if (isMobile) setMobilePane('list')
		setIsSidebarDrawerOpen(false)
	}

	const handleSelectConversation = (conversationId: number) => {
		setSelectedConversationId(conversationId)
		clearConversationUnread(conversationId)
		if (isMobile) setMobilePane('detail')
	}

	// ── Render ────────────────────────────────────────────────────────────────

	if (!session?.accessToken) {
		return (
			<div data-theme={isDarkMode ? 'dark' : 'light'} className="min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)] antialiased">
				<NotificationToasts notifications={notifications} onDismiss={dismissNotification} />
				{authView === 'login' ? (
					<LoginPage
						isSubmitting={isAuthSubmitting}
						backendStatus={backendStatus}
						onLogin={handleLogin}
						onSwitchToSignup={() => setAuthView('signup')}
						onSwitchToPasswordReset={() => setAuthView('password-reset')}
					/>
				) : authView === 'signup' ? (
					<SignupPage
						isSubmitting={isAuthSubmitting}
						backendStatus={backendStatus}
						onRegister={handleRegister}
						onSwitchToLogin={() => setAuthView('login')}
					/>
				) : authView === 'password-reset' ? (
					<PasswordResetPage
						isSubmitting={isAuthSubmitting}
						backendStatus={backendStatus}
						onRequestReset={handlePasswordResetRequest}
						onSwitchToLogin={() => setAuthView('login')}
						onSwitchToTokenPage={() => setAuthView('token-reset')}
					/>
				) : (
					<TokenResetPage
						isSubmitting={isAuthSubmitting}
						backendStatus={backendStatus}
						onConfirmReset={handlePasswordResetConfirm}
						onSwitchToLogin={() => setAuthView('login')}
						onSwitchToResetRequest={() => setAuthView('password-reset')}
					/>
				)}
			</div>
		)
	}

	const sharedChatViewProps = {
		messages: activeMessages,
		typingUsers: activeTypingUsers,
		currentUserId: currentUserProfile?.id ?? session?.user.id,
		roomMembers: activeRoomMembers,
		isRoomMembersLoading,
		roomMembersStatus,
		onSendMessage: handleSendMessage,
		onTypingStart: handleTypingStart,
		onTypingStop: handleTypingStop,
		onUploadMedia: handleUploadMedia,
		onAddUsersToRoom: handleAddUsersToRoom,
		onUpdateRoomDetails: handleUpdateRoomDetails,
		onRemoveMembersFromRoom: handleRemoveMembersFromRoom,
		onRetryMessage: handleRetryMessage,
		isSendDisabled: Boolean(session?.accessToken) && !isSocketConnected,
		isDarkMode,
	} as const

	const sharedRecentPanelProps = {
		section: activeSection,
		conversations: activeConversations,
		selectedConversationId: activeConversation?.id ?? -1,
		friends,
		onSelectConversation: handleSelectConversation,
		onCreateDirect: handleCreateDirect,
		onCreateGroup: handleCreateGroup,
		newChatTrigger,
	} as const

	const renderMainContent = () => {
		if (activeView === 'friend-requests') {
			return (
				<FriendRequestsPage
					friendships={{ incoming: incomingFriendRequests, sent: sentFriendRequests }}
					friendshipStatus={friendshipStatus}
					isFriendshipsLoading={isFriendshipsLoading}
					onRespondToFriendRequest={handleRespondToFriendRequest}
					onCancelFriendRequest={handleCancelFriendRequest}
				/>
			)
		}

		if (activeView === 'people') {
			return (
				<FindPeoplePage
					currentUserId={currentUserProfile?.id ?? session?.user.id}
					friendships={{
						incoming: incomingFriendRequests,
						sent: sentFriendRequests,
						friends,
					}}
					onSendFriendRequest={handleSendFriendRequest}
				/>
			)
		}

		if (activeView === 'profile') {
			return (
				<ProfilePage
					session={session}
					currentUser={currentUserProfile}
					friendships={{ friends }}
					isFriendshipsLoading={isFriendshipsLoading}
					onUploadProfileImage={handleUploadProfileImage}
								onUpdateProfile={handleUpdateProfile}
				/>
			)
		}

		if (activeView === 'settings') {
			return (
				<SettingsPage
					themeMode={themeMode}
					isDarkMode={isDarkMode}
					onThemeModeChange={setThemeMode}
					sessionName={session?.user.name}
					backendStatus={backendStatus}
					onLogout={handleLogout}
				/>
			)
		}

		if (isMobile) {
			if (mobilePane === 'sidebar') {
				return (
					<Sidebar
						activeView={activeView}
						onSectionChange={handleSectionChange}
						onNewChat={handleNewChat}
						currentUserName={sidebarUserName}
						currentUserProfileImageUrl={sidebarUserProfileImageUrl}
						className="h-full w-full max-w-none border-r-0"
					/>
				)
			}
			if (mobilePane === 'list') {
				return (
					<RecentMessagesPanel
						{...sharedRecentPanelProps}
						className="h-full w-full max-w-none border-r-0"
					/>
				)
			}
			return <ChatView conversation={activeConversation} {...sharedChatViewProps} />
		}

		return (
			<>
				<RecentMessagesPanel {...sharedRecentPanelProps} className="h-full" />
				<ChatView conversation={activeConversation} {...sharedChatViewProps} />
			</>
		)
	}

	return (
		<div data-theme={isDarkMode ? 'dark' : 'light'} className="h-screen min-h-screen overflow-hidden bg-md-background p-0 text-md-on-surface antialiased sm:p-2 lg:p-3">
			<NotificationToasts notifications={notifications} onDismiss={dismissNotification} />
			<div className="relative flex h-full min-w-0 overflow-hidden rounded-none bg-md-surface shadow-md3-1 sm:rounded-md3-2xl">
				{isDesktop && !isDesktopSidebarCollapsed && (
					<Sidebar
						activeView={activeView}
						onSectionChange={handleSectionChange}
						onNewChat={handleNewChat}
						currentUserName={sidebarUserName}
						currentUserProfileImageUrl={sidebarUserProfileImageUrl}
						className="h-full"
						onToggleCollapse={() => setIsDesktopSidebarCollapsed(true)}
						showCollapseButton
					/>
				)}

				{isDesktop && isDesktopSidebarCollapsed && (
					<button
						type="button"
						onClick={() => setIsDesktopSidebarCollapsed(false)}
						className="md-state motion-interactive absolute left-4 top-4 z-30 inline-flex min-h-11 items-center gap-2 rounded-full bg-md-surface-container px-4 text-sm font-medium text-md-on-surface shadow-md3-1"
						aria-label="expand sidebar"
					>
						<LayoutPanelLeft size={16} />
						Menu
					</button>
				)}

				{!isDesktop && isSidebarDrawerOpen && (
					<div className="absolute inset-0 z-40 bg-md-inverse-surface/40 backdrop-blur-sm" onClick={() => setIsSidebarDrawerOpen(false)}>
						<div className="h-full w-fit" onClick={(e) => e.stopPropagation()}>
							<Sidebar
								activeView={activeView}
								onSectionChange={handleSectionChange}
								onNewChat={handleNewChat}
								currentUserName={sidebarUserName}
								currentUserProfileImageUrl={sidebarUserProfileImageUrl}
								className="h-full max-w-[84vw] rounded-r-md3-lg shadow-md3-3"
							/>
						</div>
					</div>
				)}

				<div className="flex min-w-0 flex-1 flex-col overflow-hidden">
					{!isDesktop && (
						<header className="flex min-h-14 items-center justify-between border-b border-md-outline-variant bg-md-surface px-3 py-2 sm:px-4">
							<button
								type="button"
								onClick={() => setIsSidebarDrawerOpen((prev) => !prev)}
								className="md-state motion-interactive inline-flex min-h-11 items-center gap-2 rounded-full bg-md-surface-container px-4 text-sm font-medium text-md-on-surface"
							>
								{isSidebarDrawerOpen ? <PanelLeftClose size={16} /> : <LayoutPanelLeft size={16} />}
								Menu
							</button>

							{isMobile && isChatSection(activeView) && (
								/* MD3 segmented (single-select) control */
								<div className="flex items-center rounded-full border border-md-outline p-0.5">
									<button
										type="button"
										onClick={() => setMobilePane('list')}
										aria-pressed={mobilePane === 'list'}
										className={`md-state inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors duration-200 ${mobilePane === 'list' ? 'bg-md-secondary-container text-md-on-secondary-container' : 'text-md-on-surface-variant'}`}
									>
										<MessagesSquare size={14} />
										Chats
									</button>
									<button
										type="button"
										onClick={() => setMobilePane('detail')}
										aria-pressed={mobilePane === 'detail'}
										className={`md-state inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors duration-200 ${mobilePane === 'detail' ? 'bg-md-secondary-container text-md-on-secondary-container' : 'text-md-on-surface-variant'}`}
									>
										<MessageSquare size={14} />
										Chat
									</button>
								</div>
							)}

							<div className="w-[52px]" />
						</header>
					)}

					<div className="min-h-0 flex flex-1 min-w-0 overflow-hidden">{renderMainContent()}</div>
				</div>
			</div>
		</div>
	)
}

export default App
