const TOKEN_KEY = 'st8_access_token'
const USER_KEY = 'st8_user'

export interface AuthUser {
  id: string
  name: string
  email: string | null
  phone: string | null
  role: string
  store_id: string | null
  client_id: string | null
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function getUser(): AuthUser | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function setUser(user: AuthUser): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function isAuthenticated(): boolean {
  return !!getToken()
}

export function getRoleRedirect(role: string): string {
  switch (role) {
    case 'store_operator': return '/dashboard'
    case 'network_manager': return '/network'
    case 'courier': return '/route'
    case 'customer': return '/catalog'
    default: return '/dashboard'
  }
}
