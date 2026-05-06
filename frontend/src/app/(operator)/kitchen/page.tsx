'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { useWebSocket } from '@/hooks/useWebSocket'

type KitchenStatus = 'planned' | 'cooking' | 'ready' | 'sold' | 'cancelled'

interface KitchenTask {
  id: string
  store_id: string
  product_id: string
  quantity: number
  scheduled_for: string
  started_at: string | null
  finished_at: string | null
  status: KitchenStatus
  created_by: string
}

interface ProductRef { id: string; name: string; cooking_time_minutes: number | null }

const STATUS_LABEL: Record<KitchenStatus, string> = {
  planned: 'Запланировано',
  cooking: 'Готовится',
  ready: 'Готово',
  sold: 'Продано',
  cancelled: 'Отменено',
}

const STATUS_COLOR: Record<KitchenStatus, string> = {
  planned: '#FBBF24',
  cooking: '#F97316',
  ready: '#22C55E',
  sold: '#64748B',
  cancelled: '#475569',
}

export default function KitchenPage() {
  const [storeId, setStoreId] = useState<string | null>(null)
  const [tasks, setTasks] = useState<KitchenTask[]>([])
  const [products, setProducts] = useState<Map<string, ProductRef>>(new Map())
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api.get<{ store_id: string }>('/auth/me').then((u) => setStoreId(u.store_id))
    api.get<ProductRef[]>('/products/?limit=500').then((list) => {
      setProducts(new Map(list.map((p) => [p.id, p])))
    })
  }, [])

  useEffect(() => {
    if (storeId) load()
  }, [storeId])

  useWebSocket(storeId ? `operator/${storeId}` : null, (msg) => {
    if (msg.type === 'kitchen_task') load()
  })

  async function load() {
    if (!storeId) return
    const data = await api.get<KitchenTask[]>(`/kitchen/?store_id=${storeId}`)
    setTasks(data)
  }

  async function transition(id: string, status: KitchenStatus) {
    await api.patch(`/kitchen/${id}/status`, { status })
    load()
  }

  async function planAuto() {
    if (!storeId) return
    setBusy(true)
    try {
      await api.post(`/ai/kitchen-plan/${storeId}`, {})
      await load()
    } finally {
      setBusy(false)
    }
  }

  const grouped: Record<KitchenStatus, KitchenTask[]> = {
    planned: [], cooking: [], ready: [], sold: [], cancelled: [],
  }
  for (const t of tasks) grouped[t.status].push(t)

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-amber-400">Кухня</h1>
        <button
          onClick={planAuto}
          disabled={busy}
          className="px-4 py-2 rounded-lg text-sm font-medium"
          style={{ background: '#8B5CF6', color: 'white', opacity: busy ? 0.5 : 1 }}
        >
          {busy ? 'Планирую…' : '🤖 AI план кухни'}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {(['planned', 'cooking', 'ready'] as const).map((status) => (
          <div key={status}>
            <div className="text-xs uppercase tracking-wider mb-3" style={{ color: STATUS_COLOR[status] }}>
              {STATUS_LABEL[status]} ({grouped[status].length})
            </div>
            <div className="space-y-2">
              {grouped[status].map((t) => {
                const product = products.get(t.product_id)
                const time = new Date(t.scheduled_for).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })
                return (
                  <div key={t.id} className="rounded-xl p-3" style={{ background: '#111827', border: `1px solid ${STATUS_COLOR[status]}40` }}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-slate-200 text-sm font-medium">{product?.name || t.product_id.slice(0, 8)}</div>
                      <div className="text-amber-400 text-sm">×{t.quantity}</div>
                    </div>
                    <div className="text-xs text-slate-500 mb-2">К {time} {t.created_by === 'ai' && <span className="ml-1" style={{ color: '#8B5CF6' }}>· AI</span>}</div>
                    {status === 'planned' && (
                      <button onClick={() => transition(t.id, 'cooking')} className="w-full py-1.5 rounded-lg text-xs font-medium" style={{ background: '#F97316', color: 'white' }}>
                        Начать готовить
                      </button>
                    )}
                    {status === 'cooking' && (
                      <button onClick={() => transition(t.id, 'ready')} className="w-full py-1.5 rounded-lg text-xs font-medium" style={{ background: '#22C55E', color: 'white' }}>
                        Готово
                      </button>
                    )}
                    {status === 'ready' && (
                      <button onClick={() => transition(t.id, 'sold')} className="w-full py-1.5 rounded-lg text-xs" style={{ background: '#1E2A3A', color: '#94A3B8' }}>
                        Отметить проданным
                      </button>
                    )}
                  </div>
                )
              })}
              {grouped[status].length === 0 && <div className="text-slate-600 text-xs text-center py-4">пусто</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
