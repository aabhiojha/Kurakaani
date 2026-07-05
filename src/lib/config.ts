const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0'])

const envApiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').trim()
export const API_BASE_URL = envApiBaseUrl
const parsedGlobalRoomId = Number(import.meta.env.VITE_GLOBAL_ROOM_ID ?? '1')
export const GLOBAL_ROOM_ID = Number.isInteger(parsedGlobalRoomId) && parsedGlobalRoomId > 0 ? parsedGlobalRoomId : 1

export const SESSION_STORAGE_KEY = 'kurakaani-session'

export const resolveAssetUrl = (value?: string | null) => {
	if (!value) {
		return undefined
	}

	try {
		const runtimeBase = API_BASE_URL
			? new URL(API_BASE_URL, window.location.origin)
			: new URL(window.location.origin)
		const resolved = new URL(value, runtimeBase)

		if (LOCAL_HOSTS.has(resolved.hostname) && !LOCAL_HOSTS.has(window.location.hostname)) {
			if (resolved.port === '8000') {
				// Proxy RustFS / S3 through Vite proxy for mobile access
				resolved.pathname = '/storage' + resolved.pathname
				resolved.port = window.location.port
			}
			resolved.hostname = window.location.hostname
			// Use the ngrok/external protocol
			resolved.protocol = window.location.protocol
		}

		return resolved.toString()
	} catch {
		return value
	}
}
