'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { removeToken } from '@/lib/auth'

const NAV = [
  { href: '/network', label: 'Карта сети' },
  { href: '/analytics', label: 'Аналитика' },
  { href: '/forecast', label: 'Прогноз' },
  { href: '/reports', label: 'Отчёты' },
]

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  function logout() {
    removeToken()
    router.push('/login')
  }

  return (
    <div className="flex min-h-screen" style={{ background: '#0A0F1A' }}>
      <aside className="w-56 flex-shrink-0 p-4 flex flex-col gap-2" style={{ background: '#111827', borderRight: '1px solid #1E2A3A' }}>
        <div className="text-lg font-bold mb-4 px-2" style={{ color: '#D4A017' }}>ST8 DARK</div>
        <div className="text-xs px-3 mb-1" style={{ color: '#556677' }}>МЕНЕДЖЕР СЕТИ</div>
        {NAV.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: pathname === href ? '#1E2A3A' : 'transparent',
              color: pathname === href ? '#D4A017' : '#C8D0E0',
            }}
          >
            {label}
          </Link>
        ))}
        <div className="flex-1" />
        <button onClick={logout} className="px-3 py-2 rounded-lg text-sm text-left" style={{ color: '#556677' }}>
          Выйти
        </button>
      </aside>
      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  )
}
