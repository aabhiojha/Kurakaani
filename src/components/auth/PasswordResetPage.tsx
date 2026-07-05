import { useState, type FormEvent } from 'react'
import { Button, TextField } from '../ui'
import { AuthShell, AuthLink } from './AuthShell'

type AuthActionResult = { ok: true; message?: string } | { ok: false; error: string }

type PasswordResetPageProps = {
	isSubmitting: boolean
	backendStatus: string
	onRequestReset: (email: string) => Promise<AuthActionResult>
	onSwitchToLogin: () => void
	onSwitchToTokenPage: () => void
}

export function PasswordResetPage({
	isSubmitting,
	backendStatus,
	onRequestReset,
	onSwitchToLogin,
	onSwitchToTokenPage,
}: PasswordResetPageProps) {
	const [email, setEmail] = useState('')
	const [feedback, setFeedback] = useState<string | null>(null)

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		setFeedback(null)
		const result = await onRequestReset(email.trim())
		if (result.ok) {
			setFeedback(result.message ?? 'Reset token sent to your email.')
			return
		}
		setFeedback(result.error)
	}

	return (
		<AuthShell
			eyebrow="Recover account"
			title="Reset password"
			subtitle="Enter your email to receive a reset token."
			backendStatus={backendStatus}
			feedback={feedback}
			footer={
				<div className="flex items-center justify-between text-sm">
					<AuthLink onClick={onSwitchToLogin}>Back to login</AuthLink>
					<AuthLink onClick={onSwitchToTokenPage}>Enter token</AuthLink>
				</div>
			}
		>
			<form onSubmit={handleSubmit} className="space-y-4">
				<TextField
					label="Email"
					type="email"
					autoComplete="email"
					required
					value={email}
					onChange={(event) => setEmail(event.target.value)}
				/>
				<Button type="submit" fullWidth size="lg" isLoading={isSubmitting}>
					{isSubmitting ? 'Sending…' : 'Send reset token'}
				</Button>
			</form>
		</AuthShell>
	)
}
