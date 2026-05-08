'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { removeToken } from '@/lib/auth'

const NAV = [
  { href: '/route',    label: 'Маршрут',  icon: '🗺️' },
  { href: '/delivery', label: 'Доставки', icon: '🛵' },
]

export default function CourierLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router   = useRouter()

  function logout() { removeToken(); router.push('/login') }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0A0F1A' }}>
      <header className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid #1E2A3A' }}>
        <div className="text-lg font-bold" style={{ color: '#D4A017' }}>ST8 COURIER</div>
        <button onClick={logout} className="text-sm text-slate-500">Выйти</button>
      </header>
      <main className="flex-1 p-4 pb-20 overflow-auto">{children}</main>
      <nav className="fixed bottom-0 left-0 right-0 flex justify-around py-2" style={{ background: '#111827', borderTop: '1px solid #1E2A3A' }}>
        {NAV.map(({ href, label, icon }) => (
          <Link key={href} href={href} className="flex flex-col items-center text-xs px-6 py-1"
            style={{ color: pathname.startsWith(href) ? '#D4A017' : '#64748B' }}>
            <span className="text-xl">{icon}</span>
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}
