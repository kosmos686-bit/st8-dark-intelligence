export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2" style={{ color: '#E0E8F0' }}>Дашборд оператора</h1>
      <p style={{ color: '#556677' }}>Фаза 2 — в разработке.</p>

      <div className="grid grid-cols-2 gap-4 mt-6 max-w-lg">
        {[
          { label: 'Активных заказов', value: '—' },
          { label: 'На сборке', value: '—' },
          { label: 'Позиций в наличии', value: '—' },
          { label: 'Задач кухни', value: '—' },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl p-4" style={{ background: '#111827', border: '1px solid #1E2A3A' }}>
            <div className="text-xs mb-1" style={{ color: '#556677' }}>{label}</div>
            <div className="text-2xl font-bold" style={{ color: '#D4A017' }}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
