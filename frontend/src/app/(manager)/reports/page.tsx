'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

interface NetworkStore {
  store_id: string
  name: string
  orders_today: number
  revenue_today: number
}

export default function ReportsPage() {
  const [stores, setStores] = useState<NetworkStore[]>([])

  useEffect(() => {
    api.get<{ stores: NetworkStore[] }>('/analytics/network').then((d) => setStores(d.stores))
  }, [])

  const sorted = [...stores].sort((a, b) => b.revenue_today - a.revenue_today)

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-amber-400">Отчёты</h1>

      <section className="mb-8">
        <h2 className="text-sm uppercase tracking-wider text-slate-500 mb-3">Рейтинг точек по выручке (сегодня)</h2>
        <div className="rounded-xl p-4" style={{ background: '#111827', border: '1px solid #1E2A3A' }}>
          {sorted.map((s, i) => (
            <div key={s.store_id} className="flex items-center justify-between py-2 border-b last:border-b-0" style={{ borderColor: '#1E2A3A' }}>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full text-xs flex items-center justify-center" style={{ background: i === 0 ? '#D4A017' : '#1E2A3A', color: i === 0 ? '#0A0F1A' : '#94A3B8' }}>{i + 1}</div>
                <div className="text-slate-200 text-sm">{s.name}</div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-xs text-slate-500">{s.orders_today} зак.</div>
                <div className="text-amber-400 font-medium">{s.revenue_today.toLocaleString('ru')} ₽</div>
              </div>
            </div>
          ))}
          {sorted.length === 0 && <div className="text-slate-500 text-sm">Нет данных</div>}
        </div>
      </section>

      <div className="text-xs text-slate-500">Расширенные отчёты (PDF/Excel экспорт) — в Фазе 4.</div>
    </div>
  )
}
