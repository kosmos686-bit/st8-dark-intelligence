'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { Product } from '@/types'
import { addToCart } from '@/lib/cart'

export default function CatalogPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [category, setCategory] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<Product[]>('/products/?limit=200')
      .then(setProducts)
      .finally(() => setLoading(false))
  }, [])

  const categories = ['all', ...Array.from(new Set(products.map((p) => p.category)))]
  const filtered = category === 'all' ? products : products.filter((p) => p.category === category)

  function handleAdd(p: Product) {
    addToCart({ product_id: p.id, qty: 1, price: p.price, name: p.name })
  }

  if (loading) return <div className="text-slate-400">Загрузка…</div>

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4 text-amber-400">Каталог</h1>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className="px-3 py-1.5 rounded-full text-sm whitespace-nowrap"
            style={{
              background: category === c ? '#D4A017' : '#1E2A3A',
              color: category === c ? '#0A0F1A' : '#94A3B8',
            }}
          >
            {c === 'all' ? 'Все' : c}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {filtered.map((p) => (
          <div key={p.id} className="rounded-xl overflow-hidden flex flex-col" style={{ background: '#111827', border: '1px solid #1E2A3A' }}>
            <div className="aspect-square flex items-center justify-center text-4xl" style={{ background: '#0F172A' }}>
              {p.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
              ) : (
                '🛒'
              )}
            </div>
            <div className="p-3 flex-1 flex flex-col">
              <div className="text-sm text-slate-200 font-medium mb-1 line-clamp-2">{p.name}</div>
              <div className="text-xs text-slate-500 mb-3">{p.weight_g ? `${p.weight_g} г` : ''}</div>
              <div className="mt-auto flex items-center justify-between">
                <span className="text-amber-400 font-bold">{p.price} ₽</span>
                <button
                  onClick={() => handleAdd(p)}
                  className="px-3 py-1 rounded-lg text-xs font-medium"
                  style={{ background: '#D4A017', color: '#0A0F1A' }}
                >
                  В корзину
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && <div className="text-center text-slate-500 py-12">Нет товаров</div>}
    </div>
  )
}
