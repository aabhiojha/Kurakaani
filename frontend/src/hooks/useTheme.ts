import { useEffect, useState } from 'react'

export type ThemeMode = 'light' | 'dark' | 'system'

const THEME_STORAGE_KEY = 'kurakaani-theme'

const getSystemPrefersDark = () =>
	typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches

export function useTheme() {
	const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
		if (typeof window === 'undefined') return 'system'
		const saved = window.localStorage.getItem(THEME_STORAGE_KEY)
		if (saved === 'light' || saved === 'dark' || saved === 'system') return saved
		return 'system'
	})

	const [systemPrefersDark, setSystemPrefersDark] = useState(getSystemPrefersDark)

	const isDarkMode = themeMode === 'system' ? systemPrefersDark : themeMode === 'dark'

	useEffect(() => {
		window.localStorage.setItem(THEME_STORAGE_KEY, themeMode)
	}, [themeMode])

	useEffect(() => {
		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
		const handleChange = (event: MediaQueryListEvent) => setSystemPrefersDark(event.matches)
		mediaQuery.addEventListener('change', handleChange)
		return () => mediaQuery.removeEventListener('change', handleChange)
	}, [])

	return { themeMode, isDarkMode, setThemeMode }
}
