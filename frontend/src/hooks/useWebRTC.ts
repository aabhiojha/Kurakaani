import { useEffect, useRef, useState, useCallback } from 'react'
import type { ChatSocketService, WebRtcSignal } from '../services/chatSocketService'

type IncomingCallInfo = {
	senderUsername: string
	/** The SDP offer from the caller, buffered until the user accepts. */
	offer: RTCSessionDescriptionInit | null
	/** ICE candidates that arrived before the user accepted. */
	pendingCandidates: RTCIceCandidateInit[]
	/** Identifies if it is an audio or video call */
	callType: 'audio' | 'video'
}

const ICE_SERVERS: RTCIceServer[] = [
	{ urls: 'stun:stun.l.google.com:19302' },
	{ urls: 'stun:stun1.l.google.com:19302' },
]

export function useWebRTC(
	chatSocketService: ChatSocketService | null | undefined,
	isSocketConnected: boolean,
	currentUserUsername: string | undefined,
) {
	const [localStream, setLocalStream] = useState<MediaStream | null>(null)
	const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
	const [isCalling, setIsCalling] = useState(false)
	const [incomingCall, setIncomingCall] = useState<{ senderUsername: string, callType: 'audio' | 'video' } | null>(null)
	const [hasMultipleCameras, setHasMultipleCameras] = useState(false)
	const [isAudioOnly, setIsAudioOnly] = useState(false)
	const [isScreenSharing, setIsScreenSharing] = useState(false)
	const [networkQuality, setNetworkQuality] = useState<'excellent' | 'good' | 'poor' | 'unknown'>('unknown')

	const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
	const targetUserRef = useRef<string | null>(null)
	const localStreamRef = useRef<MediaStream | null>(null)
	const chatSocketRef = useRef(chatSocketService)
	chatSocketRef.current = chatSocketService

	// ICE candidate queue: candidates arriving before setRemoteDescription completes
	const iceCandidateQueueRef = useRef<RTCIceCandidateInit[]>([])
	const remoteDescriptionSetRef = useRef(false)

	// Buffered incoming call data (offer + early ICE candidates)
	const incomingCallRef = useRef<IncomingCallInfo | null>(null)

	const stopLocalStream = useCallback(() => {
		const stream = localStreamRef.current
		if (stream) {
			stream.getTracks().forEach((track) => track.stop())
			localStreamRef.current = null
			setLocalStream(null)
		}
	}, [])

	const cleanup = useCallback(() => {
		stopLocalStream()
		if (peerConnectionRef.current) {
			peerConnectionRef.current.close()
			peerConnectionRef.current = null
		}
		setRemoteStream(null)
		setIsCalling(false)
		setIncomingCall(null)
		setIsAudioOnly(false)
		setIsScreenSharing(false)
		setNetworkQuality('unknown')
		targetUserRef.current = null
		iceCandidateQueueRef.current = []
		remoteDescriptionSetRef.current = false
		incomingCallRef.current = null
	}, [stopLocalStream])

	/** Drain queued ICE candidates after remote description has been set. */
	const flushIceCandidateQueue = useCallback(async (pc: RTCPeerConnection) => {
		const queue = iceCandidateQueueRef.current
		iceCandidateQueueRef.current = []
		for (const candidate of queue) {
			try {
				await pc.addIceCandidate(candidate)
			} catch (e) {
				console.warn('[WebRTC] Failed to add queued ICE candidate', e)
			}
		}
	}, [])

	const createPeerConnection = useCallback((targetUsername: string) => {
		if (peerConnectionRef.current) {
			peerConnectionRef.current.close()
		}

		remoteDescriptionSetRef.current = false
		iceCandidateQueueRef.current = []

		const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })

		pc.ontrack = (event) => {
			console.debug('[WebRTC] Remote track received', event.track.kind)
			if (event.streams && event.streams.length > 0) {
				setRemoteStream(event.streams[0])
			} else {
				setRemoteStream((prev) => {
					const stream = prev || new MediaStream()
					stream.addTrack(event.track)
					return stream
				})
			}
		}

		pc.onicecandidate = (event) => {
			if (event.candidate && chatSocketRef.current) {
				// Explicitly extract serializable fields via toJSON()
				chatSocketRef.current.sendWebRtcSignal({
					type: 'ice_candidate',
					targetUsername,
					data: event.candidate.toJSON(),
				})
			}
		}

		pc.oniceconnectionstatechange = () => {
			console.debug('[WebRTC] ICE connection state:', pc.iceConnectionState)
			if (pc.iceConnectionState === 'failed') {
				alert('Connection failed. This usually happens if a direct network route cannot be found (e.g. restrictive firewall) and no TURN server is configured.')
				cleanup()
			} else if (pc.iceConnectionState === 'closed') {
				cleanup()
			}
			// Note: We intentionally ignore 'disconnected' as WebRTC can often automatically recover from it.
		}

		pc.onconnectionstatechange = () => {
			console.debug('[WebRTC] Connection state:', pc.connectionState)
		}

		peerConnectionRef.current = pc
		return pc
	}, [cleanup])

	/** Process a buffered or live offer on the callee side. */
	const processOffer = useCallback(async (
		pc: RTCPeerConnection,
		offerData: RTCSessionDescriptionInit,
		senderUsername: string,
		bufferedCandidates: RTCIceCandidateInit[],
	) => {
		// Pass the plain init object directly — no deprecated RTCSessionDescription constructor
		await pc.setRemoteDescription(offerData)
		remoteDescriptionSetRef.current = true

		// Flush candidates that arrived before the offer was processed
		for (const candidate of bufferedCandidates) {
			try {
				await pc.addIceCandidate(candidate)
			} catch (e) {
				console.warn('[WebRTC] Failed to add buffered ICE candidate', e)
			}
		}
		await flushIceCandidateQueue(pc)

		const answer = await pc.createAnswer()
		await pc.setLocalDescription(answer)

		chatSocketRef.current?.sendWebRtcSignal({
			type: 'answer',
			targetUsername: senderUsername,
			data: answer,
		})
		console.debug('[WebRTC] Answer sent to', senderUsername)
	}, [flushIceCandidateQueue])

	/** Checks if the user has more than one video input device */
	const checkCameras = useCallback(async () => {
		try {
			const devices = await navigator.mediaDevices.enumerateDevices()
			const videoDevices = devices.filter(d => d.kind === 'videoinput')
			setHasMultipleCameras(videoDevices.length > 1)
		} catch (e) {
			console.debug('[WebRTC] Failed to enumerate devices', e)
		}
	}, [])

	/** Switches to the next available camera */
	const switchCamera = useCallback(async () => {
		if (isAudioOnly || isScreenSharing) return

		try {
			const devices = await navigator.mediaDevices.enumerateDevices()
			const videoDevices = devices.filter(d => d.kind === 'videoinput')
			if (videoDevices.length < 2) return

			const currentVideoTrack = localStreamRef.current?.getVideoTracks()[0]
			const currentSettings = currentVideoTrack?.getSettings()
			const currentDeviceId = currentSettings?.deviceId

			let nextDeviceIndex = 0
			if (currentDeviceId) {
				const currentIndex = videoDevices.findIndex(d => d.deviceId === currentDeviceId)
				if (currentIndex >= 0) {
					nextDeviceIndex = (currentIndex + 1) % videoDevices.length
				}
			}
			const nextDeviceId = videoDevices[nextDeviceIndex].deviceId

			const newStream = await navigator.mediaDevices.getUserMedia({
				video: { 
					deviceId: { exact: nextDeviceId },
					width: { ideal: 1920 },
					height: { ideal: 1080 }
				}
			})
			const newVideoTrack = newStream.getVideoTracks()[0]

			if (currentVideoTrack) {
				currentVideoTrack.stop()
				localStreamRef.current?.removeTrack(currentVideoTrack)
			}
			localStreamRef.current?.addTrack(newVideoTrack)
			
			// Update local stream state with a new reference to force re-render
			const updatedStream = new MediaStream(localStreamRef.current!.getTracks())
			localStreamRef.current = updatedStream
			setLocalStream(updatedStream)

			// Replace track on the peer connection
			if (peerConnectionRef.current) {
				const videoSender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === 'video')
				if (videoSender) {
					await videoSender.replaceTrack(newVideoTrack)
				}
			}
		} catch (e) {
			console.error('[WebRTC] Failed to switch camera', e)
		}
	}, [isAudioOnly, isScreenSharing])

	/** Toggle Screen Sharing on Desktop */
	const toggleScreenShare = useCallback(async () => {
		if (isAudioOnly) return

		try {
			if (isScreenSharing) {
				// Revert to camera with high quality constraints
				const stream = await navigator.mediaDevices.getUserMedia({ 
					video: {
						width: { ideal: 1920 },
						height: { ideal: 1080 }
					} 
				})
				const newTrack = stream.getVideoTracks()[0]
				
				const currentTrack = localStreamRef.current?.getVideoTracks()[0]
				if (currentTrack) {
					currentTrack.stop()
					localStreamRef.current?.removeTrack(currentTrack)
				}
				localStreamRef.current?.addTrack(newTrack)
				
				const updatedStream = new MediaStream(localStreamRef.current!.getTracks())
				localStreamRef.current = updatedStream
				setLocalStream(updatedStream)

				if (peerConnectionRef.current) {
					const videoSender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === 'video')
					if (videoSender) {
						await videoSender.replaceTrack(newTrack)
					}
				}
				setIsScreenSharing(false)
			} else {
				// Start screen share
				const stream = await navigator.mediaDevices.getDisplayMedia({ video: true })
				const screenTrack = stream.getVideoTracks()[0]

				screenTrack.onended = () => {
					// User clicked "Stop sharing" via the browser's built-in UI
					setIsScreenSharing((prev) => {
						if (prev) toggleScreenShare()
						return false
					})
				}

				const currentTrack = localStreamRef.current?.getVideoTracks()[0]
				if (currentTrack) {
					currentTrack.stop()
					localStreamRef.current?.removeTrack(currentTrack)
				}
				localStreamRef.current?.addTrack(screenTrack)

				const updatedStream = new MediaStream(localStreamRef.current!.getTracks())
				localStreamRef.current = updatedStream
				setLocalStream(updatedStream)

				if (peerConnectionRef.current) {
					const videoSender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === 'video')
					if (videoSender) {
						await videoSender.replaceTrack(screenTrack)
					}
				}
				setIsScreenSharing(true)
			}
		} catch (error) {
			console.error('[WebRTC] Screen sharing failed or cancelled', error)
		}
	}, [isScreenSharing, isAudioOnly])


	// ── Caller side ──────────────────────────────────────────────────────────

	const startCall = useCallback(async (targetUsername: string, audioOnly = false) => {
		const svc = chatSocketRef.current
		if (!svc) return
		try {
			setIsCalling(true)
			setIsAudioOnly(audioOnly)
			targetUserRef.current = targetUsername

			if (!navigator.mediaDevices) {
				alert('Camera/Microphone access requires a secure connection (HTTPS or localhost). You are likely accessing this over an insecure local network IP on mobile.')
				throw new Error('navigator.mediaDevices is undefined')
			}

			const stream = await navigator.mediaDevices.getUserMedia({ 
				video: audioOnly ? false : {
					width: { ideal: 1920 },
					height: { ideal: 1080 }
				}, 
				audio: true 
			})
			localStreamRef.current = stream
			setLocalStream(stream)
			if (!audioOnly) {
				checkCameras()
			}

			const pc = createPeerConnection(targetUsername)
			stream.getTracks().forEach((track) => pc.addTrack(track, stream))

			const offer = await pc.createOffer()
			await pc.setLocalDescription(offer)

			// Send call_request first, then the offer
			svc.sendWebRtcSignal({ type: 'call_request', targetUsername, data: { callType: audioOnly ? 'audio' : 'video' } })
			svc.sendWebRtcSignal({ type: 'offer', targetUsername, data: offer })
			console.debug('[WebRTC] Call started → offer sent to', targetUsername)
		} catch (error) {
			console.error('[WebRTC] Failed to start call', error)
			if (error instanceof Error && (error.name === 'NotAllowedError' || error.name === 'NotFoundError')) {
				alert('Camera/Microphone permission denied or device not found.')
			}
			cleanup()
		}
	}, [createPeerConnection, cleanup, checkCameras])

	// ── Callee side ──────────────────────────────────────────────────────────

	const acceptCall = useCallback(async () => {
		const pending = incomingCallRef.current
		const svc = chatSocketRef.current
		if (!pending || !svc) return

		try {
			const targetUsername = pending.senderUsername
			const audioOnly = pending.callType === 'audio'
			
			targetUserRef.current = targetUsername
			setIsCalling(true)
			setIsAudioOnly(audioOnly)
			setIncomingCall(null)

			if (!navigator.mediaDevices) {
				alert('Camera/Microphone access requires a secure connection (HTTPS or localhost). You are likely accessing this over an insecure local network IP on mobile.')
				throw new Error('navigator.mediaDevices is undefined')
			}

			const stream = await navigator.mediaDevices.getUserMedia({ 
				video: audioOnly ? false : {
					width: { ideal: 1920 },
					height: { ideal: 1080 }
				}, 
				audio: true 
			})
			localStreamRef.current = stream
			setLocalStream(stream)
			if (!audioOnly) {
				checkCameras()
			}

			const pc = createPeerConnection(targetUsername)
			stream.getTracks().forEach((track) => pc.addTrack(track, stream))

			if (pending.offer) {
				await processOffer(pc, pending.offer, targetUsername, pending.pendingCandidates)
			}
			// If offer hasn't arrived yet (very unlikely), the signal handler
			// will process it when it arrives since peerConnectionRef is now set.

			incomingCallRef.current = null
		} catch (error) {
			console.error('[WebRTC] Failed to accept call', error)
			if (error instanceof Error && (error.name === 'NotAllowedError' || error.name === 'NotFoundError')) {
				alert('Camera/Microphone permission denied or device not found.')
			}
			cleanup()
		}
	}, [createPeerConnection, cleanup, processOffer, checkCameras])

	const rejectCall = useCallback(() => {
		const pending = incomingCallRef.current
		const svc = chatSocketRef.current
		if (pending && svc) {
			svc.sendWebRtcSignal({ type: 'call_rejected', targetUsername: pending.senderUsername, data: null })
		}
		incomingCallRef.current = null
		setIncomingCall(null)
	}, [])

	const endCall = useCallback(() => {
		const svc = chatSocketRef.current
		if (targetUserRef.current && svc) {
			svc.sendWebRtcSignal({ type: 'call_ended', targetUsername: targetUserRef.current, data: null })
		}
		cleanup()
	}, [cleanup])

	// ── Subscribe to WebRTC signals ──────────────────────────────────────────

	useEffect(() => {
		if (!chatSocketService || !isSocketConnected || !currentUserUsername) return

		const handleIncomingSignal = async (signal: WebRtcSignal) => {
			try {
				const senderUsername = signal.senderUsername
				if (!senderUsername || senderUsername === currentUserUsername) return

				console.debug('[WebRTC] Signal received:', signal.type, 'from', senderUsername)

				if (signal.type === 'call_request') {
					const callType = (signal.data as { callType?: 'audio' | 'video' } | null)?.callType || 'video'
					incomingCallRef.current = {
						senderUsername,
						offer: null,
						pendingCandidates: [],
						callType
					}
					setIncomingCall({ senderUsername, callType })
					return
				}

				if (signal.type === 'call_rejected' || signal.type === 'call_ended') {
					cleanup()
					return
				}

				if (signal.type === 'offer') {
					// If we have a pending incoming call and no PC yet → buffer for accept
					const pendingCall = incomingCallRef.current
					if (pendingCall && !peerConnectionRef.current) {
						pendingCall.offer = signal.data as RTCSessionDescriptionInit
						return
					}

					// If offer arrives WITHOUT a preceding call_request (e.g. it was lost),
					// create the incoming call state and buffer the offer
					if (!pendingCall && !peerConnectionRef.current) {
						const callType = 'video' // Default fallback
						incomingCallRef.current = {
							senderUsername,
							offer: signal.data as RTCSessionDescriptionInit,
							pendingCandidates: [],
							callType
						}
						setIncomingCall({ senderUsername, callType })
						return
					}

					// PC exists (user already accepted) but offer arrived late — process now
					if (peerConnectionRef.current && !remoteDescriptionSetRef.current) {
						await processOffer(peerConnectionRef.current, signal.data as RTCSessionDescriptionInit, senderUsername, [])
					}
					return
				}

				if (signal.type === 'answer') {
					if (peerConnectionRef.current) {
						// Pass plain object directly — no deprecated constructor
						await peerConnectionRef.current.setRemoteDescription(signal.data as RTCSessionDescriptionInit)
						remoteDescriptionSetRef.current = true
						await flushIceCandidateQueue(peerConnectionRef.current)
						console.debug('[WebRTC] Answer processed, ICE queue flushed')
					}
					return
				}

				if (signal.type === 'ice_candidate') {
					// Buffer in incoming call ref if user hasn't accepted yet
					const pendingCall = incomingCallRef.current
					if (pendingCall && !peerConnectionRef.current) {
						pendingCall.pendingCandidates.push(signal.data as RTCIceCandidateInit)
						return
					}

					if (peerConnectionRef.current) {
						if (!remoteDescriptionSetRef.current) {
							iceCandidateQueueRef.current.push(signal.data as RTCIceCandidateInit)
						} else {
							try {
								// Pass plain candidate init — no deprecated constructor
								await peerConnectionRef.current.addIceCandidate(signal.data as RTCIceCandidateInit)
							} catch (e) {
								console.warn('[WebRTC] Failed to add ICE candidate', e)
							}
						}
					}
					return
				}
			} catch (error) {
				console.error('[WebRTC] Error handling signal:', signal.type, error)
			}
		}

		try {
			chatSocketService.subscribeToWebRTC(handleIncomingSignal)
			console.debug('[WebRTC] Subscribed to /user/queue/webrtc')
		} catch {
			// Socket not ready yet; will re-run when isSocketConnected changes
		}

		return () => {
			chatSocketService.unsubscribeWebRTC()
		}
	}, [chatSocketService, isSocketConnected, currentUserUsername, cleanup, flushIceCandidateQueue, processOffer])

	// ── Monitor Network Quality ──────────────────────────────────────────────
	useEffect(() => {
		if (!isCalling) return

		let lastPacketsLost = 0
		let lastPacketsReceived = 0

		const interval = setInterval(async () => {
			const pc = peerConnectionRef.current
			if (!pc || pc.iceConnectionState !== 'connected' && pc.iceConnectionState !== 'completed') {
				// Don't update if not fully connected
				return
			}
			try {
				const stats = await pc.getStats()
				let packetsLost = 0
				let packetsReceived = 0
				
				stats.forEach((report) => {
					if (report.type === 'inbound-rtp') {
						packetsLost += report.packetsLost || 0
						packetsReceived += report.packetsReceived || 0
					}
				})
				
				const diffLost = packetsLost - lastPacketsLost
				const diffReceived = packetsReceived - lastPacketsReceived
				
				if (diffReceived > 0) {
					const lossRate = diffLost / (diffReceived + diffLost)
					if (lossRate > 0.05) setNetworkQuality('poor')
					else if (lossRate > 0.01) setNetworkQuality('good')
					else setNetworkQuality('excellent')
				} else if (diffReceived === 0 && diffLost > 0) {
					setNetworkQuality('poor')
				} else if (packetsReceived > 0) {
					setNetworkQuality('excellent')
				}
				
				lastPacketsLost = packetsLost
				lastPacketsReceived = packetsReceived
			} catch (e) {
				console.debug('[WebRTC] Failed to get stats', e)
			}
		}, 2000)

		return () => clearInterval(interval)
	}, [isCalling])

	return {
		localStream,
		remoteStream,
		isCalling,
		incomingCall,
		startCall,
		acceptCall,
		rejectCall,
		endCall,
		switchCamera,
		hasMultipleCameras,
		toggleScreenShare,
		isScreenSharing,
		isAudioOnly,
		targetUser: targetUserRef.current,
		networkQuality,
	}
}
