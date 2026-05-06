'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { useWebSocket } from '@/hooks/useWebSocket'
import type { Order } from '@/types'

interface PerishableRisk {
  inventory_id: string
  product_id: string
  product_name: string
  quantity: number
  expiry_in_hours: number
  predicted_sales: number
  risk_score: number
  recommendation: string
}

interface AlertsResponse {
  low_stock: { name: string; quantity: number }[]
  expiring_soon: { name: string }[]
}

export default function DashboardPage() {
  const [storeId, setStoreId] = useState<string | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [risks, setRisks] = useState<PerishableRisk[]>([])
  const [alerts, setAlerts] = useState<AlertsResponse | null>(null)
  const [kitchenCount, setKitchenCount] = useState(0)

  useEffect(() => {
    api.get<{ store_id: string }>('/auth/me').then((u) => setStoreId(u.store_id))
  }, [])

  useEffect(() => {
    if (storeId) loadAll()
  }, [storeId])

  useWebSocket(storeId ? `operator/${storeId}` : null, (msg) => {
    if (msg.type === 'new_order' || msg.type === 'order_update') loadOrders()
    if (msg.type === 'inventory_alert') loadAll()
    if (msg.type === 'kitchen_task') loadKitchen()
  })

  async function loadAll() {
    if (!storeId) return
    await Promise.all([loadOrders(), loadAlerts(), loadRisks(), loadKitchen()])
  }

  async function loadOrders() {
    const data = await api.get<Order[]>('/orders/?limit=100')
    setOrders(data)
  }

  async function loadAlerts() {
    if (!storeId) return
    const a = await api.get<AlertsResponse>(`/inventory/alerts/${storeId}`)
    setAlerts(a)
  }

  async function loadRisks() {
    if (!storeId) return
    try {
      const r = await api.get<{ risks: PerishableRisk[] }>(`/ai/perishable/${storeId}`)
      setRisks(r.risks)
    } catch {
      setRisks([])
    }
  }

  async function loadKitchen() {
    if (!storeId) return
    try {
      const k = await api.get<{ id: string }[]>(`/kitchen/?store_id=${storeId}&status=planned`)
      setKitchenCount(k.length)
    } catch {
      setKitchenCount(0)
    }
  }

  async function planKitchen() {
    if (!storeId) return
    await api.post(`/ai/kitchen-plan/${storeId}`, {})
    loadKitchen()
  }

  const active = orders.filter((o) => !['delivered', 'cancelled'].includes(o.status))
  const assembling = orders.filter((o) => o.status === 'assembling').length

  return (
    <div className="max-w-6xl">
      <h1 className="text-2xl font-bold mb-6 text-amber-400">Дашборд оператора</h1>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <Stat label="Активных заказов" value={String(active.length)} link="/orders" />
        <Stat label="На сборке" value={String(assembling)} accent="#8B5CF6" link="/orders" />
        <Stat label="Алертов остатков" value={String((alerts?.low_stock.length || 0) + (alerts?.expiring_soon.length || 0))} accent="#EF4444" link="/inventory" />
        <Stat label="Задач кухни" value={String(kitchenCount)} accent="#06B6D4" link="/kitchen" />
      </div>

      {risks.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm uppercase tracking-wider text-red-400">⚠ Риск списания (AI)</h2>
            <span className="text-xs text-slate-500">{risks.length} SKU</span>
          </div>
          <div className="grid gap-2">
            {risks.slice(0, 5).map((r) => (
              <div key={r.inventory_id} className="rounded-xl p-3 flex items-center gap-3" style={{ background: '#7F1D1D20', border: '1px solid #DC2626' }}>
                <div className="text-2xl">🔥</div>
                <div className="flex-1">
                  <div className="text-slate-200 text-sm font-medium">{r.product_name}</div>
                  <div className="text-xs text-slate-400">
                    {r.quantity} шт · истекает через {r.expiry_in_hours}ч · прогноз продаж {r.predicted_sales} шт
                  </div>
                  <div className="text-xs mt-1" style={{ color: '#FBBF24' }}>💡 {r.recommendation}</div>
                </div>
                <div className="text-right">
                  <div className="text-red-400 font-bold">{Math.round(r.risk_score * 100)}%</div>
                  <div className="text-xs text-slate-500">риск</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="grid grid-cols-2 gap-6">
        <div>
          <h2 className="text-sm uppercase tracking-wider text-slate-500 mb-3">Активные заказы</h2>
          <div className="space-y-2">
            {active.slice(0, 6).map((o) => (
              <Link key={o.id} href={`/picking/${o.id}`} className="block rounded-lg p-3" style={{ background: '#111827', border: '1px solid #1E2A3A' }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-500">#{o.id.slice(0, 8)}</span>
                  <span className="text-amber-400 text-sm">{o.total_amount} ₽</span>
                </div>
                <div className="text-xs text-slate-400 mt-1">{o.items.length} поз. · {o.status}</div>
              </Link>
            ))}
            {active.length === 0 && <div className="text-slate-500 text-sm">Нет активных</div>}
          </div>
        </div>

        <div>
          <h2 className="text-sm uppercase tracking-wider text-slate-500 mb-3">AI помощник</h2>
          <div className="space-y-2">
            <button
              onClick={planKitchen}
              className="w-full rounded-lg p-3 text-left"
              style={{ background: '#111827', border: '1px solid #1E2A3A' }}
            >
              <div className="text-slate-200 text-sm font-medium">🍳 Спланировать кухню</div>
              <div className="text-xs text-slate-500 mt-1">Создать задачи на 3 часа вперёд</div>
            </button>
            <button
              onClick={loadRisks}
              className="w-full rounded-lg p-3 text-left"
              style={{ background: '#111827', border: '1px solid #1E2A3A' }}
            >
              <div className="text-slate-200 text-sm font-medium">🔥 Проверить скоропорт</div>
              <div className="text-xs text-slate-500 mt-1">Запустить оценку риска списания</div>
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

function Stat({ label, value, accent = '#D4A017', link }: { label: string; value: string; accent?: string; link?: string }) {
  const inner = (
    <div className="rounded-xl p-4" style={{ background: '#111827', border: '1px solid #1E2A3A' }}>
      <div className="text-xs mb-1 text-slate-500">{label}</div>
      <div className="text-2xl font-bold" style={{ color: accent }}>{value}</div>
    </div>
  )
  return link ? <Link href={link}>{inner}</Link> : inner
}
