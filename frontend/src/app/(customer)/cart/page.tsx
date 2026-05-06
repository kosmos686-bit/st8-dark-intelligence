'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getCart, updateQty, removeFromCart, cartTotal, type CartItem } from '@/lib/cart'

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([])

  useEffect(() => {
    const update = () => setItems(getCart())
    update()
    window.addEventListener('cart-update', update)
    return () => window.removeEventListener('cart-update', update)
  }, [])

  const total = cartTotal(items)

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4 text-amber-400">Корзина</h1>

      {items.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">🛒</div>
          <div className="text-slate-400 mb-4">Корзина пуста</div>
          <Link href="/catalog" className="px-4 py-2 rounded-lg text-sm" style={{ background: '#D4A017', color: '#0A0F1A' }}>
            К каталогу
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-2 mb-6">
            {items.map((item) => (
              <div key={item.product_id} className="rounded-xl p-3 flex items-center gap-3" style={{ background: '#111827', border: '1px solid #1E2A3A' }}>
                <div className="flex-1">
                  <div className="text-slate-200 text-sm">{item.name}</div>
                  <div className="text-xs text-slate-500">{item.price} ₽ × {item.qty} = {item.price * item.qty} ₽</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQty(item.product_id, item.qty - 1)}
                    className="w-7 h-7 rounded-lg text-slate-300"
                    style={{ background: '#1E2A3A' }}
                  >
                    −
                  </button>
                  <span className="text-slate-200 w-6 text-center">{item.qty}</span>
                  <button
                    onClick={() => updateQty(item.product_id, item.qty + 1)}
                    className="w-7 h-7 rounded-lg text-slate-300"
                    style={{ background: '#1E2A3A' }}
                  >
                    +
                  </button>
                  <button
                    onClick={() => removeFromCart(item.product_id)}
                    className="ml-2 text-slate-500 text-xs"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl p-4 mb-4" style={{ background: '#111827', border: '1px solid #1E2A3A' }}>
            <div className="flex justify-between text-sm text-slate-400 mb-2">
              <span>Товары ({items.reduce((s, i) => s + i.qty, 0)})</span>
              <span>{total} ₽</span>
            </div>
            <div className="flex justify-between text-sm text-slate-400 mb-2">
              <span>Доставка</span>
              <span>Бесплатно</span>
            </div>
            <div className="flex justify-between text-lg font-bold text-amber-400 pt-2 border-t" style={{ borderColor: '#1E2A3A' }}>
              <span>Итого</span>
              <span>{total} ₽</span>
            </div>
          </div>

          <Link
            href="/checkout"
            className="block w-full py-3 rounded-xl text-center font-bold"
            style={{ background: '#D4A017', color: '#0A0F1A' }}
          >
            Оформить заказ
          </Link>
        </>
      )}
    </div>
  )
}
