'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import type { Order } from '@/types'
import { useWebSocket } from '@/hooks/useWebSocket'

export default function CourierRoutePage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    api.get<{ id: string }>('/auth/me').then((u) => setUserId(u.id))
    load()
  }, [])

  useWebSocket(userId ? `courier/${userId}` : null, (msg) => {
    if (msg.type === 'new_order' || msg.type === 'order_update') load()
  })

  async function load() {
    try {
      const data = await api.get<Order[]>('/orders/courier/queue')
      setOrders(data)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="text-slate-400">Загрузка…</div>

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4 text-amber-400">Мой маршрут</h1>

      {orders.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">🛵</div>
          <div className="text-slate-400">Активных доставок нет</div>
          <div className="text-xs text-slate-500 mt-2">Жди уведомление о новом заказе</div>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o, idx) => (
            <Link
              key={o.id}
              href={`/delivery/${o.id}`}
              className="block rounded-xl p-4"
              style={{ background: '#111827', border: '1px solid #1E2A3A' }}
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0" style={{ background: '#D4A017', color: '#0A0F1A' }}>
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <div className="text-slate-200 mb-1">{o.delivery_address}</div>
                  <div className="text-xs text-slate-500">
                    #{o.id.slice(0, 8)} · {o.items.length} поз. · {o.total_amount} ₽
                  </div>
                  <div className="mt-2 inline-block text-xs px-2 py-0.5 rounded-full" style={{ background: '#06B6D420', color: '#06B6D4' }}>
                    {o.status === 'assembled' ? 'Забрать' : o.status === 'picked_up' ? 'Везу' : 'Доставка'}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
