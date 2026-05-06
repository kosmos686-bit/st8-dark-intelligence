'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import type { Order, OrderStatus } from '@/types'

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Принят',
  confirmed: 'Подтверждён',
  assembling: 'Собираем',
  assembled: 'Готов',
  picked_up: 'У курьера',
  delivering: 'В пути',
  delivered: 'Доставлен',
  cancelled: 'Отменён',
}

export default function MyOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<Order[]>('/orders/?limit=50')
      .then(setOrders)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-slate-400">Загрузка…</div>

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4 text-amber-400">Мои заказы</h1>

      {orders.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">📦</div>
          <div className="text-slate-400 mb-4">Заказов пока нет</div>
          <Link href="/catalog" className="px-4 py-2 rounded-lg text-sm" style={{ background: '#D4A017', color: '#0A0F1A' }}>К каталогу</Link>
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map((o) => (
            <Link
              key={o.id}
              href={`/tracking/${o.id}`}
              className="block rounded-xl p-4"
              style={{ background: '#111827', border: '1px solid #1E2A3A' }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-500 text-xs font-mono">#{o.id.slice(0, 8)}</span>
                <span className="text-xs text-slate-400">{new Date(o.created_at).toLocaleDateString('ru')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-amber-400 font-bold">{o.total_amount} ₽</span>
                <span className="text-sm" style={{ color: o.status === 'delivered' ? '#22C55E' : o.status === 'cancelled' ? '#94A3B8' : '#D4A017' }}>
                  {STATUS_LABEL[o.status]}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
