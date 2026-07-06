import { apiFetch } from '../lib/api'
import type { FriendUserResponse, FriendshipResponse } from '../types/api/friend'

export const sendFriendRequest = (userId: number) =>
	apiFetch<void>(`/api/friend/request/${userId}`, {
		method: 'POST',
	})

export const respondToFriendRequest = (userId: number, response: 'ACCEPT' | 'REJECT') =>
	apiFetch<void>(`/api/friend/respond/${userId}/${response}`, {
		method: 'POST',
	})

export const cancelFriendRequest = (userId: number) =>
	apiFetch<void>(`/api/friend/${userId}/cancel`, {
		method: 'POST',
	})

export const unfriendUser = (userId: number) =>
	apiFetch<void>(`/api/friend/${userId}/unfriend`, {
		method: 'POST',
	})

export const getIncomingFriendRequests = () => apiFetch<FriendshipResponse[]>('/api/friend/requests')

export const getSentFriendRequests = () => apiFetch<FriendshipResponse[]>('/api/friend/requests/sent')

export const getFriends = () => apiFetch<FriendUserResponse[]>('/api/friend/friends')
