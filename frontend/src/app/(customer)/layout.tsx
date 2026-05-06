'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getCart } from '@/lib/cart'

const NAV = [
  { href: '/catalog', label: 'Каталог', icon: '🍎' },
  { href: '/cart', label: 'Корзина', icon: '🛒' },
  { href: '/tracking', label: 'Заказы', icon: '📦' },
]

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [cartCount, setCartCount] = useState(0)

  useEffect(() => {
    const update = () => setCartCount(getCart().reduce((s, i) => s + i.qty, 0))
    update()
    window.addEventListener('cart-update', update)
    window.addEventListener('storage', update)
    return () => {
      window.removeEventListener('cart-update', update)
      window.removeEventListener('storage', update)
    }
  }, [])

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0A0F1A' }}>
      <header className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid #1E2A3A' }}>
        <Link href="/catalog" className="text-lg font-bold" style={{ color: '#D4A017' }}>ST8 DARK</Link>
        <Link href="/cart" className="relative">
          <span className="text-2xl">🛒</span>
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-2 text-xs rounded-full px-1.5 py-0.5 font-bold" style={{ background: '#D4A017', color: '#0A0F1A' }}>{cartCount}</span>
          )}
        </Link>
      </header>

      <main className="flex-1 p-4 pb-20 overflow-auto">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 flex justify-around py-2" style={{ background: '#111827', borderTop: '1px solid #1E2A3A' }}>
        {NAV.map(({ href, label, icon }) => (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center text-xs px-4 py-1"
            style={{ color: pathname.startsWith(href) ? '#D4A017' : '#64748B' }}
          >
            <span className="text-xl">{icon}</span>
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}
