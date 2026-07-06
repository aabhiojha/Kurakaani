import { useEffect, useRef, useState, Component, type ReactNode } from 'react'
import { PhoneOff, Mic, MicOff, Video, VideoOff, SwitchCamera, MonitorUp, MonitorOff, User, SignalHigh, SignalMedium, SignalLow, PictureInPicture, Minimize2, Maximize2 } from 'lucide-react'

class VideoCallErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean, error: Error | null}> {
	constructor(props: {children: ReactNode}) {
		super(props)
		this.state = { hasError: false, error: null }
	}

	static getDerivedStateFromError(error: Error) {
		return { hasError: true, error }
	}

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		console.error('[WebRTC] UI Crash:', error, errorInfo)
	}

	render() {
		if (this.state.hasError) {
			return (
				<div className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-zinc-950 text-white p-4">
					<h2 className="text-xl text-red-500 mb-2">Video Call UI Crashed</h2>
					<p className="text-zinc-400 font-mono text-sm max-w-lg break-words">{this.state.error?.toString()}</p>
				</div>
			)
		}
		return this.props.children
	}
}

type VideoCallOverlayProps = {
	localStream: MediaStream | null
	remoteStream: MediaStream | null
	onEndCall: () => void
	onSwitchCamera?: () => void
	hasMultipleCameras?: boolean
	isAudioOnly?: boolean
	isScreenSharing?: boolean
	onToggleScreenShare?: () => void
	networkQuality?: 'excellent' | 'good' | 'poor' | 'unknown'
	remoteUsername?: string
	remoteUserProfileImageUrl?: string | null
}

export function VideoCallOverlay({ 
	localStream, 
	remoteStream, 
	onEndCall, 
	onSwitchCamera, 
	hasMultipleCameras,
	isAudioOnly = false,
	isScreenSharing = false,
	onToggleScreenShare,
	networkQuality = 'unknown',
	remoteUsername = 'User',
	remoteUserProfileImageUrl
}: VideoCallOverlayProps) {
	const localVideoRef = useRef<HTMLVideoElement>(null)
	const remoteVideoRef = useRef<HTMLVideoElement>(null)
	const remoteBlurVideoRef = useRef<HTMLVideoElement>(null)
	const [isMuted, setIsMuted] = useState(false)
	const [isVideoOff, setIsVideoOff] = useState(false)
	const [isPipActive, setIsPipActive] = useState(false)
	const [isMinimized, setIsMinimized] = useState(false)

	useEffect(() => {
		if (localVideoRef.current && localStream && !isAudioOnly) {
			localVideoRef.current.srcObject = localStream
			localVideoRef.current.play().catch((err) => {
				console.warn('[WebRTC] Local video play blocked by browser', err)
			})
		}
	}, [localStream, isAudioOnly])

	useEffect(() => {
		if (remoteStream) {
			if (remoteVideoRef.current && !isAudioOnly) {
				remoteVideoRef.current.srcObject = remoteStream
				remoteVideoRef.current.play().catch((err) => {
					console.warn('[WebRTC] Remote video play blocked by browser', err)
				})
			}
			if (remoteBlurVideoRef.current && !isAudioOnly) {
				remoteBlurVideoRef.current.srcObject = remoteStream
				remoteBlurVideoRef.current.play().catch((err) => {
					console.warn('[WebRTC] Remote blur video play blocked by browser', err)
				})
			}
			
			// For audio-only, we might still want to attach to a hidden audio element
			// or just the remoteVideoRef since it plays audio too.
			if (isAudioOnly && remoteVideoRef.current) {
				remoteVideoRef.current.srcObject = remoteStream
				remoteVideoRef.current.play().catch((err) => {
					console.warn('[WebRTC] Remote audio play blocked by browser', err)
				})
			}
		}
	}, [remoteStream, isAudioOnly])

	const toggleMute = () => {
		if (localStream) {
			localStream.getAudioTracks().forEach((track) => {
				track.enabled = !track.enabled
			})
			setIsMuted(!isMuted)
		}
	}

	const toggleVideo = () => {
		if (localStream && !isAudioOnly) {
			localStream.getVideoTracks().forEach((track) => {
				track.enabled = !track.enabled
			})
			setIsVideoOff(!isVideoOff)
		}
	}

	const togglePip = async () => {
		if (isAudioOnly || !remoteVideoRef.current) return
		
		try {
			if (document.pictureInPictureElement) {
				await document.exitPictureInPicture()
				setIsPipActive(false)
			} else if (document.pictureInPictureEnabled) {
				await remoteVideoRef.current.requestPictureInPicture()
				setIsPipActive(true)
			}
		} catch (e) {
			console.error('[WebRTC] PiP failed', e)
		}
	}

	// Listen for browser PiP exit
	useEffect(() => {
		const video = remoteVideoRef.current
		if (!video) return
		
		const handleLeave = () => setIsPipActive(false)
		video.addEventListener('leavepictureinpicture', handleLeave)
		return () => video.removeEventListener('leavepictureinpicture', handleLeave)
	}, [])

	return (
		<VideoCallErrorBoundary>
		<div className={`fixed z-[70] flex flex-col overflow-hidden font-sans transition-all duration-500 ease-in-out shadow-2xl ${isMinimized ? 'bottom-6 right-6 w-72 h-48 rounded-2xl bg-zinc-950/90 border border-white/20 hover:scale-105 hover:shadow-[0_0_30px_rgba(0,0,0,0.5)]' : 'inset-0 bg-zinc-950'}`}>
			
			{/* Remote Media Container */}
			<div className="relative flex-1 w-full h-full flex items-center justify-center group">
				{isMinimized && (
					<button
						onClick={() => setIsMinimized(false)}
						className="absolute top-3 left-3 z-50 p-2 bg-black/60 hover:bg-black/80 rounded-full text-white backdrop-blur-md transition-all duration-200 shadow-lg"
						title="Back to full screen"
					>
						<Maximize2 size={20} />
					</button>
				)}

				{remoteStream ? (
					isAudioOnly ? (
						<div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gradient-to-br from-zinc-900 to-zinc-950">
							<div className="relative w-40 h-40 mb-8">
								<div className="absolute inset-0 bg-green-500/10 rounded-full animate-ping" style={{ animationDuration: '3s' }} />
								{remoteUserProfileImageUrl ? (
									<img src={remoteUserProfileImageUrl} alt={remoteUsername} className="w-full h-full rounded-full object-cover border-4 border-zinc-800 shadow-2xl relative z-10" />
								) : (
									<div className="w-full h-full rounded-full bg-zinc-800 flex items-center justify-center border-4 border-zinc-700 shadow-2xl relative z-10">
										<User size={64} className="text-zinc-500" />
									</div>
								)}
							</div>
							<h2 className="text-3xl font-light text-white tracking-wide">{remoteUsername}</h2>
							<p className="text-zinc-400 mt-2">Audio Call</p>
							
							{/* Hidden video element just for audio playback */}
							<video ref={remoteVideoRef} autoPlay playsInline className="hidden" />
						</div>
					) : (
						<>
							{/* Blurred Background for Large Screens (makes aspect-ratio mismatch look premium) */}
							<video
								ref={remoteBlurVideoRef}
								autoPlay
								playsInline
								muted
								className="absolute inset-0 w-full h-full object-cover blur-3xl opacity-40 scale-110 pointer-events-none"
							/>
							
							{/* Main Remote Video */}
							<video
								ref={remoteVideoRef}
								autoPlay
								playsInline
								className="absolute inset-0 w-full h-full object-contain z-10"
							/>
							
							{/* Network Quality Indicator (Video Mode) */}
							<div className="absolute top-6 left-6 z-30 flex items-center gap-2 bg-zinc-900/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-white shadow-lg transition-opacity duration-300">
								{networkQuality === 'excellent' && <SignalHigh size={16} className="text-green-500" />}
								{networkQuality === 'good' && <SignalMedium size={16} className="text-yellow-500" />}
								{networkQuality === 'poor' && <SignalLow size={16} className="text-red-500 animate-pulse" />}
								{networkQuality === 'unknown' && <SignalHigh size={16} className="text-zinc-500" />}
								<span className="text-xs font-medium tracking-wide">
									{networkQuality === 'poor' ? 'Poor Connection' : remoteUsername}
								</span>
							</div>
						</>
					)
				) : (
					<div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-white/90 bg-gradient-to-br from-zinc-900 to-zinc-950">
						<div className="relative flex items-center justify-center w-24 h-24 mb-6">
							<div className="absolute inset-0 rounded-full border-4 border-white/10" />
							<div className="absolute inset-0 rounded-full border-4 border-t-white/80 animate-spin" />
							<PhoneOff size={28} className="text-white/40 opacity-0" />
						</div>
						<h2 className="text-2xl font-light tracking-wide mb-2">Connecting</h2>
						<p className="text-sm text-white/50">Waiting for {remoteUsername} to connect...</p>
					</div>
				)}

				{/* Local Video (Picture-in-Picture inside the app) */}
				{!isAudioOnly && !isMinimized && (
					<div className={`absolute top-6 right-6 sm:bottom-8 sm:top-auto sm:right-8 ${isScreenSharing ? 'w-48 h-32 sm:w-64 sm:h-40 lg:w-80 lg:h-52' : 'w-28 h-40 sm:w-60 sm:h-40 lg:w-72 lg:h-48'} bg-zinc-900/80 backdrop-blur-md rounded-2xl overflow-hidden shadow-2xl border border-white/10 z-30 transition-all duration-300 hover:scale-[1.02] group/local`}>
						{localStream ? (
							<video
								ref={localVideoRef}
								autoPlay
								playsInline
								muted
								className={`w-full h-full ${isScreenSharing ? 'object-contain bg-black' : 'object-cover'}`}
							/>
						) : (
							<div className="flex w-full h-full items-center justify-center text-white/50 text-xs font-medium">
								Camera starting...
							</div>
						)}
						
						{/* Switch Camera Button (Inside Local Preview) */}
						{hasMultipleCameras && onSwitchCamera && !isScreenSharing && (
							<button
								type="button"
								onClick={onSwitchCamera}
								className="absolute top-2 right-2 z-40 p-2 bg-black/40 hover:bg-black/60 rounded-full text-white backdrop-blur-md transition-opacity duration-200 opacity-0 group-hover/local:opacity-100"
								aria-label="switch camera"
							>
								<SwitchCamera size={18} />
							</button>
						)}
						
						{/* Local Mute/Video Off indicators */}
						<div className="absolute bottom-3 left-3 flex gap-1.5 z-40">
							{isMuted && (
								<div className="bg-red-500/90 backdrop-blur-sm p-1.5 rounded-full text-white shadow-sm">
									<MicOff size={12} strokeWidth={3} />
								</div>
							)}
							{isVideoOff && (
								<div className="bg-red-500/90 backdrop-blur-sm p-1.5 rounded-full text-white shadow-sm">
									<VideoOff size={12} strokeWidth={3} />
								</div>
							)}
						</div>
					</div>
				)}

				{/* Floating Controls Bar */}
				<div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40">
					<div className="flex items-center gap-4 sm:gap-6 bg-zinc-900/60 backdrop-blur-xl border border-white/10 px-6 sm:px-8 py-4 rounded-full shadow-2xl">
						<button
							type="button"
							onClick={toggleMute}
							className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg ${
								isMuted 
									? 'bg-red-500 text-white hover:bg-red-600' 
									: 'bg-white/10 text-white hover:bg-white/20'
							}`}
							aria-label={isMuted ? 'unmute microphone' : 'mute microphone'}
						>
							{isMuted ? <MicOff size={24} /> : <Mic size={24} />}
						</button>

						{!isAudioOnly && (
							<>
								<button
									type="button"
									onClick={toggleVideo}
									className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg ${
										isVideoOff 
											? 'bg-red-500 text-white hover:bg-red-600' 
											: 'bg-white/10 text-white hover:bg-white/20'
									}`}
									aria-label={isVideoOff ? 'turn on camera' : 'turn off camera'}
								>
									{isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
								</button>

								{onToggleScreenShare && typeof navigator.mediaDevices !== 'undefined' && 'getDisplayMedia' in navigator.mediaDevices && (
									<button
										type="button"
										onClick={onToggleScreenShare}
										className={`hidden sm:flex w-12 h-12 sm:w-14 sm:h-14 rounded-full items-center justify-center transition-all duration-200 shadow-lg ${
											isScreenSharing 
												? 'bg-blue-500 text-white hover:bg-blue-600' 
												: 'bg-white/10 text-white hover:bg-white/20'
										}`}
										aria-label={isScreenSharing ? 'stop screen sharing' : 'share screen'}
									>
										{isScreenSharing ? <MonitorOff size={24} /> : <MonitorUp size={24} />}
									</button>
								)}

								{/* Picture-in-Picture Button */}
								{'pictureInPictureEnabled' in document && (
									<button
										type="button"
										onClick={togglePip}
										className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg ${
											isPipActive
												? 'bg-blue-500 text-white hover:bg-blue-600'
												: 'bg-white/10 text-white hover:bg-white/20'
										}`}
										aria-label={isPipActive ? 'exit picture in picture' : 'picture in picture'}
									>
										<PictureInPicture size={24} />
									</button>
								)}
							</>
						)}

						{/* Minimize to Chat Button */}
						{!isMinimized && (
							<button
								type="button"
								onClick={() => setIsMinimized(true)}
								className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg bg-white/10 text-white hover:bg-white/20"
								aria-label="minimize call"
							>
								<Minimize2 size={24} />
							</button>
						)}

						<div className="w-px h-8 bg-white/10 mx-1 sm:mx-2" />

						<button
							type="button"
							onClick={onEndCall}
							className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-red-500 flex items-center justify-center text-white hover:bg-red-600 hover:scale-105 transition-all duration-200 shadow-[0_0_20px_rgba(239,68,68,0.4)]"
							aria-label="end call"
						>
							<PhoneOff size={28} />
						</button>
					</div>
				</div>
			</div>
		</div>
		</VideoCallErrorBoundary>
	)
}
