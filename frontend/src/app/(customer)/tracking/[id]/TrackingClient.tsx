'use client'
import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { DEMO_ORDERS } from '@/lib/store-demo-data'
import type { StoreOrder } from '@/lib/store-demo-data'

type TrackingStage =
  | 'pending'
  | 'confirmed'
  | 'assembling'
  | 'assembled'
  | 'picked_up'
  | 'delivering'
  | 'delivered'

const STAGES: { key: TrackingStage; label: string; icon: string }[] = [
  { key: 'pending',    label: 'Принят',          icon: '📝' },
  { key: 'confirmed',  label: 'Подтверждён',      icon: '✅' },
  { key: 'assembling', label: 'Собираем',          icon: '📦' },
  { key: 'assembled',  label: 'Готов к выдаче',   icon: '✨' },
  { key: 'picked_up',  label: 'Курьер забрал',     icon: '🛵' },
  { key: 'delivering', label: 'В пути',            icon: '🚀' },
  { key: 'delivered',  label: 'Доставлен',         icon: '🎉' },
]

const STAGE_KEYS = STAGES.map((s) => s.key)

export default function TrackingClient() {
  const { id } = useParams<{ id: string }>()
  const [order, setOrder] = useState<StoreOrder | null>(null)
  const [stageIdx, setStageIdx] = useState(2) // start at 'assembling'
  const [autoRunning, setAutoRunning] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const found = DEMO_ORDERS.find((o) => o.id === id) ?? DEMO_ORDERS[0]
    setOrder(found)
  }, [id])

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  function toggleAuto() {
    if (autoRunning) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      intervalRef.current = null
      setAutoRunning(false)
    } else {
      setAutoRunning(true)
      intervalRef.current = setInterval(() => {
        setStageIdx((prev) => {
          if (prev >= STAGE_KEYS.length - 1) {
            if (intervalRef.current) clearInterval(intervalRef.current)
            intervalRef.current = null
            setAutoRunning(false)
            return prev
          }
          return prev + 1
        })
      }, 2000)
    }
  }

  if (!order) return (
    <div className="text-slate-400 p-8 text-center">Загрузка…</div>
  )

  const currentStage = STAGE_KEYS[stageIdx]

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Order header */}
      <div
        className="rounded-2xl p-5 mb-5"
        style={{ background: '#0D1626', border: '1px solid #1E2A3A' }}
      >
        <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">
          {order.number}
        </div>
        <div className="text-2xl font-bold text-amber-400 mb-1">
          {order.total.toLocaleString('ru')} ₽
        </div>
        <div className="text-sm text-slate-300 mb-1">{order.customer}</div>
        <div className="text-sm text-slate-500">{order.address}</div>
        {order.notes && (
          <div
            className="mt-3 p-3 rounded-xl text-sm"
            style={{ background: '#78350F22', border: '1px solid #78350F', color: '#FBBF24' }}
          >
            📝 {order.notes}
          </div>
        )}
      </div>

      {/* Auto-update button */}
      <button
        onClick={toggleAuto}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium mb-5 transition-all"
        style={{
          background: autoRunning ? '#D4A01722' : '#1E2A3A',
          border: `1px solid ${autoRunning ? '#D4A017' : '#2D3D52'}`,
          color: autoRunning ? '#D4A017' : '#94A3B8',
        }}
      >
        <span
          className={autoRunning ? 'animate-spin' : ''}
          style={{ display: 'inline-block' }}
        >
          ⚡
        </span>
        {autoRunning ? 'Стоп авто-обновление' : 'Авто-обновление'}
      </button>

      {/* Stage timeline */}
      <div className="space-y-2 mb-6">
        {STAGES.map((stage, idx) => {
          const isPast = idx < stageIdx
          const isCurrent = idx === stageIdx
          const isFuture = idx > stageIdx

          return (
            <div
              key={stage.key}
              className="flex items-center gap-3 rounded-2xl p-4 transition-all"
              style={{
                background: isCurrent ? '#D4A01715' : '#0D1626',
                border: `1px solid ${isCurrent ? '#D4A017' : '#1E2A3A'}`,
                opacity: isFuture ? 0.35 : 1,
              }}
            >
              {/* Icon */}
              <div className="text-2xl w-9 text-center flex-shrink-0">{stage.icon}</div>

              {/* Label */}
              <div className="flex-1">
                <div
                  className="font-medium text-sm"
                  style={{ color: isCurrent ? '#D4A017' : isPast ? '#CBD5E1' : '#64748B' }}
                >
                  {stage.label}
                </div>
              </div>

              {/* Status indicator */}
              <div className="flex-shrink-0 w-6 flex items-center justify-center">
                {isPast && (
                  <div className="text-green-400 text-sm font-bold">✓</div>
                )}
                {isCurrent && (
                  <div
                    className="w-2.5 h-2.5 rounded-full animate-pulse"
                    style={{ background: '#D4A017' }}
                  />
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Items list */}
      <div
        className="rounded-2xl p-4"
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
              <span className="text-slate-300 flex-1 pr-4">{item.name} × {item.qty}</span>
              <span className="text-amber-400 text-xs whitespace-nowrap">
                {(item.price * item.qty).toLocaleString('ru')} ₽
              </span>
            </div>
          ))}
        </div>
        <div
          className="flex justify-between items-center pt-3 mt-1 font-semibold text-sm"
          style={{ borderTop: '1px solid #1E2A3A' }}
        >
          <span className="text-slate-400">Итого</span>
          <span className="text-amber-400">{order.total.toLocaleString('ru')} ₽</span>
        </div>
      </div>

      {/* Delivered banner */}
      {currentStage === 'delivered' && (
        <div
          className="mt-4 rounded-2xl p-5 text-center"
          style={{ background: '#14532D22', border: '1px solid #22C55E' }}
        >
          <div className="text-3xl mb-2">🎉</div>
          <div className="text-green-400 font-bold">Заказ доставлен!</div>
          <div className="text-slate-500 text-sm mt-1">Спасибо за покупку</div>
        </div>
      )}
    </div>
  )
}
