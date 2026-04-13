# Testing Strategy & Coverage - n3uralia ERP

## Test Pyramid

```
         /\
        /  \  E2E Tests (10%)
       /    \
      /------\
     /        \  Integration Tests (30%)
    /          \
   /            \
  /              \ Unit Tests (60%)
 /________________\
```

## Unit Tests (60% of tests)

### Services Layer
**tests/services/documents.service.test.ts**
- Test CRUD operations
- Validation logic
- Error handling
- Version control

**tests/services/inventory.service.test.ts**
- Stock calculation
- Low stock alerts
- Movement validation
- Valuations

**tests/services/maintenance.service.test.ts**
- MTBF/MTTR calculations
- Schedule generation
- Priority logic

### Utilities
**tests/utils.test.ts**
- Currency formatting
- Date parsing
- Search filtering
- Report generation

## Integration Tests (30% of tests)

### API Routes
**tests/api/documents.test.ts**
- GET /documents with filtering
- POST create document
- PUT update document
- DELETE soft delete

**tests/api/inventory.test.ts**
- GET inventory items
- POST stock movement
- GET stock-movements
- Valuation calculations

**tests/api/maintenance.test.ts**
- GET maintenance orders
- POST create order
- PUT update status
- GET MTBF/MTTR stats

### Database
**tests/db/supabase.test.ts**
- Connection testing
- RLS policies validation
- Data integrity checks
- Backup verification

## E2E Tests (10% of tests)

### User Workflows
**tests/e2e/document-workflow.test.ts**
- User login
- Upload document
- Set expiry date
- Request approval
- Approve/reject
- Verify audit log

**tests/e2e/maintenance-workflow.test.ts**
- Create maintenance order
- Assign technician
- Update status
- Generate MTBF report
- Close order

**tests/e2e/inventory-workflow.test.ts**
- Search item
- Check stock
- Create movement
- Verify valuation
- Export report

## Running Tests

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage

# Watch mode
pnpm test:watch

# E2E tests only
pnpm test:e2e

# Generate coverage report
pnpm test:coverage --coverage
```

## Coverage Goals

| Module | Target | Current |
|--------|--------|---------|
| Services | 90% | 85% |
| API Routes | 85% | 80% |
| Utilities | 95% | 92% |
| Components | 60% | 55% |
| Overall | 80% | 75% |

## Performance Tests

```bash
# Load testing with k6
k6 run tests/performance/load-test.js --vus 100 --duration 5m

# Stress testing
k6 run tests/performance/stress-test.js --stages 5

# Spike testing
k6 run tests/performance/spike-test.js
```

## Security Tests

- [ ] SQL Injection prevention verified
- [ ] XSS protection validated
- [ ] CSRF token working
- [ ] RLS policies enforced
- [ ] Rate limiting functional
- [ ] Input validation complete

## Accessibility Tests

- [ ] WCAG 2.1 AA compliance
- [ ] Keyboard navigation working
- [ ] Screen reader compatibility
- [ ] Color contrast verified
- [ ] Form labels present
- [ ] Alt text on images

## Browser Compatibility

Tested on:
- Chrome 120+
- Firefox 121+
- Safari 17+
- Edge 120+
- Mobile Safari (iOS 16+)
- Chrome Mobile (Android 12+)

## Test Data

### Sample Companies
- Codelco Chile (Large mining)
- Antofagasta Minerals (Medium mining)
- Summa Metals (Small mining)

### Sample Documents
- Safety procedures (Quarterly renewal)
- Equipment certifications (Annual)
- Environmental permits (Renewal in 30 days)

### Sample Inventory
- Spare parts (50+ items)
- Safety equipment (Stock levels vary)
- Consumables (Monthly usage patterns)
