/**
 * Локальная корзина в localStorage.
 */
import type { OrderItem } from '@/types'

const KEY = 'st8_cart'

export type CartItem = OrderItem

export function getCart(): CartItem[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]')
  } catch {
    return []
  }
}

export function setCart(items: CartItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items))
  window.dispatchEvent(new Event('cart-update'))
}

export function addToCart(item: CartItem) {
  const cart = getCart()
  const existing = cart.find((i) => i.product_id === item.product_id)
  if (existing) {
    existing.qty += item.qty
  } else {
    cart.push(item)
  }
  setCart(cart)
}

export function removeFromCart(productId: string) {
  setCart(getCart().filter((i) => i.product_id !== productId))
}

export function updateQty(productId: string, qty: number) {
  const cart = getCart()
  const item = cart.find((i) => i.product_id === productId)
  if (item) {
    if (qty <= 0) {
      setCart(cart.filter((i) => i.product_id !== productId))
    } else {
      item.qty = qty
      setCart(cart)
    }
  }
}

export function clearCart() {
  setCart([])
}

export function cartTotal(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.price * i.qty, 0)
}
