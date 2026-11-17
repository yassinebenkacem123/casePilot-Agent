---
name: casepilot-design-system
description: CasePilot AI brand identity, dark-first design tokens, typography, layout, Kanban, and AI agent UI patterns. Load whenever creating or modifying UI components.
---

# CasePilot AI — Design System & UI Guidelines

## 1. Brand Identity & Personality

**Brand name:** CasePilot AI
**Positioning:** Intelligent customer support orchestration platform — Linear-level precision, modern AI platform aesthetics, and enterprise Salesforce workflows.

**Personality:**
- **Premium & modern:** High-contrast dark surfaces, crisp 1px borders, disciplined spacing.
- **Intelligent & trustworthy:** Transparent AI reasoning, explicit confidence and provenance, never opaque or gimmicky.
- **Human-centered AI:** AI proposes; humans approve. Proposed actions are visually distinct from approved/executed actions.
- **Enterprise-ready:** Accessible, keyboard-navigable, responsive across desktop, tablet, and mobile.

---

## 2. Color Tokens & Usage Rules

CasePilot AI uses a **dark-first** visual identity. All colors are centralized as CSS custom properties in `frontend/app/globals.css` — never hardcode hex values in components.

| Semantic Token | CSS Variable | Value | Usage |
|---|---|---|---|
| Main background | `--background` | `#000000` | App canvas, page backdrop |
| Secondary background | `--bg-secondary` | `#0D0D0F` | Sidebar, topbar, recessed regions |
| Card background | `--card` | `#151518` | Metric cards, ticket cards, form panels, Kanban columns |
| Elevated surface | `--elevated` | `#1F1F23` | Drawers, popovers, hover states, active inputs |
| Primary text | `--foreground` | `#F5F5F7` | Headings, primary labels, ticket titles |
| Secondary text | `--muted-foreground` | `#A1A1AA` | Metadata, descriptions, timestamps, hints |
| Primary accent | `--primary` | `#FF3419` | Sampled from official logo AI badge; primary CTAs, active nav, selected states, key AI indicators |
| Accent hover | `--primary-hover` | `#E52B1A` | Hover/active state for primary buttons |
| Subtle border | `--border` | `#2A2A2E` | 1px hairlines, dividers, card/input outlines |
| Success | `--success` | `#22C55E` | Approved states, resolved status, live sync |
| Warning | `--warning` | `#F59E0B` | Pending review, demo mode notices, medium-high alerts |
| Danger | `--danger` | `#EF4444` | Errors, critical severity, destructive actions |

**Strict Usage Rules:**
- Black (`#000000`) and dark charcoal (`#0D0D0F`, `#151518`) dominate ≥ 85% of the viewport.
- Reserve `#FF3419` for primary CTAs, active navigation indicators, focused/selected states, and meaningful AI highlights.
- **Never** use generic blue/purple AI gradients or neon glow effects.
- **Never** use large orange background fills for cards or panels.

---

## 3. Typography

- **Headings (`h1`–`h3`, display metrics):** `Sora` (`--font-sora`), tight tracking (`-0.025em` to `-0.04em`), weights `600`–`700`.
- **Body & UI:** `Inter` (`--font-inter`), `14px` base, `1.5`–`1.65` line height, weights `400`–`600`.
- **Monospace (ticket refs, tracking IDs, run IDs):** `JetBrains Mono` / `ui-monospace`.

Avoid decorative weights above `700` or ultra-light weights below `400`.

---

## 4. Logo Usage Guidelines

Use the original logo PNGs as the single source of truth. **Never** recreate, stretch, skew, recolor, or replace them with SVG approximations or AI-generated variants.

- **Dark surfaces (default):** `/assets/casepilot-logo-dark.png` (white wordmark + `#FF3419` AI badge, transparent background).
- **Light surfaces:** `/assets/casepilot-logo-light.png` (`#151414` wordmark + `#FF3419` AI badge).
- Always render via the reusable `<BrandLogo />` component with `object-contain` and explicit aspect-preserving dimensions. Maintain clear space around the mark.

---

## 5. Layout & Spacing Principles

- **App Shell:** Fixed/collapsible left sidebar (`240px` desktop, compact top bar on mobile `<= 768px`) + sticky translucent top bar (`64px`, `backdrop-filter: blur(12px)`) + spacious main content area (`max-width: 1600px`).
- **Grid & Rhythm:** 4px/8px spacing scale (`gap: 16px`–`24px` for grids, `16px`–`24px` internal card padding).
- **Responsive Breakpoints:**
  - Desktop (`>= 1200px`): 4-column metric grid, 4-column Kanban board, full sidebar.
  - Tablet (`768px`–`1199px`): 2-column metric grid, horizontal-scroll Kanban columns, compact sidebar.
  - Mobile (`<= 767px`): Stacked intake, collapsible/compact nav, 2-column or 1-column metrics, horizontal-scroll or stacked Kanban.

---

## 6. Component Design Patterns

- **Cards:** `--card` (`#151518`) background, `1px solid var(--border)` (`#2A2A2E`), `10px`–`12px` radius, restrained border-brightening on hover (`#3A3A40`).
- **Primary Buttons:** `--primary` (`#FF3419`) background, `#FFFFFF` text, `--primary-hover` (`#E52B1A`) on hover, subtle `scale(0.98)` press feedback.
- **Secondary / Outline Buttons:** `--elevated` (`#1F1F23`) or transparent background, `1px solid var(--border)`, `--foreground` text.
- **Inputs & Selects:** `--bg-secondary` (`#0D0D0F`) background, `1px solid var(--border)`, `--foreground` text, `#FF3419` focus ring (`2px` offset).

---

## 7. Kanban-Specific Design Rules

- **Priority vs. Status Separation:** Priority (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`) is severity; Status (`REVIEW`, `TODO`, `IN_PROGRESS`, `RESOLVED`) is workflow column. Never conflate them.
- **Columns:** Subtle column header with status dot, count pill, and `--bg-secondary` container.
- **Ticket Cards:** Display `public_ref`, drag handle, clickable subject title, customer name, priority badge (semantic color), intent tag, assigned team, AI confidence, approval state badge (`PENDING` vs `APPROVED`), and accessible keyboard/select move controls.
- **Drag & Drop:** Preserve `@dnd-kit/react` `useSortable` / `useDroppable` contracts, clear `.dragging` visual feedback (elevated border + subtle accent ring), and keyboard move controls.

---

## 8. AI Agent UI Patterns

- **Visual States:** Explicitly surface agent lifecycle states with restrained icons and concise labels:
  - `PENDING_ANALYSIS`: AI analyzing request (subtle pulse indicator, never blocking).
  - `COMPLETED` + `PENDING` proposal: Intent detected, Priority suggested, Team recommended, Knowledge retrieved — **Awaiting human approval**.
  - `APPROVED`: Human-approved decision (green/verified indicator).
  - `FAILED`: Agent error (semantic danger alert with retry option).
- **AI vs. Human Authority:**
  - AI recommendations live in a clearly labeled **AI Proposal** container with `#FF3419` accent tag, confidence percentage, and rationale.
  - Human overrides and locked fields (`human_locked_fields`) display explicit lock badges.
  - **Never** present a proposed action or draft reply as sent or synced.

---

## 9. Motion, Accessibility & Quality Checklist

- **Motion:** Smooth `150ms`–`220ms` cubic-bezier transitions for drawers, modals, card hover, and button press. Wrap animations with `@media (prefers-reduced-motion: reduce)` fallbacks.
- **Accessibility:**
  - WCAG AA contrast on all dark surfaces (`#F5F5F7` on `#151518` > 13:1; `#A1A1AA` on `#151518` > 6:1).
  - Visible `:focus-visible` outlines (`#FF3419`).
  - Semantic landmarks (`<main>`, `<aside>`, `<header>`, `<section aria-label>`), `role="alert"`, `role="status"`, and keyboard-accessible DnD controls.

**Pre-merge Checklist:**
- [ ] Zero hardcoded off-brand colors (`#5359d9`, light-mode `#fff` surfaces) remaining.
- [ ] Official `<BrandLogo />` rendered cleanly without distortion.
- [ ] `Sora` and `Inter` loaded and applied.
- [ ] AI proposals clearly separated from human-approved actions.
- [ ] `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` pass.

