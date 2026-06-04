export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';

    // Mock purchase orders data
    const mockOrders = [
      {
        id: 'OC-2024-001',
        supplier: 'Proveedor A',
        description: 'Repuestos minería',
        amount: 25000000,
        status: 'approved',
        date: '2024-06-01',
        deliveryDate: '2024-06-15',
        received: true,
      },
      {
        id: 'OC-2024-002',
        supplier: 'Proveedor B',
        description: 'Accesorios industriales',
        amount: 12500000,
        status: 'pending',
        date: '2024-06-02',
        deliveryDate: '2024-06-20',
        received: false,
      },
      {
        id: 'OC-2024-003',
        supplier: 'Proveedor C',
        description: 'Equipos de seguridad',
        amount: 8750000,
        status: 'received',
        date: '2024-05-25',
        deliveryDate: '2024-06-10',
        received: true,
      },
      {
        id: 'OC-2024-004',
        supplier: 'Proveedor D',
        description: 'Suministros varios',
        amount: 15000000,
        status: 'draft',
        date: '2024-06-03',
        deliveryDate: '2024-06-25',
        received: false,
      },
      {
        id: 'OC-2024-005',
        supplier: 'Proveedor A',
        description: 'Mantenimiento preventivo',
        amount: 18500000,
        status: 'approved',
        date: '2024-06-04',
        deliveryDate: '2024-06-22',
        received: false,
      },
    ];

    // Filter by status if needed
    const filtered = status === 'all' 
      ? mockOrders 
      : mockOrders.filter(o => o.status === status);

    return Response.json({
      orders: filtered,
      totalValue: filtered.reduce((sum, o) => sum + o.amount, 0),
      pendingOrders: filtered.filter(o => o.status === 'pending').length,
      suppliers: [...new Set(filtered.map(o => o.supplier))],
    });
  } catch (error) {
    console.error('[v0] Error in compras API:', error);
    return Response.json(
      { error: 'Error loading purchase orders' },
      { status: 500 }
    );
  }
}
