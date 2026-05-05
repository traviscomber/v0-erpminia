describe('n3uralia ERP - Critical Workflows', () => {
  
  describe('Authentication Flow', () => {
    it('should allow user signup with valid credentials', () => {
      cy.visit('/auth/signup')
      cy.get('input[name="email"]').type('test@mining.com')
      cy.get('input[name="password"]').type('SecurePass123!')
      cy.get('button[type="submit"]').click()
      cy.url().should('include', '/auth/verify-email')
    })

    it('should validate strong password requirements', () => {
      cy.visit('/auth/signup')
      cy.get('input[name="password"]').type('weak')
      cy.get('input[name="password"]').blur()
      cy.get('[data-testid="password-error"]').should('contain', '12 caracteres')
    })

    it('should allow user login', () => {
      cy.visit('/auth/login')
      cy.get('input[name="email"]').type('admin@miningco.com')
      cy.get('input[name="password"]').type('SecurePass123!')
      cy.get('button[type="submit"]').click()
      cy.url().should('include', '/dashboard')
    })
  })

  describe('Dashboard Access', () => {
    beforeEach(() => {
      // Login before each test
      cy.visit('/auth/login')
      cy.get('input[name="email"]').type('admin@miningco.com')
      cy.get('input[name="password"]').type('SecurePass123!')
      cy.get('button[type="submit"]').click()
      cy.url().should('include', '/dashboard')
    })

    it('should display all operational modules', () => {
      cy.get('[data-testid="sidebar-produccion"]').should('exist')
      cy.get('[data-testid="sidebar-mantenimiento"]').should('exist')
      cy.get('[data-testid="sidebar-bodega"]').should('exist')
      cy.get('[data-testid="sidebar-hse"]').should('exist')
    })

    it('should navigate to Produccion module', () => {
      cy.get('a[href="/dashboard/produccion"]').click()
      cy.url().should('include', '/produccion')
      cy.get('[data-testid="equipos-table"]').should('exist')
    })
  })

  describe('Produccion Module - Real-time Telemetry', () => {
    beforeEach(() => {
      cy.login('technician@miningco.com', 'SecurePass123!')
      cy.visit('/dashboard/produccion')
    })

    it('should display equipment list with real-time data', () => {
      cy.get('[data-testid="equipment-list"]').should('exist')
      cy.get('[data-testid="equipment-item"]').should('have.length.greaterThan', 0)
    })

    it('should auto-refresh telemetry every 30 seconds', () => {
      cy.get('[data-testid="sensor-reading"]').first().then($el => {
        const initialValue = $el.text()
        cy.wait(31000)
        cy.get('[data-testid="sensor-reading"]').first().should('not.have.text', initialValue)
      })
    })

    it('should show critical alarms prominently', () => {
      cy.get('[data-testid="alarm-critical"]').should('have.css', 'background-color', 'rgb(239, 68, 68)')
    })
  })

  describe('Bodega Module - FIFO Inventory', () => {
    beforeEach(() => {
      cy.login('warehouse@miningco.com', 'SecurePass123!')
      cy.visit('/dashboard/bodega')
    })

    it('should display inventory in FIFO order', () => {
      cy.get('[data-testid="fifo-sequence"]').then($items => {
        const sequences = Array.from($items).map(el => el.textContent)
        expect(sequences).to.equal(sequences.sort((a, b) => a - b))
      })
    })

    it('should show critical stock alerts', () => {
      cy.get('[data-testid="stock-alert-critical"]').should('have.length.greaterThan', 0)
    })
  })

  describe('Compras Module - Purchase Orders', () => {
    beforeEach(() => {
      cy.login('procurement@miningco.com', 'SecurePass123!')
      cy.visit('/dashboard/compras')
    })

    it('should create a new purchase order', () => {
      cy.get('button:contains("Nueva OC")').click()
      cy.get('input[name="supplier"]').type('SupplierCorp')
      cy.get('input[name="amount"]').type('50000')
      cy.get('button[type="submit"]').click()
      cy.get('[data-testid="toast-success"]').should('contain', 'OC creada')
    })

    it('should display purchase order status workflow', () => {
      cy.get('[data-testid="oc-status-draft"]').should('exist')
      cy.get('[data-testid="oc-status-approved"]').should('exist')
      cy.get('[data-testid="oc-status-received"]').should('exist')
    })
  })

  describe('Permissions & RBAC', () => {
    it('should enforce role-based access control', () => {
      cy.login('viewer@miningco.com', 'SecurePass123!')
      cy.visit('/dashboard/compras')
      cy.get('button:contains("Nueva OC")').should('not.exist')
      cy.get('[data-testid="read-only-badge"]').should('exist')
    })

    it('should allow admin to access permissions manager', () => {
      cy.login('admin@miningco.com', 'SecurePass123!')
      cy.visit('/dashboard/admin/permissions')
      cy.url().should('include', '/permissions')
      cy.get('[data-testid="permissions-table"]').should('exist')
    })
  })

  describe('IA Operacional', () => {
    beforeEach(() => {
      cy.login('manager@miningco.com', 'SecurePass123!')
      cy.visit('/dashboard/ia-operacional')
    })

    it('should display 6 types of AI insights', () => {
      cy.get('[data-testid="insight-riesgo"]').should('exist')
      cy.get('[data-testid="insight-vencimiento"]').should('exist')
      cy.get('[data-testid="insight-stock"]').should('exist')
      cy.get('[data-testid="insight-mantencion"]').should('exist')
      cy.get('[data-testid="insight-oc"]').should('exist')
      cy.get('[data-testid="insight-resumen"]').should('exist')
    })

    it('should display critical alerts prominently', () => {
      cy.get('[data-testid="severity-critical"]').should('have.css', 'color', 'rgb(220, 38, 38)')
    })
  })

  describe('KPI Dashboard', () => {
    beforeEach(() => {
      cy.login('admin@miningco.com', 'SecurePass123!')
      cy.visit('/dashboard/kpi-dashboard')
    })

    it('should display 8 critical mining KPIs', () => {
      cy.get('[data-testid="kpi-equipos"]').should('exist')
      cy.get('[data-testid="kpi-mtbf"]').should('exist')
      cy.get('[data-testid="kpi-stock"]').should('exist')
      cy.get('[data-testid="kpi-documentos"]').should('exist')
      cy.get('[data-testid="kpi-hse"]').should('exist')
      cy.get('[data-testid="kpi-ocs"]').should('exist')
      cy.get('[data-testid="kpi-costos"]').should('exist')
      cy.get('[data-testid="kpi-alertas"]').should('exist')
    })

    it('should update KPI values every minute', () => {
      cy.get('[data-testid="kpi-equipos-value"]').then($el => {
        const initialValue = $el.text()
        cy.wait(61000)
        cy.get('[data-testid="kpi-equipos-value"]').should('not.have.text', initialValue)
      })
    })
  })
})

// Custom Cypress commands
Cypress.Commands.add('login', (email: string, password: string) => {
  cy.visit('/auth/login')
  cy.get('input[name="email"]').type(email)
  cy.get('input[name="password"]').type(password)
  cy.get('button[type="submit"]').click()
  cy.url().should('include', '/dashboard')
})
