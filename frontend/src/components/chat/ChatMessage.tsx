import { useEffect, useRef, useState } from 'react'
import { Check, CheckCheck, Loader2, RotateCcw } from 'lucide-react'
import { resolveAssetUrl } from '../../lib/config'
import { cn } from '../../lib/cn'
import type { Message } from '../../types/chat'

type ChatMessageProps = {
	message: Message
	isGroupedWithPrevious: boolean
	isGroupedWithNext: boolean
	onRetry?: (messageId: number) => void
	onReaction?: (messageId: number, emoji: string) => void
}

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏']

export function ChatMessage({ message, isGroupedWithPrevious, isGroupedWithNext, onRetry, onReaction }: ChatMessageProps) {
	const [isMetaVisible, setIsMetaVisible] = useState(false)
	const [isReactionMenuOpen, setIsReactionMenuOpen] = useState(false)
	const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false)
	const messageMetaRef = useRef<HTMLDivElement | null>(null)
	const isSystemMessage = message.senderName === 'System'
	const isRight = message.isSent
	const mediaUrl = resolveAssetUrl(message.mediaUrl)
	const senderAvatarUrl = resolveAssetUrl(message.senderProfileImageUrl)
	const avatarTopSpacingClass = isGroupedWithPrevious ? 'mt-0' : 'mt-4'
	const bubbleStateClass =
		message.deliveryState === 'pending'
			? 'opacity-75'
			: message.deliveryState === 'failed'
				? 'opacity-80'
				: 'opacity-100'

	useEffect(() => {
		if (!isMetaVisible) return
		const handlePointerDown = (event: PointerEvent) => {
			if (!messageMetaRef.current) return
			if (!messageMetaRef.current.contains(event.target as Node)) setIsMetaVisible(false)
		}
		document.addEventListener('pointerdown', handlePointerDown)
		return () => document.removeEventListener('pointerdown', handlePointerDown)
	}, [isMetaVisible])

	if (isSystemMessage) {
		return (
			<div className="motion-message mt-4 flex justify-center">
				<div className="flex flex-col items-center">
					<div className="rounded-full bg-md-surface-container-high px-3.5 py-1 text-xs font-medium text-md-on-surface-variant">
						{message.text}
					</div>
					<span className="mt-1 text-[11px] text-md-outline">{message.timestamp}</span>
				</div>
			</div>
		)
	}

	return (
		<>
			<div
				className={cn(
					'motion-message flex',
					isRight ? 'justify-end' : 'justify-start',
					isGroupedWithPrevious ? 'mt-0.5' : 'mt-2.5',
				)}
			>
				<div className={cn('flex max-w-[80%] items-start gap-2', isRight ? 'flex-row-reverse' : 'flex-row')}>
					{isGroupedWithNext ? (
						<div className="h-8 w-8 shrink-0" />
					) : (
						<div
							className={cn(
								avatarTopSpacingClass,
								'flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full text-[11px] font-semibold',
								isRight
									? 'bg-md-primary text-md-on-primary'
									: 'bg-md-tertiary-container text-md-on-tertiary-container',
							)}
						>
							{senderAvatarUrl ? (
								<img src={senderAvatarUrl} alt={`${message.senderName} avatar`} className="h-full w-full object-cover" />
							) : (
								message.senderAvatar
							)}
						</div>
					)}
					<div className={cn('flex flex-col', isRight ? 'items-end' : 'items-start')}>
						{!isGroupedWithPrevious && (
							<span className="mb-0.5 px-1 text-xs font-medium text-md-on-surface-variant">{message.senderName}</span>
						)}
						<div ref={messageMetaRef} className="group relative">
							<div
								onClick={() => setIsMetaVisible((previous) => !previous)}
								onMouseLeave={() => setIsReactionMenuOpen(false)}
								onKeyDown={(event) => {
									if (event.key === 'Enter' || event.key === ' ') {
										event.preventDefault()
										setIsMetaVisible((previous) => !previous)
									}
								}}
								role="button"
								tabIndex={0}
								className={cn(
									'relative rounded-md3-lg px-3.5 py-2 text-sm leading-relaxed transition-shadow duration-200',
									bubbleStateClass,
									isRight
										? 'rounded-br-md bg-md-bubble-sent text-md-on-bubble-sent'
										: 'rounded-bl-md bg-md-bubble-received text-md-on-bubble-received',
								)}
							>
								{/* Quick Reaction Menu (shows on hover) */}
								{onReaction && (
									<div 
										className={cn(
											"absolute top-0 -translate-y-1/2 flex items-center gap-1 rounded-full bg-md-surface-container-high px-2 py-1 shadow-md3-2 transition-all duration-200 z-20",
											isRight ? "left-0 -translate-x-full -ml-2" : "right-0 translate-x-full ml-2",
											isReactionMenuOpen ? "opacity-100 pointer-events-auto scale-100" : "opacity-0 pointer-events-none scale-95 group-hover:opacity-100 group-hover:pointer-events-auto group-hover:scale-100"
										)}
										onMouseEnter={() => setIsReactionMenuOpen(true)}
									>
										{QUICK_REACTIONS.map((emoji) => (
											<button
												key={emoji}
												className="hover:scale-125 transition-transform p-1"
												onClick={(e) => {
													e.stopPropagation()
													setIsReactionMenuOpen(false)
													onReaction(message.id, emoji)
												}}
											>
												{emoji}
											</button>
										))}
									</div>
								)}
								{message.text ? <p>{message.text}</p> : null}
								{mediaUrl && message.messageType === 'IMAGE' && (
									<div className="mt-3 overflow-hidden rounded-md3-sm bg-md-surface-container-low p-2">
										<button
											type="button"
											onClick={(event) => {
												event.stopPropagation()
												setIsImagePreviewOpen(true)
											}}
											className="block w-full"
											aria-label="open image preview"
										>
											<img
												src={mediaUrl}
												alt={message.mediaFileName ?? 'Shared image'}
												className="max-h-80 w-full rounded-md3-xs object-cover transition-transform duration-200 hover:scale-[1.01]"
											/>
										</button>
									</div>
								)}
								{mediaUrl && message.messageType === 'VIDEO' && (
									<div className="mt-3 overflow-hidden rounded-md3-sm bg-md-surface-container-low p-2">
										<video src={mediaUrl} controls className="max-h-80 w-full rounded-md3-xs" />
									</div>
								)}
								{mediaUrl && message.messageType === 'AUDIO' && (
									<div className="mt-2 overflow-hidden rounded-full bg-md-surface-container-low px-3 py-1.5 shadow-inner">
										<audio src={mediaUrl} controls className="h-8 max-w-[200px] sm:max-w-[250px] outline-none [&::-webkit-media-controls-panel]:bg-transparent" />
									</div>
								)}
								{message.reactions && message.reactions.length > 0 && (
									<div className={cn("absolute -bottom-3 flex items-center gap-1", isRight ? "left-2" : "right-2")}>
										{Array.from(new Set(message.reactions.map(r => r.emoji))).map(emoji => {
											const count = message.reactions?.filter(r => r.emoji === emoji).length || 0;
											return (
												<button 
													key={emoji}
													onClick={(e) => {
														e.stopPropagation();
														if (onReaction) onReaction(message.id, emoji);
													}}
													className="flex items-center gap-1 rounded-full bg-md-surface-container-high px-1.5 py-0.5 text-[11px] shadow-sm hover:bg-md-surface-container-highest transition-colors border border-md-outline-variant"
												>
													<span>{emoji}</span>
													{count > 1 && <span className="font-semibold text-md-on-surface-variant">{count}</span>}
												</button>
											);
										})}
									</div>
								)}
							</div>
							{/* MD3 tooltip — inverse surface */}
							<div
								className={cn(
									'pointer-events-none absolute -top-8 z-10 whitespace-nowrap rounded-md3-xs bg-md-inverse-surface px-2 py-1 text-[11px] text-md-inverse-on-surface shadow-md3-2 transition-opacity duration-200 ease-md-standard',
									isMetaVisible ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
									isRight ? 'right-0' : 'left-0',
								)}
							>
								{message.senderName} • {message.timestamp}
							</div>
						</div>
						{!isGroupedWithNext && (
							<div className="mt-0.5 flex items-center gap-1 px-1 text-xs text-md-outline">
								<button
									type="button"
									onClick={() => setIsMetaVisible((previous) => !previous)}
									className="text-xs text-md-outline"
								>
									{message.timestamp}
								</button>
								{isRight && message.deliveryState === 'pending' && <Loader2 size={11} className="animate-spin" />}
								{isRight && message.deliveryState === 'sent' && <Check size={11} />}
								{isRight && message.deliveryState === 'delivered' && <CheckCheck size={11} />}
								{isRight && message.deliveryState === 'read' && <CheckCheck size={11} className="text-md-primary" />}
								{isRight && message.deliveryState === 'failed' && (
									<button
										type="button"
										onClick={() => onRetry?.(message.id)}
										className="inline-flex items-center gap-1 text-[11px] font-medium text-md-error"
									>
										<RotateCcw size={10} />
										failed — retry
									</button>
								)}
							</div>
						)}
					</div>
				</div>
			</div>
			{isImagePreviewOpen && mediaUrl && message.messageType === 'IMAGE' && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center bg-md-inverse-surface/80 p-4 backdrop-blur-sm"
					onClick={() => setIsImagePreviewOpen(false)}
				>
					<div className="max-h-[90vh] max-w-[90vw] overflow-hidden rounded-md3-lg bg-md-surface-container p-2 shadow-md3-3">
						<img
							src={mediaUrl}
							alt={message.mediaFileName ?? 'Shared image'}
							className="max-h-[85vh] max-w-[85vw] rounded-md3-md object-contain"
						/>
					</div>
				</div>
			)}
		</>
	)
}
