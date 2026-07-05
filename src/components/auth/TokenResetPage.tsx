import { useState, type FormEvent } from 'react'
import { Button, TextField } from '../ui'
import { AuthShell, AuthLink } from './AuthShell'

type AuthActionResult = { ok: true; message?: string } | { ok: false; error: string }

type TokenResetPageProps = {
	isSubmitting: boolean
	backendStatus: string
	onConfirmReset: (token: number, password: string) => Promise<AuthActionResult>
	onSwitchToLogin: () => void
	onSwitchToResetRequest: () => void
}

export function TokenResetPage({
	isSubmitting,
	backendStatus,
	onConfirmReset,
	onSwitchToLogin,
	onSwitchToResetRequest,
}: TokenResetPageProps) {
	const [token, setToken] = useState('')
	const [password, setPassword] = useState('')
	const [feedback, setFeedback] = useState<string | null>(null)

	const parsedToken = Number(token)
	const tokenInvalid = token.length > 0 && (!Number.isInteger(parsedToken) || parsedToken <= 0)

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		setFeedback(null)
		if (!Number.isInteger(parsedToken) || parsedToken <= 0) {
			setFeedback('Token must be a valid number.')
			return
		}
		const result = await onConfirmReset(parsedToken, password)
		if (result.ok) {
			setFeedback(result.message ?? 'Password reset successful. You can now log in.')
			setPassword('')
			return
		}
		setFeedback(result.error)
	}

	return (
		<AuthShell
			eyebrow="Confirm reset"
			title="Enter reset token"
			subtitle="Enter the token you received and set your new password."
			backendStatus={backendStatus}
			feedback={feedback}
			footer={
				<div className="flex items-center justify-between text-sm">
					<AuthLink onClick={onSwitchToResetRequest}>Request token</AuthLink>
					<AuthLink onClick={onSwitchToLogin}>Back to login</AuthLink>
				</div>
			}
		>
			<form onSubmit={handleSubmit} className="space-y-4">
				<TextField
					label="Token"
					type="text"
					inputMode="numeric"
					required
					value={token}
					onChange={(event) => setToken(event.target.value)}
					error={tokenInvalid ? 'Token must be a valid number' : undefined}
				/>
				<TextField
					label="New password"
					type="password"
					autoComplete="new-password"
					required
					value={password}
					onChange={(event) => setPassword(event.target.value)}
				/>
				<Button type="submit" fullWidth size="lg" isLoading={isSubmitting} disabled={tokenInvalid}>
					{isSubmitting ? 'Resetting…' : 'Reset password'}
				</Button>
			</form>
		</AuthShell>
	)
}
