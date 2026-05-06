'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { Store } from '@/types'

interface ForecastItem { product_id: string; predicted_qty: number; confidence: number }
interface ProductRef { id: string; name: string; category: string }

export default function ForecastPage() {
  const [stores, setStores] = useState<Store[]>([])
  const [storeId, setStoreId] = useState('')
  const [hours, setHours] = useState(12)
  const [items, setItems] = useState<ForecastItem[]>([])
  const [products, setProducts] = useState<Map<string, ProductRef>>(new Map())
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    api.get<Store[]>('/stores/').then((s) => {
      setStores(s)
      if (s[0]) setStoreId(s[0].id)
    })
    api.get<ProductRef[]>('/products/?limit=500').then((list) => {
      setProducts(new Map(list.map((p) => [p.id, p])))
    })
  }, [])

  useEffect(() => {
    if (!storeId) return
    api.get<{ items: ForecastItem[] }>(`/analytics/forecast?store_id=${storeId}&hours_ahead=${hours}`)
      .then((d) => setItems(d.items))
  }, [storeId, hours])

  async function recompute() {
    if (!storeId) return
    setBusy(true)
    setMsg(null)
    try {
      const r = await api.post<{ rows_written: number }>(`/ai/forecast/${storeId}?horizon_hours=24`, {})
      setMsg(`Записано прогнозов: ${r.rows_written}`)
      const d = await api.get<{ items: ForecastItem[] }>(`/analytics/forecast?store_id=${storeId}&hours_ahead=${hours}`)
      setItems(d.items)
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Ошибка')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-amber-400">Прогноз спроса</h1>

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
          value={hours}
          onChange={(e) => setHours(Number(e.target.value))}
          className="px-3 py-2 rounded-lg text-slate-200"
          style={{ background: '#111827', border: '1px solid #1E2A3A' }}
        >
          <option value={6}>Ближайшие 6ч</option>
          <option value={12}>12ч</option>
          <option value={24}>24ч</option>
          <option value={48}>48ч</option>
        </select>
        <button
          onClick={recompute}
          disabled={busy}
          className="px-4 py-2 rounded-lg text-sm font-medium"
          style={{ background: '#8B5CF6', color: 'white', opacity: busy ? 0.5 : 1 }}
        >
          {busy ? 'Считаю…' : 'Пересчитать'}
        </button>
      </div>

      {msg && <div className="mb-4 text-sm text-slate-400">{msg}</div>}

      <div className="rounded-xl overflow-hidden" style={{ background: '#111827', border: '1px solid #1E2A3A' }}>
        <table className="w-full text-sm">
          <thead style={{ background: '#0F172A' }}>
            <tr className="text-slate-500 text-xs text-left">
              <th className="px-4 py-2 font-medium">Товар</th>
              <th className="px-4 py-2 font-medium text-right">Прогноз</th>
              <th className="px-4 py-2 font-medium text-right">Уверенность</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => {
              const product = products.get(i.product_id)
              return (
                <tr key={i.product_id} className="border-t" style={{ borderColor: '#1E2A3A' }}>
                  <td className="px-4 py-2 text-slate-200">{product?.name || i.product_id.slice(0, 8)}</td>
                  <td className="px-4 py-2 text-right text-amber-400 font-medium">{i.predicted_qty} шт</td>
                  <td className="px-4 py-2 text-right">
                    <ConfidenceBar value={i.confidence} />
                  </td>
                </tr>
              )
            })}
            {items.length === 0 && (
              <tr><td colSpan={3} className="px-4 py-6 text-center text-slate-500">Прогноз пуст. Нажми «Пересчитать», чтобы построить.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ConfidenceBar({ value }: { value: number }) {
  const color = value > 0.7 ? '#22C55E' : value > 0.4 ? '#FBBF24' : '#EF4444'
  return (
    <div className="inline-flex items-center gap-2">
      <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: '#1E2A3A' }}>
        <div style={{ background: color, width: `${Math.round(value * 100)}%`, height: '100%' }} />
      </div>
      <span className="text-xs text-slate-500 w-8">{Math.round(value * 100)}%</span>
    </div>
  )
}
