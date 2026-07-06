import { SESSION_STORAGE_KEY } from './config'
import type { SessionState } from '../types/api/session'

export const getSession = (): SessionState | null => {
	if (typeof window === 'undefined') {
		return null
	}

	const raw = window.localStorage.getItem(SESSION_STORAGE_KEY)
	if (!raw) {
		return null
	}

	try {
		return JSON.parse(raw) as SessionState
	} catch {
		window.localStorage.removeItem(SESSION_STORAGE_KEY)
		return null
	}
}

export const setSession = (session: SessionState) => {
	window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
}

export const clearSession = () => {
	window.localStorage.removeItem(SESSION_STORAGE_KEY)
}
