import { apiFetch } from '../lib/api'
import type { UserSummaryResponse } from '../types/api/user'

export const getUsers = () => apiFetch<UserSummaryResponse[]>('/api/user')
