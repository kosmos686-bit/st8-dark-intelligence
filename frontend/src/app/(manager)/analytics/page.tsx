'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { Store } from '@/types'

interface TopProduct { product_id: string; name: string; qty: number; revenue: number }
interface HourlyBucket { hour: string; orders: number; revenue: number }
interface Summary { orders_today: number; revenue_today: number; cancelled_today: number }

export default function AnalyticsPage() {
  const [stores, setStores] = useState<Store[]>([])
  const [storeId, setStoreId] = useState('')
  const [summary, setSummary] = useState<Summary | null>(null)
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [hourly, setHourly] = useState<HourlyBucket[]>([])
  const [days, setDays] = useState(7)

  useEffect(() => {
    api.get<Store[]>('/stores/').then((s) => {
      setStores(s)
      if (s[0]) setStoreId(s[0].id)
    })
  }, [])

  useEffect(() => {
    if (!storeId) return
    api.get<Summary>(`/analytics/summary?store_id=${storeId}`).then(setSummary)
    api.get<{ products: TopProduct[] }>(`/analytics/top-products?store_id=${storeId}&days=${days}&limit=15`).then((d) => setTopProducts(d.products))
    api.get<{ buckets: HourlyBucket[] }>(`/analytics/hourly?store_id=${storeId}&days=1`).then((d) => setHourly(d.buckets))
  }, [storeId, days])

  const maxOrders = Math.max(1, ...hourly.map((h) => h.orders))

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-amber-400">Аналитика</h1>

      <div className="flex gap-3 mb-6">
        <select
          value={storeId}
          onChange={(e) => setStoreId(e.target.value)}
          className="px-3 py-2 rounded-lg text-slate-200"
          style={{ background: '#111827', border: '1px solid #1E2A3A' }}
        >
          {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="px-3 py-2 rounded-lg text-slate-200"
          style={{ background: '#111827', border: '1px solid #1E2A3A' }}
        >
          <option value={1}>Сегодня</option>
          <option value={7}>7 дней</option>
          <option value={30}>30 дней</option>
        </select>
      </div>

      {summary && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Stat label="Заказов сегодня" value={String(summary.orders_today)} />
          <Stat label="Выручка сегодня" value={`${summary.revenue_today.toLocaleString('ru')} ₽`} />
          <Stat label="Отменено" value={String(summary.cancelled_today)} accent="#EF4444" />
        </div>
      )}

      <section className="mb-8">
        <h2 className="text-sm uppercase tracking-wider text-slate-500 mb-3">Заказы по часам</h2>
        <div className="rounded-xl p-4" style={{ background: '#111827', border: '1px solid #1E2A3A' }}>
          {hourly.length === 0 ? (
            <div className="text-slate-500 text-sm">Нет данных</div>
          ) : (
            <div className="flex items-end gap-1 h-32">
              {hourly.map((h) => (
                <div key={h.hour} className="flex-1 flex flex-col items-center" title={`${new Date(h.hour).toLocaleTimeString('ru', { hour: '2-digit' })} — ${h.orders}`}>
                  <div className="w-full" style={{ background: '#D4A017', height: `${(h.orders / maxOrders) * 100}%`, minHeight: 2, borderRadius: '2px 2px 0 0' }} />
                  <div className="text-[9px] text-slate-600 mt-1">{new Date(h.hour).getHours()}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-sm uppercase tracking-wider text-slate-500 mb-3">Топ товаров за {days} {days === 1 ? 'день' : 'дн.'}</h2>
        <div className="rounded-xl overflow-hidden" style={{ background: '#111827', border: '1px solid #1E2A3A' }}>
          <table className="w-full text-sm">
            <thead style={{ background: '#0F172A' }}>
              <tr className="text-slate-500 text-xs text-left">
                <th className="px-4 py-2 font-medium">#</th>
                <th className="px-4 py-2 font-medium">Товар</th>
                <th className="px-4 py-2 font-medium text-right">Кол-во</th>
                <th className="px-4 py-2 font-medium text-right">Выручка</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.map((p, i) => (
                <tr key={p.product_id} className="border-t" style={{ borderColor: '#1E2A3A' }}>
                  <td className="px-4 py-2 text-slate-500">{i + 1}</td>
                  <td className="px-4 py-2 text-slate-200">{p.name}</td>
                  <td className="px-4 py-2 text-right text-slate-300">{p.qty}</td>
                  <td className="px-4 py-2 text-right text-amber-400 font-medium">{p.revenue.toLocaleString('ru')} ₽</td>
                </tr>
              ))}
              {topProducts.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-500">Нет данных</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function Stat({ label, value, accent = '#D4A017' }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-xl p-5" style={{ background: '#111827', border: '1px solid #1E2A3A' }}>
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className="text-2xl font-bold" style={{ color: accent }}>{value}</div>
    </div>
  )
}
