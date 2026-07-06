export type UserSummaryResponse = {
	id: number
	userName: string
	email?: string
	profileImageUrl?: string | null
	enabled?: boolean
	roles?: string[]
	createdAt?: string
	updatedAt?: string
}
