'use client'
import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { setToken, setUser, getRoleRedirect } from '@/lib/auth'
import type { TokenResponse } from '@/types'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await api.post<TokenResponse>('/auth/login', { email, password })
      setToken(data.access_token)
      setUser({ id: data.user_id, name: data.name, email, phone: null, role: data.role, store_id: null, client_id: null })
      router.push(getRoleRedirect(data.role))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка входа')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#0A0F1A' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold" style={{ color: '#D4A017', letterSpacing: '2px' }}>ST8 DARK</h1>
          <p className="text-sm mt-1" style={{ color: '#556677' }}>Войдите в систему</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-xl p-6 space-y-4" style={{ background: '#111827', border: '1px solid #1E2A3A' }}>
          <div>
            <label className="block text-xs mb-1" style={{ color: '#556677' }}>Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ background: '#0A0F1A', border: '1px solid #1E2A3A', color: '#E0E8F0' }}
              placeholder="admin@st8dark.ru"
            />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: '#556677' }}>Пароль</label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ background: '#0A0F1A', border: '1px solid #1E2A3A', color: '#E0E8F0' }}
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-xs" style={{ color: '#E74C3C' }}>{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded-lg font-bold text-sm transition-opacity"
            style={{ background: '#D4A017', color: '#0A0F1A', opacity: loading ? 0.6 : 1 }}
          >
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>

        <p className="text-center text-xs mt-4" style={{ color: '#556677' }}>
          Нет аккаунта?{' '}
          <Link href="/register" style={{ color: '#D4A017' }}>Зарегистрироваться</Link>
        </p>
      </div>
    </div>
  )
}
