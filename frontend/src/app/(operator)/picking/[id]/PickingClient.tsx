'use client'
import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { DEMO_ORDERS } from '@/lib/store-demo-data'
import { CheckCircle, ArrowLeft, Zap, Package } from 'lucide-react'

const ZONE_COLOR: Record<string, string> = {
  A: '#3B82F6', B: '#EF4444', C: '#D4A017', D: '#8B5CF6',
  E: '#10B981', F: '#F97316', G: '#EC4899',
}

export default function PickingClient() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const storeOrder = DEMO_ORDERS.find(o => o.id === id) ?? DEMO_ORDERS[0]
  const [picked, setPicked] = useState<Set<number>>(new Set())
  const [done, setDone] = useState(false)

  function toggle(idx: number) {
    setPicked(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx); else next.add(idx)
      return next
    })
  }

  function finish() {
    setDone(true)
    setTimeout(() => router.push('/store'), 1800)
  }

  const allPicked = picked.size === storeOrder.items.length

  if (done) return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 16,
      background: '#060A12',
    }}>
      <CheckCircle size={64} style={{ color: '#10B981' }} />
      <div style={{ fontSize: 20, fontWeight: 800, color: '#10B981' }}>Сборка завершена!</div>
      <div style={{ fontSize: 13, color: '#475569' }}>Возврат на склад…</div>
    </div>
  )

  return (
    <div style={{
      minHeight: '100vh', background: '#060A12',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '0 0 40px',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 20px', borderBottom: '1px solid #1E2A3A',
        background: 'rgba(6,10,18,.95)', backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10,
      }}>
        <button onClick={() => router.push('/store')} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#475569', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13,
        }}>
          <ArrowLeft size={16}/> Склад
        </button>
        <Package size={16} style={{ color: '#8B5CF6', marginLeft: 8 }} />
        <span style={{ fontWeight: 700, color: '#E2E8F0', fontSize: 15 }}>
          Сборка {storeOrder.number}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#475569' }}>
          {storeOrder.customer}
        </span>
      </div>

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Order info */}
        <div style={{ borderRadius: 14, padding: '14px 16px', background: '#111827', border: '1px solid #1E2A3A' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#D4A017' }}>{storeOrder.number}</span>
            <span style={{ fontSize: 13, color: '#64748B' }}>{storeOrder.total.toLocaleString('ru')} ₽</span>
          </div>
          <div style={{ fontSize: 12, color: '#64748B', marginBottom: 4 }}>📍 {storeOrder.address}</div>
          {storeOrder.notes && (
            <div style={{ fontSize: 12, color: '#FBBF24', marginTop: 6 }}>📝 {storeOrder.notes}</div>
          )}
        </div>

        {/* AI route hint */}
        <div style={{
          borderRadius: 12, padding: '10px 14px',
          background: 'rgba(212,160,23,.07)', border: '1px solid rgba(212,160,23,.2)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <Zap size={14} style={{ color: '#D4A017', flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: '#D4A017', fontWeight: 600 }}>
            AI-маршрут: {[...new Set(storeOrder.items.map(i => i.zone))].sort().join(' → ')}
          </span>
          <span style={{ fontSize: 11, color: '#475569', marginLeft: 'auto' }}>
            ~{Math.ceil(storeOrder.items.length * 0.8 + [...new Set(storeOrder.items.map(i=>i.zone))].length * 0.6)} мин
          </span>
        </div>

        {/* Progress */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: '#64748B' }}>Прогресс сборки</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: picked.size === storeOrder.items.length ? '#10B981' : '#8B5CF6' }}>
              {picked.size}/{storeOrder.items.length}
            </span>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: '#1E2A3A', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 3, transition: 'width .4s',
              width: `${(picked.size / storeOrder.items.length) * 100}%`,
              background: allPicked ? '#10B981' : 'linear-gradient(90deg,#8B5CF6,#A78BFA)',
            }} />
          </div>
        </div>

        {/* Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 11, color: '#475569', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 2 }}>
            Отметь собранные позиции
          </div>
          {storeOrder.items.map((item, idx) => {
            const isPicked = picked.has(idx)
            const zc = ZONE_COLOR[item.zone] ?? '#6B7280'
            return (
              <button key={idx} onClick={() => toggle(idx)} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', borderRadius: 12, textAlign: 'left',
                background: isPicked ? 'rgba(16,185,129,.08)' : '#111827',
                border: `1px solid ${isPicked ? 'rgba(16,185,129,.4)' : '#1E2A3A'}`,
                cursor: 'pointer', transition: 'all .2s',
              }}>
                <div style={{
                  width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isPicked ? '#10B981' : 'transparent',
                  border: `2px solid ${isPicked ? '#10B981' : '#374151'}`,
                  color: 'white', fontSize: 13, transition: 'all .2s',
                }}>
                  {isPicked ? '✓' : ''}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: isPicked ? '#6EE7B7' : '#CBD5E1', fontWeight: 500 }}>
                    {item.name}
                  </div>
                  <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>
                    {item.qty} шт. · {item.price} ₽
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5,
                    background: `${zc}18`, color: zc, border: `1px solid ${zc}33`,
                  }}>
                    Зона {item.zone}
                  </span>
                  <span style={{ fontSize: 10, color: '#374151' }}>{item.cell}</span>
                </div>
              </button>
            )
          })}
        </div>

        {/* Finish button */}
        <button
          onClick={finish}
          disabled={!allPicked}
          style={{
            width: '100%', padding: '14px', borderRadius: 14,
            fontSize: 14, fontWeight: 700, border: 'none', cursor: allPicked ? 'pointer' : 'not-allowed',
            background: allPicked
              ? 'linear-gradient(135deg,#10B981,#059669)'
              : '#1E2A3A',
            color: allPicked ? 'white' : '#374151',
            transition: 'all .3s',
            boxShadow: allPicked ? '0 8px 24px rgba(16,185,129,.3)' : 'none',
          }}
        >
          {allPicked ? '✅ Завершить сборку' : `Собери все позиции (${picked.size}/${storeOrder.items.length})`}
        </button>
      </div>
    </div>
  )
}
