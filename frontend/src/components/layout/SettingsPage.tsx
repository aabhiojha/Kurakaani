import { Laptop, Moon, Sun } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Button, Card } from '../ui'

type ThemeMode = 'light' | 'dark' | 'system'

type SettingsPageProps = {
	themeMode: ThemeMode
	isDarkMode: boolean
	onThemeModeChange: (mode: ThemeMode) => void
	sessionName?: string
	backendStatus: string
	onLogout: () => void
}

const THEME_OPTIONS: { mode: ThemeMode; label: string; icon: ReactNode }[] = [
	{ mode: 'light', label: 'Light', icon: <Sun size={16} /> },
	{ mode: 'dark', label: 'Dark', icon: <Moon size={16} /> },
	{ mode: 'system', label: 'System', icon: <Laptop size={16} /> },
]

export function SettingsPage({
	themeMode,
	isDarkMode,
	onThemeModeChange,
	sessionName,
	backendStatus,
	onLogout,
}: SettingsPageProps) {
	return (
		<section className="motion-slide-in-right flex min-w-0 flex-1 overflow-y-auto bg-md-surface-container-low p-3 text-md-on-surface sm:p-4 lg:p-6">
			<div className="mx-auto w-full max-w-4xl space-y-6">
				<div>
					<p className="text-xs font-medium uppercase tracking-[0.12em] text-md-primary">Workspace preferences</p>
					<h1 className="mt-1 text-[2rem] font-medium tracking-tight">Settings</h1>
				</div>

				<Card className="p-5 sm:p-6">
					<h2 className="text-xl font-medium tracking-tight">Session</h2>
					<p className="mt-1 text-sm text-md-on-surface-variant">
						Current authenticated session for API requests and WebSocket chat.
					</p>

					<div className="mt-4 flex flex-col gap-3 rounded-md3-md bg-md-surface-container-high p-4 sm:flex-row sm:items-center sm:justify-between">
						<div>
							<p className="text-sm font-medium">Session status</p>
							<p className="text-sm text-md-on-surface-variant">Signed in as {sessionName ?? 'User'}</p>
							<p className="mt-1 text-xs text-md-outline">{backendStatus}</p>
						</div>
						<Button variant="danger" size="md" onClick={onLogout} className="shrink-0">
							Logout
						</Button>
					</div>
				</Card>

				<Card className="p-5 sm:p-6">
					<h2 className="text-xl font-medium tracking-tight">Appearance</h2>
					<p className="mt-1 text-sm text-md-on-surface-variant">Control appearance and account preferences.</p>

					<div className="mt-6 flex flex-col gap-4 rounded-md3-md bg-md-surface-container-high p-4 lg:flex-row lg:items-center lg:justify-between">
						<div>
							<h3 className="text-base font-medium">Theme</h3>
							<p className="text-sm text-md-on-surface-variant">
								Choose light, dark, or follow your system preference.
							</p>
							<p className="mt-1 text-xs text-md-outline">Current: {isDarkMode ? 'Dark' : 'Light'}</p>
						</div>
						{/* MD3 segmented control */}
						<div className="inline-flex items-center rounded-full border border-md-outline p-1">
							{THEME_OPTIONS.map(({ mode, label, icon }) => {
								const active = themeMode === mode
								return (
									<button
										key={mode}
										type="button"
										onClick={() => onThemeModeChange(mode)}
										aria-pressed={active}
										aria-label={`use ${label.toLowerCase()} theme`}
										className={cn(
											'md-state inline-flex min-h-9 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors duration-200 ease-md-standard',
											active
												? 'bg-md-secondary-container text-md-on-secondary-container'
												: 'text-md-on-surface-variant',
										)}
									>
										{icon}
										{label}
									</button>
								)
							})}
						</div>
					</div>
				</Card>
			</div>
		</section>
	)
}
