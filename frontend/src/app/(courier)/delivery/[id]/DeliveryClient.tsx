'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { DEMO_ORDERS } from '@/lib/store-demo-data'
import type { StoreOrder } from '@/lib/store-demo-data'

type DeliveryStage = 'assembled' | 'picked_up' | 'delivering' | 'delivered'

const STAGE_SEQUENCE: DeliveryStage[] = ['assembled', 'picked_up', 'delivering', 'delivered']

export default function DeliveryClient() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [order, setOrder] = useState<StoreOrder | null>(null)
  const [stage, setStage] = useState<DeliveryStage>('assembled')
  const [working, setWorking] = useState(false)

  useEffect(() => {
    const found = DEMO_ORDERS.find((o) => o.id === id) ?? DEMO_ORDERS[0]
    setOrder(found)
  }, [id])

  function advance() {
    if (!order || working) return
    const currentIdx = STAGE_SEQUENCE.indexOf(stage)
    const next = STAGE_SEQUENCE[currentIdx + 1]
    if (!next) return

    setWorking(true)
    setTimeout(() => {
      setStage(next)
      setWorking(false)
      if (next === 'delivered') {
        setTimeout(() => router.push('/store'), 1500)
      }
    }, 300)
  }

  if (!order) return (
    <div className="text-slate-400 p-8 text-center">Загрузка…</div>
  )

  const mapsUrl = `https://yandex.ru/maps/?text=${encodeURIComponent(order.address)}`

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <button
        onClick={() => router.push('/route')}
        className="text-sm text-slate-400 mb-5 flex items-center gap-1 hover:text-slate-200 transition-colors"
      >
        ← Маршрут
      </button>

      {/* Order header card */}
      <div
        className="rounded-2xl p-5 mb-4"
        style={{ background: '#0D1626', border: '1px solid #1E2A3A' }}
      >
        <div className="text-xs text-slate-500 mb-1 tracking-wide uppercase">
          Заказ {order.number}
        </div>
        <div className="text-xl font-bold text-slate-100 mb-1">{order.address}</div>
        <div className="text-sm text-slate-400 mb-3">{order.customer}</div>
        <div className="flex items-center gap-3 text-sm text-slate-400">
          <span>{order.items.length} поз.</span>
          <span className="text-slate-600">·</span>
          <span className="text-amber-400 font-semibold">{order.total.toLocaleString('ru')} ₽</span>
        </div>
        {order.notes && (
          <div
            className="mt-4 p-3 rounded-xl text-sm"
            style={{ background: '#78350F22', border: '1px solid #78350F', color: '#FBBF24' }}
          >
            📝 {order.notes}
          </div>
        )}
      </div>

      {/* Yandex Maps link */}
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl font-medium mb-4 transition-opacity hover:opacity-80"
        style={{ background: '#1E2A3A', color: '#38BDF8' }}
      >
        🗺️ Открыть в Яндекс.Картах
      </a>

      {/* Items list */}
      <div
        className="rounded-2xl p-4 mb-6"
        style={{ background: '#0D1626', border: '1px solid #1E2A3A' }}
      >
        <div className="text-xs text-slate-500 uppercase tracking-wide mb-3">Состав заказа</div>
        <div className="space-y-2">
          {order.items.map((item) => (
            <div
              key={item.sku}
              className="flex justify-between items-center text-sm py-1"
              style={{ borderBottom: '1px solid #1E2A3A' }}
            >
              <span className="text-slate-300 flex-1 pr-4">{item.name}</span>
              <span className="text-slate-500 whitespace-nowrap">× {item.qty}</span>
              <span
                className="text-amber-400 text-xs ml-3 whitespace-nowrap"
                style={{ minWidth: 60, textAlign: 'right' }}
              >
                {(item.price * item.qty).toLocaleString('ru')} ₽
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="space-y-3">
        {stage === 'assembled' && (
          <button
            onClick={advance}
            disabled={working}
            className="w-full py-4 rounded-2xl font-bold text-base transition-opacity disabled:opacity-50"
            style={{ background: '#D4A017', color: '#060A12' }}
          >
            Забрал заказ
          </button>
        )}

        {stage === 'picked_up' && (
          <button
            onClick={advance}
            disabled={working}
            className="w-full py-4 rounded-2xl font-bold text-base transition-opacity disabled:opacity-50"
            style={{ background: '#0EA5E9', color: '#fff' }}
          >
            Еду к клиенту
          </button>
        )}

        {stage === 'delivering' && (
          <button
            onClick={advance}
            disabled={working}
            className="w-full py-4 rounded-2xl font-bold text-base transition-opacity disabled:opacity-50"
            style={{ background: '#22C55E', color: '#fff' }}
          >
            ✓ Доставлено
          </button>
        )}

        {stage === 'delivered' && (
          <div
            className="flex flex-col items-center gap-2 py-6 rounded-2xl"
            style={{ background: '#14532D22', border: '1px solid #22C55E' }}
          >
            <div className="text-3xl">🎉</div>
            <div className="text-green-400 font-bold text-lg">Доставлено!</div>
            <div className="text-slate-500 text-sm">Возвращаемся на склад…</div>
          </div>
        )}
      </div>
    </div>
  )
}
