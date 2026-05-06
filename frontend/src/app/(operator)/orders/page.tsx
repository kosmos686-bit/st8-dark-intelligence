'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import type { Order, OrderStatus } from '@/types'
import { useWebSocket } from '@/hooks/useWebSocket'

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Новый',
  confirmed: 'Подтверждён',
  assembling: 'Сборка',
  assembled: 'Готов к выдаче',
  picked_up: 'Забран курьером',
  delivering: 'Доставка',
  delivered: 'Доставлен',
  cancelled: 'Отменён',
}

const STATUS_COLOR: Record<OrderStatus, string> = {
  pending: '#D4A017',
  confirmed: '#3B82F6',
  assembling: '#8B5CF6',
  assembled: '#10B981',
  picked_up: '#06B6D4',
  delivering: '#06B6D4',
  delivered: '#22C55E',
  cancelled: '#64748B',
}

export default function OrdersQueuePage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [storeId, setStoreId] = useState<string | null>(null)

  useEffect(() => {
    api.get<{ store_id: string }>('/auth/me').then((u) => setStoreId(u.store_id))
    load()
  }, [])

  useWebSocket(storeId ? `operator/${storeId}` : null, (msg) => {
    if (msg.type === 'new_order' || msg.type === 'order_update') {
      load()
    }
  })

  async function load() {
    try {
      const data = await api.get<Order[]>('/orders/?limit=100')
      setOrders(data)
    } finally {
      setLoading(false)
    }
  }

  async function transition(id: string, status: OrderStatus) {
    await api.patch(`/orders/${id}/status`, { status })
    load()
  }

  const active = orders.filter((o) => !['delivered', 'cancelled'].includes(o.status))
  const done = orders.filter((o) => ['delivered', 'cancelled'].includes(o.status))

  if (loading) return <div className="text-slate-400">Загрузка…</div>

  return (
    <div className="max-w-6xl">
      <h1 className="text-2xl font-bold mb-6 text-amber-400">Очередь заказов</h1>

      <section className="mb-8">
        <div className="text-sm text-slate-400 mb-3">Активные ({active.length})</div>
        <div className="grid gap-3">
          {active.map((o) => (
            <div key={o.id} className="rounded-xl p-4 flex items-center justify-between" style={{ background: '#111827', border: '1px solid #1E2A3A' }}>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: STATUS_COLOR[o.status] + '20', color: STATUS_COLOR[o.status] }}>
                    {STATUS_LABEL[o.status]}
                  </span>
                  <span className="text-slate-300 text-sm font-mono">#{o.id.slice(0, 8)}</span>
                  <span className="text-slate-400 text-sm">{o.items.length} поз. · {o.total_amount} ₽</span>
                </div>
                <div className="text-xs text-slate-500">{o.delivery_address}</div>
              </div>
              <div className="flex gap-2">
                {o.status === 'pending' && (
                  <button onClick={() => transition(o.id, 'confirmed')} className="px-3 py-1.5 rounded-lg text-sm font-medium" style={{ background: '#3B82F6', color: 'white' }}>
                    Подтвердить
                  </button>
                )}
                {o.status === 'confirmed' && (
                  <Link href={`/picking/${o.id}`} className="px-3 py-1.5 rounded-lg text-sm font-medium" style={{ background: '#8B5CF6', color: 'white' }}>
                    Собрать
                  </Link>
                )}
                {o.status === 'assembling' && (
                  <Link href={`/picking/${o.id}`} className="px-3 py-1.5 rounded-lg text-sm font-medium" style={{ background: '#8B5CF6', color: 'white' }}>
                    Продолжить сборку
                  </Link>
                )}
                {!['delivered', 'cancelled', 'picked_up', 'delivering'].includes(o.status) && (
                  <button onClick={() => transition(o.id, 'cancelled')} className="px-3 py-1.5 rounded-lg text-sm" style={{ background: 'transparent', border: '1px solid #374151', color: '#94A3B8' }}>
                    Отмена
                  </button>
                )}
              </div>
            </div>
          ))}
          {active.length === 0 && <div className="text-slate-500 text-sm">Нет активных заказов</div>}
        </div>
      </section>

      <section>
        <div className="text-sm text-slate-400 mb-3">Завершённые ({done.length})</div>
        <div className="grid gap-2">
          {done.slice(0, 20).map((o) => (
            <div key={o.id} className="rounded-lg p-3 flex items-center justify-between text-sm" style={{ background: '#0F172A', border: '1px solid #1E2A3A' }}>
              <span className="text-slate-500 font-mono">#{o.id.slice(0, 8)}</span>
              <span style={{ color: STATUS_COLOR[o.status] }}>{STATUS_LABEL[o.status]}</span>
              <span className="text-slate-400">{o.total_amount} ₽</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
