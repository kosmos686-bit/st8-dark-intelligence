'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import type { Store, Order } from '@/types'
import { getCart, cartTotal, clearCart } from '@/lib/cart'

export default function CheckoutPage() {
  const router = useRouter()
  const [stores, setStores] = useState<Store[]>([])
  const [storeId, setStoreId] = useState<string>('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const items = typeof window !== 'undefined' ? getCart() : []
  const total = cartTotal(items)

  useEffect(() => {
    api.get<Store[]>('/stores/').then((s) => {
      setStores(s)
      if (s[0]) setStoreId(s[0].id)
    })
  }, [])

  async function submit() {
    if (!storeId || !address.trim()) {
      setError('Заполни адрес и выбери даркстор')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const order = await api.post<Order>('/orders/', {
        store_id: storeId,
        items: items.map((i) => ({ product_id: i.product_id, qty: i.qty, price: i.price, name: i.name })),
        total_amount: total,
        delivery_address: address,
        notes: notes || undefined,
      })
      clearCart()
      router.push(`/tracking/${order.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка оформления')
    } finally {
      setSubmitting(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-slate-400 mb-4">Корзина пуста</div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4 text-amber-400">Оформление</h1>

      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm text-slate-400 mb-1">Даркстор</label>
          <select
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
            className="w-full p-3 rounded-xl text-slate-200"
            style={{ background: '#111827', border: '1px solid #1E2A3A' }}
          >
            {stores.map((s) => (
              <option key={s.id} value={s.id}>{s.name} — {s.address}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-1">Адрес доставки</label>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Москва, Тверская 1, кв. 10"
            className="w-full p-3 rounded-xl text-slate-200"
            style={{ background: '#111827', border: '1px solid #1E2A3A' }}
          />
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-1">Комментарий (необязательно)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Код домофона, этаж…"
            className="w-full p-3 rounded-xl text-slate-200"
            style={{ background: '#111827', border: '1px solid #1E2A3A' }}
          />
        </div>
      </div>

      <div className="rounded-xl p-4 mb-4" style={{ background: '#111827', border: '1px solid #1E2A3A' }}>
        <div className="text-sm text-slate-400 mb-2">{items.length} позиций</div>
        <div className="flex justify-between text-lg font-bold text-amber-400">
          <span>К оплате</span>
          <span>{total} ₽</span>
        </div>
      </div>

      {error && <div className="mb-4 text-sm text-red-400">{error}</div>}

      <button
        onClick={submit}
        disabled={submitting}
        className="w-full py-3 rounded-xl font-bold"
        style={{ background: '#D4A017', color: '#0A0F1A', opacity: submitting ? 0.5 : 1 }}
      >
        {submitting ? 'Оформляю…' : 'Подтвердить заказ'}
      </button>
    </div>
  )
}
