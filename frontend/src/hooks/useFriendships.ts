import { useCallback, useMemo, useState } from 'react'
import {
	cancelFriendRequest,
	getFriends,
	getIncomingFriendRequests,
	getSentFriendRequests,
	respondToFriendRequest,
	sendFriendRequest,
} from '../services/friendService'
import type { FriendUserResponse, FriendshipResponse } from '../types/api/friend'
import type { FriendRequestNotificationPayload } from '../services/chatSocketService'

export function useFriendships() {
	const [incomingFriendRequests, setIncomingFriendRequests] = useState<FriendshipResponse[]>([])
	const [sentFriendRequests, setSentFriendRequests] = useState<FriendshipResponse[]>([])
	const [friends, setFriends] = useState<FriendUserResponse[]>([])
	const [isFriendshipsLoading, setIsFriendshipsLoading] = useState(false)
	const [friendshipStatus, setFriendshipStatus] = useState<string | null>(null)

	const loadFriendships = useCallback(async () => {
		setIsFriendshipsLoading(true)
		try {
			const [incomingResult, sentResult, acceptedResult] = await Promise.allSettled([
				getIncomingFriendRequests(),
				getSentFriendRequests(),
				getFriends(),
			])

			if (incomingResult.status === 'fulfilled') {
				setIncomingFriendRequests(incomingResult.value)
			} else {
				setIncomingFriendRequests([])
			}

			if (sentResult.status === 'fulfilled') {
				setSentFriendRequests(sentResult.value)
			} else {
				setSentFriendRequests([])
			}

			if (acceptedResult.status === 'fulfilled') {
				setFriends(acceptedResult.value)
			} else {
				setFriends([])
			}

			if (
				incomingResult.status === 'rejected' ||
				sentResult.status === 'rejected' ||
				acceptedResult.status === 'rejected'
			) {
				setFriendshipStatus('Some friendship data could not be loaded. Showing available results.')
			} else {
				setFriendshipStatus(null)
			}
		} catch {
			setFriendshipStatus('Failed to load friendship data.')
		} finally {
			setIsFriendshipsLoading(false)
		}
	}, [])

	const clearFriendships = useCallback(() => {
		setIncomingFriendRequests([])
		setSentFriendRequests([])
		setFriends([])
		setFriendshipStatus(null)
	}, [])

	// Called by useChatSocket when a friendship notification arrives over WebSocket.
	const handleFriendshipNotification = useCallback((payload: FriendRequestNotificationPayload) => {
		void loadFriendships()

		switch (payload.event) {
			case 'RECEIVED':
				setFriendshipStatus(
					payload.senderName
						? `New friend request from ${payload.senderName}.`
						: 'You received a new friend request.',
				)
				break
			case 'ACCEPTED':
				setFriendshipStatus(
					payload.senderName
						? `${payload.senderName} accepted your friend request.`
						: 'Your friend request was accepted.',
				)
				break
			case 'DECLINED':
				setFriendshipStatus(
					payload.senderName
						? `${payload.senderName} declined your friend request.`
						: 'A friend request was declined.',
				)
				break
			case 'REMOVED':
				setFriendshipStatus('A friendship was removed.')
				break
			default:
				setFriendshipStatus('Friendship status updated.')
				break
		}
	}, [loadFriendships])

	const handleSendFriendRequest = useCallback(async (userId: number) => {
		await sendFriendRequest(userId)
		await loadFriendships()
		setFriendshipStatus(`Friend request sent to user ${userId}.`)
	}, [loadFriendships])

	const handleRespondToFriendRequest = useCallback(async (userId: number, response: 'ACCEPT' | 'REJECT') => {
		await respondToFriendRequest(userId, response)
		await loadFriendships()
		setFriendshipStatus(
			`Friend request from user ${userId} ${response === 'ACCEPT' ? 'accepted' : 'rejected'}.`,
		)
	}, [loadFriendships])

	const handleCancelFriendRequest = useCallback(async (userId: number) => {
		await cancelFriendRequest(userId)
		await loadFriendships()
		setFriendshipStatus(`Cancelled friend request to user ${userId}.`)
	}, [loadFriendships])

	return useMemo(() => ({
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
	}), [
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
	])
}
