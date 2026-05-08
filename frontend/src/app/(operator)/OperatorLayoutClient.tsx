'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { removeToken } from '@/lib/auth'
import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard, ShoppingCart, Layers, Package,
  LogOut, Menu, X, ChevronRight,
} from 'lucide-react'

interface NavItem { href: string; label: string; Icon: LucideIcon; color: string }

const NAV: NavItem[] = [
  { href: '/dashboard', label: 'Дашборд', Icon: LayoutDashboard, color: '#D4A017' },
  { href: '/orders',    label: 'Заказы',   Icon: ShoppingCart,    color: '#3B82F6' },
  { href: '/store',     label: 'Склад',    Icon: Layers,          color: '#8B5CF6' },
  { href: '/inventory', label: 'Остатки',  Icon: Package,         color: '#10B981' },
]

function SidebarInner({ pathname, onClose, onLogout }: { pathname: string; onClose?: () => void; onLogout: () => void }) {
  return (
    <div className="flex flex-col h-full" style={{ width: 260, background: 'linear-gradient(180deg,#111827 0%,#0C1220 100%)', borderRight: '1px solid #1E2A3A' }}>
      <div className="px-6 pt-6 pb-4" style={{ borderBottom: '1px solid #1E2A3A' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center rounded-[14px] font-black text-[20px]"
              style={{ width: 44, height: 44, background: 'linear-gradient(135deg,#D4A017,#F59E0B)', boxShadow: '0 6px 20px rgba(212,160,23,.4)', color: '#0A0F1A' }}>
              S
            </div>
            <div>
              <div className="font-extrabold text-lg tracking-[-0.04em]" style={{ color: '#D4A017' }}>ST8</div>
              <div className="text-[9px] tracking-[0.22em] uppercase mt-[-2px]" style={{ color: '#475569' }}>DARK INTELLIGENCE</div>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="lg:hidden p-1.5 rounded-lg" style={{ color: '#475569' }}>
              <X size={16} />
            </button>
          )}
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ href, label, Icon, color }) => {
          const active = pathname === href
          return (
            <Link key={href} href={href} onClick={onClose}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all"
              style={{
                background:  active ? `${color}18` : 'transparent',
                color:       active ? color : '#4B5563',
                borderLeft: `3px solid ${active ? color : 'transparent'}`,
              }}>
              <Icon size={16} style={{ color: active ? color : '#374151', flexShrink: 0 }} />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight size={13} style={{ color }} />}
            </Link>
          )
        })}
      </nav>
      <div className="px-4 pb-5" style={{ borderTop: '1px solid #1E2A3A', paddingTop: 14 }}>
        <button onClick={onLogout}
          className="flex items-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm transition-all text-left"
          style={{ color: '#334155', border: '1px solid #1E2A3A' }}>
          <LogOut size={14} />
          Выйти из системы
        </button>
      </div>
    </div>
  )
}

export default function OperatorLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router   = useRouter()
  const [open, setOpen] = useState(false)

  function logout() { removeToken(); router.push('/login') }

  const currentLabel = NAV.find(n => n.href === pathname)?.label ?? ''

  return (
    <div className="flex min-h-screen" style={{ background: '#0A0F1A' }}>
      <div
        className="fixed inset-0 z-20 lg:hidden transition-all duration-200"
        style={{ background: 'rgba(0,0,0,0.7)', opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none' }}
        onClick={() => setOpen(false)}
      />
      <div className="hidden lg:flex flex-shrink-0">
        <SidebarInner pathname={pathname} onLogout={logout} />
      </div>
      <div
        className="fixed inset-y-0 left-0 z-30 lg:hidden transition-transform duration-300"
        style={{ transform: open ? 'translateX(0)' : 'translateX(-100%)' }}
      >
        <SidebarInner pathname={pathname} onClose={() => setOpen(false)} onLogout={logout} />
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 flex-shrink-0"
          style={{ background: 'rgba(11,16,27,.95)', borderBottom: '1px solid #1E2A3A', backdropFilter: 'blur(12px)' }}>
          <button onClick={() => setOpen(true)} className="p-1.5 rounded-lg" style={{ color: '#D4A017' }}>
            <Menu size={20} />
          </button>
          <span className="font-bold tracking-[-0.03em]" style={{ color: '#D4A017' }}>ST8 DARK</span>
          {currentLabel && <span className="ml-auto text-xs" style={{ color: '#334155' }}>{currentLabel}</span>}
        </div>
        <main className="flex-1 p-4 lg:p-6 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
