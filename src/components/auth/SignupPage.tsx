import { useState, type FormEvent } from 'react'
import { Button, TextField } from '../ui'
import { AuthShell, AuthLink } from './AuthShell'

type AuthActionResult = { ok: true; message?: string } | { ok: false; error: string }

type SignupPageProps = {
	isSubmitting: boolean
	backendStatus: string
	onRegister: (username: string, email: string, password: string, confirmPassword: string) => Promise<AuthActionResult>
	onSwitchToLogin: () => void
}

export function SignupPage({ isSubmitting, backendStatus, onRegister, onSwitchToLogin }: SignupPageProps) {
	const [username, setUsername] = useState('')
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [confirmPassword, setConfirmPassword] = useState('')
	const [feedback, setFeedback] = useState<string | null>(null)

	const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		setFeedback(null)
		const result = await onRegister(username.trim(), email.trim(), password, confirmPassword)
		if (result.ok) {
			setPassword('')
			setConfirmPassword('')
			setFeedback(result.message ?? 'Registration successful.')
			return
		}
		setFeedback(result.error)
	}

	return (
		<AuthShell
			eyebrow="Get started"
			title="Create your account"
			subtitle="Sign up to join Kurakaani and start chatting."
			backendStatus={backendStatus}
			feedback={feedback}
			footer={
				<p className="text-center text-sm text-md-on-surface-variant">
					Already have an account? <AuthLink onClick={onSwitchToLogin}>Login</AuthLink>
				</p>
			}
		>
			<form onSubmit={handleSubmit} className="space-y-4">
				<TextField
					label="Username"
					type="text"
					autoComplete="username"
					required
					value={username}
					onChange={(event) => setUsername(event.target.value)}
				/>
				<TextField
					label="Email"
					type="email"
					autoComplete="email"
					required
					value={email}
					onChange={(event) => setEmail(event.target.value)}
				/>
				<TextField
					label="Password"
					type="password"
					autoComplete="new-password"
					required
					value={password}
					onChange={(event) => setPassword(event.target.value)}
				/>
				<TextField
					label="Confirm password"
					type="password"
					autoComplete="new-password"
					required
					value={confirmPassword}
					onChange={(event) => setConfirmPassword(event.target.value)}
					error={passwordsMismatch ? 'Passwords do not match' : undefined}
				/>
				<Button type="submit" fullWidth size="lg" isLoading={isSubmitting} disabled={passwordsMismatch}>
					{isSubmitting ? 'Creating account…' : 'Create account'}
				</Button>
			</form>
		</AuthShell>
	)
}
