'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Package, Clock, AlertTriangle, CheckCircle, Truck, LayoutGrid,
  Zap, ChevronRight, X, RotateCcw, MapPin, User, Navigation,
  AlertCircle, ShoppingBag, Layers, TrendingUp, Star,
} from 'lucide-react'
import {
  DEMO_ORDERS, DEMO_PICKERS, DEMO_ZONES,
  type StoreOrder, type KanbanStatus, type Picker,
} from '@/lib/store-demo-data'

// ─── Config ──────────────────────────────────────────────────────────────────

const COLUMNS: { id: KanbanStatus; label: string; color: string; icon: React.ReactNode }[] = [
  { id: 'new',        label: 'Новые',    color: '#6B7280', icon: <Package size={14}/> },
  { id: 'picking',   label: 'Сборка',   color: '#8B5CF6', icon: <ShoppingBag size={14}/> },
  { id: 'check',     label: 'Проверка', color: '#D4A017', icon: <AlertCircle size={14}/> },
  { id: 'ready',     label: 'Готов',    color: '#10B981', icon: <CheckCircle size={14}/> },
  { id: 'dispatched',label: 'Выдан',    color: '#3B82F6', icon: <Truck size={14}/> },
]

const CHANNEL_LABELS: Record<string, { label: string; color: string }> = {
  yandex: { label: 'Яндекс',  color: '#FFCC00' },
  sber:   { label: 'СберМаркет', color: '#21A038' },
  samokat:{ label: 'Самокат', color: '#FF6600' },
  direct: { label: 'Прямой',  color: '#3B82F6' },
  wb:     { label: 'WB',      color: '#CB11AB' },
}

const PRIORITY_COLOR: Record<string, string> = {
  low: '#374151', normal: '#4B5563', high: '#D4A017', urgent: '#EF4444',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })
}

function useCountdown(deadlineIso: string) {
  const [secs, setSecs] = useState(() => Math.floor((new Date(deadlineIso).getTime() - Date.now()) / 1000))
  useEffect(() => {
    const id = setInterval(() => setSecs(s => s - 1), 1000)
    return () => clearInterval(id)
  }, [deadlineIso])
  return secs
}

function CountdownBadge({ deadline, status }: { deadline: string; status: KanbanStatus }) {
  const secs = useCountdown(deadline)
  if (status === 'dispatched') return null
  const abs = Math.abs(secs)
  const late = secs < 0
  const mins = Math.floor(abs / 60)
  const s    = abs % 60
  const color = late ? '#EF4444' : secs < 180 ? '#F97316' : secs < 600 ? '#D4A017' : '#10B981'
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, color,
      background: `${color}18`, borderRadius: 6, padding: '2px 6px',
      fontVariantNumeric: 'tabular-nums', letterSpacing: '0.02em',
    }}>
      {late ? '-' : ''}{String(mins).padStart(2,'0')}:{String(s).padStart(2,'0')}
    </span>
  )
}

// ─── Toast ───────────────────────────────────────────────────────────────────

interface Toast { id: number; msg: string; type: 'success' | 'error' | 'info' }
let _toastId = 0

function Toaster({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: number) => void }) {
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {toasts.map(t => (
        <div key={t.id} onClick={() => onRemove(t.id)} style={{
          padding: '10px 16px', borderRadius: 12, fontSize: 13, fontWeight: 500, cursor: 'pointer',
          background: t.type === 'success' ? 'rgba(16,185,129,.15)' : t.type === 'error' ? 'rgba(239,68,68,.15)' : 'rgba(59,130,246,.15)',
          border: `1px solid ${t.type === 'success' ? 'rgba(16,185,129,.4)' : t.type === 'error' ? 'rgba(239,68,68,.4)' : 'rgba(59,130,246,.4)'}`,
          color: t.type === 'success' ? '#6EE7B7' : t.type === 'error' ? '#FCA5A5' : '#93C5FD',
          backdropFilter: 'blur(12px)',
          animation: 'fadeUp .3s ease-out both',
          maxWidth: 320,
        }}>
          {t.msg}
        </div>
      ))}
    </div>
  )
}

// ─── AI Route Modal ───────────────────────────────────────────────────────────

function AIRouteModal({ order, onClose }: { order: StoreOrder; onClose: () => void }) {
  const zones = [...new Set(order.items.map(i => i.zone))].sort()

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const routeColors: Record<string, string> = {
    A: '#3B82F6', B: '#EF4444', C: '#D4A017', D: '#8B5CF6',
    E: '#10B981', F: '#F97316', G: '#EC4899',
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,.75)', backdropFilter: 'blur(8px)',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '92%', maxWidth: 540, borderRadius: 20, overflow: 'hidden',
        background: '#0D1424', border: '1px solid rgba(212,160,23,.2)',
        boxShadow: '0 32px 80px rgba(0,0,0,.8)',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid #1E2A3A',
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'rgba(212,160,23,.06)',
        }}>
          <Zap size={16} style={{ color: '#D4A017' }} />
          <span style={{ fontWeight: 700, color: '#D4A017', fontSize: 14 }}>AI Маршрут сборки</span>
          <span style={{ fontSize: 12, color: '#475569', marginLeft: 4 }}>— {order.number}</span>
          <button onClick={onClose} style={{ marginLeft: 'auto', color: '#475569', background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={16}/>
          </button>
        </div>

        {/* Warehouse SVG */}
        <div style={{ padding: '20px', borderBottom: '1px solid #1E2A3A' }}>
          <svg viewBox="0 0 480 240" style={{ width: '100%', height: 'auto' }}>
            {/* Floor grid */}
            {Array.from({ length: 8 }).map((_, i) => (
              <line key={`v${i}`} x1={60 * i + 20} y1="10" x2={60 * i + 20} y2="230" stroke="rgba(212,160,23,.05)" strokeWidth="1"/>
            ))}
            {Array.from({ length: 5 }).map((_, i) => (
              <line key={`h${i}`} x1="20" y1={50 * i + 10} x2="460" y2={50 * i + 10} stroke="rgba(212,160,23,.05)" strokeWidth="1"/>
            ))}
            {/* Zone boxes */}
            {[
              { id: 'A', x: 20,  y: 20,  w: 80, h: 90,  label: 'Зона A\nМолочка' },
              { id: 'B', x: 110, y: 20,  w: 70, h: 90,  label: 'Зона B\nМясо/Рыба' },
              { id: 'C', x: 190, y: 20,  w: 100,h: 90,  label: 'Зона C\nБакалея' },
              { id: 'D', x: 300, y: 20,  w: 60, h: 90,  label: 'Зона D\nЗаморозка' },
              { id: 'E', x: 370, y: 20,  w: 90, h: 90,  label: 'Зона E\nФрукты/Овощи' },
              { id: 'F', x: 20,  y: 130, w: 80, h: 60,  label: 'Зона F\nАлкоголь' },
              { id: 'G', x: 110, y: 130, w: 80, h: 60,  label: 'Зона G\nГотовая еда' },
            ].map(z => {
              const active = zones.includes(z.id)
              const c = routeColors[z.id] ?? '#374151'
              return (
                <g key={z.id}>
                  <rect x={z.x} y={z.y} width={z.w} height={z.h} rx="6"
                    fill={active ? `${c}22` : 'rgba(17,24,39,.6)'}
                    stroke={active ? c : '#1E2A3A'} strokeWidth={active ? 2 : 1}/>
                  {z.label.split('\n').map((line, li) => (
                    <text key={li} x={z.x + z.w/2} y={z.y + 20 + li * 14} textAnchor="middle"
                      fill={active ? c : '#374151'} fontSize="9" fontWeight={active ? '700' : '400'}>
                      {line}
                    </text>
                  ))}
                  {active && (
                    <circle cx={z.x + z.w - 8} cy={z.y + 8} r="5" fill={c}/>
                  )}
                </g>
              )
            })}
            {/* Entry point */}
            <rect x="200" y="185" width="60" height="30" rx="6" fill="rgba(212,160,23,.15)" stroke="rgba(212,160,23,.5)" strokeWidth="1.5"/>
            <text x="230" y="204" textAnchor="middle" fill="#D4A017" fontSize="9" fontWeight="700">ВХОД</text>
            {/* Route arrows between active zones */}
            {zones.length > 1 && zones.slice(0, -1).map((_, i) => {
              const from = zones[i], to = zones[i + 1]
              const coords: Record<string, [number, number]> = {
                A: [60, 65], B: [145, 65], C: [240, 65], D: [330, 65], E: [415, 65], F: [60, 160], G: [150, 160],
              }
              const [x1, y1] = coords[from] ?? [0,0]
              const [x2, y2] = coords[to] ?? [0,0]
              return (
                <g key={`r${i}`}>
                  <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(212,160,23,.6)" strokeWidth="2" strokeDasharray="6 3" markerEnd="url(#arrow)"/>
                </g>
              )
            })}
            <defs>
              <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                <path d="M 0 0 L 6 3 L 0 6 z" fill="rgba(212,160,23,.7)"/>
              </marker>
            </defs>
          </svg>
        </div>

        {/* Route steps */}
        <div style={{ padding: '16px 20px' }}>
          <p style={{ fontSize: 11, color: '#475569', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12 }}>
            Оптимальный маршрут ({order.items.length} позиций)
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {order.items.map((item, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px', borderRadius: 10,
                background: 'rgba(17,24,39,.6)', border: '1px solid #1E2A3A',
              }}>
                <span style={{
                  width: 22, height: 22, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: `${routeColors[item.zone] ?? '#374151'}22`,
                  color: routeColors[item.zone] ?? '#475569', fontSize: 11, fontWeight: 700, flexShrink: 0,
                }}>
                  {i + 1}
                </span>
                <span style={{ flex: 1, fontSize: 12, color: '#CBD5E1' }}>{item.name}</span>
                <span style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                  background: `${routeColors[item.zone] ?? '#374151'}22`,
                  color: routeColors[item.zone] ?? '#475569',
                  padding: '2px 8px', borderRadius: 6,
                }}>
                  {item.zone}-{item.cell.split('-')[1]}
                </span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
            <div style={{
              flex: 1, padding: '10px 14px', borderRadius: 10,
              background: 'rgba(16,185,129,.08)', border: '1px solid rgba(16,185,129,.2)',
            }}>
              <div style={{ fontSize: 10, color: '#6EE7B7', letterSpacing: '0.1em' }}>ОЖ. ВРЕМЯ</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#10B981', marginTop: 2 }}>
                ~{Math.ceil(order.items.length * 0.8 + zones.length * 0.6)} мин
              </div>
            </div>
            <div style={{
              flex: 1, padding: '10px 14px', borderRadius: 10,
              background: 'rgba(212,160,23,.08)', border: '1px solid rgba(212,160,23,.2)',
            }}>
              <div style={{ fontSize: 10, color: '#FCD34D', letterSpacing: '0.1em' }}>ЗОНЫ</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#D4A017', marginTop: 2 }}>
                {zones.join(' → ')}
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: '0 20px 16px', fontSize: 10, color: '#1E2A3A', textAlign: 'center' }}>
          Нажмите Esc или кликните за пределами для закрытия
        </div>
      </div>
    </div>
  )
}

// ─── Order Card ───────────────────────────────────────────────────────────────

function OrderCard({
  order, pickers, onMove, onAssign, onRoute, isDragging, dragOver,
}: {
  order: StoreOrder
  pickers: Picker[]
  onMove: (id: string, to: KanbanStatus) => void
  onAssign: (orderId: string, pickerId: string) => void
  onRoute: (order: StoreOrder) => void
  isDragging: boolean
  dragOver: boolean
}) {
  const ch = CHANNEL_LABELS[order.channel] ?? { label: order.channel, color: '#6B7280' }
  const col = COLUMNS.find(c => c.id === order.status)!
  const pickedCount = order.items.filter(i => i.picked).length
  const progress = order.items.length > 0 ? pickedCount / order.items.length : 0

  const nextStatus: Partial<Record<KanbanStatus, KanbanStatus>> = {
    new: 'picking', picking: 'check', check: 'ready', ready: 'dispatched',
  }
  const actionLabel: Partial<Record<KanbanStatus, string>> = {
    new: 'Начать сборку', picking: 'Проверить', check: 'Готов', ready: 'Выдать',
  }

  return (
    <div style={{
      borderRadius: 14, overflow: 'hidden',
      background: isDragging ? 'rgba(17,24,39,.95)' : dragOver ? 'rgba(212,160,23,.04)' : 'rgba(17,24,39,.8)',
      border: `1px solid ${isDragging ? col.color : dragOver ? 'rgba(212,160,23,.3)' : '#1E2A3A'}`,
      boxShadow: isDragging ? `0 12px 40px rgba(0,0,0,.6), 0 0 0 2px ${col.color}` : '0 4px 16px rgba(0,0,0,.4)',
      backdropFilter: 'blur(8px)',
      borderLeft: `3px solid ${col.color}`,
      transition: 'all .2s ease',
      cursor: 'grab',
    }}>
      {/* Header */}
      <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,.04)', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#E2E8F0', flex: 1 }}>{order.number}</span>
        {/* Channel */}
        <span style={{
          fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', padding: '2px 6px', borderRadius: 5,
          background: `${ch.color}22`, color: ch.color, border: `1px solid ${ch.color}44`,
        }}>
          {ch.label}
        </span>
        {/* Priority */}
        {order.priority === 'urgent' && (
          <AlertTriangle size={12} style={{ color: '#EF4444', flexShrink: 0 }} />
        )}
        {order.priority === 'high' && (
          <Star size={12} style={{ color: '#D4A017', flexShrink: 0 }} />
        )}
        {/* Timer */}
        <CountdownBadge deadline={order.deadline_at} status={order.status} />
      </div>

      {/* Body */}
      <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Customer */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <User size={11} style={{ color: '#4B5563', flexShrink: 0 }}/>
          <span style={{ fontSize: 12, color: '#94A3B8' }}>{order.customer}</span>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <MapPin size={11} style={{ color: '#4B5563', flexShrink: 0 }}/>
          <span style={{ fontSize: 11, color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {order.address}
          </span>
        </div>

        {/* Items summary */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {[...new Set(order.items.map(i => i.zone))].map(z => {
            const zc = { A:'#3B82F6',B:'#EF4444',C:'#D4A017',D:'#8B5CF6',E:'#10B981',F:'#F97316',G:'#EC4899' }[z] ?? '#6B7280'
            return (
              <span key={z} style={{
                fontSize: 9, padding: '1px 6px', borderRadius: 4, fontWeight: 700,
                background: `${zc}18`, color: zc, border: `1px solid ${zc}33`,
              }}>Зона {z}</span>
            )
          })}
          <span style={{ fontSize: 9, color: '#475569', marginLeft: 'auto' }}>
            {order.items.length} поз. · {order.total.toLocaleString('ru')} ₽
          </span>
        </div>

        {/* Progress (for picking) */}
        {order.status === 'picking' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontSize: 10, color: '#475569' }}>Собрано</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#8B5CF6' }}>{pickedCount}/{order.items.length}</span>
            </div>
            <div style={{ height: 4, borderRadius: 2, background: '#1E2A3A', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 2, transition: 'width .4s',
                width: `${progress * 100}%`,
                background: progress === 1 ? '#10B981' : 'linear-gradient(90deg,#8B5CF6,#A78BFA)',
              }}/>
            </div>
          </div>
        )}

        {/* Picker assignment */}
        {order.status !== 'dispatched' && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <User size={11} style={{ color: '#374151', flexShrink: 0 }}/>
            <select
              value={order.picker_id ?? ''}
              onChange={e => onAssign(order.id, e.target.value)}
              onClick={e => e.stopPropagation()}
              style={{
                flex: 1, fontSize: 11, padding: '4px 6px', borderRadius: 7,
                background: '#0A0F1A', border: '1px solid #1E2A3A',
                color: order.picker_id ? '#CBD5E1' : '#4B5563',
                outline: 'none', cursor: 'pointer',
              }}
            >
              <option value="">Назначить сборщика</option>
              {pickers.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.status === 'free' ? '✓' : p.status === 'break' ? '☕' : '●'}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
          {nextStatus[order.status] && (
            <button
              onClick={e => { e.stopPropagation(); onMove(order.id, nextStatus[order.status]!) }}
              style={{
                flex: 1, padding: '7px 10px', borderRadius: 9, fontSize: 11, fontWeight: 600,
                background: `linear-gradient(135deg, ${col.color}cc, ${col.color})`,
                color: '#fff', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              }}
            >
              {actionLabel[order.status]}
              <ChevronRight size={12}/>
            </button>
          )}
          {order.status !== 'dispatched' && (
            <button
              onClick={e => { e.stopPropagation(); onRoute(order) }}
              title="AI маршрут (Ctrl+M)"
              style={{
                padding: '7px 10px', borderRadius: 9, fontSize: 11,
                background: 'rgba(212,160,23,.1)', border: '1px solid rgba(212,160,23,.2)',
                color: '#D4A017', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              <Zap size={12}/>
            </button>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: '6px 12px', borderTop: '1px solid rgba(255,255,255,.04)',
        display: 'flex', gap: 8, alignItems: 'center',
        background: 'rgba(0,0,0,.2)',
      }}>
        <Clock size={10} style={{ color: '#374151' }}/>
        <span style={{ fontSize: 10, color: '#374151' }}>{formatTime(order.created_at)}</span>
        {order.notes && (
          <span style={{ fontSize: 10, color: '#475569', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            · {order.notes}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Kanban Column ────────────────────────────────────────────────────────────

function KanbanColumn({
  col, orders, pickers, onMove, onAssign, onRoute,
  dragOverCol, onDragEnter, onDragLeave, onDrop,
}: {
  col: typeof COLUMNS[0]
  orders: StoreOrder[]
  pickers: Picker[]
  onMove: (id: string, to: KanbanStatus) => void
  onAssign: (orderId: string, pickerId: string) => void
  onRoute: (order: StoreOrder) => void
  dragOverCol: string | null
  onDragEnter: (colId: string) => void
  onDragLeave: () => void
  onDrop: (colId: string, e: React.DragEvent) => void
}) {
  const isOver = dragOverCol === col.id

  return (
    <div style={{
      minWidth: 240, maxWidth: 280, flex: '0 0 260px',
      display: 'flex', flexDirection: 'column', gap: 0,
    }}>
      {/* Column header */}
      <div style={{
        padding: '10px 12px', borderRadius: '12px 12px 0 0', marginBottom: 0,
        background: `${col.color}14`, border: `1px solid ${col.color}33`,
        borderBottom: 'none', display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ color: col.color }}>{col.icon}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: col.color, letterSpacing: '0.04em' }}>
          {col.label}
        </span>
        <span style={{
          marginLeft: 'auto', fontSize: 11, fontWeight: 800,
          background: `${col.color}22`, color: col.color,
          width: 22, height: 22, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {orders.length}
        </span>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); onDragEnter(col.id) }}
        onDragLeave={onDragLeave}
        onDrop={e => { e.preventDefault(); onDrop(col.id, e) }}
        style={{
          flex: 1, minHeight: 120, borderRadius: '0 0 12px 12px',
          border: `1px solid ${isOver ? col.color : '#1E2A3A'}`,
          borderTop: 'none',
          background: isOver ? `${col.color}08` : 'rgba(10,15,26,.5)',
          padding: 8, display: 'flex', flexDirection: 'column', gap: 8,
          transition: 'all .15s ease',
        }}
      >
        {orders.length === 0 && (
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, color: '#1E2A3A', letterSpacing: '0.06em',
          }}>
            {isOver ? '↓ Переместить сюда' : 'Нет заказов'}
          </div>
        )}
        {orders.map(order => (
          <div
            key={order.id}
            draggable
            onDragStart={e => { e.dataTransfer.setData('orderId', order.id) }}
          >
            <OrderCard
              order={order}
              pickers={pickers}
              onMove={onMove}
              onAssign={onAssign}
              onRoute={onRoute}
              isDragging={false}
              dragOver={false}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function StoreSidebar({
  pickers, orders, onAIRoute,
}: {
  pickers: Picker[]
  orders: StoreOrder[]
  onAIRoute: () => void
}) {
  const metrics = {
    new:        orders.filter(o => o.status === 'new').length,
    picking:    orders.filter(o => o.status === 'picking').length,
    ready:      orders.filter(o => o.status === 'ready').length,
    dispatched: orders.filter(o => o.status === 'dispatched').length,
  }
  return (
    <aside style={{
      width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16,
      paddingRight: 8,
    }}>
      {/* Quick metrics */}
      <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid #1E2A3A' }}>
        <div style={{ padding: '10px 12px', background: 'rgba(212,160,23,.06)', borderBottom: '1px solid #1E2A3A' }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', color: '#475569' }}>СВОДКА</span>
        </div>
        {[
          { label: 'Новые', value: metrics.new, color: '#6B7280' },
          { label: 'Сборка', value: metrics.picking, color: '#8B5CF6' },
          { label: 'Готовы', value: metrics.ready, color: '#10B981' },
          { label: 'Выдано', value: metrics.dispatched, color: '#3B82F6' },
        ].map(m => (
          <div key={m.label} style={{
            padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8,
            borderBottom: '1px solid rgba(255,255,255,.03)',
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: m.color, flexShrink: 0 }}/>
            <span style={{ flex: 1, fontSize: 12, color: '#64748B' }}>{m.label}</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: m.color }}>{m.value}</span>
          </div>
        ))}
      </div>

      {/* Pickers */}
      <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid #1E2A3A' }}>
        <div style={{ padding: '10px 12px', background: 'rgba(139,92,246,.06)', borderBottom: '1px solid #1E2A3A' }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', color: '#475569' }}>СБОРЩИКИ</span>
        </div>
        {pickers.map(p => {
          const sc = p.status === 'free' ? '#10B981' : p.status === 'break' ? '#D4A017' : '#8B5CF6'
          return (
            <div key={p.id} style={{
              padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8,
              borderBottom: '1px solid rgba(255,255,255,.03)',
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, fontWeight: 700, background: `${sc}18`, color: sc, border: `1px solid ${sc}33`,
              }}>
                {p.avatar}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: '#CBD5E1', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.name}
                </div>
                <div style={{ fontSize: 10, color: sc }}>
                  {p.status === 'free' ? 'Свободен' : p.status === 'break' ? 'Перерыв' : p.active_order ?? 'Работает'}
                </div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>{p.completed_today}</span>
            </div>
          )
        })}
      </div>

      {/* AI Button */}
      <button onClick={onAIRoute} style={{
        padding: '12px', borderRadius: 12, fontSize: 12, fontWeight: 700,
        background: 'linear-gradient(135deg, rgba(212,160,23,.15), rgba(212,160,23,.05))',
        border: '1px solid rgba(212,160,23,.3)', color: '#D4A017',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        transition: 'all .2s',
      }}>
        <Zap size={14}/>
        AI Маршрут (Ctrl+M)
      </button>

      {/* Zones */}
      <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid #1E2A3A' }}>
        <div style={{ padding: '10px 12px', background: 'rgba(16,185,129,.06)', borderBottom: '1px solid #1E2A3A' }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', color: '#475569' }}>ЗОНЫ</span>
        </div>
        {DEMO_ZONES.map(z => {
          const pct = z.cells > 0 ? z.occupied / z.cells : 0
          return (
            <div key={z.id} style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: z.color, minWidth: 16 }}>{z.id}</span>
                <span style={{ fontSize: 10, color: '#64748B', flex: 1 }}>{z.temp}</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: pct > 0.85 ? '#EF4444' : '#4B5563' }}>
                  {Math.round(pct * 100)}%
                </span>
              </div>
              <div style={{ height: 3, borderRadius: 2, background: '#1E2A3A' }}>
                <div style={{ height: '100%', borderRadius: 2, width: `${pct * 100}%`, background: pct > 0.85 ? '#EF4444' : z.color }}/>
              </div>
            </div>
          )
        })}
      </div>
    </aside>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StorePage() {
  const [orders, setOrders] = useState<StoreOrder[]>(DEMO_ORDERS)
  const [pickers] = useState(DEMO_PICKERS)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [routeOrder, setRouteOrder] = useState<StoreOrder | null>(null)
  const [dragOverCol, setDragOverCol] = useState<string | null>(null)
  const draggingId = useRef<string | null>(null)

  function toast(msg: string, type: Toast['type'] = 'info') {
    const id = ++_toastId
    setToasts(t => [...t, { id, msg, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500)
  }

  function removeToast(id: number) { setToasts(t => t.filter(x => x.id !== id)) }

  const moveOrder = useCallback((orderId: string, to: KanbanStatus) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: to } : o))
    const label = COLUMNS.find(c => c.id === to)?.label ?? to
    toast(`Заказ перемещён → ${label}`, 'success')
  }, [])

  const assignPicker = useCallback((orderId: string, pickerId: string) => {
    if (!pickerId) return
    const p = pickers.find(x => x.id === pickerId)
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, picker_id: pickerId } : o))
    toast(`Назначен: ${p?.name ?? pickerId}`, 'info')
  }, [pickers])

  function onDrop(colId: string, e?: React.DragEvent) {
    const orderId = e?.dataTransfer.getData('orderId') ?? draggingId.current
    if (!orderId) return
    draggingId.current = null
    setDragOverCol(null)
    moveOrder(orderId, colId as KanbanStatus)
  }

  // Ctrl+M hotkey — open AI route for first picking order
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey && e.key === 'm') {
        e.preventDefault()
        const first = orders.find(o => o.status === 'picking') ?? orders[0]
        if (first) setRouteOrder(first)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [orders])

  const totalRevenue = orders.filter(o => o.status === 'dispatched').reduce((a, o) => a + o.total, 0)

  return (
    <>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        select option { background: #0D1424; color: #CBD5E1; }
      `}</style>

      {/* Page uses fixed overlay to escape layout padding */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 10,
        background: '#060A12', display: 'flex', flexDirection: 'column',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        {/* Header */}
        <div style={{
          height: 52, flexShrink: 0, display: 'flex', alignItems: 'center',
          padding: '0 20px', gap: 12,
          background: 'rgba(6,10,18,.9)', borderBottom: '1px solid #1E2A3A',
          backdropFilter: 'blur(12px)', zIndex: 20,
        }}>
          <Layers size={16} style={{ color: '#D4A017' }}/>
          <span style={{ fontWeight: 800, fontSize: 15, color: '#E2E8F0', letterSpacing: '-0.02em' }}>
            Управление складом
          </span>
          <span style={{ fontSize: 11, color: '#374155', marginLeft: 2 }}>
            · {orders.length} заказов
          </span>

          {/* Live metrics strip */}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
            {[
              { label: 'Новые',   val: orders.filter(o=>o.status==='new').length,       color: '#6B7280' },
              { label: 'Сборка',  val: orders.filter(o=>o.status==='picking').length,    color: '#8B5CF6' },
              { label: 'Готовы',  val: orders.filter(o=>o.status==='ready').length,      color: '#10B981' },
              { label: 'Выручка', val: `${(totalRevenue/1000).toFixed(1)}к`,             color: '#D4A017' },
            ].map(m => (
              <div key={m.label} style={{
                padding: '4px 10px', borderRadius: 8,
                background: `${m.color}12`, border: `1px solid ${m.color}22`,
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <span style={{ fontSize: 10, color: '#374155' }}>{m.label}</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: m.color }}>{m.val}</span>
              </div>
            ))}

            <button
              onClick={() => setOrders(DEMO_ORDERS)}
              style={{
                padding: '5px 10px', borderRadius: 8, fontSize: 11,
                background: 'rgba(59,130,246,.1)', border: '1px solid rgba(59,130,246,.2)',
                color: '#93C5FD', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
              }}
            >
              <RotateCcw size={11}/>
              Сброс
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', padding: '12px 16px', gap: 12 }}>
          {/* Sidebar */}
          <div style={{ overflowY: 'auto', flexShrink: 0 }}>
            <StoreSidebar
              pickers={pickers}
              orders={orders}
              onAIRoute={() => {
                const first = orders.find(o => o.status === 'picking') ?? orders[0]
                if (first) setRouteOrder(first)
              }}
            />
          </div>

          {/* Kanban board */}
          <div style={{
            flex: 1, display: 'flex', gap: 10, overflowX: 'auto', overflowY: 'hidden',
            paddingBottom: 4,
          }}>
            {COLUMNS.map(col => {
              const colOrders = orders.filter(o => o.status === col.id)
              return (
                <div key={col.id} style={{ display: 'flex', flexDirection: 'column', flex: '0 0 260px', minWidth: 240, overflowY: 'auto' }}>
                  <KanbanColumn
                    col={col}
                    orders={colOrders}
                    pickers={pickers}
                    onMove={moveOrder}
                    onAssign={assignPicker}
                    onRoute={setRouteOrder}
                    dragOverCol={dragOverCol}
                    onDragEnter={id => { setDragOverCol(id) }}
                    onDragLeave={() => setDragOverCol(null)}
                    onDrop={onDrop}
                  />
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* AI Route Modal */}
      {routeOrder && (
        <AIRouteModal order={routeOrder} onClose={() => setRouteOrder(null)} />
      )}

      {/* Toast */}
      <Toaster toasts={toasts} onRemove={removeToast} />
    </>
  )
}
