'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import type { Order, OrderItem } from '@/types'

export default function PickingPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [working, setWorking] = useState(false)

  useEffect(() => {
    api.get<Order>(`/orders/${id}`).then(setOrder)
  }, [id])

  async function startAssembly() {
    if (order?.status === 'confirmed') {
      setWorking(true)
      const updated = await api.patch<Order>(`/orders/${order.id}/status`, { status: 'assembling' })
      setOrder(updated)
      setWorking(false)
    }
  }

  function togglePick(productId: string) {
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(productId)) next.delete(productId)
      else next.add(productId)
      return next
    })
  }

  async function finishAssembly() {
    if (!order) return
    setWorking(true)
    await api.patch(`/orders/${order.id}/status`, { status: 'assembled' })
    router.push('/orders')
  }

  if (!order) return <div className="text-slate-400">Загрузка…</div>

  const allPicked = order.items.every((i: OrderItem) => picked.has(i.product_id))

  return (
    <div className="max-w-2xl">
      <button onClick={() => router.push('/orders')} className="text-sm text-slate-400 mb-4">← К очереди</button>
      <div className="rounded-xl p-5 mb-4" style={{ background: '#111827', border: '1px solid #1E2A3A' }}>
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-bold text-amber-400">Сборка #{order.id.slice(0, 8)}</h1>
          <span className="text-sm text-slate-400">{order.items.length} позиций · {order.total_amount} ₽</span>
        </div>
        <div className="text-sm text-slate-500">{order.delivery_address}</div>
        {order.notes && <div className="mt-2 text-sm" style={{ color: '#FBBF24' }}>📝 {order.notes}</div>}
      </div>

      {order.status === 'confirmed' && (
        <button onClick={startAssembly} disabled={working} className="w-full py-3 rounded-xl font-medium mb-4" style={{ background: '#8B5CF6', color: 'white' }}>
          Начать сборку
        </button>
      )}

      {order.status === 'assembling' && (
        <>
          <div className="text-sm text-slate-400 mb-3">Отметь собранные позиции:</div>
          <div className="space-y-2 mb-6">
            {order.items.map((item: OrderItem) => {
              const isPicked = picked.has(item.product_id)
              return (
                <button
                  key={item.product_id}
                  onClick={() => togglePick(item.product_id)}
                  className="w-full flex items-center gap-3 p-4 rounded-xl text-left transition-colors"
                  style={{
                    background: isPicked ? '#10B98120' : '#111827',
                    border: `1px solid ${isPicked ? '#10B981' : '#1E2A3A'}`,
                  }}
                >
                  <div
                    className="w-6 h-6 rounded-md flex items-center justify-center text-sm flex-shrink-0"
                    style={{
                      background: isPicked ? '#10B981' : 'transparent',
                      border: `2px solid ${isPicked ? '#10B981' : '#374151'}`,
                      color: 'white',
                    }}
                  >
                    {isPicked ? '✓' : ''}
                  </div>
                  <div className="flex-1">
                    <div className="text-slate-200">{item.name}</div>
                    <div className="text-xs text-slate-500">{item.qty} шт. · {item.price} ₽</div>
                  </div>
                </button>
              )
            })}
          </div>

          <button
            onClick={finishAssembly}
            disabled={!allPicked || working}
            className="w-full py-3 rounded-xl font-medium"
            style={{
              background: allPicked ? '#10B981' : '#1E2A3A',
              color: allPicked ? 'white' : '#475569',
              cursor: allPicked ? 'pointer' : 'not-allowed',
            }}
          >
            {allPicked ? 'Завершить сборку' : `Собрано ${picked.size}/${order.items.length}`}
          </button>
        </>
      )}

      {!['confirmed', 'assembling'].includes(order.status) && (
        <div className="text-slate-400 text-sm">Текущий статус: {order.status}</div>
      )}
    </div>
  )
}
