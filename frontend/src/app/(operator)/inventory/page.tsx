'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  Package,
  Layers,
  RefreshCw,
  Search,
  AlertTriangle,
  Clock,
  Grid3X3,
  List,
  ShoppingCart,
  Thermometer,
  BarChart3,
  X,
} from 'lucide-react'
import { DEMO_SKU, DEMO_ZONES } from '@/lib/store-demo-data'
import type { SKUItem, ZoneConfig } from '@/lib/store-demo-data'

// ─── Constants ────────────────────────────────────────────────────────────────

const TODAY = new Date().toISOString().slice(0, 10) // "YYYY-MM-DD"

function daysUntilExpiry(expiry_date: string | null): number | null {
  if (!expiry_date) return null
  const ms = new Date(expiry_date).getTime() - new Date(TODAY).getTime()
  return Math.floor(ms / 86_400_000)
}

function isExpiringToday(expiry_date: string | null): boolean {
  return expiry_date === TODAY
}

function isExpiringWithin2Days(expiry_date: string | null): boolean {
  const d = daysUntilExpiry(expiry_date)
  return d !== null && d >= 0 && d <= 1
}

function isExpiringWithin3Days(expiry_date: string | null): boolean {
  const d = daysUntilExpiry(expiry_date)
  return d !== null && d >= 0 && d <= 2
}

function isLowStock(item: SKUItem): boolean {
  return item.qty < item.min_qty
}

function isSoonLow(item: SKUItem): boolean {
  return item.qty < item.min_qty * 1.5
}

function stockBarColor(item: SKUItem): string {
  if (item.qty < item.min_qty) return '#EF4444'
  if (item.qty < item.min_qty * 1.5) return '#F97316'
  return '#10B981'
}

function formatPrice(p: number): string {
  return p.toLocaleString('ru-RU') + ' ₽'
}

function fillPct(zone: ZoneConfig): number {
  return Math.round((zone.occupied / zone.cells) * 100)
}

// ─── Types ────────────────────────────────────────────────────────────────────

type StatusFilter = 'all' | 'critical' | 'expiring' | 'ok'
type ViewMode = 'grid' | 'table'

const CATEGORIES = [
  'Все', 'Молочка', 'Мясо', 'Рыба', 'Фрукты', 'Бакалея', 'Напитки', 'Кулинария', 'Заморозка',
]

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all',      label: 'Все' },
  { key: 'critical', label: 'Критично' },
  { key: 'expiring', label: 'Истекает' },
  { key: 'ok',       label: 'Норма' },
]

const ZONE_IDS = ['Все', 'A', 'B', 'C', 'D', 'E', 'F', 'G']

// ─── Toast ────────────────────────────────────────────────────────────────────

interface Toast {
  id: number
  message: string
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ZoneCard({ zone }: { zone: ZoneConfig }) {
  const pct = fillPct(zone)
  const isOver = pct > 85
  const barColor = isOver ? '#EF4444' : zone.color

  return (
    <div
      style={{
        background: zone.color + '1F',
        border: `1px solid ${zone.color}33`,
        borderRadius: 14,
        padding: '0.875rem 1rem',
        minWidth: 130,
        flex: '1 1 130px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle gradient shimmer top */}
      <div
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: 2,
          background: `linear-gradient(90deg, ${zone.color}00, ${zone.color}, ${zone.color}00)`,
          borderRadius: '14px 14px 0 0',
          opacity: 0.7,
        }}
      />

      {/* Zone letter */}
      <div
        style={{
          fontSize: '2rem',
          fontWeight: 800,
          color: zone.color,
          lineHeight: 1,
          marginBottom: '0.25rem',
          letterSpacing: '-0.03em',
        }}
      >
        {zone.id}
      </div>

      {/* Zone label */}
      <div style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 500, marginBottom: '0.15rem', lineHeight: 1.3 }}>
        {zone.label}
      </div>

      {/* Temperature */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.6rem' }}>
        <Thermometer size={10} color="#475569" />
        <span style={{ fontSize: '0.68rem', color: '#475569' }}>{zone.temp}</span>
      </div>

      {/* Cells */}
      <div style={{ fontSize: '0.7rem', color: '#64748B', marginBottom: '0.4rem' }}>
        <span style={{ color: zone.color, fontWeight: 600 }}>{zone.occupied}</span>
        <span> / {zone.cells} ячеек</span>
      </div>

      {/* Progress bar */}
      <div style={{ height: 5, borderRadius: 99, background: 'rgba(0,0,0,0.3)', overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            borderRadius: 99,
            background: barColor,
            transition: 'width 0.6s ease',
            boxShadow: isOver ? `0 0 8px ${barColor}80` : 'none',
          }}
        />
      </div>

      {/* Fill % */}
      <div
        style={{
          fontSize: '0.68rem',
          fontWeight: 700,
          color: isOver ? '#EF4444' : zone.color,
          marginTop: '0.3rem',
          textAlign: 'right',
        }}
      >
        {pct}%
      </div>
    </div>
  )
}

// ─── SKU Card ─────────────────────────────────────────────────────────────────

function SKUCard({
  item,
  onOrder,
}: {
  item: SKUItem
  onOrder: (item: SKUItem) => void
}) {
  const [hovered, setHovered] = useState(false)
  const low = isLowStock(item)
  const soonLow = isSoonLow(item)
  const barColor = stockBarColor(item)
  const stockPct = Math.min(Math.round((item.qty / (item.min_qty * 3)) * 100), 100)
  const days = daysUntilExpiry(item.expiry_date)
  const expiresWithin3 = isExpiringWithin3Days(item.expiry_date)

  const zoneData = DEMO_ZONES.find(z => z.id === item.zone)

  let expiryColor = '#10B981'
  let expiryBg = '#10B98118'
  let expiryLabel = ''

  if (item.expiry_date) {
    if (days !== null && days < 0) {
      expiryColor = '#EF4444'; expiryBg = '#EF444420'
      expiryLabel = 'Просрочено'
    } else if (days === 0) {
      expiryColor = '#EF4444'; expiryBg = '#EF444420'
      expiryLabel = 'Истекает сегодня'
    } else if (days === 1) {
      expiryColor = '#EF4444'; expiryBg = '#EF444420'
      expiryLabel = 'Истекает завтра'
    } else if (days !== null && days <= 2) {
      expiryColor = '#F97316'; expiryBg = '#F9731620'
      expiryLabel = `Через ${days} дн.`
    } else {
      expiryColor = '#64748B'; expiryBg = 'transparent'
      expiryLabel = item.expiry_date
    }
  }

  const borderColor = hovered
    ? low ? '#EF444470' : soonLow ? '#F9731670' : '#D4A01750'
    : low ? '#EF444430' : soonLow ? '#F9731630' : '#1E2A3A'

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'rgba(17,24,39,.8)',
        backdropFilter: 'blur(12px)',
        border: `1px solid ${borderColor}`,
        borderRadius: 14,
        padding: '1rem 1.1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.55rem',
        cursor: 'default',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        boxShadow: hovered
          ? `0 0 22px ${low ? '#EF444418' : soonLow ? '#F9731618' : '#D4A01718'}`
          : '0 1px 3px rgba(0,0,0,0.3)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top accent for critical */}
      {(low || isExpiringWithin2Days(item.expiry_date)) && (
        <div
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0,
            height: 2,
            background: low
              ? 'linear-gradient(90deg, #EF4444, #F97316)'
              : 'linear-gradient(90deg, #F97316, #D4A017)',
          }}
        />
      )}

      {/* Row 1: SKU + barcode */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#D4A017', letterSpacing: '0.06em', fontFamily: 'monospace' }}>
          {item.sku}
        </span>
        <span style={{ fontSize: '0.62rem', color: '#334155', fontFamily: 'monospace' }}>
          {item.barcode}
        </span>
      </div>

      {/* Row 2: Product name */}
      <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#F1F5F9', lineHeight: 1.35 }}>
        {item.name}
      </div>

      {/* Row 3: Zone + Cell + Category */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
        <span
          style={{
            fontSize: '0.7rem',
            fontWeight: 700,
            color: '#D4A017',
            background: '#D4A01722',
            border: '1px solid #D4A01740',
            borderRadius: 6,
            padding: '0.1rem 0.5rem',
          }}
        >
          {item.zone}
        </span>
        <span
          style={{
            fontSize: '0.7rem',
            fontWeight: 600,
            color: '#475569',
            background: '#1E2A3A',
            border: '1px solid #243447',
            borderRadius: 6,
            padding: '0.1rem 0.5rem',
            fontFamily: 'monospace',
          }}
        >
          {item.cell}
        </span>
        {zoneData && (
          <span
            style={{
              fontSize: '0.65rem',
              fontWeight: 500,
              color: zoneData.color,
              background: zoneData.color + '18',
              border: `1px solid ${zoneData.color}30`,
              borderRadius: 6,
              padding: '0.1rem 0.5rem',
            }}
          >
            {item.category}
          </span>
        )}
      </div>

      {/* Row 4: Stock bar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#475569', marginBottom: '0.3rem' }}>
          <span>Запас</span>
          <span style={{ color: barColor, fontWeight: 700 }}>
            {item.qty} / {item.min_qty}
            <span style={{ color: '#334155', fontWeight: 400 }}> (мин)</span>
          </span>
        </div>
        <div style={{ height: 6, borderRadius: 99, background: '#0A0F1A', overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${stockPct}%`,
              borderRadius: 99,
              background: low
                ? 'linear-gradient(90deg, #EF4444, #F87171)'
                : soonLow
                ? 'linear-gradient(90deg, #F97316, #FBBF24)'
                : 'linear-gradient(90deg, #10B981, #34D399)',
              transition: 'width 0.5s ease',
            }}
          />
        </div>
      </div>

      {/* Row 5: Price + Expiry */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#E2E8F0' }}>
          {formatPrice(item.price)}
        </span>
        {item.expiry_date && (
          <span
            style={{
              fontSize: '0.67rem',
              fontWeight: expiresWithin3 ? 700 : 400,
              color: expiryColor,
              background: expiryBg,
              border: expiresWithin3 ? `1px solid ${expiryColor}40` : 'none',
              borderRadius: 6,
              padding: '0.1rem 0.45rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
          >
            <Clock size={10} />
            {expiryLabel}
          </span>
        )}
      </div>

      {/* Row 6: Supplier + Order button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.1rem' }}>
        <span style={{ fontSize: '0.68rem', color: '#334155' }}>
          {item.supplier}
        </span>
        {soonLow && (
          <button
            onClick={() => onOrder(item)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              padding: '0.3rem 0.7rem',
              borderRadius: 8,
              background: low ? 'rgba(239,68,68,0.12)' : 'rgba(249,115,22,0.12)',
              border: `1px solid ${low ? '#EF444450' : '#F9731650'}`,
              color: low ? '#EF4444' : '#F97316',
              fontSize: '0.7rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLButtonElement
              el.style.background = low ? 'rgba(239,68,68,0.22)' : 'rgba(249,115,22,0.22)'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLButtonElement
              el.style.background = low ? 'rgba(239,68,68,0.12)' : 'rgba(249,115,22,0.12)'
            }}
          >
            <ShoppingCart size={11} />
            Заказать
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Table Row ────────────────────────────────────────────────────────────────

function TableRow({
  item,
  onOrder,
}: {
  item: SKUItem
  onOrder: (item: SKUItem) => void
}) {
  const [hovered, setHovered] = useState(false)
  const low = isLowStock(item)
  const soonLow = isSoonLow(item)
  const barColor = stockBarColor(item)
  const days = daysUntilExpiry(item.expiry_date)
  const expiresWithin3 = isExpiringWithin3Days(item.expiry_date)
  const zoneData = DEMO_ZONES.find(z => z.id === item.zone)

  let expiryColor = '#64748B'
  let expiryLabel = item.expiry_date ?? '—'
  if (item.expiry_date) {
    if (days !== null && days < 0) { expiryColor = '#EF4444'; expiryLabel = 'Просрочено' }
    else if (days === 0)            { expiryColor = '#EF4444'; expiryLabel = 'Сегодня' }
    else if (days === 1)            { expiryColor = '#EF4444'; expiryLabel = 'Завтра' }
    else if (days !== null && days <= 2) { expiryColor = '#F97316'; expiryLabel = `${days} дн.` }
  }

  return (
    <tr
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered
          ? low ? 'rgba(239,68,68,0.06)' : 'rgba(212,160,23,0.04)'
          : 'transparent',
        transition: 'background 0.15s',
        borderBottom: '1px solid #1E2A3A',
      }}
    >
      {/* SKU */}
      <td style={{ padding: '0.65rem 0.75rem', whiteSpace: 'nowrap' }}>
        <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#D4A017', fontFamily: 'monospace' }}>
          {item.sku}
        </div>
        <div style={{ fontSize: '0.6rem', color: '#334155', fontFamily: 'monospace', marginTop: '0.1rem' }}>
          {item.barcode}
        </div>
      </td>

      {/* Name */}
      <td style={{ padding: '0.65rem 0.75rem' }}>
        <div style={{ fontSize: '0.82rem', fontWeight: 500, color: '#E2E8F0', lineHeight: 1.3 }}>
          {item.name}
        </div>
        <div style={{ fontSize: '0.66rem', color: '#334155', marginTop: '0.1rem' }}>{item.supplier}</div>
      </td>

      {/* Zone + Cell */}
      <td style={{ padding: '0.65rem 0.75rem', whiteSpace: 'nowrap' }}>
        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#D4A017', background: '#D4A01722', border: '1px solid #D4A01740', borderRadius: 5, padding: '0.1rem 0.4rem', marginRight: '0.3rem' }}>
          {item.zone}
        </span>
        <span style={{ fontSize: '0.7rem', color: '#475569', fontFamily: 'monospace', background: '#1E2A3A', borderRadius: 5, padding: '0.1rem 0.4rem' }}>
          {item.cell}
        </span>
      </td>

      {/* Category */}
      <td style={{ padding: '0.65rem 0.75rem', whiteSpace: 'nowrap' }}>
        {zoneData && (
          <span style={{ fontSize: '0.68rem', color: zoneData.color, background: zoneData.color + '18', border: `1px solid ${zoneData.color}30`, borderRadius: 5, padding: '0.1rem 0.45rem' }}>
            {item.category}
          </span>
        )}
      </td>

      {/* Stock */}
      <td style={{ padding: '0.65rem 0.75rem', minWidth: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ flex: 1, height: 4, borderRadius: 99, background: '#0A0F1A', overflow: 'hidden', minWidth: 50 }}>
            <div style={{
              height: '100%',
              width: `${Math.min(Math.round((item.qty / (item.min_qty * 3)) * 100), 100)}%`,
              borderRadius: 99,
              background: barColor,
            }} />
          </div>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: barColor, whiteSpace: 'nowrap' }}>
            {item.qty} / {item.min_qty}
          </span>
        </div>
      </td>

      {/* Price */}
      <td style={{ padding: '0.65rem 0.75rem', whiteSpace: 'nowrap' }}>
        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#E2E8F0' }}>
          {formatPrice(item.price)}
        </span>
      </td>

      {/* Expiry */}
      <td style={{ padding: '0.65rem 0.75rem', whiteSpace: 'nowrap' }}>
        <span style={{ fontSize: '0.7rem', color: expiryColor, fontWeight: expiresWithin3 ? 700 : 400 }}>
          {expiryLabel}
        </span>
      </td>

      {/* Action */}
      <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>
        {soonLow && (
          <button
            onClick={() => onOrder(item)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              padding: '0.28rem 0.65rem',
              borderRadius: 7,
              background: low ? 'rgba(239,68,68,0.12)' : 'rgba(249,115,22,0.12)',
              border: `1px solid ${low ? '#EF444450' : '#F9731650'}`,
              color: low ? '#EF4444' : '#F97316',
              fontSize: '0.68rem',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            <ShoppingCart size={10} />
            Заказать
          </button>
        )}
      </td>
    </tr>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function InventoryPage() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('Все')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [zoneFilter, setZoneFilter] = useState('Все')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [refreshing, setRefreshing] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [toastCounter, setToastCounter] = useState(0)

  // ── Derived stats ──────────────────────────────────────────────────────────

  const totalSKU = DEMO_SKU.length
  const lowStockCount = useMemo(() => DEMO_SKU.filter(isLowStock).length, [])
  const expiringTodayCount = useMemo(
    () => DEMO_SKU.filter(i => isExpiringToday(i.expiry_date)).length,
    [],
  )

  // ── Critical / expiring alert items ───────────────────────────────────────

  const alertItems = useMemo(
    () => DEMO_SKU.filter(i => isLowStock(i) || isExpiringWithin2Days(i.expiry_date)),
    [],
  )

  // ── Filtered SKU list ─────────────────────────────────────────────────────

  const filtered = useMemo<SKUItem[]>(() => {
    let result = DEMO_SKU

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        i => i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q),
      )
    }

    if (category !== 'Все') {
      result = result.filter(i => {
        // map category tab to data categories
        const catMap: Record<string, string[]> = {
          Молочка:   ['Молочка'],
          Мясо:      ['Мясо'],
          Рыба:      ['Рыба'],
          Фрукты:    ['Фрукты', 'Овощи'],
          Бакалея:   ['Бакалея', 'Хлеб', 'Соусы'],
          Напитки:   ['Напитки'],
          Кулинария: ['Кулинария'],
          Заморозка: ['Заморозка'],
        }
        const mapped = catMap[category] ?? [category]
        return mapped.some(c => i.category === c)
      })
    }

    if (statusFilter === 'critical') {
      result = result.filter(isLowStock)
    } else if (statusFilter === 'expiring') {
      result = result.filter(i => isExpiringWithin2Days(i.expiry_date))
    } else if (statusFilter === 'ok') {
      result = result.filter(i => !isLowStock(i) && !isExpiringWithin2Days(i.expiry_date))
    }

    if (zoneFilter !== 'Все') {
      result = result.filter(i => i.zone === zoneFilter)
    }

    return result
  }, [search, category, statusFilter, zoneFilter])

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleRefresh = useCallback(() => {
    setRefreshing(true)
    setTimeout(() => setRefreshing(false), 900)
  }, [])

  const handleOrder = useCallback((item: SKUItem) => {
    const id = Date.now()
    setToastCounter(c => c + 1)
    setToasts(prev => [
      ...prev,
      { id, message: `Заявка поставщику ${item.supplier} отправлена` },
    ])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3500)
  }, [])

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  // ── Shared card style ─────────────────────────────────────────────────────

  const card = {
    background: 'rgba(17,24,39,.8)' as const,
    backdropFilter: 'blur(12px)' as const,
    border: '1px solid #1E2A3A' as const,
    borderRadius: 14 as const,
  }

  const sectionLabel: React.CSSProperties = {
    fontSize: 11,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.15em',
    color: '#475569',
    fontWeight: 600,
    marginBottom: '0.75rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  }

  return (
    <div
      style={{
        maxWidth: '80rem',
        padding: '0 1.25rem 3rem',
        margin: '0 auto',
        color: '#E2E8F0',
        fontFamily: 'inherit',
        position: 'relative',
      }}
    >
      {/* ── Toast container ────────────────────────────────────────────────── */}
      <div
        style={{
          position: 'fixed',
          bottom: '1.5rem',
          right: '1.5rem',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          pointerEvents: 'none',
        }}
      >
        {toasts.map(toast => (
          <div
            key={toast.id}
            style={{
              background: 'rgba(17,24,39,0.95)',
              backdropFilter: 'blur(16px)',
              border: '1px solid #10B98150',
              borderRadius: 12,
              padding: '0.75rem 1rem',
              color: '#10B981',
              fontSize: '0.82rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              pointerEvents: 'auto',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              minWidth: 260,
              animation: 'slideUp 0.25s ease',
            }}
          >
            <ShoppingCart size={14} color="#10B981" />
            <span style={{ flex: 1 }}>{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: 0, display: 'flex' }}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          paddingTop: '2rem',
          paddingBottom: '1.5rem',
        }}
      >
        {/* Title + stats */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #10B98120, #10B98140)',
                border: '1px solid #10B98150',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Package size={20} color="#10B981" />
            </div>
            <h1
              style={{
                fontSize: '1.6rem',
                fontWeight: 700,
                color: '#F1F5F9',
                letterSpacing: '-0.02em',
                margin: 0,
              }}
            >
              Управление остатками
            </h1>
          </div>

          {/* Stat pills */}
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <StatPill label="Всего SKU" value={totalSKU} color="#D4A017" />
            <StatPill
              label="Критично"
              value={lowStockCount}
              color={lowStockCount > 0 ? '#EF4444' : '#10B981'}
            />
            <StatPill
              label="Истекает сегодня"
              value={expiringTodayCount}
              color={expiringTodayCount > 0 ? '#F97316' : '#10B981'}
            />
          </div>
        </div>

        {/* Refresh + view toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div
            style={{
              display: 'flex',
              background: 'rgba(17,24,39,.8)',
              border: '1px solid #1E2A3A',
              borderRadius: 10,
              overflow: 'hidden',
            }}
          >
            <ViewToggleBtn
              active={viewMode === 'grid'}
              onClick={() => setViewMode('grid')}
              icon={<Grid3X3 size={14} />}
            />
            <ViewToggleBtn
              active={viewMode === 'table'}
              onClick={() => setViewMode('table')}
              icon={<List size={14} />}
            />
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.5rem 1.1rem',
              borderRadius: 10,
              background: 'rgba(17,24,39,.8)',
              backdropFilter: 'blur(12px)',
              border: '1px solid #1E2A3A',
              color: '#94A3B8',
              fontSize: '0.82rem',
              cursor: refreshing ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              if (!refreshing) {
                const el = e.currentTarget as HTMLButtonElement
                el.style.borderColor = '#D4A01760'
                el.style.color = '#D4A017'
              }
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLButtonElement
              el.style.borderColor = '#1E2A3A'
              el.style.color = '#94A3B8'
            }}
          >
            <RefreshCw
              size={14}
              style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }}
            />
            Обновить
          </button>
        </div>
      </div>

      {/* ── Alert Banner ───────────────────────────────────────────────────── */}
      {alertItems.length > 0 && (
        <div
          style={{
            ...card,
            background: 'rgba(239,68,68,0.07)',
            border: '1px solid #EF444430',
            padding: '1rem 1.25rem',
            marginBottom: '1.5rem',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0, left: 0, right: 0,
              height: 2,
              background: 'linear-gradient(90deg, #EF4444, #F97316, #EF4444)',
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
            <AlertTriangle size={16} color="#EF4444" />
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#EF4444', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Требуют внимания — {alertItems.length} позиций
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.4rem',
            }}
          >
            {alertItems.map(item => {
              const low = isLowStock(item)
              const exp = isExpiringWithin2Days(item.expiry_date)
              const color = low ? '#EF4444' : '#F97316'
              return (
                <span
                  key={item.id}
                  style={{
                    fontSize: '0.7rem',
                    color: color,
                    background: color + '18',
                    border: `1px solid ${color}35`,
                    borderRadius: 6,
                    padding: '0.2rem 0.6rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                  }}
                >
                  {low && <BarChart3 size={10} />}
                  {!low && exp && <Clock size={10} />}
                  {item.name}
                  {low && (
                    <span style={{ opacity: 0.6 }}>({item.qty}/{item.min_qty})</span>
                  )}
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Zone Heatmap ───────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={sectionLabel}>
          <Layers size={13} />
          Тепловая карта зон
        </div>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          {DEMO_ZONES.map(zone => (
            <ZoneCard key={zone.id} zone={zone} />
          ))}
        </div>
      </div>

      {/* ── Filters ────────────────────────────────────────────────────────── */}
      <div
        style={{
          ...card,
          padding: '1rem 1.25rem',
          marginBottom: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
        }}
      >
        {/* Row 1: Search + Status + Zone */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 0 }}>
            <Search
              size={14}
              color="#334155"
              style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
            />
            <input
              type="text"
              placeholder="Поиск по названию или SKU..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.85rem 0.5rem 2.2rem',
                background: 'rgba(10,15,26,0.6)',
                border: '1px solid #1E2A3A',
                borderRadius: 9,
                color: '#E2E8F0',
                fontSize: '0.83rem',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => { (e.target as HTMLInputElement).style.borderColor = '#D4A01770' }}
              onBlur={e  => { (e.target as HTMLInputElement).style.borderColor = '#1E2A3A' }}
            />
          </div>

          {/* Status filter */}
          <div
            style={{
              display: 'flex',
              gap: '0.25rem',
              background: 'rgba(10,15,26,0.5)',
              border: '1px solid #1E2A3A',
              borderRadius: 9,
              padding: '0.25rem',
            }}
          >
            {STATUS_FILTERS.map(sf => (
              <button
                key={sf.key}
                onClick={() => setStatusFilter(sf.key)}
                style={{
                  padding: '0.3rem 0.7rem',
                  borderRadius: 6,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: statusFilter === sf.key ? 700 : 400,
                  background: statusFilter === sf.key
                    ? sf.key === 'critical' ? '#EF444422'
                    : sf.key === 'expiring' ? '#F9731622'
                    : sf.key === 'ok'       ? '#10B98122'
                    : '#D4A01722'
                    : 'transparent',
                  color: statusFilter === sf.key
                    ? sf.key === 'critical' ? '#EF4444'
                    : sf.key === 'expiring' ? '#F97316'
                    : sf.key === 'ok'       ? '#10B981'
                    : '#D4A017'
                    : '#475569',
                  transition: 'all 0.15s',
                  whiteSpace: 'nowrap',
                }}
              >
                {sf.label}
              </button>
            ))}
          </div>

          {/* Zone filter */}
          <div
            style={{
              display: 'flex',
              gap: '0.2rem',
              background: 'rgba(10,15,26,0.5)',
              border: '1px solid #1E2A3A',
              borderRadius: 9,
              padding: '0.25rem',
              flexWrap: 'wrap',
            }}
          >
            {ZONE_IDS.map(z => {
              const zoneData = DEMO_ZONES.find(zd => zd.id === z)
              const isAll = z === 'Все'
              const isActive = zoneFilter === z
              return (
                <button
                  key={z}
                  onClick={() => setZoneFilter(z)}
                  style={{
                    padding: '0.28rem 0.55rem',
                    borderRadius: 6,
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.72rem',
                    fontWeight: isActive ? 700 : 400,
                    background: isActive
                      ? isAll
                        ? '#D4A01722'
                        : (zoneData?.color ?? '#D4A017') + '22'
                      : 'transparent',
                    color: isActive
                      ? isAll
                        ? '#D4A017'
                        : zoneData?.color ?? '#D4A017'
                      : '#475569',
                    transition: 'all 0.15s',
                  }}
                >
                  {z}
                </button>
              )
            })}
          </div>
        </div>

        {/* Row 2: Category tabs */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              style={{
                padding: '0.3rem 0.8rem',
                borderRadius: 7,
                border: `1px solid ${category === cat ? '#D4A01760' : '#1E2A3A'}`,
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: category === cat ? 700 : 400,
                background: category === cat ? '#D4A01718' : 'transparent',
                color: category === cat ? '#D4A017' : '#475569',
                transition: 'all 0.15s',
              }}
            >
              {cat}
            </button>
          ))}

          <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: '#334155', alignSelf: 'center', flexShrink: 0 }}>
            {filtered.length} из {totalSKU}
          </span>
        </div>
      </div>

      {/* ── SKU List ───────────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div
          style={{
            ...card,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4rem 1rem',
            gap: '1rem',
          }}
        >
          <div
            style={{
              width: 60, height: 60,
              borderRadius: 14,
              background: '#1E2A3A',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Package size={28} color="#334155" />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#94A3B8', marginBottom: '0.3rem' }}>
              Позиций не найдено
            </div>
            <div style={{ fontSize: '0.78rem', color: '#334155' }}>
              Попробуйте изменить фильтры или поисковый запрос
            </div>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '0.875rem',
          }}
        >
          {filtered.map(item => (
            <SKUCard key={item.id} item={item} onOrder={handleOrder} />
          ))}
        </div>
      ) : (
        <div
          style={{
            ...card,
            overflow: 'hidden',
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1E2A3A' }}>
                  {['SKU', 'Название', 'Зона', 'Категория', 'Запас', 'Цена', 'Срок', ''].map(h => (
                    <th
                      key={h}
                      style={{
                        padding: '0.65rem 0.75rem',
                        textAlign: 'left',
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        color: '#334155',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => (
                  <TableRow key={item.id} item={item} onOrder={handleOrder} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Keyframes ──────────────────────────────────────────────────────── */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        input::placeholder { color: #1E2A3A; }
      `}</style>
    </div>
  )
}

// ─── Small helper components ──────────────────────────────────────────────────

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        background: color + '14',
        border: `1px solid ${color}30`,
        borderRadius: 8,
        padding: '0.2rem 0.65rem',
      }}
    >
      <span style={{ fontSize: '0.68rem', color: '#475569' }}>{label}</span>
      <span style={{ fontSize: '0.82rem', fontWeight: 700, color }}>{value}</span>
    </div>
  )
}

function ViewToggleBtn({
  active,
  onClick,
  icon,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '0.45rem 0.7rem',
        background: active ? '#D4A01722' : 'transparent',
        border: 'none',
        cursor: 'pointer',
        color: active ? '#D4A017' : '#475569',
        display: 'flex',
        alignItems: 'center',
        transition: 'all 0.15s',
      }}
    >
      {icon}
    </button>
  )
}
