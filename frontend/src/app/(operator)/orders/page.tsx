'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { DEMO_ORDERS, DEMO_PICKERS } from '@/lib/store-demo-data'
import type { StoreOrder, KanbanStatus, Picker } from '@/lib/store-demo-data'
import {
  ShoppingCart,
  MapPin,
  AlertTriangle,
  Star,
  RefreshCw,
  X,
  Clock,
  ChevronDown,
  CheckSquare,
  Square,
  User,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<KanbanStatus, string> = {
  new: '#6B7280',
  picking: '#8B5CF6',
  check: '#D4A017',
  ready: '#10B981',
  dispatched: '#3B82F6',
}
const STATUS_LABEL: Record<KanbanStatus, string> = {
  new: 'Новый',
  picking: 'Сборка',
  check: 'Проверка',
  ready: 'Готов',
  dispatched: 'Выдан',
}
const STATUS_NEXT: Partial<Record<KanbanStatus, KanbanStatus>> = {
  new: 'picking',
  picking: 'check',
  check: 'ready',
  ready: 'dispatched',
}
const STATUS_ACTION_LABEL: Partial<Record<KanbanStatus, string>> = {
  new: 'Начать сборку',
  picking: 'На проверку',
  check: 'Готов',
  ready: 'Выдать',
}

const CHANNEL_COLOR: Record<string, string> = {
  yandex: '#FFCC00',
  sber: '#21A038',
  samokat: '#FF6600',
  direct: '#3B82F6',
  wb: '#CB11AB',
}
const CHANNEL_LABEL: Record<string, string> = {
  yandex: 'Яндекс',
  sber: 'СберМаркет',
  samokat: 'Самокат',
  direct: 'Прямой',
  wb: 'WB',
}

const ZONE_COLOR: Record<string, string> = {
  A: '#3B82F6',
  B: '#EF4444',
  C: '#D4A017',
  D: '#8B5CF6',
  E: '#10B981',
  F: '#F97316',
  G: '#EC4899',
}

const PRIORITY_ORDER: Record<string, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
}

// ─────────────────────────────────────────────────────────────────────────────
// Toast
// ─────────────────────────────────────────────────────────────────────────────

interface Toast {
  id: number
  message: string
}

let toastSeq = 0

function ToastContainer({ toasts }: { toasts: Toast[] }) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{
            background: 'rgba(17,24,39,0.95)',
            backdropFilter: 'blur(16px)',
            border: '1px solid #D4A017',
            borderRadius: '12px',
            padding: '12px 20px',
            color: '#F1F5F9',
            fontSize: '13px',
            fontWeight: 600,
            boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
            animation: 'fadeSlideIn 0.25s ease',
          }}
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function countdown(deadlineIso: string): { label: string; color: string } {
  const diff = Math.floor((new Date(deadlineIso).getTime() - Date.now()) / 1000)
  if (diff <= 0) {
    const over = Math.abs(diff)
    const m = Math.floor(over / 60)
    const s = over % 60
    return { label: `-${m}:${String(s).padStart(2, '0')}`, color: '#EF4444' }
  }
  const m = Math.floor(diff / 60)
  const s = diff % 60
  const label = `${m}:${String(s).padStart(2, '0')}`
  if (diff < 3 * 60) return { label, color: '#F97316' }
  if (diff < 10 * 60) return { label, color: '#D4A017' }
  return { label, color: '#10B981' }
}

function fmtTime(iso: string): string {
  const d = new Date(iso)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

function fmtMoney(n: number): string {
  return n.toLocaleString('ru-RU') + ' ₽'
}

function getOrderZones(order: StoreOrder): string[] {
  const zs = new Set(order.items.map((i) => i.zone))
  return Array.from(zs)
}

// ─────────────────────────────────────────────────────────────────────────────
// Zone badge
// ─────────────────────────────────────────────────────────────────────────────

function ZoneBadge({ zone, small }: { zone: string; small?: boolean }) {
  const c = ZONE_COLOR[zone] ?? '#6B7280'
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: small ? '18px' : '22px',
        height: small ? '18px' : '22px',
        borderRadius: '4px',
        fontSize: small ? '10px' : '11px',
        fontWeight: 700,
        background: c + '22',
        color: c,
        border: `1px solid ${c}44`,
        flexShrink: 0,
      }}
    >
      {zone}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Status badge
// ─────────────────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: KanbanStatus }) {
  const c = STATUS_COLOR[status]
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 10px',
        borderRadius: '9999px',
        fontSize: '11px',
        fontWeight: 600,
        letterSpacing: '0.02em',
        background: c + '22',
        color: c,
        border: `1px solid ${c}44`,
        whiteSpace: 'nowrap',
      }}
    >
      {STATUS_LABEL[status]}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Channel badge
// ─────────────────────────────────────────────────────────────────────────────

function ChannelBadge({ channel }: { channel: string }) {
  const c = CHANNEL_COLOR[channel] ?? '#6B7280'
  const label = CHANNEL_LABEL[channel] ?? channel
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: '6px',
        fontSize: '10px',
        fontWeight: 700,
        background: c + '18',
        color: c,
        border: `1px solid ${c}33`,
        whiteSpace: 'nowrap',
        letterSpacing: '0.03em',
      }}
    >
      {label}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Countdown timer (auto-refresh)
// ─────────────────────────────────────────────────────────────────────────────

function CountdownTimer({ deadlineIso }: { deadlineIso: string }) {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((v) => v + 1), 1000)
    return () => clearInterval(id)
  }, [])
  const { label, color } = countdown(deadlineIso)
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '12px',
        fontWeight: 700,
        color,
        fontVariantNumeric: 'tabular-nums',
      }}
      aria-hidden={true}
    >
      <Clock size={11} />
      {label}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Order card
// ─────────────────────────────────────────────────────────────────────────────

interface OrderCardProps {
  order: StoreOrder
  pickers: Picker[]
  onClick: () => void
  onStatusAdvance: (orderId: string) => void
}

function OrderCard({ order, pickers, onClick, onStatusAdvance }: OrderCardProps) {
  const [hovered, setHovered] = useState(false)
  const borderColor = STATUS_COLOR[order.status]
  const picker = pickers.find((p) => p.id === order.picker_id)
  const zones = getOrderZones(order)
  const isDispatched = order.status === 'dispatched'
  const nextStatus = STATUS_NEXT[order.status]
  const actionLabel = STATUS_ACTION_LABEL[order.status]

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'rgba(17,24,39,0.8)',
        backdropFilter: 'blur(14px)',
        border: `1px solid ${hovered ? borderColor + '55' : '#1E2A3A'}`,
        borderLeft: `4px solid ${borderColor}`,
        borderRadius: '14px',
        padding: '14px 18px',
        cursor: 'pointer',
        transition: 'border-color 0.2s, box-shadow 0.2s, transform 0.15s',
        boxShadow: hovered
          ? `0 0 0 1px ${borderColor}22, 0 6px 28px rgba(0,0,0,0.45)`
          : '0 2px 8px rgba(0,0,0,0.25)',
        transform: hovered ? 'translateY(-1px)' : 'none',
        outline: 'none',
      }}
    >
      {/* Row 1: number + channel + priority + timer + total */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
        <span style={{ fontWeight: 700, fontSize: '14px', color: '#F1F5F9', letterSpacing: '0.01em' }}>
          {order.number}
        </span>
        <ChannelBadge channel={order.channel} />
        {order.priority === 'urgent' && (
          <AlertTriangle size={14} color="#EF4444" title="Срочно" />
        )}
        {order.priority === 'high' && (
          <Star size={13} color="#D4A017" fill="#D4A017" title="Высокий" />
        )}
        <span style={{ flex: 1 }} />
        <CountdownTimer deadlineIso={order.deadline_at} />
        <span style={{ fontWeight: 700, fontSize: '15px', color: '#D4A017', marginLeft: '4px' }}>
          {fmtMoney(order.total)}
        </span>
      </div>

      {/* Row 2: customer + address */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginBottom: '8px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#CBD5E1', marginBottom: '2px' }}>
            {order.customer}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '4px',
              fontSize: '12px',
              color: '#475569',
            }}
          >
            <MapPin size={11} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '340px',
              }}
            >
              {order.address}
            </span>
          </div>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {/* Row 3: zones + item count + picker */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {zones.map((z) => (
            <ZoneBadge key={z} zone={z} small />
          ))}
        </div>
        <span style={{ fontSize: '11px', color: '#64748B' }}>{order.items.length} поз.</span>
        <span style={{ flex: 1 }} />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '12px',
            color: picker ? '#94A3B8' : '#475569',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <User size={11} />
          {picker ? picker.name : <span style={{ fontStyle: 'italic', color: '#334155' }}>Не назначен</span>}
        </div>
      </div>

      {/* Row 4: action button */}
      {!isDispatched && nextStatus && actionLabel && (
        <div style={{ marginTop: '12px' }}>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onStatusAdvance(order.id)
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 16px',
              borderRadius: '9px',
              fontSize: '12px',
              fontWeight: 600,
              background: `linear-gradient(135deg, ${borderColor}cc, ${borderColor}88)`,
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              boxShadow: `0 2px 10px ${borderColor}44`,
              transition: 'opacity 0.15s, transform 0.1s',
            }}
            onMouseOver={(e) => ((e.currentTarget.style.opacity = '0.85'))}
            onMouseOut={(e) => ((e.currentTarget.style.opacity = '1'))}
          >
            {actionLabel}
          </button>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Order Detail Modal
// ─────────────────────────────────────────────────────────────────────────────

interface DetailModalProps {
  order: StoreOrder
  pickers: Picker[]
  onClose: () => void
  onStatusAdvance: (orderId: string) => void
  onCancel: (orderId: string) => void
  onReassign: (orderId: string, pickerId: string | null) => void
}

function DetailModal({
  order,
  pickers,
  onClose,
  onStatusAdvance,
  onCancel,
  onReassign,
}: DetailModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const borderColor = STATUS_COLOR[order.status]
  const picker = pickers.find((p) => p.id === order.picker_id)
  const nextStatus = STATUS_NEXT[order.status]
  const actionLabel = STATUS_ACTION_LABEL[order.status]
  const isDispatched = order.status === 'dispatched'

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  function handleBackdrop(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose()
  }

  const timeline: { label: string; time: string | null | undefined; done: boolean }[] = [
    { label: 'Создан', time: order.created_at, done: true },
    { label: 'Сборщик назначен', time: order.picker_id ? order.created_at : null, done: !!order.picker_id },
    { label: 'Сборка начата', time: order.picked_at, done: !!order.picked_at },
    { label: 'Готов', time: order.ready_at, done: !!order.ready_at },
    { label: 'Выдан', time: order.dispatched_at, done: !!order.dispatched_at },
  ]

  return (
    <div
      ref={overlayRef}
      onClick={handleBackdrop}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '600px',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: 'rgba(17,24,39,0.97)',
          backdropFilter: 'blur(24px)',
          border: `1px solid ${borderColor}44`,
          borderLeft: `4px solid ${borderColor}`,
          borderRadius: '18px',
          boxShadow: `0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px ${borderColor}22`,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '18px 20px 14px',
            borderBottom: '1px solid #1E2A3A',
            position: 'sticky',
            top: 0,
            background: 'rgba(17,24,39,0.99)',
            zIndex: 10,
            borderRadius: '18px 18px 0 0',
          }}
        >
          <span style={{ fontWeight: 800, fontSize: '16px', color: '#F1F5F9' }}>{order.number}</span>
          <StatusBadge status={order.status} />
          <ChannelBadge channel={order.channel} />
          {order.priority === 'urgent' && <AlertTriangle size={14} color="#EF4444" />}
          {order.priority === 'high' && <Star size={13} color="#D4A017" fill="#D4A017" />}
          <span style={{ flex: 1 }} />
          <CountdownTimer deadlineIso={order.deadline_at} />
          <button
            onClick={onClose}
            aria-label="Закрыть"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid #1E2A3A',
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748B',
              flexShrink: 0,
            }}
          >
            <X size={15} />
          </button>
        </div>

        <div style={{ padding: '20px' }}>
          {/* Customer info */}
          <section style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#E2E8F0', marginBottom: '6px' }}>
              {order.customer}
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '5px', fontSize: '13px', color: '#64748B' }}>
              <MapPin size={13} style={{ flexShrink: 0, marginTop: '2px' }} />
              {order.address}
            </div>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '12px',
                marginTop: '10px',
                fontSize: '12px',
                color: '#475569',
              }}
            >
              <span>Создан: <strong style={{ color: '#94A3B8' }}>{fmtTime(order.created_at)}</strong></span>
              <span>Дедлайн: <strong style={{ color: STATUS_COLOR.check }}>{fmtTime(order.deadline_at)}</strong></span>
              <span>Итого: <strong style={{ color: '#D4A017' }}>{fmtMoney(order.total)}</strong></span>
            </div>
          </section>

          {/* Items table */}
          <section style={{ marginBottom: '20px' }}>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                color: '#334155',
                textTransform: 'uppercase',
                marginBottom: '8px',
              }}
            >
              Позиции заказа
            </div>
            <div
              style={{
                border: '1px solid #1E2A3A',
                borderRadius: '10px',
                overflow: 'hidden',
              }}
            >
              {order.items.map((item, idx) => (
                <div
                  key={item.sku}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '9px 12px',
                    borderTop: idx === 0 ? 'none' : '1px solid #1E2A3A',
                    background: item.picked ? 'rgba(16,185,129,0.04)' : 'transparent',
                  }}
                >
                  <ZoneBadge zone={item.zone} small />
                  <span
                    style={{
                      fontSize: '10px',
                      color: '#475569',
                      fontFamily: 'monospace',
                      minWidth: '42px',
                    }}
                  >
                    {item.cell}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      fontSize: '13px',
                      color: item.picked ? '#64748B' : '#CBD5E1',
                      textDecoration: item.picked ? 'line-through' : 'none',
                    }}
                  >
                    {item.name}
                  </span>
                  <span style={{ fontSize: '12px', color: '#64748B', minWidth: '30px', textAlign: 'right' }}>
                    ×{item.qty}
                  </span>
                  <span style={{ fontSize: '12px', color: '#94A3B8', minWidth: '60px', textAlign: 'right' }}>
                    {fmtMoney(item.price * item.qty)}
                  </span>
                  {item.picked ? (
                    <CheckSquare size={14} color="#10B981" style={{ flexShrink: 0 }} />
                  ) : (
                    <Square size={14} color="#334155" style={{ flexShrink: 0 }} />
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Picker assignment */}
          <section style={{ marginBottom: '20px' }}>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                color: '#334155',
                textTransform: 'uppercase',
                marginBottom: '8px',
              }}
            >
              Сборщик
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {picker ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'rgba(139,92,246,0.1)',
                    border: '1px solid rgba(139,92,246,0.2)',
                  }}
                >
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: '#8B5CF6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      fontWeight: 700,
                      color: '#fff',
                      flexShrink: 0,
                    }}
                  >
                    {picker.avatar}
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#C4B5FD' }}>{picker.name}</div>
                    <div style={{ fontSize: '11px', color: '#6B7280' }}>
                      {picker.completed_today} выдано · {picker.avg_time_min} мин/заказ
                    </div>
                  </div>
                </div>
              ) : (
                <span style={{ fontSize: '13px', color: '#334155', fontStyle: 'italic' }}>Не назначен</span>
              )}
              <div style={{ position: 'relative' }}>
                <select
                  value={order.picker_id ?? ''}
                  onChange={(e) => onReassign(order.id, e.target.value || null)}
                  style={{
                    appearance: 'none',
                    background: 'rgba(17,24,39,0.9)',
                    border: '1px solid #1E2A3A',
                    borderRadius: '8px',
                    color: '#94A3B8',
                    fontSize: '12px',
                    padding: '6px 28px 6px 10px',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  <option value="">— Переназначить —</option>
                  {pickers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.status === 'free' ? 'свободен' : p.status === 'busy' ? 'занят' : 'перерыв'})
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={12}
                  style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#475569' }}
                />
              </div>
            </div>
          </section>

          {/* Notes */}
          {order.notes && (
            <section style={{ marginBottom: '20px' }}>
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: 'rgba(249,115,22,0.08)',
                  border: '1px solid rgba(249,115,22,0.2)',
                  fontSize: '13px',
                  color: '#F97316',
                }}
              >
                {order.notes}
              </div>
            </section>
          )}

          {/* Timeline */}
          <section style={{ marginBottom: '24px' }}>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                color: '#334155',
                textTransform: 'uppercase',
                marginBottom: '12px',
              }}
            >
              История
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {timeline.map((step, idx) => (
                <div key={step.label} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                    <div
                      style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: step.done ? '#10B981' : '#1E2A3A',
                        border: step.done ? '2px solid #10B981' : '2px solid #334155',
                        marginTop: '3px',
                        transition: 'background 0.2s',
                      }}
                    />
                    {idx < timeline.length - 1 && (
                      <div
                        style={{
                          width: '1px',
                          flex: 1,
                          background: step.done ? 'rgba(16,185,129,0.3)' : '#1E2A3A',
                          minHeight: '20px',
                        }}
                      />
                    )}
                  </div>
                  <div style={{ paddingBottom: '14px', flex: 1 }}>
                    <span style={{ fontSize: '13px', color: step.done ? '#94A3B8' : '#334155', fontWeight: step.done ? 500 : 400 }}>
                      {step.label}
                    </span>
                    {step.done && step.time && (
                      <span style={{ fontSize: '11px', color: '#475569', marginLeft: '8px' }}>
                        {fmtTime(step.time)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {!isDispatched && nextStatus && actionLabel && (
              <button
                onClick={() => onStatusAdvance(order.id)}
                style={{
                  flex: 1,
                  minWidth: '160px',
                  padding: '10px 20px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 700,
                  background: `linear-gradient(135deg, ${borderColor}, ${borderColor}bb)`,
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: `0 4px 14px ${borderColor}44`,
                  transition: 'opacity 0.15s',
                }}
                onMouseOver={(e) => (e.currentTarget.style.opacity = '0.85')}
                onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
              >
                {actionLabel}
              </button>
            )}
            {!isDispatched && (
              <button
                onClick={() => onCancel(order.id)}
                style={{
                  padding: '10px 18px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 600,
                  background: 'transparent',
                  color: '#EF4444',
                  border: '1px solid rgba(239,68,68,0.35)',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
                onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                Отменить
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Dropdown helper
// ─────────────────────────────────────────────────────────────────────────────

interface SelectProps {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
}

function Select({ value, onChange, options, placeholder }: SelectProps) {
  return (
    <div style={{ position: 'relative' }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          appearance: 'none',
          background: 'rgba(17,24,39,0.8)',
          border: `1px solid ${value ? '#D4A017' : '#1E2A3A'}`,
          borderRadius: '8px',
          color: value ? '#D4A017' : '#64748B',
          fontSize: '13px',
          fontWeight: value ? 600 : 400,
          padding: '7px 28px 7px 12px',
          cursor: 'pointer',
          outline: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={12}
        style={{
          position: 'absolute',
          right: '8px',
          top: '50%',
          transform: 'translateY(-50%)',
          pointerEvents: 'none',
          color: '#475569',
        }}
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

type StatusFilter = 'all' | KanbanStatus
type PriorityFilter = 'all' | 'urgent' | 'high' | 'normal'

export default function OrdersPage() {
  // Data
  const [orders, setOrders] = useState<StoreOrder[]>(() =>
    [...DEMO_ORDERS].sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
  )
  const pickers: Picker[] = DEMO_PICKERS

  // Filters
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [channelFilter, setChannelFilter] = useState('')
  const [pickerFilter, setPickerFilter] = useState('')
  const [zoneFilter, setZoneFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all')
  const [search, setSearch] = useState('')

  // UI state
  const [selectedOrder, setSelectedOrder] = useState<StoreOrder | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])

  function addToast(msg: string) {
    const id = ++toastSeq
    setToasts((prev) => [...prev, { id, message: msg }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000)
  }

  function handleRefresh() {
    setOrders([...DEMO_ORDERS].sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]))
  }

  const advanceStatus = useCallback((orderId: string) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o
        const next = STATUS_NEXT[o.status]
        if (!next) return o
        const now = new Date().toISOString()
        const update: Partial<StoreOrder> = { status: next }
        if (next === 'picking') update.picked_at = now
        if (next === 'ready') update.ready_at = now
        if (next === 'dispatched') update.dispatched_at = now
        addToast(`Заказ ${o.number} → ${STATUS_LABEL[next]}`)
        return { ...o, ...update }
      })
    )
    setSelectedOrder((prev) => {
      if (!prev || prev.id !== orderId) return prev
      const next = STATUS_NEXT[prev.status]
      if (!next) return prev
      const now = new Date().toISOString()
      const update: Partial<StoreOrder> = { status: next }
      if (next === 'picking') update.picked_at = now
      if (next === 'ready') update.ready_at = now
      if (next === 'dispatched') update.dispatched_at = now
      return { ...prev, ...update }
    })
  }, [])

  const cancelOrder = useCallback((orderId: string) => {
    setOrders((prev) => prev.filter((o) => o.id !== orderId))
    setSelectedOrder(null)
    addToast('Заказ отменён')
  }, [])

  const reassignPicker = useCallback((orderId: string, pickerId: string | null) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, picker_id: pickerId } : o))
    )
    setSelectedOrder((prev) => (prev && prev.id === orderId ? { ...prev, picker_id: pickerId } : prev))
  }, [])

  // ── Filtering ──────────────────────────────────────────────────────────────

  const filtered = orders.filter((o) => {
    if (statusFilter !== 'all' && o.status !== statusFilter) return false
    if (channelFilter && o.channel !== channelFilter) return false
    if (pickerFilter) {
      if (pickerFilter === '__none__') {
        if (o.picker_id !== null) return false
      } else {
        if (o.picker_id !== pickerFilter) return false
      }
    }
    if (zoneFilter && !o.items.some((i) => i.zone === zoneFilter)) return false
    if (priorityFilter !== 'all') {
      if (priorityFilter === 'normal' && !['normal', 'low'].includes(o.priority)) return false
      if (priorityFilter !== 'normal' && o.priority !== priorityFilter) return false
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      if (
        !o.number.toLowerCase().includes(q) &&
        !o.customer.toLowerCase().includes(q)
      )
        return false
    }
    return true
  })

  const filteredRevenue = filtered.reduce((sum, o) => sum + o.total, 0)
  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0)

  const statusTabs: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'Все' },
    { key: 'new', label: 'Новые' },
    { key: 'picking', label: 'Сборка' },
    { key: 'check', label: 'Проверка' },
    { key: 'ready', label: 'Готов' },
    { key: 'dispatched', label: 'Выдан' },
  ]

  const priorityChips: { key: PriorityFilter; label: string }[] = [
    { key: 'all', label: 'Все' },
    { key: 'urgent', label: 'Срочно' },
    { key: 'high', label: 'Высокий' },
    { key: 'normal', label: 'Норм' },
  ]

  return (
    <>
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1E2A3A; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #2D3E52; }
        select option { background: #0A0F1A; color: #E2E8F0; }
      `}</style>

      <div style={{ minHeight: '100vh', padding: '24px 16px 48px' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>

          {/* ── Header ── */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              marginBottom: '28px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <ShoppingCart size={26} color="#D4A017" />
              <div>
                <h1
                  style={{
                    margin: 0,
                    fontSize: '24px',
                    fontWeight: 800,
                    color: '#F1F5F9',
                    letterSpacing: '-0.02em',
                    lineHeight: 1.1,
                  }}
                >
                  Все заказы
                </h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '4px' }}>
                  <span style={{ fontSize: '13px', color: '#64748B' }}>
                    {orders.length} заказов
                  </span>
                  <span style={{ fontSize: '13px', color: '#D4A017', fontWeight: 600 }}>
                    {fmtMoney(totalRevenue)}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleRefresh}
              title="Обновить"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '10px',
                background: 'rgba(17,24,39,0.8)',
                border: '1px solid #1E2A3A',
                color: '#64748B',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'border-color 0.15s, color 0.15s',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = '#D4A017'
                e.currentTarget.style.color = '#D4A017'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = '#1E2A3A'
                e.currentTarget.style.color = '#64748B'
              }}
            >
              <RefreshCw size={13} />
              Обновить
            </button>
          </div>

          {/* ── Filter bar ── */}
          <div
            style={{
              background: 'rgba(17,24,39,0.8)',
              backdropFilter: 'blur(14px)',
              border: '1px solid #1E2A3A',
              borderRadius: '14px',
              padding: '14px 16px',
              marginBottom: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {/* Status tabs */}
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
              {statusTabs.map((tab) => {
                const count = tab.key === 'all' ? orders.length : orders.filter((o) => o.status === tab.key).length
                const isActive = statusFilter === tab.key
                const c = tab.key === 'all' ? '#D4A017' : STATUS_COLOR[tab.key as KanbanStatus] ?? '#6B7280'
                return (
                  <button
                    key={tab.key}
                    onClick={() => setStatusFilter(tab.key)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 14px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                      border: isActive ? `1px solid ${c}66` : '1px solid transparent',
                      background: isActive ? `${c}18` : 'transparent',
                      color: isActive ? c : '#475569',
                      transition: 'all 0.15s',
                    }}
                  >
                    {tab.label}
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '1px 6px',
                        borderRadius: '20px',
                        background: isActive ? `${c}22` : 'rgba(255,255,255,0.06)',
                        color: isActive ? c : '#64748B',
                        fontWeight: 700,
                      }}
                    >
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Second row: dropdowns + priority + search */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
              <Select
                value={channelFilter}
                onChange={setChannelFilter}
                placeholder="Канал: Все"
                options={[
                  { value: 'yandex', label: 'Яндекс' },
                  { value: 'sber', label: 'СберМаркет' },
                  { value: 'samokat', label: 'Самокат' },
                  { value: 'direct', label: 'Прямой' },
                  { value: 'wb', label: 'WB' },
                ]}
              />
              <Select
                value={pickerFilter}
                onChange={setPickerFilter}
                placeholder="Сборщик: Все"
                options={[
                  { value: '__none__', label: 'Не назначен' },
                  ...pickers.map((p) => ({ value: p.id, label: p.name })),
                ]}
              />
              <Select
                value={zoneFilter}
                onChange={setZoneFilter}
                placeholder="Зона: Все"
                options={['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((z) => ({ value: z, label: `Зона ${z}` }))}
              />

              {/* Priority chips */}
              <div style={{ display: 'flex', gap: '4px' }}>
                {priorityChips.map((chip) => {
                  const isActive = priorityFilter === chip.key
                  return (
                    <button
                      key={chip.key}
                      onClick={() => setPriorityFilter(chip.key)}
                      style={{
                        padding: '6px 11px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: isActive ? '1px solid #D4A01766' : '1px solid #1E2A3A',
                        background: isActive ? 'rgba(212,160,23,0.15)' : 'rgba(17,24,39,0.8)',
                        color: isActive ? '#D4A017' : '#475569',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.15s',
                      }}
                    >
                      {chip.label}
                    </button>
                  )
                })}
              </div>

              {/* Search */}
              <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
                <input
                  type="text"
                  placeholder="Поиск по номеру или имени..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(10,15,26,0.6)',
                    border: `1px solid ${search ? '#D4A017' : '#1E2A3A'}`,
                    borderRadius: '8px',
                    color: '#E2E8F0',
                    fontSize: '13px',
                    padding: '7px 32px 7px 12px',
                    outline: 'none',
                    transition: 'border-color 0.15s',
                    boxSizing: 'border-box',
                  }}
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#475569',
                      padding: 0,
                      display: 'flex',
                    }}
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── Summary stats ── */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              flexWrap: 'wrap',
              marginBottom: '16px',
              padding: '10px 16px',
              background: 'rgba(17,24,39,0.6)',
              border: '1px solid #1E2A3A',
              borderRadius: '10px',
              fontSize: '13px',
            }}
          >
            <span style={{ color: '#475569' }}>
              Показано:{' '}
              <strong style={{ color: '#94A3B8' }}>{filtered.length}</strong>
              <span style={{ color: '#334155' }}> / {orders.length}</span>
            </span>
            <span
              style={{
                width: '1px',
                height: '14px',
                background: '#1E2A3A',
              }}
            />
            <span style={{ color: '#475569' }}>
              Выручка:{' '}
              <strong style={{ color: '#D4A017' }}>{fmtMoney(filteredRevenue)}</strong>
              {filtered.length < orders.length && (
                <span style={{ color: '#334155', fontWeight: 400 }}> (из {fmtMoney(totalRevenue)})</span>
              )}
            </span>
            {(statusFilter !== 'all' || channelFilter || pickerFilter || zoneFilter || priorityFilter !== 'all' || search) && (
              <>
                <span style={{ width: '1px', height: '14px', background: '#1E2A3A' }} />
                <button
                  onClick={() => {
                    setStatusFilter('all')
                    setChannelFilter('')
                    setPickerFilter('')
                    setZoneFilter('')
                    setPriorityFilter('all')
                    setSearch('')
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#EF4444',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: 0,
                  }}
                >
                  <X size={11} />
                  Сбросить фильтры
                </button>
              </>
            )}
          </div>

          {/* ── Orders list ── */}
          {filtered.length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
                padding: '60px 0',
                color: '#334155',
              }}
            >
              <ShoppingCart size={44} strokeWidth={1.2} />
              <span style={{ fontSize: '15px' }}>Нет заказов по выбранным фильтрам</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filtered.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  pickers={pickers}
                  onClick={() => setSelectedOrder(order)}
                  onStatusAdvance={advanceStatus}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Detail Modal ── */}
      {selectedOrder && (
        <DetailModal
          order={selectedOrder}
          pickers={pickers}
          onClose={() => setSelectedOrder(null)}
          onStatusAdvance={(id) => {
            advanceStatus(id)
          }}
          onCancel={cancelOrder}
          onReassign={reassignPicker}
        />
      )}

      {/* ── Toasts ── */}
      <ToastContainer toasts={toasts} />
    </>
  )
}
