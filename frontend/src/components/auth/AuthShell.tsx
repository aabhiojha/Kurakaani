import type { ReactNode } from 'react'
import { MessagesSquare } from 'lucide-react'
import { Card } from '../ui'

type AuthShellProps = {
	eyebrow: string
	title: string
	subtitle: string
	backendStatus: string
	feedback?: string | null
	children: ReactNode
	footer?: ReactNode
}

/**
 * Shared scaffold for every auth screen. This is the one place in the app where
 * MD3's expressive "organic blur shapes" are used (auth pages / empty states) —
 * kept off the dense product surfaces where they'd hurt legibility.
 */
export function AuthShell({ eyebrow, title, subtitle, backendStatus, feedback, children, footer }: AuthShellProps) {
	return (
		<section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-md-background px-4 py-8 text-md-on-surface">
			{/* Decorative atmosphere — purely presentational */}
			<div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
				<div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-md-primary-container opacity-60 blur-3xl" />
				<div className="absolute -right-28 top-1/3 h-96 w-96 rounded-full bg-md-tertiary-container opacity-50 blur-3xl" />
				<div className="absolute bottom-[-6rem] left-1/3 h-72 w-72 rounded-full bg-md-secondary-container opacity-50 blur-3xl" />
			</div>

			<Card
				variant="elevated"
				className="motion-enter relative z-10 w-full max-w-md rounded-md3-2xl p-6 sm:p-8"
			>
				<div className="mb-6">
					<span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-md3-md bg-md-primary text-md-on-primary shadow-md3-1">
						<MessagesSquare size={26} />
					</span>
					<p className="text-xs font-medium uppercase tracking-[0.14em] text-md-primary">{eyebrow}</p>
					<h1 className="mt-1.5 text-[2rem] font-medium leading-tight tracking-tight text-md-on-surface">{title}</h1>
					<p className="mt-2 text-sm leading-relaxed text-md-on-surface-variant">{subtitle}</p>

					{feedback && (
						<div
							role="status"
							className="motion-enter-soft mt-4 rounded-md3-sm bg-md-secondary-container px-4 py-3 text-sm text-md-on-secondary-container"
						>
							{feedback}
						</div>
					)}
				</div>

				{children}

				{footer && <div className="mt-6">{footer}</div>}

				<p className="mt-6 text-center text-xs text-md-outline">{backendStatus}</p>
			</Card>
		</section>
	)
}

/** A subtle text-button-style link used in auth footers. */
export function AuthLink({ onClick, children }: { onClick: () => void; children: ReactNode }) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="rounded-md3-xs font-medium text-md-primary underline-offset-4 transition-colors duration-200 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-md-primary focus-visible:ring-offset-2 focus-visible:ring-offset-md-surface"
		>
			{children}
		</button>
	)
}
