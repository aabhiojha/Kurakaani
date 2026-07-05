import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Camera, Mail, ShieldCheck, UserCircle, Users } from 'lucide-react'
import { Button } from '../ui'
import { resolveAssetUrl } from '../../lib/config'
import type { FriendUserResponse } from '../../types/api/friend'
import type { CurrentUserResponse, SessionState } from '../../types/api/session'

type ProfilePageProps = {
	session: SessionState | null
	currentUser?: CurrentUserResponse
	friendships: {
		friends: FriendUserResponse[]
	}
	isFriendshipsLoading: boolean
	onUploadProfileImage?: (file: File) => Promise<void>
	onUpdateProfile?: (updates: { userName?: string; email?: string }) => Promise<void>
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

const formatDate = (value?: string) => {
	if (!value) {
		return 'Unavailable'
	}

	const parsed = new Date(value)
	if (Number.isNaN(parsed.getTime())) {
		return 'Unavailable'
	}

	return parsed.toLocaleString([], {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	})
}

export function ProfilePage({
	session,
	currentUser,
	friendships,
	isFriendshipsLoading,
	onUploadProfileImage,
	onUpdateProfile,
}: ProfilePageProps) {
	const displayName = session?.user.name || currentUser?.userName || 'Kurakaani User'
	const username = currentUser?.userName ?? session?.user.name ?? 'Unavailable'
	const email = session?.user.email || currentUser?.email || 'No email available'
	const roles = currentUser?.roles ?? session?.user.roles ?? []
	const avatarLabel = getAvatarLabel(displayName)
	const profileImageUrl = resolveAssetUrl(currentUser?.profileImageUrl ?? session?.user.profileImageUrl)
	const enabledLabel = currentUser?.enabled === false ? 'Restricted' : 'Active'
	const [uploadError, setUploadError] = useState<string | null>(null)
	const [isUploading, setIsUploading] = useState(false)
	const [editableUserName, setEditableUserName] = useState(username)
	const [editableEmail, setEditableEmail] = useState(email)
	const [isSavingProfile, setIsSavingProfile] = useState(false)
	const [profileSaveError, setProfileSaveError] = useState<string | null>(null)
	const [profileSaveStatus, setProfileSaveStatus] = useState<string | null>(null)
	const fileInputRef = useRef<HTMLInputElement | null>(null)

	useEffect(() => {
		setEditableUserName(username)
	}, [username])

	useEffect(() => {
		setEditableEmail(email)
	}, [email])

	const handleProfileImageSelection = async (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0]
		if (!file || !onUploadProfileImage) {
			return
		}

		setUploadError(null)
		setIsUploading(true)

		try {
			await onUploadProfileImage(file)
		} catch (error) {
			setUploadError(error instanceof Error ? error.message : 'Failed to upload profile image.')
		} finally {
			setIsUploading(false)
			event.target.value = ''
		}
	}

	const handleProfileSave = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		if (!onUpdateProfile) {
			return
		}

		const nextUserName = editableUserName.trim()
		const nextEmail = editableEmail.trim()

		if (!nextUserName) {
			setProfileSaveError('Username is required.')
			return
		}

		if (!nextEmail) {
			setProfileSaveError('Email is required.')
			return
		}

		setProfileSaveError(null)
		setProfileSaveStatus(null)
		setIsSavingProfile(true)

		try {
			await onUpdateProfile({ userName: nextUserName, email: nextEmail })
			setProfileSaveStatus('Profile updated successfully.')
		} catch (error) {
			setProfileSaveError(error instanceof Error ? error.message : 'Failed to update profile.')
		} finally {
			setIsSavingProfile(false)
		}
	}

	return (
		<section className="motion-enter flex min-w-0 flex-1 overflow-y-auto bg-[var(--bg-surface-alt)] p-3 text-[var(--text-primary)] sm:p-4 lg:p-6">
			<div className="mx-auto flex w-full max-w-6xl flex-col gap-4 lg:gap-6 xl:flex-row">
				<div className="w-full shrink-0 rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 shadow-sm sm:p-6 xl:w-[320px]">
					<input
						ref={fileInputRef}
						type="file"
						accept="image/*"
						className="hidden"
						onChange={handleProfileImageSelection}
					/>
					<div className="relative mx-auto mb-4 h-24 w-24 overflow-hidden rounded-full bg-[var(--bubble-sent)] text-center text-2xl font-semibold leading-[6rem] text-white">
						{profileImageUrl ? (
							<img src={profileImageUrl} alt={displayName} className="h-full w-full object-cover" />
						) : (
							avatarLabel
						)}
						<button
							type="button"
							onClick={() => fileInputRef.current?.click()}
							disabled={isUploading || !onUploadProfileImage}
							className="md-state absolute bottom-1 right-1 rounded-full bg-md-secondary-container p-2 text-md-on-secondary-container shadow-md3-1 active:scale-95 disabled:pointer-events-none disabled:opacity-40"
							aria-label="profile image"
						>
							<Camera size={14} />
						</button>
					</div>
					{isUploading && <p className="mb-2 text-center text-xs text-[var(--text-secondary)]">Uploading profile image…</p>}
					{uploadError && <p className="mb-2 text-center text-xs text-red-500">{uploadError}</p>}
					<h1 className="text-center text-xl font-semibold tracking-tight text-[var(--text-primary)]">{displayName}</h1>
					<p className="mb-2 text-center text-sm text-[var(--text-secondary)]">{email}</p>
					<div className="mb-6 flex justify-center">
						<span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">
							{enabledLabel}
						</span>
					</div>

					<div className="space-y-3 rounded-2xl bg-[var(--bg-soft)] p-4 text-sm text-[var(--text-primary)]">
						<div className="flex items-center gap-2">
							<Mail size={15} className="text-[var(--text-secondary)]" />
							<span className="truncate">{email}</span>
						</div>
						<div className="flex items-center gap-2">
							<UserCircle size={15} className="text-[var(--text-secondary)]" />
							User ID #{currentUser?.id ?? session?.user.id ?? 'N/A'}
						</div>
						<div className="flex items-center gap-2">
							<ShieldCheck size={15} className="text-[var(--text-secondary)]" />
							{roles.length > 0 ? roles.join(', ') : 'No roles assigned'}
						</div>
					</div>
				</div>

				<div className="min-w-0 flex-1 space-y-4">
					<div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 shadow-sm sm:p-6">
						<p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">Account</p>
						<div className="mb-6 border-b border-[var(--border)] pb-4">
							<h2 className="mt-1 text-xl font-semibold tracking-tight text-[var(--text-primary)]">Profile Details</h2>
							{/* <p className="mt-1 text-sm text-[var(--text-secondary)]">Authenticated account data from the backend session.</p> */}
						</div>

						<div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-soft)] p-3">
							<div className="flex min-w-0 items-center gap-3">
								<div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--avatar-neutral-bg)] text-xs font-semibold text-white">
									{profileImageUrl ? (
										<img src={profileImageUrl} alt={displayName} className="h-full w-full object-cover" />
									) : (
										avatarLabel
									)}
								</div>
								<div className="min-w-0">
									<p className="truncate text-sm font-semibold text-[var(--text-primary)]">{displayName}</p>
									<p className="truncate text-xs text-[var(--text-secondary)]">@{username}</p>
								</div>
							</div>
							<span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">
								{enabledLabel}
							</span>
						</div>

						<form onSubmit={handleProfileSave} className="grid gap-4 md:grid-cols-2">
							<div className="text-sm font-medium text-[var(--text-secondary)]">
								Display Name
								<div className="mt-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-2.5 text-sm text-[var(--text-primary)]">
									{displayName}
								</div>
							</div>
							<div className="text-sm font-medium text-[var(--text-secondary)]">
								Username
								<input
									type="text"
									value={editableUserName}
									onChange={(event) => setEditableUserName(event.target.value)}
									className="mt-1.5 h-12 w-full rounded-t-md3-sm border-b-2 border-md-outline bg-md-surface-container-highest px-3 text-sm text-md-on-surface outline-none transition-colors duration-200 focus:border-md-primary"
								/>
							</div>
							<div className="text-sm font-medium text-[var(--text-secondary)]">
								Email
								<input
									type="email"
									value={editableEmail}
									onChange={(event) => setEditableEmail(event.target.value)}
									className="mt-1.5 h-12 w-full rounded-t-md3-sm border-b-2 border-md-outline bg-md-surface-container-highest px-3 text-sm text-md-on-surface outline-none transition-colors duration-200 focus:border-md-primary"
								/>
							</div>
							<div className="text-sm font-medium text-[var(--text-secondary)]">
								Account Status
								<div className="mt-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-2.5 text-sm text-[var(--text-primary)]">
									{enabledLabel}
								</div>
							</div>
							<div className="text-sm font-medium text-[var(--text-secondary)]">
								Created At
								<div className="mt-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-2.5 text-sm text-[var(--text-primary)]">
									{formatDate(currentUser?.createdAt)}
								</div>
							</div>
							<div className="text-sm font-medium text-[var(--text-secondary)]">
								Last Updated
								<div className="mt-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-2.5 text-sm text-[var(--text-primary)]">
									{formatDate(currentUser?.updatedAt)}
								</div>
							</div>
							<div className="text-sm font-medium text-[var(--text-secondary)] md:col-span-2">
								Roles
								<div className="mt-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-2.5 text-sm text-[var(--text-primary)]">
									{roles.length > 0 ? roles.join(', ') : 'No roles assigned'}
								</div>
							</div>
							<div className="md:col-span-2 flex items-center justify-end gap-3">
								{profileSaveError && <p className="text-sm text-md-error">{profileSaveError}</p>}
								{profileSaveStatus && <p className="text-sm text-md-on-surface-variant">{profileSaveStatus}</p>}
								<Button type="submit" size="md" isLoading={isSavingProfile} disabled={!onUpdateProfile}>
									{isSavingProfile ? 'Saving…' : 'Save changes'}
								</Button>
							</div>
						</form>
					</div>

					<div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 shadow-sm sm:p-6">
						<div className="mb-6 border-b border-[var(--border)] pb-4">
							<p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">Friendships</p>
							<h2 className="mt-1 text-xl font-semibold tracking-tight text-[var(--text-primary)]">Friends</h2>
							<p className="mt-1 text-sm text-[var(--text-secondary)]">Users you are currently connected with.</p>
						</div>

						<div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-soft)] p-4">
							<div className="mb-3 flex items-center justify-between">
								<div className="flex items-center gap-2">
									<Users size={16} className="text-[var(--text-secondary)]" />
									<h3 className="text-sm font-semibold text-[var(--text-primary)]">Friends</h3>
								</div>
								<span className="rounded-full bg-[var(--bg-surface)] px-2 py-1 text-xs text-[var(--text-secondary)]">{friendships.friends.length}</span>
							</div>
							<div className="space-y-3">
								{friendships.friends.map((friend) => {
									const friendAvatarLabel = getAvatarLabel(friend.username)
									const friendImageUrl = resolveAssetUrl(friend.profilePicUrl)
									return (
										<div key={friend.userId} className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-3">
											<div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--avatar-neutral-bg)] text-xs font-semibold text-white">
												{friendImageUrl ? (
													<img src={friendImageUrl} alt={friend.username} className="h-full w-full object-cover" />
												) : (
													friendAvatarLabel
												)}
											</div>
											<div className="min-w-0">
												<p className="truncate text-sm font-semibold text-[var(--text-primary)]">{friend.username}</p>
												<p className="text-xs text-[var(--text-muted)]">@{friend.username}</p>
											</div>
										</div>
									)
								})}
								{isFriendshipsLoading && <p className="text-sm text-[var(--text-secondary)]">Loading friends…</p>}
								{!isFriendshipsLoading && friendships.friends.length === 0 && <p className="text-sm text-[var(--text-secondary)]">No friends yet.</p>}
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	)
}
