'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import type { Order, OrderStatus } from '@/types'

export default function DeliveryPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)
  const [working, setWorking] = useState(false)

  useEffect(() => {
    api.get<Order>(`/orders/${id}`).then(setOrder)
  }, [id])

  async function transition(status: OrderStatus) {
    if (!order) return
    setWorking(true)
    try {
      const updated = await api.patch<Order>(`/orders/${order.id}/status`, { status })
      setOrder(updated)
      if (status === 'delivered') {
        router.push('/route')
      }
    } finally {
      setWorking(false)
    }
  }

  if (!order) return <div className="text-slate-400">Загрузка…</div>

  const mapsUrl = order.delivery_lat && order.delivery_lng
    ? `https://yandex.ru/maps/?rtext=~${order.delivery_lat},${order.delivery_lng}&rtt=auto`
    : `https://yandex.ru/maps/?text=${encodeURIComponent(order.delivery_address)}`

  return (
    <div className="max-w-xl mx-auto">
      <button onClick={() => router.push('/route')} className="text-sm text-slate-400 mb-4">← Маршрут</button>

      <div className="rounded-xl p-5 mb-4" style={{ background: '#111827', border: '1px solid #1E2A3A' }}>
        <div className="text-xs text-slate-500 mb-1">Заказ #{order.id.slice(0, 8)}</div>
        <div className="text-xl font-bold text-slate-200 mb-2">{order.delivery_address}</div>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <span>{order.items.length} поз.</span>
          <span>·</span>
          <span>{order.total_amount} ₽</span>
        </div>
        {order.notes && (
          <div className="mt-3 p-2 rounded-lg text-sm" style={{ background: '#78350F30', color: '#FBBF24' }}>
            📝 {order.notes}
          </div>
        )}
      </div>

      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full py-3 rounded-xl text-center font-medium mb-4"
        style={{ background: '#1E2A3A', color: '#06B6D4' }}
      >
        🗺️ Открыть в Яндекс.Картах
      </a>

      <div className="rounded-xl p-4 mb-6" style={{ background: '#111827', border: '1px solid #1E2A3A' }}>
        <div className="text-sm text-slate-400 mb-2">Состав</div>
        {order.items.map((item) => (
          <div key={item.product_id} className="flex justify-between text-sm py-1">
            <span className="text-slate-300">{item.name} × {item.qty}</span>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {order.status === 'assembled' && (
          <button
            onClick={() => transition('picked_up')}
            disabled={working}
            className="w-full py-3 rounded-xl font-bold"
            style={{ background: '#06B6D4', color: 'white' }}
          >
            Забрал заказ
          </button>
        )}
        {order.status === 'picked_up' && (
          <button
            onClick={() => transition('delivering')}
            disabled={working}
            className="w-full py-3 rounded-xl font-bold"
            style={{ background: '#06B6D4', color: 'white' }}
          >
            Еду к клиенту
          </button>
        )}
        {order.status === 'delivering' && (
          <button
            onClick={() => transition('delivered')}
            disabled={working}
            className="w-full py-3 rounded-xl font-bold"
            style={{ background: '#22C55E', color: 'white' }}
          >
            ✓ Доставлено
          </button>
        )}
        {order.status === 'delivered' && (
          <div className="text-center py-4 text-green-400 font-medium">✓ Доставлено</div>
        )}
      </div>
    </div>
  )
}
