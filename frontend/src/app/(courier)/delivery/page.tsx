'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import type { Order, OrderStatus } from '@/types'

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Принят',
  confirmed: 'Подтверждён',
  assembling: 'Сборка',
  assembled: 'Готов к выдаче',
  picked_up: 'Забран',
  delivering: 'В пути',
  delivered: 'Доставлен',
  cancelled: 'Отменён',
}

export default function DeliveryListPage() {
  const [orders, setOrders] = useState<Order[]>([])

  useEffect(() => {
    api.get<Order[]>('/orders/?limit=50').then(setOrders)
  }, [])

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4 text-amber-400">История доставок</h1>
      <div className="space-y-2">
        {orders.map((o) => (
          <Link
            key={o.id}
            href={`/delivery/${o.id}`}
            className="block rounded-xl p-3"
            style={{ background: '#111827', border: '1px solid #1E2A3A' }}
          >
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-slate-500 font-mono">#{o.id.slice(0, 8)}</span>
              <span className="text-xs" style={{ color: o.status === 'delivered' ? '#22C55E' : '#D4A017' }}>{STATUS_LABEL[o.status]}</span>
            </div>
            <div className="text-sm text-slate-300">{o.delivery_address}</div>
          </Link>
        ))}
        {orders.length === 0 && <div className="text-center text-slate-500 py-8">Нет доставок</div>}
      </div>
    </div>
  )
}
