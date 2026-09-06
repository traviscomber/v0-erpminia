# MOTIL Maintenance UI Rules

`DESIGN.md` in the repository is canonical. Re-read it before substantial UI work. These are the maintenance-specific operating rules.

## Hierarchy

Every screen should communicate in this order:

1. What area/context am I in?
2. What requires attention?
3. What is the evidence/state?
4. What is the next valid action?

Prefer operational density over decoration, but never hide critical provenance or uncertainty.

## Layout

- One primary intent per route.
- One primary visible action; at most one secondary visible action in the header.
- Additional actions belong in contextual menus.
- KPI rows: 2 to 4 cards, no duplicates.
- Avoid nested cards and heavy shadows.
- Use semantic theme tokens; avoid hardcoded colors for ordinary UI.
- Support dark/light modes and WCAG AA contrast.
- Preserve visible focus, minimum touch size, and `prefers-reduced-motion`.
- Responsive behavior is required, not deferred polish.

## Naming

Use one name per concept across navigation, data, and UI. Do not casually alternate Activos/Equipos/Maquinaria for the same master entity. If a distinction is real, document it.

## State presentation

Support and explain:

- loading;
- updated;
- partial data;
- empty/no data;
- no permissions;
- recoverable error;
- blocking error.

Partial data must say what source is missing or incomplete.

## Derived and uncertain information

Clearly distinguish:

- Canonical.
- Derived.
- Pending review/promotion.
- Historical.
- Inactive.
- Evidence only.

Do not style inferred/derived records as equivalent to canonical entities.

## Maintenance Assistant launcher and panel

- Keep the launcher transparent, in-code, and token-based.
- Use subtle motion only; it must feel alive without competing with operational alerts.
- Respect reduced-motion settings.
- The assistant panel should show canonical status, user/cargo context when useful, memory count, model/source context, and a clear new-conversation control.
- Conversation history is the main content; starter prompts are onboarding aids, not permanent clutter once a session has started.
