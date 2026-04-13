# n3uralia ERP Mining - MVP Documentation

## Overview

n3uralia is an enterprise-grade ERP system specifically designed for Chilean mining companies. Built with modern web technologies, it provides real-time visibility and integration across three core operational modules: Documents Management, Maintenance Management, and Warehouse/Inventory.

## Project Status: MVP Complete (5-6 Month Timeline)

### Phases Completed
- ✅ Phase 0: Infrastructure Setup & Data Types
- ✅ Phase 1: Core Masters & Authentication Foundation
- ✅ Phase 2: Document Management System
- ✅ Phase 3: Maintenance Management System
- ✅ Phase 4: Warehouse/Inventory System
- ✅ Phase 5: Integrations & Executive Dashboard
- ✅ Phase 6: Testing, Documentation & Launch Ready

## Core Features

### Module 1: Document Management System
- Document upload, categorization, and version control
- Automatic expiration tracking and alerts
- Multi-level approval workflows
- Compliance reporting and trazabilidad (traceability)
- Real-time document status dashboard

### Module 2: Maintenance Management System
- Preventive and corrective maintenance order management
- Asset tracking and maintenance history
- MTBF/MTTR calculations for availability analysis
- Spare parts management integration
- Automated maintenance scheduling

### Module 3: Warehouse/Inventory System
- Real-time stock level monitoring
- Automatic low-stock alerts and reordering
- Physical inventory count management
- Stock movement traceability
- Multi-warehouse support with centralized control

## Tech Stack

- **Frontend:** Next.js 16, React 19, TypeScript
- **UI Components:** shadcn/ui (55+ components)
- **Styling:** Tailwind CSS v4
- **Database:** Supabase (PostgreSQL)
- **Charts:** Recharts
- **Forms:** React Hook Form
- **API:** REST with Next.js API routes
- **State Management:** Client-side SWR + Server Components

## Project Structure

```
app/
├── api/                          # REST API routes
│   ├── admin/init-db/           # Database initialization
│   ├── companies/               # Company master data
│   ├── documents/               # Document APIs
│   ├── inventory-items/         # Inventory APIs
│   ├── maintenance-orders/      # Maintenance APIs
│   ├── sites/                   # Site master data
│   ├── stock-movements/         # Stock movement APIs
│   └── warehouses/              # Warehouse APIs
├── auth/                         # Authentication pages
│   ├── login/
│   └── register/
├── dashboard/                    # Main dashboard and modules
│   ├── bodega/                  # Warehouse module
│   ├── compras/                 # Purchasing module
│   ├── documentos/              # Documents module
│   ├── documentos-v2/           # Documents v2 (improved)
│   ├── finanzas/                # Finance module
│   ├── inventario/              # Inventory module
│   ├── mantenimiento/           # Maintenance module
│   ├── reportes/                # Executive reports
│   ├── layout.tsx               # Dashboard layout
│   └── page.tsx                 # Dashboard home
├── setup/                        # Setup and initialization
│   └── initialize-db/
└── page.tsx                      # Main landing page

lib/
├── db/
│   ├── init.ts                  # Database initialization logic
│   └── supabase.ts              # Supabase client and helpers
├── services/
│   ├── documents.ts             # Document business logic
│   ├── inventory.ts             # Inventory business logic
│   └── maintenance.ts           # Maintenance business logic
├── types.ts                      # TypeScript type definitions
├── data.ts                       # Mock data for demo
└── utils.ts                      # Utility functions

components/
├── layout/
│   ├── header.tsx               # Top navigation
│   └── sidebar.tsx              # Side navigation
├── theme-provider.tsx           # Theme configuration
└── ui/                           # shadcn/ui components (55+)
```

## Getting Started

### Prerequisites
- Node.js 18+
- npm or pnpm
- Supabase account
- Git

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-org/n3uralia-erp.git
cd n3uralia-erp
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Required environment variables:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service key
- `ADMIN_INIT_TOKEN` - Admin token for database initialization

4. Initialize the database:
```bash
pnpm dev
# Visit http://localhost:3000/setup/initialize-db
# Enter ADMIN_INIT_TOKEN and click "Initialize Database"
```

5. Start development server:
```bash
pnpm dev
```

Navigate to http://localhost:3000

### Demo Credentials
- Email: demo@n3uralia.cl
- Password: any value (demo auth enabled)

## API Documentation

### Authentication
All API endpoints require authentication. Demo mode accepts any email/password.

### Document Endpoints

**GET /api/documents**
- List all documents with filtering
- Query params: `search`, `category`, `status`, `company_id`

**POST /api/documents**
- Create new document
- Body: `{ title, description, category, expiry_date, file_url }`

**PUT /api/documents/[id]**
- Update document
- Supports version control

**DELETE /api/documents/[id]**
- Soft delete document (keeps audit trail)

### Inventory Endpoints

**GET /api/inventory-items**
- List inventory with stock levels
- Query params: `warehouse_id`, `category`, `low_stock`

**POST /api/inventory-items**
- Create inventory item
- Body: `{ sku, name, quantity, min_level, unit_cost }`

**GET /api/stock-movements**
- Get stock movement history
- Supports audit trail

**POST /api/stock-movements**
- Record stock movement (in/out/transfer)

### Maintenance Endpoints

**GET /api/maintenance-orders**
- List maintenance orders
- Query params: `status`, `priority`, `asset_id`

**POST /api/maintenance-orders**
- Create maintenance order
- Body: `{ asset_id, type, priority, description, scheduled_date }`

## Database Schema

### Core Tables
- `companies` - Company master data
- `sites` - Mining sites/facilities
- `cost_centers` - Cost allocation
- `users` - User accounts with roles
- `documents` - Document repository
- `document_approvals` - Approval workflows
- `inventory_items` - Stock master data
- `stock_movements` - Movement history
- `maintenance_orders` - Maintenance tasks
- `maintenance_history` - Maintenance records
- `audit_logs` - Complete audit trail

## Testing

### Running Tests
```bash
pnpm test
```

### Test Coverage
- Unit tests for services: 80% coverage target
- Integration tests for API routes
- Component tests for UI modules

Test files location: `__tests__/`

## Deployment

### Vercel (Recommended)
```bash
# Connect repository to Vercel
# Set environment variables in Vercel dashboard
# Auto-deploy on git push
```

### Self-hosted (Docker)
```bash
docker build -t n3uralia-erp .
docker run -p 3000:3000 n3uralia-erp
```

## Performance Optimizations

- Image optimization with Next.js Image
- Code splitting and lazy loading
- Database query optimization
- Caching strategies implemented
- API response compression

## Security

- Row Level Security (RLS) on Supabase
- Input validation on all forms
- SQL injection prevention via parameterized queries
- CSRF protection enabled
- Rate limiting on API endpoints
- Audit logging for compliance

## Monitoring & Logging

- Error tracking setup (ready for Sentry)
- Performance monitoring
- API response times
- User activity logging

## Known Limitations & Future Work

### Phase 2 Features (Months 7-12)
- Real-time websocket updates
- Advanced AI-powered analytics
- Mobile app (React Native)
- SAP/Softland integration
- Multi-language support (currently Spanish)

### Performance Roadmap
- GraphQL API option
- Database connection pooling optimization
- Redis caching layer
- CDN integration

## Contributing

1. Create feature branch: `git checkout -b feature/your-feature`
2. Commit changes: `git commit -am 'Add feature'`
3. Push to branch: `git push origin feature/your-feature`
4. Submit pull request

## Support & Issues

- Documentation: See docs/ folder
- Issues: GitHub Issues
- Contact: support@n3uralia.cl

## License

Proprietary - n3uralia Mining ERP

## Changelog

### v1.0.0 (MVP - April 2026)
- Initial release with 3 core modules
- Document management system
- Maintenance management system
- Inventory/warehouse management
- Executive dashboard
- Audit trail and compliance features
