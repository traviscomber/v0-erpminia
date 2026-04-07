// Mock data for ERP Minero Chile MVP

export const mockPurchaseOrders = [
  {
    id: 'PO-2024-001',
    vendor: 'Minería Industrial S.A.',
    amount: 45000,
    status: 'Confirmada',
    date: '2024-03-15',
    items: 12,
  },
  {
    id: 'PO-2024-002',
    vendor: 'Proveedores del Norte Ltda.',
    amount: 32500,
    status: 'Pendiente',
    date: '2024-03-14',
    items: 8,
  },
  {
    id: 'PO-2024-003',
    vendor: 'Equipos Mineros Ltda.',
    amount: 78900,
    status: 'Entregado',
    date: '2024-03-10',
    items: 24,
  },
  {
    id: 'PO-2024-004',
    vendor: 'Repuestos Industriales S.A.',
    amount: 12300,
    status: 'Cancelada',
    date: '2024-03-08',
    items: 5,
  },
  {
    id: 'PO-2024-005',
    vendor: 'Minería Industrial S.A.',
    amount: 56700,
    status: 'Pendiente',
    date: '2024-03-20',
    items: 18,
  },
];

export const mockInventoryItems = [
  {
    id: 'INV-001',
    name: 'Acero Estructural A36',
    category: 'Materiales',
    quantity: 450,
    unit: 'Toneladas',
    unitCost: 1200,
    totalValue: 540000,
    minLevel: 100,
    status: 'Normal',
  },
  {
    id: 'INV-002',
    name: 'Cobre Refinado 99.99%',
    category: 'Concentrados',
    quantity: 125,
    unit: 'Toneladas',
    unitCost: 8500,
    totalValue: 1062500,
    minLevel: 50,
    status: 'Normal',
  },
  {
    id: 'INV-003',
    name: 'Tuberías PVC 4"',
    category: 'Equipos',
    quantity: 80,
    unit: 'Unidades',
    unitCost: 450,
    totalValue: 36000,
    minLevel: 50,
    status: 'Normal',
  },
  {
    id: 'INV-004',
    name: 'Dinamita Comercial',
    category: 'Explosivos',
    quantity: 25,
    unit: 'Cajas',
    unitCost: 3200,
    totalValue: 80000,
    minLevel: 50,
    status: 'Bajo Stock',
  },
  {
    id: 'INV-005',
    name: 'Cemento Portland',
    category: 'Materiales',
    quantity: 280,
    unit: 'Sacos',
    unitCost: 15,
    totalValue: 4200,
    minLevel: 100,
    status: 'Normal',
  },
];

export const mockDocuments = [
  {
    id: 'DOC-2024-001',
    title: 'Plan Anual de Operaciones 2024',
    category: 'Planificación',
    type: 'PDF',
    date: '2024-03-15',
    author: 'Dirección Operacional',
    size: '2.4 MB',
  },
  {
    id: 'DOC-2024-002',
    title: 'Reporte de Seguridad Marzo 2024',
    category: 'Seguridad',
    type: 'PDF',
    date: '2024-03-20',
    author: 'Departamento de Seguridad',
    size: '1.8 MB',
  },
  {
    id: 'DOC-2024-003',
    title: 'Presupuesto Q2 2024',
    category: 'Finanzas',
    type: 'XLSX',
    date: '2024-03-18',
    author: 'Contabilidad',
    size: '856 KB',
  },
  {
    id: 'DOC-2024-004',
    title: 'Procedimientos de Emergencia',
    category: 'Procedimientos',
    type: 'PDF',
    date: '2024-02-28',
    author: 'Recursos Humanos',
    size: '3.2 MB',
  },
];

export const mockFinances = [
  {
    id: 'INV-2024-001',
    type: 'Factura',
    vendor: 'Minería Industrial S.A.',
    amount: 45000,
    status: 'Pagada',
    dueDate: '2024-03-30',
    paidDate: '2024-03-25',
  },
  {
    id: 'INV-2024-002',
    type: 'Factura',
    vendor: 'Equipos Mineros Ltda.',
    amount: 78900,
    status: 'Pagada',
    dueDate: '2024-03-20',
    paidDate: '2024-03-18',
  },
  {
    id: 'INV-2024-003',
    type: 'Factura',
    vendor: 'Proveedores del Norte Ltda.',
    amount: 32500,
    status: 'Pendiente',
    dueDate: '2024-04-14',
    paidDate: null,
  },
  {
    id: 'INV-2024-004',
    type: 'Factura',
    vendor: 'Repuestos Industriales S.A.',
    amount: 12300,
    status: 'Vencida',
    dueDate: '2024-02-28',
    paidDate: null,
  },
];

export const kpiData = {
  totalOrders: {
    value: 5,
    change: 12,
    period: 'este mes',
  },
  inventoryValue: {
    value: 1722700,
    change: 8,
    period: 'vs último mes',
  },
  pendingDocuments: {
    value: 8,
    change: -5,
    period: 'por revisar',
  },
  financialSummary: {
    totalExpense: 168700,
    paid: 135900,
    pending: 32800,
  },
};

export const chartData = [
  { month: 'Ene', orders: 4, inventory: 2400, documents: 12 },
  { month: 'Feb', orders: 3, inventory: 1398, documents: 9 },
  { month: 'Mar', orders: 2, inventory: 9800, documents: 14 },
  { month: 'Abr', orders: 5, inventory: 3908, documents: 11 },
  { month: 'May', orders: 4, inventory: 4800, documents: 8 },
];

export const recentActivity = [
  { id: 1, action: 'Orden de compra creada', description: 'PO-2024-005 por $56,700', time: 'hace 2 horas' },
  { id: 2, action: 'Documento revisado', description: 'Plan Anual de Operaciones aprobado', time: 'hace 4 horas' },
  { id: 3, action: 'Inventario actualizado', description: 'Recepción de materiales registrada', time: 'hace 1 día' },
  { id: 4, action: 'Factura pagada', description: 'INV-2024-002 confirmada', time: 'hace 2 días' },
];
