import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Camera, Mail, UserCircle, Users, Edit2 } from 'lucide-react'
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
	const avatarLabel = getAvatarLabel(displayName)
	const profileImageUrl = resolveAssetUrl(currentUser?.profileImageUrl ?? session?.user.profileImageUrl)
	const [uploadError, setUploadError] = useState<string | null>(null)
	const [isUploading, setIsUploading] = useState(false)
	const [editableUserName, setEditableUserName] = useState(username)
	const [editableEmail, setEditableEmail] = useState(email)
	const [isSavingProfile, setIsSavingProfile] = useState(false)
	const [profileSaveError, setProfileSaveError] = useState<string | null>(null)
	const [profileSaveStatus, setProfileSaveStatus] = useState<string | null>(null)
	const fileInputRef = useRef<HTMLInputElement | null>(null)
	const [isEditing, setIsEditing] = useState(false)

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
			setTimeout(() => {
				setIsEditing(false)
				setProfileSaveStatus(null)
			}, 1500)
		} catch (error) {
			setProfileSaveError(error instanceof Error ? error.message : 'Failed to update profile.')
		} finally {
			setIsSavingProfile(false)
		}
	}

	return (
		<section className="motion-enter flex min-w-0 flex-1 flex-col overflow-y-auto bg-md-surface p-4 sm:p-6 lg:p-10">
			<div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-8">
				{/* Profile Header */}
				<div className="flex w-full flex-col items-center rounded-3xl bg-md-surface-container p-8 shadow-sm">
					<input
						ref={fileInputRef}
						type="file"
						accept="image/*"
						className="hidden"
						onChange={handleProfileImageSelection}
					/>
					<div className="group relative mb-6 h-32 w-32 overflow-hidden rounded-full bg-gradient-to-tr from-md-primary to-md-tertiary text-center text-4xl font-semibold leading-[8rem] text-white shadow-lg transition-transform hover:scale-105">
						{profileImageUrl ? (
							<img src={profileImageUrl} alt={displayName} className="h-full w-full object-cover" />
						) : (
							avatarLabel
						)}
						<button
							type="button"
							onClick={() => fileInputRef.current?.click()}
							disabled={isUploading || !onUploadProfileImage}
							className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 disabled:pointer-events-none"
							aria-label="profile image"
						>
							<Camera size={28} className="text-white" />
						</button>
					</div>
					{isUploading && <p className="mb-2 text-center text-sm text-md-on-surface-variant">Uploading…</p>}
					{uploadError && <p className="mb-2 text-center text-sm text-md-error">{uploadError}</p>}
					<h1 className="text-3xl font-bold tracking-tight text-md-on-surface">{displayName}</h1>
					<p className="mt-1 text-md-on-surface-variant">@{username}</p>
				</div>

				<div className="flex w-full flex-col gap-6 lg:flex-row">
					{/* Account Details */}
					<div className="flex w-full flex-1 flex-col rounded-3xl bg-md-surface-container-low p-6 shadow-sm">
						<div className="mb-6 flex items-center justify-between">
							<h2 className="text-lg font-semibold text-md-on-surface">Account Details</h2>
							{!isEditing && (
								<button
									onClick={() => setIsEditing(true)}
									className="flex items-center gap-2 rounded-full bg-md-secondary-container px-4 py-2 text-sm font-medium text-md-on-secondary-container transition-colors hover:bg-md-secondary-container/80"
								>
									<Edit2 size={16} /> Edit
								</button>
							)}
						</div>
						
						{isEditing ? (
							<form onSubmit={handleProfileSave} className="flex flex-col gap-4 motion-enter-soft">
								<label className="flex flex-col gap-1.5">
									<span className="text-sm font-medium text-md-on-surface-variant">Display Name / Username</span>
									<input
										type="text"
										value={editableUserName}
										onChange={(event) => setEditableUserName(event.target.value)}
										className="h-12 rounded-xl border border-md-outline bg-md-surface px-4 text-md-on-surface outline-none transition-colors focus:border-md-primary focus:ring-1 focus:ring-md-primary"
									/>
								</label>
								<label className="flex flex-col gap-1.5">
									<span className="text-sm font-medium text-md-on-surface-variant">Email Address</span>
									<input
										type="email"
										value={editableEmail}
										onChange={(event) => setEditableEmail(event.target.value)}
										className="h-12 rounded-xl border border-md-outline bg-md-surface px-4 text-md-on-surface outline-none transition-colors focus:border-md-primary focus:ring-1 focus:ring-md-primary"
									/>
								</label>
								<div className="mt-4 flex items-center justify-end gap-3">
									{profileSaveError && <p className="text-sm text-md-error">{profileSaveError}</p>}
									{profileSaveStatus && <p className="text-sm text-green-500">{profileSaveStatus}</p>}
									<button
										type="button"
										onClick={() => {
											setIsEditing(false)
											setEditableUserName(username)
											setEditableEmail(email)
											setProfileSaveError(null)
										}}
										className="rounded-full px-4 py-2 text-sm font-medium text-md-on-surface-variant hover:bg-md-surface-variant/50"
									>
										Cancel
									</button>
									<Button type="submit" isLoading={isSavingProfile} disabled={!onUpdateProfile}>
										{isSavingProfile ? 'Saving…' : 'Save Changes'}
									</Button>
								</div>
							</form>
						) : (
							<div className="flex flex-col gap-5 motion-enter-soft">
								<div className="flex items-center gap-4 rounded-2xl bg-md-surface p-4">
									<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-md-primary-container text-md-on-primary-container">
										<UserCircle size={20} />
									</div>
									<div className="min-w-0 flex-1">
										<p className="text-xs font-medium text-md-on-surface-variant">Username</p>
										<p className="truncate text-[15px] font-medium text-md-on-surface">{displayName}</p>
									</div>
								</div>
								<div className="flex items-center gap-4 rounded-2xl bg-md-surface p-4">
									<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-md-tertiary-container text-md-on-tertiary-container">
										<Mail size={20} />
									</div>
									<div className="min-w-0 flex-1">
										<p className="text-xs font-medium text-md-on-surface-variant">Email</p>
										<p className="truncate text-[15px] font-medium text-md-on-surface">{email}</p>
									</div>
								</div>
							</div>
						)}
					</div>

					{/* Friends List */}
					<div className="flex w-full flex-1 flex-col rounded-3xl bg-md-surface-container-low p-6 shadow-sm">
						<div className="mb-6 flex items-center justify-between">
							<h2 className="text-lg font-semibold text-md-on-surface">Friends</h2>
							<span className="flex h-6 items-center justify-center rounded-full bg-md-primary px-3 text-xs font-medium text-md-on-primary">
								{friendships.friends.length}
							</span>
						</div>
						
						<div className="flex flex-col gap-3">
							{isFriendshipsLoading ? (
								<p className="text-center text-sm text-md-on-surface-variant">Loading friends…</p>
							) : friendships.friends.length === 0 ? (
								<div className="flex flex-col items-center justify-center rounded-2xl bg-md-surface py-8 text-center">
									<Users size={32} className="mb-3 text-md-outline" />
									<p className="text-sm font-medium text-md-on-surface">No friends yet</p>
									<p className="mt-1 text-xs text-md-on-surface-variant">Connect with others to see them here.</p>
								</div>
							) : (
								friendships.friends.map((friend) => {
									const friendAvatarLabel = getAvatarLabel(friend.username)
									const friendImageUrl = resolveAssetUrl(friend.profilePicUrl)
									return (
										<div key={friend.userId} className="flex items-center gap-4 rounded-2xl bg-md-surface p-3 transition-colors hover:bg-md-surface-container">
											<div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-tr from-md-secondary to-md-tertiary text-sm font-semibold text-white">
												{friendImageUrl ? (
													<img src={friendImageUrl} alt={friend.username} className="h-full w-full object-cover" />
												) : (
													friendAvatarLabel
												)}
											</div>
											<div className="min-w-0 flex-1">
												<p className="truncate text-[15px] font-medium text-md-on-surface">{friend.username}</p>
												<p className="truncate text-xs text-md-on-surface-variant">@{friend.username}</p>
											</div>
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
