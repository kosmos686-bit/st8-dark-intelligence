'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

interface NetworkStore {
  store_id: string
  name: string
  address: string
  lat: number
  lng: number
  is_active: boolean
  orders_today: number
  revenue_today: number
}

export default function NetworkPage() {
  const [stores, setStores] = useState<NetworkStore[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<{ stores: NetworkStore[] }>('/analytics/network')
      .then((d) => setStores(d.stores))
      .finally(() => setLoading(false))
  }, [])

  const total = stores.reduce(
    (acc, s) => ({ orders: acc.orders + s.orders_today, revenue: acc.revenue + s.revenue_today }),
    { orders: 0, revenue: 0 }
  )

  if (loading) return <div className="text-slate-400">Загрузка…</div>

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-amber-400">Карта сети</h1>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card label="Точек активно" value={String(stores.filter((s) => s.is_active).length)} />
        <Card label="Заказов сегодня" value={String(total.orders)} />
        <Card label="Выручка сегодня" value={`${total.revenue.toLocaleString('ru')} ₽`} />
      </div>

      <div className="grid gap-3">
        {stores.map((s) => (
          <div key={s.store_id} className="rounded-xl p-4 flex items-center justify-between" style={{ background: '#111827', border: '1px solid #1E2A3A' }}>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full" style={{ background: s.is_active ? '#22C55E' : '#64748B' }} />
                <div className="text-slate-200 font-medium">{s.name}</div>
              </div>
              <div className="text-sm text-slate-500">{s.address}</div>
              <div className="text-xs text-slate-600 mt-1 font-mono">{s.lat.toFixed(4)}, {s.lng.toFixed(4)}</div>
            </div>
            <div className="text-right">
              <div className="text-amber-400 font-bold text-lg">{s.revenue_today.toLocaleString('ru')} ₽</div>
              <div className="text-xs text-slate-500">{s.orders_today} заказов</div>
            </div>
          </div>
        ))}
        {stores.length === 0 && <div className="text-slate-500 text-center py-8">Нет дарксторов</div>}
      </div>
    </div>
  )
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl p-5" style={{ background: '#111827', border: '1px solid #1E2A3A' }}>
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className="text-2xl font-bold text-amber-400">{value}</div>
    </div>
  )
}
