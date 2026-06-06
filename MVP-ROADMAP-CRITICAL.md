# Motil MVP - Critical Audit Findings & Roadmap

**Audit Date**: June 6, 2026  
**Current MVP Status**: 28-32% (revised from 92%)  
**Assessment**: Prototype funcional temprano / pre-MVP comercial

---

## Executive Summary

Motil has a **strong landing/positioning** but **lacks verified internal systems**. The audit reveals that:
- Landing page: 70% complete (messaging is solid)
- Internal modules: 25-35% complete (mostly scaffolding, limited CRUD)
- Database: Not verified (auth/roles/permissions behind login)
- Integrated workflows: 20% complete (narrativa, not funcional)

**Key Finding**: This is a **visual MVP**, not an **operational MVP**. To reach 65-70% (piloto-ready), prioritize core infrastructure over module expansion.

---

## Module Completion Assessment

| Module | Current % | MVP Target | Gap | Priority |
|--------|-----------|-----------|-----|----------|
| **Auth/Login** | 30% | 80% | Password recovery, roles, multi-company | CRITICAL |
| **Roles/Permissions** | 25% | 80% | Matrix is hidden; must verify real perms | CRITICAL |
| **Database Schema** | Not verified | 100% | Need clean schema for Users, Companies, Assets, OT, Parts, Documents | CRITICAL |
| **Audit Log** | 25% | 75% | Who/what/when/before/after tracking | CRITICAL |
| **Dashboard Interno** | 25% | 80% | Role-based dashboard layout | HIGH |
| **Mantención/OT** | 35% | 75% | CRUD, estados, asignación, evidencia, MTTR | HIGH |
| **Bodega** | 30% | 65% | Inventory, movimientos, reservas, mínimos | HIGH |
| **HSE** | 30% | 65% | Checklists, incidentes, RCA, auditoría | HIGH |
| **Documentos** | 25% | 55% | Repositorio, versionado, permisos, vencimientos | MEDIUM |
| **Producción** | 25% | 50% | Dashboard, alertas simuladas, eventos → OT | MEDIUM |
| **Mobile/Campo** | 15% | 60% | PWA, offline sync, QR, fotos | MEDIUM |

---

## Phase 0: Core System (BLOCKING)

**DO THIS FIRST. Nothing else works without this.**

### Phase 0.1: Database Schema
- [ ] Users (email, company_id, role, status)
- [ ] Companies/Faenas (name, location, status)
- [ ] Assets/Equipos (code, name, company_id, type, status)
- [ ] WorkOrders (id, asset_id, status, assigned_to, created_at, closed_at)
- [ ] Inventory (part_code, name, quantity, reorder_level)
- [ ] Documents (name, category, associated_to, version, expires_at)
- [ ] Incidents (type, severity, status, asset_id)
- [ ] AuditLog (user_id, action, entity, before, after, timestamp)

**Effort**: 4-6 hours  
**Blocking**: Everything

### Phase 0.2: Auth + Roles
- [ ] Fix login (password recovery, email verification)
- [ ] Implement role matrix: Admin, Gerencia, Jefe Mantención, Técnico, Bodega, HSE, Operador
- [ ] Protect routes by role
- [ ] Create role-based sidebar

**Effort**: 6-8 hours  
**Blocking**: Internal dashboard, all modules

### Phase 0.3: Global Audit Log
- [ ] Log every mutation: create, update, delete
- [ ] Capture: user_id, action, entity_type, entity_id, before/after, timestamp
- [ ] Create audit dashboard (read-only history)

**Effort**: 4-5 hours  
**Blocking**: Compliance, trazabilidad

---

## Phase 1: Mantención MVP (Core Workflow)

**Once Phase 0 is done, make Mantención the heart of the system.**

- [ ] Asset CRUD (create, list, edit, delete)
- [ ] WorkOrder CRUD
- [ ] WorkOrder states: Nueva → Asignada → En Proceso → Bloqueada → Cerrada
- [ ] Assign técnico
- [ ] Add evidence (photos)
- [ ] Checklist before closure
- [ ] Auto-calculate MTTR
- [ ] Asset history (all OTs for an equipment)

**Effort**: 12-15 hours  
**Result**: First real CRUD, first workflow verification

---

## Phase 2: Bodega Conectada

**Connect parts to WorkOrders.**

- [ ] Inventory CRUD
- [ ] Movement tracking (entrada/salida)
- [ ] Reserve parts for OT
- [ ] QR per part
- [ ] Low stock alerts
- [ ] FIFO tracking (basic)

**Effort**: 10-12 hours  
**Result**: OT → Repuesto → Auditoría

---

## Phase 3: HSE Integrado

**Make HSE part of the workflow, not a separate module.**

- [ ] HSE Checklist by work type
- [ ] Incident logging
- [ ] RCA básico
- [ ] Evidence (photos)
- [ ] Require HSE approval for critical OTs
- [ ] Audit export

**Effort**: 10-12 hours  
**Result**: Mantención + Bodega + HSE flow

---

## Phase 4: Documentos + Trazabilidad

**Close the loop with document management and audit trail.**

- [ ] Document upload
- [ ] Categories: contract, procedure, OC, report
- [ ] Associate to asset/OT/provider
- [ ] Basic versioning
- [ ] Expiration tracking
- [ ] Permissions by role
- [ ] Export audit trail

**Effort**: 8-10 hours  
**Result**: Full trazabilidad

---

## Phase 5: Producción Simulada + Demo

**Make the story complete (even with simulated data).**

- [ ] Production dashboard (assets, status)
- [ ] Simulated alerts
- [ ] Event → Create OT workflow
- [ ] Full end-to-end demo
- [ ] KPI dashboard (MTTR, costs, availability)

**Effort**: 12-14 hours  
**Result**: Completestory for executive demo

---

## Implementation Roadmap

| Phase | Focus | Duration | Result |
|-------|-------|----------|--------|
| **Phase 0** | Core system (DB, Auth, Roles, Audit) | 14-19h | MVP-ready foundation |
| **Phase 1** | Mantención CRUD + workflow | 12-15h | First real module |
| **Phase 2** | Bodega integration | 10-12h | OT ↔ Parts flow |
| **Phase 3** | HSE integration | 10-12h | Complete workflow |
| **Phase 4** | Docs + Audit export | 8-10h | Compliance-ready |
| **Phase 5** | Producción simulada + demo | 12-14h | Executive demo ready |
| **TOTAL** | | **66-82h** | **65-70% MVP** |

---

## MVP Definition for Piloto

**Motil MVP** = System that allows:
1. Register mining assets
2. Create work orders + assign technicians
3. Reserve parts from inventory
4. Execute HSE checklist
5. Close with photo evidence
6. Show KPIs (MTTR, costs, availability)
7. Full audit trail of who did what when

**NOT included in MVP**:
- Real sensor integration (simulate instead)
- Complex financials
- Multi-language
- Mobile app (responsive web)
- Advanced AI

---

## Next Action

**Do NOT continue polishing the landing page.**

Start Phase 0 immediately:
1. Create/verify Supabase schema
2. Fix auth + roles
3. Implement audit log

Phase 0 must be 100% done before Phase 1 starts. Everything depends on it.

---

## Reference

- Landing positioning: **70%** ✓ (keep as-is)
- Internal system: **28-32%** ⚠️ (rebuild in phases)
- Target for piloto: **65-70%**
- Estimated effort: **66-82 hours**
