// ST8 Dark Store — demo data for offline/demo mode

export type KanbanStatus = 'new' | 'picking' | 'check' | 'ready' | 'dispatched'
export type Channel = 'yandex' | 'sber' | 'samokat' | 'direct' | 'wb'
export type Priority = 'low' | 'normal' | 'high' | 'urgent'

export interface StoreOrderItem {
  sku: string
  name: string
  qty: number
  price: number
  zone: string
  cell: string
  picked?: boolean
}

export interface StoreOrder {
  id: string
  number: string
  status: KanbanStatus
  channel: Channel
  priority: Priority
  customer: string
  address: string
  items: StoreOrderItem[]
  total: number
  picker_id: string | null
  created_at: string         // ISO
  deadline_at: string        // ISO — SLA deadline
  picked_at?: string | null
  ready_at?: string | null
  dispatched_at?: string | null
  notes?: string | null
}

export interface Picker {
  id: string
  name: string
  avatar: string             // initials
  status: 'free' | 'busy' | 'break'
  active_order: string | null
  completed_today: number
  avg_time_min: number
}

export interface SKUItem {
  id: string
  sku: string
  barcode: string
  name: string
  category: string
  zone: string
  cell: string
  qty: number
  min_qty: number
  price: number
  supplier: string
  expiry_date: string | null
  is_perishable: boolean
  requires_cold: boolean
}

export interface ZoneConfig {
  id: string
  name: string
  label: string
  color: string
  temp: string
  cells: number
  occupied: number
}

// ─── Zones ────────────────────────────────────────────────────────────────────

export const DEMO_ZONES: ZoneConfig[] = [
  { id: 'A', name: 'Зона A', label: 'Молочка / Охлаждённое', color: '#3B82F6', temp: '+2…+6°C', cells: 48, occupied: 39 },
  { id: 'B', name: 'Зона B', label: 'Мясо / Рыба',           color: '#EF4444', temp: '0…+2°C',  cells: 32, occupied: 28 },
  { id: 'C', name: 'Зона C', label: 'Бакалея / Сухое',       color: '#D4A017', temp: '+18…+22°C', cells: 80, occupied: 61 },
  { id: 'D', name: 'Зона D', label: 'Заморозка',             color: '#8B5CF6', temp: '-18°C',   cells: 24, occupied: 18 },
  { id: 'E', name: 'Зона E', label: 'Фрукты / Овощи',        color: '#10B981', temp: '+8…+12°C', cells: 36, occupied: 27 },
  { id: 'F', name: 'Зона F', label: 'Алкоголь',              color: '#F97316', temp: '+16…+18°C', cells: 20, occupied: 14 },
  { id: 'G', name: 'Зона G', label: 'Готовая еда / Кулинария', color: '#EC4899', temp: '+2…+4°C', cells: 16, occupied: 11 },
]

// ─── Pickers ──────────────────────────────────────────────────────────────────

export const DEMO_PICKERS: Picker[] = [
  { id: 'p1', name: 'Дмитрий К.',   avatar: 'ДК', status: 'busy',  active_order: 'ORD-0241', completed_today: 18, avg_time_min: 3.8 },
  { id: 'p2', name: 'Наталья В.',   avatar: 'НВ', status: 'busy',  active_order: 'ORD-0238', completed_today: 22, avg_time_min: 3.2 },
  { id: 'p3', name: 'Артём С.',     avatar: 'АС', status: 'free',  active_order: null,       completed_today: 15, avg_time_min: 4.1 },
  { id: 'p4', name: 'Екатерина М.', avatar: 'ЕМ', status: 'break', active_order: null,       completed_today: 11, avg_time_min: 4.6 },
  { id: 'p5', name: 'Иван Р.',      avatar: 'ИР', status: 'busy',  active_order: 'ORD-0243', completed_today: 19, avg_time_min: 3.5 },
]

// helper — create ISO string relative to "now"
function ago(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString()
}
function fromNow(minutes: number): string {
  return new Date(Date.now() + minutes * 60_000).toISOString()
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export const DEMO_ORDERS: StoreOrder[] = [
  // ── NEW ──────────────────────────────────────────────────────────────────
  {
    id: 'o1', number: 'ORD-0244', status: 'new', channel: 'yandex', priority: 'urgent',
    customer: 'Михаил Орлов', address: 'Кутузовский пр., 36, кв. 12',
    items: [
      { sku: 'MLK-001', name: 'Молоко «Простоквашино» 3.2%', qty: 2, price: 89, zone: 'A', cell: 'A-04', picked: false },
      { sku: 'CHE-012', name: 'Сыр «Российский» 200 г',       qty: 1, price: 245, zone: 'A', cell: 'A-11', picked: false },
      { sku: 'BRD-003', name: 'Хлеб «Дарницкий» н/к',         qty: 1, price: 67, zone: 'C', cell: 'C-02', picked: false },
    ],
    total: 490, picker_id: null,
    created_at: ago(2), deadline_at: fromNow(13),
    notes: 'Домофон: 36к12. Оставить у двери.',
  },
  {
    id: 'o2', number: 'ORD-0243', status: 'new', channel: 'sber', priority: 'high',
    customer: 'Анна Смирнова', address: 'Ленинградский пр., 78, кв. 45',
    items: [
      { sku: 'FRU-022', name: 'Клубника охлаждённая 500 г', qty: 2, price: 349, zone: 'E', cell: 'E-07', picked: false },
      { sku: 'YOG-005', name: 'Йогурт Danone «Активиа» 4шт', qty: 1, price: 199, zone: 'A', cell: 'A-22', picked: false },
    ],
    total: 897, picker_id: 'p5',
    created_at: ago(4), deadline_at: fromNow(11),
    notes: null,
  },
  {
    id: 'o3', number: 'ORD-0242', status: 'new', channel: 'direct', priority: 'normal',
    customer: 'Сергей Петров', address: 'Тверская ул., 15, кв. 8',
    items: [
      { sku: 'WNE-041', name: 'Вино «Chateau Ste Michelle» Riesling', qty: 2, price: 1290, zone: 'F', cell: 'F-03', picked: false },
      { sku: 'CHE-018', name: 'Сыр «Бри» 150 г Президент',          qty: 1, price: 389, zone: 'A', cell: 'A-15', picked: false },
      { sku: 'FRU-031', name: 'Виноград «Кишмиш» 1 кг',             qty: 1, price: 279, zone: 'E', cell: 'E-12', picked: false },
    ],
    total: 3248, picker_id: null,
    created_at: ago(6), deadline_at: fromNow(9),
    notes: 'Предпочтителен ранний слот.',
  },
  // ── PICKING ──────────────────────────────────────────────────────────────
  {
    id: 'o4', number: 'ORD-0241', status: 'picking', channel: 'yandex', priority: 'high',
    customer: 'Мария Козлова', address: 'Арбат, 24, кв. 3',
    items: [
      { sku: 'MEA-007', name: 'Говядина вырезка 500 г',         qty: 1, price: 789, zone: 'B', cell: 'B-06', picked: true },
      { sku: 'VEG-014', name: 'Томаты черри 250 г',             qty: 2, price: 149, zone: 'E', cell: 'E-03', picked: true },
      { sku: 'SAU-002', name: 'Соус «Heinz Tomato Ketchup» 570г', qty: 1, price: 219, zone: 'C', cell: 'C-17', picked: false },
      { sku: 'BRD-008', name: 'Чиабатта «La Forneria» 250 г',   qty: 1, price: 129, zone: 'C', cell: 'C-04', picked: false },
    ],
    total: 1435, picker_id: 'p1',
    created_at: ago(14), deadline_at: fromNow(6),
    picked_at: ago(8),
  },
  {
    id: 'o5', number: 'ORD-0240', status: 'picking', channel: 'samokat', priority: 'urgent',
    customer: 'Игорь Волков', address: 'Остоженка, 7, кв. 19',
    items: [
      { sku: 'ICE-001', name: 'Мороженое «Häagen-Dazs» Vanilla 500 мл', qty: 2, price: 599, zone: 'D', cell: 'D-02', picked: true },
      { sku: 'JUI-009', name: 'Сок Rich «Апельсин» 1 л',                 qty: 3, price: 139, zone: 'C', cell: 'C-28', picked: false },
    ],
    total: 1615, picker_id: 'p2',
    created_at: ago(18), deadline_at: fromNow(2),
    picked_at: ago(10),
  },
  {
    id: 'o6', number: 'ORD-0239', status: 'picking', channel: 'wb', priority: 'normal',
    customer: 'Татьяна Новикова', address: 'Смоленская ул., 5, кв. 77',
    items: [
      { sku: 'FIS-003', name: 'Лосось с/с «Черноморское» 250 г', qty: 2, price: 649, zone: 'B', cell: 'B-14', picked: false },
      { sku: 'CEA-011', name: 'Крем-сыр «Hohland» 400 г',         qty: 1, price: 329, zone: 'A', cell: 'A-18', picked: false },
    ],
    total: 1627, picker_id: 'p2',
    created_at: ago(22), deadline_at: fromNow(8),
    picked_at: ago(12),
  },
  // ── CHECK ─────────────────────────────────────────────────────────────────
  {
    id: 'o7', number: 'ORD-0238', status: 'check', channel: 'yandex', priority: 'high',
    customer: 'Алексей Морозов', address: 'Новый Арбат, 10, кв. 201',
    items: [
      { sku: 'MLK-001', name: 'Молоко «Простоквашино» 3.2%', qty: 3, price: 89, zone: 'A', cell: 'A-04', picked: true },
      { sku: 'EGG-001', name: 'Яйца «Русская деревня» С1 10шт', qty: 2, price: 129, zone: 'A', cell: 'A-31', picked: true },
      { sku: 'BUT-002', name: 'Масло «Вологодское» 82,5% 200 г', qty: 1, price: 219, zone: 'A', cell: 'A-07', picked: true },
    ],
    total: 894, picker_id: 'p2',
    created_at: ago(28), deadline_at: fromNow(7),
    picked_at: ago(18), ready_at: null,
  },
  {
    id: 'o8', number: 'ORD-0237', status: 'check', channel: 'sber', priority: 'normal',
    customer: 'Ольга Белова', address: 'Пречистенка, 32, кв. 5',
    items: [
      { sku: 'REA-007', name: 'Салат «Цезарь с курицей» 300 г (готовый)', qty: 2, price: 399, zone: 'G', cell: 'G-03', picked: true },
      { sku: 'REA-012', name: 'Суп-пюре «Тыквенный» 400 г (готовый)',     qty: 1, price: 279, zone: 'G', cell: 'G-07', picked: true },
    ],
    total: 1077, picker_id: 'p1',
    created_at: ago(35), deadline_at: fromNow(5),
    picked_at: ago(22),
  },
  // ── READY ─────────────────────────────────────────────────────────────────
  {
    id: 'o9', number: 'ORD-0236', status: 'ready', channel: 'yandex', priority: 'normal',
    customer: 'Виктор Соколов', address: 'Садовая-Спасская, 18, кв. 14',
    items: [
      { sku: 'COF-004', name: 'Кофе Lavazza «Gran Aroma» 1 кг', qty: 1, price: 1490, zone: 'C', cell: 'C-44', picked: true },
      { sku: 'TEA-002', name: 'Чай «Ahmad» English Breakfast 100 пак', qty: 1, price: 399, zone: 'C', cell: 'C-51', picked: true },
    ],
    total: 1889, picker_id: 'p3',
    created_at: ago(45), deadline_at: fromNow(3),
    picked_at: ago(30), ready_at: ago(5),
    notes: 'Курьер уже едет.',
  },
  {
    id: 'o10', number: 'ORD-0235', status: 'ready', channel: 'direct', priority: 'low',
    customer: 'Наталья Королёва', address: 'Фрунзенская наб., 44, кв. 9',
    items: [
      { sku: 'WNE-044', name: 'Шампанское «Моэт Шандон» Brut 0.75 л', qty: 1, price: 4990, zone: 'F', cell: 'F-11', picked: true },
      { sku: 'CHE-025', name: 'Сырная тарелка «Азбука Вкуса» 300 г',   qty: 1, price: 890, zone: 'A', cell: 'A-33', picked: true },
    ],
    total: 5880, picker_id: 'p3',
    created_at: ago(50), deadline_at: fromNow(10),
    picked_at: ago(35), ready_at: ago(8),
  },
  // ── DISPATCHED ────────────────────────────────────────────────────────────
  {
    id: 'o11', number: 'ORD-0234', status: 'dispatched', channel: 'samokat', priority: 'high',
    customer: 'Роман Зайцев', address: 'Б. Полянка, 28, кв. 6',
    items: [
      { sku: 'FRU-028', name: 'Авокадо «Hass» 4 шт', qty: 1, price: 349, zone: 'E', cell: 'E-18', picked: true },
      { sku: 'VEG-021', name: 'Шпинат свежий 150 г',  qty: 2, price: 189, zone: 'E', cell: 'E-22', picked: true },
    ],
    total: 727, picker_id: 'p1',
    created_at: ago(70), deadline_at: fromNow(0),
    picked_at: ago(55), ready_at: ago(40), dispatched_at: ago(12),
  },
  {
    id: 'o12', number: 'ORD-0233', status: 'dispatched', channel: 'yandex', priority: 'normal',
    customer: 'Светлана Павлова', address: 'Ул. Маросейка, 11, кв. 3',
    items: [
      { sku: 'REA-019', name: 'Пицца «Маргарита» замороженная', qty: 2, price: 499, zone: 'D', cell: 'D-09', picked: true },
      { sku: 'BEV-006', name: 'Coca-Cola 0.5 л 6шт',            qty: 1, price: 359, zone: 'C', cell: 'C-67', picked: true },
    ],
    total: 1357, picker_id: 'p5',
    created_at: ago(90), deadline_at: ago(20),
    picked_at: ago(75), ready_at: ago(60), dispatched_at: ago(30),
  },
]

// ─── SKU ──────────────────────────────────────────────────────────────────────

export const DEMO_SKU: SKUItem[] = [
  { id: 's01', sku: 'MLK-001', barcode: '4601025008791', name: 'Молоко «Простоквашино» 3.2% 1 л',          category: 'Молочка', zone: 'A', cell: 'A-04', qty: 24, min_qty: 12, price: 89,   supplier: 'Простоквашино',  expiry_date: '2026-05-10', is_perishable: true,  requires_cold: true  },
  { id: 's02', sku: 'CHE-012', barcode: '4607043660291', name: 'Сыр «Российский» 200 г',                   category: 'Молочка', zone: 'A', cell: 'A-11', qty: 8,  min_qty: 6,  price: 245,  supplier: 'Агрокомплекс',   expiry_date: '2026-05-12', is_perishable: true,  requires_cold: true  },
  { id: 's03', sku: 'BRD-003', barcode: '4601023561890', name: 'Хлеб «Дарницкий» нарезной 700 г',          category: 'Хлеб',    zone: 'C', cell: 'C-02', qty: 15, min_qty: 5,  price: 67,   supplier: 'Коломенское',    expiry_date: '2026-05-09', is_perishable: true,  requires_cold: false },
  { id: 's04', sku: 'FRU-022', barcode: '2000000111111', name: 'Клубника охлаждённая 500 г',               category: 'Фрукты',  zone: 'E', cell: 'E-07', qty: 12, min_qty: 8,  price: 349,  supplier: 'АгроЮг',        expiry_date: '2026-05-08', is_perishable: true,  requires_cold: true  },
  { id: 's05', sku: 'YOG-005', barcode: '4607003660440', name: 'Йогурт Danone «Активиа» 4шт 130 г',        category: 'Молочка', zone: 'A', cell: 'A-22', qty: 19, min_qty: 8,  price: 199,  supplier: 'Danone',         expiry_date: '2026-05-14', is_perishable: true,  requires_cold: true  },
  { id: 's06', sku: 'WNE-041', barcode: '0083708220819', name: 'Вино «Chateau Ste Michelle» Riesling 0.75',category: 'Алкоголь', zone: 'F', cell: 'F-03', qty: 6,  min_qty: 3,  price: 1290, supplier: 'Simple Wine',    expiry_date: null,         is_perishable: false, requires_cold: false },
  { id: 's07', sku: 'CHE-018', barcode: '3228020450098', name: 'Сыр «Бри» 150 г Président',                category: 'Молочка', zone: 'A', cell: 'A-15', qty: 5,  min_qty: 4,  price: 389,  supplier: 'Lactalis',       expiry_date: '2026-05-11', is_perishable: true,  requires_cold: true  },
  { id: 's08', sku: 'FRU-031', barcode: '2000000222222', name: 'Виноград «Кишмиш» 1 кг',                   category: 'Фрукты',  zone: 'E', cell: 'E-12', qty: 10, min_qty: 5,  price: 279,  supplier: 'АгроЮг',        expiry_date: '2026-05-13', is_perishable: true,  requires_cold: false },
  { id: 's09', sku: 'MEA-007', barcode: '4607080011123', name: 'Говядина вырезка охл. 500 г',               category: 'Мясо',    zone: 'B', cell: 'B-06', qty: 4,  min_qty: 5,  price: 789,  supplier: 'Мираторг',       expiry_date: '2026-05-09', is_perishable: true,  requires_cold: true  },
  { id: 's10', sku: 'VEG-014', barcode: '2000000333333', name: 'Томаты черри 250 г',                        category: 'Овощи',   zone: 'E', cell: 'E-03', qty: 22, min_qty: 10, price: 149,  supplier: 'Белая Дача',     expiry_date: '2026-05-12', is_perishable: true,  requires_cold: false },
  { id: 's11', sku: 'SAU-002', barcode: '0013000006403', name: 'Кетчуп «Heinz Tomato» 570 г',               category: 'Соусы',   zone: 'C', cell: 'C-17', qty: 31, min_qty: 10, price: 219,  supplier: 'Heinz',          expiry_date: '2027-01-01', is_perishable: false, requires_cold: false },
  { id: 's12', sku: 'ICE-001', barcode: '0074221000012', name: 'Мороженое «Häagen-Dazs» Vanilla 500 мл',   category: 'Заморозка', zone: 'D', cell: 'D-02', qty: 7, min_qty: 4,  price: 599,  supplier: 'General Mills',  expiry_date: '2026-09-01', is_perishable: false, requires_cold: true  },
  { id: 's13', sku: 'JUI-009', barcode: '4602007023110', name: 'Сок Rich «Апельсин» 1 л',                   category: 'Напитки', zone: 'C', cell: 'C-28', qty: 18, min_qty: 10, price: 139,  supplier: 'Coca-Cola HBC',  expiry_date: '2026-10-01', is_perishable: false, requires_cold: false },
  { id: 's14', sku: 'FIS-003', barcode: '4607102220012', name: 'Лосось с/с «Черноморское» 250 г',           category: 'Рыба',    zone: 'B', cell: 'B-14', qty: 3,  min_qty: 5,  price: 649,  supplier: 'Русское море',   expiry_date: '2026-05-09', is_perishable: true,  requires_cold: true  },
  { id: 's15', sku: 'CEA-011', barcode: '4052100010234', name: 'Крем-сыр «Hohland» 400 г',                  category: 'Молочка', zone: 'A', cell: 'A-18', qty: 9,  min_qty: 6,  price: 329,  supplier: 'Hohland',        expiry_date: '2026-05-20', is_perishable: true,  requires_cold: true  },
  { id: 's16', sku: 'EGG-001', barcode: '4607043661100', name: 'Яйца «Русская деревня» С1 10 шт',           category: 'Молочка', zone: 'A', cell: 'A-31', qty: 16, min_qty: 10, price: 129,  supplier: 'Роскар',         expiry_date: '2026-05-22', is_perishable: true,  requires_cold: false },
  { id: 's17', sku: 'BUT-002', barcode: '4607080021000', name: 'Масло «Вологодское» 82,5% 200 г',            category: 'Молочка', zone: 'A', cell: 'A-07', qty: 11, min_qty: 6,  price: 219,  supplier: 'Северное молоко', expiry_date: '2026-05-18', is_perishable: true,  requires_cold: true  },
  { id: 's18', sku: 'REA-007', barcode: '4607999110001', name: 'Салат «Цезарь с курицей» 300 г готовый',    category: 'Кулинария', zone: 'G', cell: 'G-03', qty: 6, min_qty: 4,  price: 399,  supplier: 'АВ-Кухня',       expiry_date: '2026-05-08', is_perishable: true,  requires_cold: true  },
  { id: 's19', sku: 'REA-012', barcode: '4607999110002', name: 'Суп-пюре «Тыквенный» 400 г готовый',        category: 'Кулинария', zone: 'G', cell: 'G-07', qty: 4,  min_qty: 3,  price: 279,  supplier: 'АВ-Кухня',       expiry_date: '2026-05-08', is_perishable: true,  requires_cold: true  },
  { id: 's20', sku: 'COF-004', barcode: '0080400500014', name: 'Кофе Lavazza «Gran Aroma» молотый 1 кг',    category: 'Напитки', zone: 'C', cell: 'C-44', qty: 7,  min_qty: 3,  price: 1490, supplier: 'Lavazza',        expiry_date: '2027-04-01', is_perishable: false, requires_cold: false },
  { id: 's21', sku: 'TEA-002', barcode: '0054881001231', name: 'Чай «Ahmad» English Breakfast 100 пак',      category: 'Напитки', zone: 'C', cell: 'C-51', qty: 13, min_qty: 5,  price: 399,  supplier: 'Ahmad Tea',      expiry_date: '2027-06-01', is_perishable: false, requires_cold: false },
  { id: 's22', sku: 'WNE-044', barcode: '0094000001234', name: 'Шампанское «Моэт Шандон» Brut 0.75 л',      category: 'Алкоголь', zone: 'F', cell: 'F-11', qty: 3,  min_qty: 2,  price: 4990, supplier: 'Moët Hennessy', expiry_date: null,         is_perishable: false, requires_cold: false },
  { id: 's23', sku: 'CHE-025', barcode: '4607999220001', name: 'Сырная тарелка «Азбука Вкуса» 300 г',       category: 'Молочка', zone: 'A', cell: 'A-33', qty: 5,  min_qty: 3,  price: 890,  supplier: 'АВ-Кухня',       expiry_date: '2026-05-09', is_perishable: true,  requires_cold: true  },
  { id: 's24', sku: 'FRU-028', barcode: '2000000444444', name: 'Авокадо «Hass» 4 шт',                       category: 'Фрукты',  zone: 'E', cell: 'E-18', qty: 14, min_qty: 6,  price: 349,  supplier: 'АгроЮг',        expiry_date: '2026-05-13', is_perishable: true,  requires_cold: false },
  { id: 's25', sku: 'VEG-021', barcode: '2000000555555', name: 'Шпинат свежий 150 г',                       category: 'Овощи',   zone: 'E', cell: 'E-22', qty: 8,  min_qty: 5,  price: 189,  supplier: 'Белая Дача',     expiry_date: '2026-05-09', is_perishable: true,  requires_cold: false },
  { id: 's26', sku: 'REA-019', barcode: '4007110500001', name: 'Пицца «Маргарита» замороженная 340 г',      category: 'Заморозка', zone: 'D', cell: 'D-09', qty: 9, min_qty: 5,  price: 499,  supplier: 'Dr. Oetker',     expiry_date: '2026-08-01', is_perishable: false, requires_cold: true  },
  { id: 's27', sku: 'BEV-006', barcode: '5449000000996', name: 'Coca-Cola 0.5 л 6шт',                       category: 'Напитки', zone: 'C', cell: 'C-67', qty: 24, min_qty: 12, price: 359,  supplier: 'Coca-Cola HBC',  expiry_date: '2026-12-01', is_perishable: false, requires_cold: false },
  { id: 's28', sku: 'BRD-008', barcode: '4607100880001', name: 'Чиабатта «La Forneria» 250 г',               category: 'Хлеб',    zone: 'C', cell: 'C-04', qty: 2,  min_qty: 4,  price: 129,  supplier: 'La Forneria',    expiry_date: '2026-05-08', is_perishable: true,  requires_cold: false },
  { id: 's29', sku: 'FIS-008', barcode: '4607102220088', name: 'Тунец «Rio Mare» в масле 160 г',             category: 'Рыба',    zone: 'C', cell: 'C-33', qty: 17, min_qty: 8,  price: 299,  supplier: 'Tri Marine',     expiry_date: '2027-03-01', is_perishable: false, requires_cold: false },
  { id: 's30', sku: 'CEA-019', barcode: '4052100019990', name: 'Маскарпоне «Galbani» 250 г',                 category: 'Молочка', zone: 'A', cell: 'A-26', qty: 7,  min_qty: 4,  price: 359,  supplier: 'Galbani',        expiry_date: '2026-05-15', is_perishable: true,  requires_cold: true  },
]
