export type SessionUser = {
	id: number
	email: string
	name: string
	roles: string[]
	profileImageUrl?: string
}

export type SessionState = {
	accessToken: string
	user: SessionUser
}

export type LoginRequest = {
	username: string
	password: string
}

export type RegisterRequest = {
	username: string
	password: string
	confirmPassword: string
	email: string
}

export type LoginResponse = {
	token: string
	username: string
	roles: string[]
}

export type CurrentUserResponse = {
	id: number
	userName: string
	email: string
	profileImageUrl?: string
	enabled: boolean
	roles: string[]
	createdAt: string
	updatedAt: string
}

export type ApiError = {
	status: number
	error: string
	message: string
	path: string
	timestamp: string
	fieldErrors?: { field: string; message: string }[] | null
}
