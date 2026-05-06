'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { api } from '@/lib/api'
import type { Order, OrderStatus } from '@/types'
import { useWebSocket } from '@/hooks/useWebSocket'

const STAGES: { key: OrderStatus; label: string; icon: string }[] = [
  { key: 'pending', label: 'Принят', icon: '📝' },
  { key: 'confirmed', label: 'Подтверждён', icon: '✅' },
  { key: 'assembling', label: 'Собираем', icon: '📦' },
  { key: 'assembled', label: 'Готов', icon: '✨' },
  { key: 'picked_up', label: 'Курьер забрал', icon: '🛵' },
  { key: 'delivering', label: 'В пути', icon: '🚀' },
  { key: 'delivered', label: 'Доставлен', icon: '🎉' },
]

export default function TrackingPage() {
  const { id } = useParams<{ id: string }>()
  const [order, setOrder] = useState<Order | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    api.get<{ id: string }>('/auth/me').then((u) => setUserId(u.id))
    api.get<Order>(`/orders/${id}`).then(setOrder)
  }, [id])

  useWebSocket(userId ? `customer/${userId}` : null, (msg) => {
    if (msg.type === 'order_update' && msg.payload?.order_id === id) {
      api.get<Order>(`/orders/${id}`).then(setOrder)
    }
  })

  if (!order) return <div className="text-slate-400">Загрузка…</div>

  const currentIdx = STAGES.findIndex((s) => s.key === order.status)
  const isCancelled = order.status === 'cancelled'

  return (
    <div className="max-w-2xl mx-auto">
      <div className="rounded-xl p-5 mb-4" style={{ background: '#111827', border: '1px solid #1E2A3A' }}>
        <div className="text-sm text-slate-500 mb-1">Заказ #{order.id.slice(0, 8)}</div>
        <div className="text-xl font-bold text-amber-400">{order.total_amount} ₽</div>
        <div className="text-sm text-slate-400 mt-2">{order.delivery_address}</div>
        {order.estimated_delivery_at && (
          <div className="text-xs text-slate-500 mt-1">
            Ориентир: {new Date(order.estimated_delivery_at).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </div>

      {isCancelled ? (
        <div className="rounded-xl p-6 text-center" style={{ background: '#7F1D1D30', border: '1px solid #DC2626' }}>
          <div className="text-3xl mb-2">❌</div>
          <div className="text-red-300 font-medium">Заказ отменён</div>
        </div>
      ) : (
        <div className="space-y-3">
          {STAGES.map((stage, idx) => {
            const isPast = idx < currentIdx
            const isCurrent = idx === currentIdx
            return (
              <div
                key={stage.key}
                className="flex items-center gap-3 rounded-xl p-3"
                style={{
                  background: isCurrent ? '#D4A01720' : '#111827',
                  border: `1px solid ${isCurrent ? '#D4A017' : '#1E2A3A'}`,
                  opacity: !isPast && !isCurrent ? 0.4 : 1,
                }}
              >
                <div className="text-2xl">{stage.icon}</div>
                <div className="flex-1">
                  <div className={isCurrent ? 'text-amber-400 font-medium' : 'text-slate-200'}>{stage.label}</div>
                </div>
                {isPast && <div className="text-green-400">✓</div>}
                {isCurrent && <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#D4A017' }} />}
              </div>
            )
          })}
        </div>
      )}

      <div className="mt-6 rounded-xl p-4" style={{ background: '#111827', border: '1px solid #1E2A3A' }}>
        <div className="text-sm text-slate-400 mb-2">Состав заказа</div>
        {order.items.map((item) => (
          <div key={item.product_id} className="flex justify-between text-sm py-1">
            <span className="text-slate-300">{item.name} × {item.qty}</span>
            <span className="text-slate-400">{item.price * item.qty} ₽</span>
          </div>
        ))}
      </div>
    </div>
  )
}
