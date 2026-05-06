'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { useWebSocket } from '@/hooks/useWebSocket'

interface InventoryItem {
  id: string
  store_id: string
  product_id: string
  product_name: string
  quantity: number
  reserved_quantity: number
  available_quantity: number
  expiry_at: string | null
  batch_id: string | null
  updated_at: string
}

interface AlertsResponse {
  low_stock: { inventory_id: string; name: string; quantity: number }[]
  expiring_soon: { inventory_id: string; name: string; quantity: number; expiry_at: string | null }[]
}

export default function InventoryPage() {
  const [storeId, setStoreId] = useState<string | null>(null)
  const [items, setItems] = useState<InventoryItem[]>([])
  const [alerts, setAlerts] = useState<AlertsResponse | null>(null)
  const [filter, setFilter] = useState<'all' | 'low' | 'expiring'>('all')

  useEffect(() => {
    api.get<{ store_id: string }>('/auth/me').then((u) => setStoreId(u.store_id))
  }, [])

  useEffect(() => {
    if (storeId) load()
  }, [storeId, filter])

  useWebSocket(storeId ? `operator/${storeId}` : null, (msg) => {
    if (msg.type === 'inventory_alert') load()
  })

  async function load() {
    if (!storeId) return
    const params = new URLSearchParams({ store_id: storeId })
    if (filter === 'low') params.set('low_stock', 'true')
    if (filter === 'expiring') params.set('expiring_soon', 'true')
    const [list, a] = await Promise.all([
      api.get<InventoryItem[]>(`/inventory/?${params}`),
      api.get<AlertsResponse>(`/inventory/alerts/${storeId}`),
    ])
    setItems(list)
    setAlerts(a)
  }

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold mb-6 text-amber-400">Остатки</h1>

      {alerts && (alerts.low_stock.length > 0 || alerts.expiring_soon.length > 0) && (
        <div className="mb-6 grid grid-cols-2 gap-3">
          <div className="rounded-xl p-4" style={{ background: '#7F1D1D30', border: '1px solid #DC2626' }}>
            <div className="text-sm text-red-300 font-medium mb-1">Заканчивается ({alerts.low_stock.length})</div>
            <div className="text-xs text-slate-400">{alerts.low_stock.slice(0, 3).map((x) => x.name).join(', ')}</div>
          </div>
          <div className="rounded-xl p-4" style={{ background: '#78350F30', border: '1px solid #D97706' }}>
            <div className="text-sm font-medium mb-1" style={{ color: '#FBBF24' }}>Истекает 24ч ({alerts.expiring_soon.length})</div>
            <div className="text-xs text-slate-400">{alerts.expiring_soon.slice(0, 3).map((x) => x.name).join(', ')}</div>
          </div>
        </div>
      )}

      <div className="flex gap-2 mb-4">
        {(['all', 'low', 'expiring'] as const).map((k) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className="px-3 py-1.5 rounded-lg text-sm"
            style={{
              background: filter === k ? '#D4A017' : '#1E2A3A',
              color: filter === k ? '#0A0F1A' : '#94A3B8',
            }}
          >
            {k === 'all' ? 'Все' : k === 'low' ? 'Заканчивается' : 'Скоропорт'}
          </button>
        ))}
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: '#111827', border: '1px solid #1E2A3A' }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-slate-500 text-left text-xs" style={{ background: '#0F172A' }}>
              <th className="px-4 py-2 font-medium">Товар</th>
              <th className="px-4 py-2 font-medium">Остаток</th>
              <th className="px-4 py-2 font-medium">Резерв</th>
              <th className="px-4 py-2 font-medium">Доступно</th>
              <th className="px-4 py-2 font-medium">Истекает</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => {
              const lowStock = it.quantity <= 5
              return (
                <tr key={it.id} className="border-t" style={{ borderColor: '#1E2A3A' }}>
                  <td className="px-4 py-2 text-slate-200">{it.product_name}</td>
                  <td className="px-4 py-2" style={{ color: lowStock ? '#EF4444' : '#94A3B8' }}>{it.quantity}</td>
                  <td className="px-4 py-2 text-slate-500">{it.reserved_quantity}</td>
                  <td className="px-4 py-2 text-slate-300">{it.available_quantity}</td>
                  <td className="px-4 py-2 text-slate-500 text-xs">{it.expiry_at ? new Date(it.expiry_at).toLocaleDateString('ru') : '—'}</td>
                </tr>
              )
            })}
            {items.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">Нет данных</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
