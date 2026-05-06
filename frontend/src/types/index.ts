export type Role = 'superadmin' | 'network_manager' | 'store_operator' | 'courier' | 'customer'

export interface User {
  id: string
  email: string | null
  phone: string | null
  name: string
  role: Role
  store_id: string | null
  client_id: string | null
  is_active: boolean
  created_at: string
}

export interface Store {
  id: string
  client_id: string
  name: string
  address: string
  lat: number
  lng: number
  timezone: string
  is_active: boolean
  has_kitchen: boolean
  area_sqm: number | null
  max_orders_per_hour: number
  created_at: string
}

export interface Product {
  id: string
  client_id: string
  sku: string
  name: string
  category: string
  subcategory: string | null
  price: number
  weight_g: number | null
  is_perishable: boolean
  shelf_life_hours: number | null
  requires_cold: boolean
  image_url: string | null
  barcode: string | null
  is_active: boolean
  is_kitchen_item: boolean
}

export interface OrderItem {
  product_id: string
  qty: number
  price: number
  name: string
  substituted_with?: string | null
}

export type OrderStatus =
  | 'pending' | 'confirmed' | 'assembling' | 'assembled'
  | 'picked_up' | 'delivering' | 'delivered' | 'cancelled'

export interface Order {
  id: string
  store_id: string
  customer_id: string
  courier_id: string | null
  picker_id: string | null
  status: OrderStatus
  items: OrderItem[]
  total_amount: number
  delivery_address: string
  delivery_lat: number | null
  delivery_lng: number | null
  notes: string | null
  created_at: string
  estimated_delivery_at: string | null
  actual_delivery_at: string | null
  assembly_started_at: string | null
  assembly_finished_at: string | null
}

export interface WSMessage {
  type: 'new_order' | 'order_update' | 'inventory_alert' | 'substitution_request' | 'kitchen_task' | 'anomaly' | 'connected'
  payload: Record<string, unknown>
  timestamp: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
  role: Role
  user_id: string
  name: string
}
