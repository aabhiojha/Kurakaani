import { API_BASE_URL } from './config'
import { getSession } from './session'
import type { ApiError } from '../types/api/session'

const buildApiUrl = (path: string): string => {
	if (/^https?:\/\//i.test(path)) {
		return path
	}

	if (!API_BASE_URL) {
		return path
	}

	const normalizedBase = API_BASE_URL.replace(/\/+$/, '')
	const normalizedPath = path.startsWith('/') ? path : `/${path}`

	if (normalizedBase.endsWith('/api') && normalizedPath.startsWith('/api/')) {
		return `${normalizedBase}${normalizedPath.slice(4)}`
	}

	return `${normalizedBase}${normalizedPath}`
}

async function parseResponseBody<T>(response: Response): Promise<T> {
	if (response.status === 204) {
		return null as T
	}

	const contentLength = response.headers.get('content-length')
	if (contentLength === '0') {
		return null as T
	}

	const raw = await response.text()
	if (!raw.trim()) {
		return null as T
	}

	return JSON.parse(raw) as T
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
	const session = getSession()
	const token = session?.accessToken
	const isFormData = init.body instanceof FormData

	const response = await fetch(buildApiUrl(path), {
		...init,
		headers: {
			...(isFormData ? {} : { 'Content-Type': 'application/json' }),
			...(token ? { Authorization: `Bearer ${token}` } : {}),
			...(init.headers ?? {}),
		},
	})

	if (!response.ok) {
		const error = (await response.json().catch(() => null)) as ApiError | null
		throw error ?? new Error(`Request failed with ${response.status}`)
	}

	return parseResponseBody<T>(response)
}

export async function publicFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
	const isFormData = init.body instanceof FormData

	const response = await fetch(buildApiUrl(path), {
		...init,
		headers: {
			...(isFormData ? {} : { 'Content-Type': 'application/json' }),
			...(init.headers ?? {}),
		},
	})

	if (!response.ok) {
		const error = (await response.json().catch(() => null)) as ApiError | null
		throw error ?? new Error(`Request failed with ${response.status}`)
	}

	return parseResponseBody<T>(response)
}
