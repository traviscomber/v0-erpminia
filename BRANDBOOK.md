# La Patagua - Brandbook (Super Simple)

## Core Colors (4 Only)

| Name | Use | Tailwind Class | CSS Variable |
|------|-----|----------------|--------------|
| **Gris Oscuro** | Backgrounds, text | `bg-background`, `text-foreground` | `--background`, `--foreground` |
| **Naranja** | Primary actions, buttons, links | `bg-primary`, `text-primary` | `--primary` |
| **Verde** | Success, secondary, accents | `bg-secondary`, `text-secondary` | `--secondary` |
| **Rojo** | Errors, destructive actions | `bg-destructive`, `text-destructive` | `--destructive` |

## Rules for All UI

1. **NO gradients** - Use solid colors only
2. **NO purple/violet** - Never use these colors
3. **NO blue** - Use verde (green) instead for info states
4. **Maximum 4 colors per page** - background, primary action, secondary accent, destructive if needed

## Allowed Tailwind Classes

### Backgrounds
- `bg-background` - Main backgrounds (dark gray in dark mode)
- `bg-card` - Card backgrounds
- `bg-muted` - Muted/secondary backgrounds
- `bg-primary` - Primary action backgrounds (naranja)
- `bg-secondary` - Secondary action backgrounds (verde)
- `bg-destructive` - Error/delete backgrounds (rojo)

### Text
- `text-foreground` - Main text
- `text-muted-foreground` - Secondary text
- `text-primary` - Links, emphasis (naranja)
- `text-secondary` - Success text (verde)
- `text-destructive` - Error text (rojo)

### Borders
- `border-border` - Default borders
- `border-primary` - Accent borders (naranja)

## Button Styles

```jsx
// Primary (Naranja) - Main actions
<Button className="bg-primary hover:bg-primary/90">

// Secondary (Verde) - Secondary actions
<Button variant="secondary">

// Destructive (Rojo) - Delete, danger
<Button variant="destructive">

// Ghost/Outline - Neutral
<Button variant="ghost">
<Button variant="outline">
```

## Card Styles

```jsx
// Standard card
<Card className="bg-card border-border">

// Highlighted card (use sparingly)
<Card className="bg-card border-primary">
```

## Status Indicators

| Status | Color | Class |
|--------|-------|-------|
| Success/Aprobado | Verde | `text-secondary`, `bg-secondary/10` |
| Warning/Pendiente | Naranja | `text-primary`, `bg-primary/10` |
| Error/Rechazado | Rojo | `text-destructive`, `bg-destructive/10` |
| Neutral/Info | Gris | `text-muted-foreground`, `bg-muted` |

## Typography

- Headings: `font-heading` (Montserrat)
- Body: `font-sans` (Geist)
- Code: `font-mono` (Geist Mono)

## Do NOT Use

- `bg-blue-*`, `text-blue-*`
- `bg-purple-*`, `text-purple-*`, `bg-violet-*`
- `bg-gradient-*`, `from-*`, `to-*`
- `bg-orange-*` (use `bg-primary` instead)
- `bg-green-*` (use `bg-secondary` instead)
- `bg-red-*` (use `bg-destructive` instead)
- Any arbitrary color values like `bg-[#FF6B35]`

## Quick Reference

```
Naranja = primary = #E8933A = oklch(0.62 0.18 40)
Verde = secondary = #2D7A3F = oklch(0.48 0.14 142)
Rojo = destructive = #C0392B = oklch(0.45 0.18 25)
Gris Oscuro = background (dark) = #252525 = oklch(0.145 0 0)
```
