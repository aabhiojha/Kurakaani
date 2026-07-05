import { useState, type FormEvent } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Button, IconButton, TextField } from '../ui'
import { AuthShell, AuthLink } from './AuthShell'

type AuthActionResult = { ok: true; message?: string } | { ok: false; error: string }

type LoginPageProps = {
	isSubmitting: boolean
	backendStatus: string
	onLogin: (username: string, password: string) => Promise<AuthActionResult>
	onSwitchToSignup: () => void
	onSwitchToPasswordReset: () => void
}

export function LoginPage({
	isSubmitting,
	backendStatus,
	onLogin,
	onSwitchToSignup,
	onSwitchToPasswordReset,
}: LoginPageProps) {
	const [username, setUsername] = useState('')
	const [password, setPassword] = useState('')
	const [showPassword, setShowPassword] = useState(false)
	const [feedback, setFeedback] = useState<string | null>(null)

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		setFeedback(null)
		const result = await onLogin(username.trim(), password)
		if (result.ok) {
			setPassword('')
			setFeedback('Logged in successfully.')
			return
		}
		setFeedback(result.error)
	}

	return (
		<AuthShell
			eyebrow="Welcome back"
			title="Login to Kurakaani"
			subtitle="Sign in to continue your chats and rooms."
			backendStatus={backendStatus}
			feedback={feedback}
			footer={
				<div className="space-y-2 text-center text-sm text-md-on-surface-variant">
					<p>
						Don&apos;t have an account? <AuthLink onClick={onSwitchToSignup}>Create one</AuthLink>
					</p>
					<p>
						Forgot password? <AuthLink onClick={onSwitchToPasswordReset}>Reset here</AuthLink>
					</p>
				</div>
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
					label="Password"
					type={showPassword ? 'text' : 'password'}
					autoComplete="current-password"
					required
					value={password}
					onChange={(event) => setPassword(event.target.value)}
					trailing={
						<IconButton
							size="sm"
							label={showPassword ? 'Hide password' : 'Show password'}
							icon={showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
							onClick={() => setShowPassword((prev) => !prev)}
						/>
					}
				/>
				<Button type="submit" fullWidth size="lg" isLoading={isSubmitting}>
					{isSubmitting ? 'Signing in…' : 'Login'}
				</Button>
			</form>
		</AuthShell>
	)
}
