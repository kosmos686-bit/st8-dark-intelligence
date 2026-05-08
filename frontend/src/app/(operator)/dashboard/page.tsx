'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Package,
  ShoppingBag,
  CheckCircle,
  Truck,
  Clock,
  Zap,
  RotateCcw,
  ArrowUpRight,
} from 'lucide-react'
import { DEMO_ORDERS, DEMO_PICKERS } from '@/lib/store-demo-data'
import type { StoreOrder, Picker } from '@/lib/store-demo-data'

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })
}

function fmtAmount(n: number) {
  return n.toLocaleString('ru-RU') + ' ₽'
}

// ── Channel badge config ───────────────────────────────────────────────────────

const CHANNEL_CFG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  yandex:  { label: 'Яндекс',  color: '#FBBF24', bg: 'rgba(251,191,36,.12)',  border: 'rgba(251,191,36,.3)'  },
  sber:    { label: 'Сбер',    color: '#10B981', bg: 'rgba(16,185,129,.12)',  border: 'rgba(16,185,129,.3)'  },
  samokat: { label: 'Самокат', color: '#8B5CF6', bg: 'rgba(139,92,246,.12)',  border: 'rgba(139,92,246,.3)'  },
  direct:  { label: 'Прямой', color: '#3B82F6', bg: 'rgba(59,130,246,.12)',  border: 'rgba(59,130,246,.3)'  },
  wb:      { label: 'WB',      color: '#EF4444', bg: 'rgba(239,68,68,.12)',   border: 'rgba(239,68,68,.3)'   },
}

// ── Kanban status badge config ─────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  new:        { label: 'Новый',    color: '#6B7280', bg: 'rgba(107,114,128,.12)', border: 'rgba(107,114,128,.3)' },
  picking:    { label: 'Сборка',   color: '#8B5CF6', bg: 'rgba(139,92,246,.12)',  border: 'rgba(139,92,246,.3)'  },
  check:      { label: 'Проверка', color: '#F97316', bg: 'rgba(249,115,22,.12)',  border: 'rgba(249,115,22,.3)'  },
  ready:      { label: 'Готов',    color: '#10B981', bg: 'rgba(16,185,129,.12)',  border: 'rgba(16,185,129,.3)'  },
  dispatched: { label: 'Выдан',    color: '#3B82F6', bg: 'rgba(59,130,246,.12)',  border: 'rgba(59,130,246,.3)'  },
}

// ── Picker status labels ───────────────────────────────────────────────────────

const PICKER_STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  free:  { label: 'Свободен', color: '#10B981', bg: 'rgba(16,185,129,.12)',  border: 'rgba(16,185,129,.3)'  },
  busy:  { label: 'Работает', color: '#8B5CF6', bg: 'rgba(139,92,246,.12)',  border: 'rgba(139,92,246,.3)'  },
  break: { label: 'Перерыв',  color: '#F97316', bg: 'rgba(249,115,22,.12)',  border: 'rgba(249,115,22,.3)'  },
}

// ── AI recommendations (static) ────────────────────────────────────────────────

const AI_RECS = [
  '🚨 Критично: срок годности Клубника (SKU FRU-022) истекает сегодня — 12 ед. в зоне E-07. Рекомендуется уценка -30%.',
  '⚡ Нагрузка: у сборщика Дмитрий К. — 18 заказов, средн. 3.8 мин. Рекомендуется перераспределить на Артём С. (свободен).',
  '📦 Дефицит: Говядина вырезка (B-06) — остаток 4 ед., мин. 5. Автозаказ у Мираторг запланирован через 2 ч.',
]

// ── Card styles ────────────────────────────────────────────────────────────────

const CARD: React.CSSProperties = {
  background: 'rgba(17,24,39,.8)',
  backdropFilter: 'blur(12px)',
  border: '1px solid #1E2A3A',
  borderRadius: 16,
}

// ── MetricCard component ───────────────────────────────────────────────────────

interface MetricCardProps {
  icon: React.ElementType
  label: string
  value: number | string
  color: string
  trend: string
  href: string
}

function MetricCard({ icon: Icon, label, value, color, trend, href }: MetricCardProps) {
  const [hovered, setHovered] = useState(false)
  return (
    <Link
      href={href}
      style={{ textDecoration: 'none', display: 'block' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{
        ...CARD,
        padding: '20px',
        position: 'relative',
        overflow: 'hidden',
        transition: 'border-color .2s, box-shadow .2s',
        borderColor: hovered ? color + '55' : '#1E2A3A',
        boxShadow: hovered ? `0 8px 32px ${color}1A` : 'none',
        cursor: 'pointer',
      }}>
        {/* Glow blob */}
        <div style={{
          position: 'absolute', top: -24, right: -24,
          width: 90, height: 90, borderRadius: '50%',
          background: color, opacity: 0.08, filter: 'blur(24px)',
          pointerEvents: 'none',
        }} />

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 11,
            background: color + '1A', border: `1px solid ${color}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon size={17} style={{ color }} />
          </div>
          <span style={{
            fontSize: 11, fontWeight: 600, color: '#10B981',
            display: 'flex', alignItems: 'center', gap: 3,
          }}>
            <ArrowUpRight size={11} style={{ color: '#10B981' }} />
            {trend}
          </span>
        </div>

        <div style={{
          fontSize: 32, fontWeight: 800, color,
          lineHeight: 1, letterSpacing: '-0.04em', marginBottom: 5,
        }}>
          {value}
        </div>
        <div style={{
          fontSize: 11, color: '#475569', textTransform: 'uppercase',
          letterSpacing: '0.08em', fontWeight: 500,
        }}>
          {label}
        </div>
      </div>
    </Link>
  )
}

// ── SectionHeader ──────────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, label, color = '#D4A017' }: { icon?: React.ElementType; label: string; color?: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14,
    }}>
      {Icon && <Icon size={15} style={{ color }} />}
      <span style={{
        fontSize: 11, fontWeight: 700, color: '#475569',
        textTransform: 'uppercase', letterSpacing: '0.1em',
      }}>
        {label}
      </span>
    </div>
  )
}

// ── PickerCard ─────────────────────────────────────────────────────────────────

function PickerCard({ picker }: { picker: Picker }) {
  const sCfg = PICKER_STATUS_CFG[picker.status]
  const pct = Math.min(100, Math.round((picker.completed_today / 25) * 100))

  return (
    <div style={{ ...CARD, padding: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        {/* Avatar */}
        <div style={{
          width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg,#1E3A5F,#2A4A70)',
          border: '2px solid #1E2A3A',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 700, color: '#94A3B8',
          letterSpacing: '0.03em',
        }}>
          {picker.avatar}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#E2E8F0', marginBottom: 3 }}>
            {picker.name}
          </div>
          <span style={{
            fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
            background: sCfg.bg, color: sCfg.color, border: `1px solid ${sCfg.border}`,
          }}>
            {sCfg.label}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#E2E8F0', lineHeight: 1 }}>
            {picker.completed_today}
          </div>
          <div style={{ fontSize: 10, color: '#475569', marginTop: 3 }}>выполнено</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#D4A017', lineHeight: 1 }}>
            {picker.avg_time_min.toFixed(1)}
          </div>
          <div style={{ fontSize: 10, color: '#475569', marginTop: 3 }}>мин/заказ</div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 4, borderRadius: 2, background: '#1E2A3A', overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 2,
          width: `${pct}%`,
          background: pct >= 80 ? 'linear-gradient(90deg,#10B98177,#10B981)'
            : pct >= 50 ? 'linear-gradient(90deg,#D4A01777,#D4A017)'
            : 'linear-gradient(90deg,#6B728077,#6B7280)',
          transition: 'width .6s ease',
        }} />
      </div>
      <div style={{ fontSize: 10, color: '#334155', marginTop: 4 }}>
        {picker.completed_today} / 25 сегодня
      </div>
    </div>
  )
}

// ── StatusBadge ────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.new
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: '2px 9px', borderRadius: 20,
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
      whiteSpace: 'nowrap',
    }}>
      {cfg.label}
    </span>
  )
}

function ChannelBadge({ channel }: { channel: string }) {
  const cfg = CHANNEL_CFG[channel] ?? CHANNEL_CFG.direct
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: '2px 9px', borderRadius: 20,
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
      whiteSpace: 'nowrap',
    }}>
      {cfg.label}
    </span>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [orders, setOrders] = useState<StoreOrder[]>(DEMO_ORDERS)
  const [pickers] = useState<Picker[]>(DEMO_PICKERS)
  const [refreshing, setRefreshing] = useState(false)

  // Derived counts
  const newCount        = orders.filter(o => o.status === 'new').length
  const pickingCount    = orders.filter(o => o.status === 'picking').length
  const readyCount      = orders.filter(o => o.status === 'ready').length
  const dispatchedCount = orders.filter(o => o.status === 'dispatched').length

  // Revenue: sum of dispatched totals
  const revenueToday = orders
    .filter(o => o.status === 'dispatched')
    .reduce((acc, o) => acc + o.total, 0)

  // Last 5 orders
  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)

  const handleRefresh = useCallback(() => {
    setRefreshing(true)
    setTimeout(() => {
      setOrders(DEMO_ORDERS)
      setRefreshing(false)
    }, 600)
  }, [])

  return (
    <div style={{ minHeight: '100%', padding: '28px 24px 48px' }}>
      <style>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%      { opacity: .5; transform: scale(.85); }
        }
        .metrics-row { display: grid; grid-template-columns: repeat(2,1fr); gap: 14px; }
        .metrics-row-3 { display: grid; grid-template-columns: repeat(1,1fr); gap: 14px; }
        .pickers-grid { display: grid; grid-template-columns: repeat(1,1fr); gap: 14px; }
        @media (min-width: 640px) {
          .metrics-row   { grid-template-columns: repeat(4,1fr); }
          .metrics-row-3 { grid-template-columns: repeat(3,1fr); }
          .pickers-grid  { grid-template-columns: repeat(2,1fr); }
        }
        @media (min-width: 1024px) {
          .pickers-grid { grid-template-columns: repeat(5,1fr); }
        }
      `}</style>

      <div style={{ maxWidth: 1280, margin: '0 auto' }}>

        {/* ── Page header ──────────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 12, marginBottom: 28,
          animation: 'fade-in-up .35s ease both',
        }}>
          <div>
            <h1 style={{
              fontSize: 26, fontWeight: 800, letterSpacing: '-0.04em',
              color: '#D4A017', margin: 0, lineHeight: 1.1,
            }}>
              Дашборд оператора
            </h1>
            <p style={{
              margin: '6px 0 0', fontSize: 12, color: '#475569',
              display: 'flex', alignItems: 'center', gap: 7,
            }}>
              <span style={{
                width: 7, height: 7, borderRadius: '50%', background: '#10B981',
                display: 'inline-block', animation: 'pulse-dot 2s ease-in-out infinite',
                boxShadow: '0 0 8px #10B981',
              }} />
              <span style={{ color: '#10B981', fontWeight: 600 }}>Live</span>
              <span style={{ color: '#1E3A5F' }}>·</span>
              ST8 Dark Intelligence
            </p>
          </div>

          {/* Refresh button */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '9px 18px', borderRadius: 10, cursor: refreshing ? 'wait' : 'pointer',
              background: 'rgba(17,24,39,.8)', border: '1px solid #1E2A3A',
              fontSize: 12, fontWeight: 600, color: refreshing ? '#475569' : '#94A3B8',
              transition: 'color .15s, border-color .15s',
              backdropFilter: 'blur(10px)',
            }}
          >
            <RotateCcw
              size={13}
              style={{
                color: refreshing ? '#475569' : '#D4A017',
                animation: refreshing ? 'spin .6s linear infinite' : 'none',
              }}
            />
            Обновить
          </button>
        </div>

        {/* ── Row 1: 4 status metrics ──────────────────────────────────────── */}
        <div
          className="metrics-row"
          style={{ marginBottom: 14, animation: 'fade-in-up .4s ease both' }}
        >
          <MetricCard icon={Package}      label="Новые заказы"      value={newCount}        color="#6B7280" trend="+12%" href="/store" />
          <MetricCard icon={ShoppingBag}  label="В сборке"          value={pickingCount}    color="#8B5CF6" trend="+5%"  href="/store" />
          <MetricCard icon={CheckCircle}  label="Готовы к выдаче"   value={readyCount}      color="#10B981" trend="+8%"  href="/store" />
          <MetricCard icon={Truck}        label="Выдано сегодня"     value={dispatchedCount} color="#3B82F6" trend="+18%" href="/store" />
        </div>

        {/* ── Row 2: 3 KPI cards ───────────────────────────────────────────── */}
        <div
          className="metrics-row-3"
          style={{ marginBottom: 28, animation: 'fade-in-up .45s ease both' }}
        >
          {/* Avg assembly time */}
          <div style={{ ...CARD, padding: '20px', position: 'relative', overflow: 'hidden' }}>
            <div style={{
              position: 'absolute', top: -20, right: -20, width: 80, height: 80,
              borderRadius: '50%', background: '#D4A017', opacity: 0.07,
              filter: 'blur(20px)', pointerEvents: 'none',
            }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'rgba(212,160,23,.15)', border: '1px solid rgba(212,160,23,.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Clock size={16} style={{ color: '#D4A017' }} />
              </div>
              <span style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
                Среднее время сборки
              </span>
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, color: '#D4A017', lineHeight: 1, letterSpacing: '-0.03em' }}>
              4.2 <span style={{ fontSize: 16, fontWeight: 600 }}>мин</span>
            </div>
          </div>

          {/* SLA */}
          <div style={{ ...CARD, padding: '20px', position: 'relative', overflow: 'hidden' }}>
            <div style={{
              position: 'absolute', top: -20, right: -20, width: 80, height: 80,
              borderRadius: '50%', background: '#10B981', opacity: 0.07,
              filter: 'blur(20px)', pointerEvents: 'none',
            }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'rgba(16,185,129,.15)', border: '1px solid rgba(16,185,129,.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <CheckCircle size={16} style={{ color: '#10B981' }} />
              </div>
              <span style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
                SLA выполнение
              </span>
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, color: '#10B981', lineHeight: 1, letterSpacing: '-0.03em', marginBottom: 12 }}>
              94.3<span style={{ fontSize: 18, fontWeight: 600 }}>%</span>
            </div>
            <div style={{ height: 5, borderRadius: 3, background: '#1E2A3A', overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: '94.3%', borderRadius: 3,
                background: 'linear-gradient(90deg,#10B98166,#10B981)',
                transition: 'width .8s ease',
              }} />
            </div>
          </div>

          {/* Revenue */}
          <div style={{ ...CARD, padding: '20px', position: 'relative', overflow: 'hidden' }}>
            <div style={{
              position: 'absolute', top: -20, right: -20, width: 80, height: 80,
              borderRadius: '50%', background: '#D4A017', opacity: 0.07,
              filter: 'blur(20px)', pointerEvents: 'none',
            }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'rgba(212,160,23,.15)', border: '1px solid rgba(212,160,23,.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Truck size={16} style={{ color: '#D4A017' }} />
              </div>
              <span style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
                Выручка сегодня
              </span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#D4A017', lineHeight: 1, letterSpacing: '-0.03em' }}>
              {revenueToday > 0 ? fmtAmount(revenueToday) : '—'}
            </div>
            <div style={{ fontSize: 11, color: '#334155', marginTop: 6 }}>
              Выданные заказы
            </div>
          </div>
        </div>

        {/* ── AI Recommendations ───────────────────────────────────────────── */}
        <div style={{ marginBottom: 28, animation: 'fade-in-up .5s ease both' }}>
          <SectionHeader icon={Zap} label="AI Рекомендации" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {AI_RECS.map((rec, i) => (
              <div
                key={i}
                style={{
                  ...CARD,
                  padding: '14px 18px',
                  border: '1px solid rgba(212,160,23,.15)',
                  borderLeft: '3px solid rgba(212,160,23,.6)',
                  borderRadius: '0 12px 12px 0',
                  fontSize: 13, color: '#CBD5E1', lineHeight: 1.6,
                }}
              >
                {rec}
              </div>
            ))}
          </div>
        </div>

        {/* ── Pickers ──────────────────────────────────────────────────────── */}
        <div style={{ marginBottom: 28, animation: 'fade-in-up .55s ease both' }}>
          <SectionHeader label="Сборщики" />
          <div className="pickers-grid">
            {pickers.map(p => (
              <PickerCard key={p.id} picker={p} />
            ))}
          </div>
        </div>

        {/* ── Recent orders ────────────────────────────────────────────────── */}
        <div style={{ animation: 'fade-in-up .6s ease both' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <SectionHeader label="Последние заказы" />
            <Link
              href="/store"
              style={{
                fontSize: 11, color: '#475569', textDecoration: 'none',
                display: 'flex', alignItems: 'center', gap: 4,
                marginBottom: 14,
                transition: 'color .15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#D4A017')}
              onMouseLeave={e => (e.currentTarget.style.color = '#475569')}
            >
              Все заказы <ArrowUpRight size={12} />
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recentOrders.map(order => (
              <div
                key={order.id}
                style={{
                  ...CARD,
                  padding: '14px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 12,
                  transition: 'border-color .2s',
                }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderColor = '#2A3A50')}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = '#1E2A3A')}
              >
                {/* Order number */}
                <span style={{
                  fontFamily: 'monospace', fontSize: 12, fontWeight: 700,
                  color: '#64748B', letterSpacing: '0.05em', flexShrink: 0, minWidth: 90,
                }}>
                  {order.number}
                </span>

                {/* Channel */}
                <div style={{ flexShrink: 0 }}>
                  <ChannelBadge channel={order.channel} />
                </div>

                {/* Customer */}
                <span style={{
                  fontSize: 13, fontWeight: 500, color: '#CBD5E1',
                  flex: 1, minWidth: 120, overflow: 'hidden',
                  textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {order.customer}
                </span>

                {/* Total */}
                <span style={{
                  fontSize: 14, fontWeight: 700, color: '#D4A017',
                  flexShrink: 0,
                }}>
                  {fmtAmount(order.total)}
                </span>

                {/* Status */}
                <div style={{ flexShrink: 0 }}>
                  <StatusBadge status={order.status} />
                </div>

                {/* Time */}
                <span style={{
                  fontSize: 11, color: '#334155', flexShrink: 0,
                  minWidth: 42, textAlign: 'right',
                }}>
                  {fmtTime(order.created_at)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <div style={{
          marginTop: 40, paddingTop: 20,
          borderTop: '1px solid #1E2A3A',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          fontSize: 11, color: '#1E3A5F',
        }}>
          <Zap size={10} style={{ color: '#D4A017', opacity: 0.5 }} />
          ST8 Dark Intelligence · Данные обновляются в реальном времени
        </div>

      </div>
    </div>
  )
}
