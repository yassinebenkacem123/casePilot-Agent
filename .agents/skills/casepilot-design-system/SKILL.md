---
name: casepilot-design-system
description: CasePilot AI brand identity, dark-first design tokens, enlarged logo rules, Figma-based layout composition, Kanban, and AI agent UI patterns. Load whenever creating or modifying UI components.
---

# CasePilot AI — Design System & UI Guidelines

## 1. Brand Identity & Visual Direction

**Brand name:** CasePilot AI
**Positioning:** Intelligent customer support orchestration platform powered by LangGraph, RAG, human-in-the-loop governance, and Salesforce Service Cloud.
**Visual Direction:** *A premium creative agency layout (`FasterUI` Figma reference `#1:3`) transformed into an enterprise-grade dark-first AI SaaS experience.*

---

## 2. Color Tokens & Usage Rules

CasePilot AI uses a **light-first** visual identity (`#F5F8FF` / `#FFFFFF` + `#FF3419` sampled brand orange-red). All tokens are centralized in `frontend/app/globals.css`.

| Semantic Token | CSS Variable | Value | Usage |
|---|---|---|---|
| Main background | `--background` | `#F5F8FF` | App canvas, page backdrop |
| Secondary background | `--bg-secondary` | `#EEF2FB` | Kanban column wells, recessed surfaces |
| Card background | `--card` | `#FFFFFF` | Bento cards, metric cards, ticket cards, drawers |
| Elevated surface | `--elevated` | `#F3F5FA` | Secondary buttons, icon wells, badges, hover states |
| Primary text | `--foreground` | `#151414` | Headings, primary labels, ticket titles |
| Secondary text | `--muted-foreground` | `#5C5B70` | Descriptions, metadata, timestamps |
| Primary accent | `--primary` | `#FF3419` | Sampled from official logo AI badge; primary CTAs, active nav, floating agent FAB, AI indicators |
| Accent hover | `--primary-hover` | `#E52B1A` | Hover/active state for primary buttons |
| Subtle border | `--border` | `#DFE4F2` | 1px hairlines, card/input outlines |
| Success | `--success` | `#16A34A` | Approved states, low priority, live sync |
| Warning | `--warning` | `#D97706` | Medium priority, demo mode notices |
| Danger | `--danger` | `#DC2626` | Errors, critical severity, destructive actions |

**Strict Usage Rules:**
- Black (`#000000`) and dark charcoal (`#0D0D0F`, `#151518`) dominate the interface.
- **Never** use generic blue/purple AI gradients (`#4E47FF` / `#5B54FF` from the source Figma template are always replaced with `#FF3419` or dark surfaces).

---

## 3. Enlarged Logo Sizing & Usage

The source logo PNGs (`2700x1500`) have native vertical transparent whitespace (`Content bbox: 2672x702`).
- **Always** render via `<BrandLogo variant="dark-surface" size="header" | "md" | "sm" />` (`frontend/components/brand-logo.tsx`).
- **Desktop Header Target:** `220px–255px` wide (`w-[180px] sm:w-[230px] lg:w-[255px]`), using `.brand-logo-img` (`margin-top: -15%; margin-bottom: -18%`) to trim only transparent vertical whitespace without clipping, stretching, or recoloring the mark or AI badge.
- **Dark surfaces (default):** `/assets/casepilot-logo-dark.png` (white wordmark + `#FF3419` AI badge).
- **Light surfaces:** `/assets/casepilot-logo-light.png` (`#151414` wordmark + `#FF3419` AI badge).

---

## 4. Typography

- **Headings (`h1`–`h3`, metrics, FAQ triggers):** `Sora` (`--font-sora`), weights `600`–`700`, tight tracking (`-0.03em` to `-0.035em`).
- **Body & UI:** `Inter` (`--font-inter`), `14px` base, `1.5`–`1.65` line height.
- **Monospace:** `ui-monospace` for ticket references (`CP-XXXX`), tracking IDs, and run IDs.

---

## 5. Figma-Based Landing Page Structure (`features/tickets/landing.tsx`)

Follows the `Faster Template` (`node-id=1:3`) composition converted to dark-first CasePilot AI:
1. **Top Navigation:** Enlarged left `<BrandLogo size="header" />`, centered glassmorphic pill container (`border-radius: 20px`) with `Platform`, `Features`, `How It Works`, `AI Capabilities`, `Dashboard`, `Contact`, and right `Sign In` + `Get Started` CTA.
2. **Hero:** Centered display headline (*"Customer Support. Reimagined with AI."*), subtitle, `Explore Platform` + `View Dashboard` CTAs, backed by local `/assets/figma/hero-mesh.svg`.
3. **Asymmetric 4-Column Bento Grid ("What CasePilot Does"):** 3 top cards + 1 tall vertical span-2 card on the right (with live mini `Low / Medium / High` Kanban preview) + 1 wide span-2 card on the bottom-left (with `#FF3419` RAG grounding callout) + 1 standard card.
4. **Orchestration in Action (3-Card Showcase + Trust Pill):** Product previews + centered rounded trust badge.
5. **Split Capabilities Section:** Left CTA card + right 2-column checklist card with bottom stat bar.
6. **FAQ Accordion:** 2-column split with interactive accordion items.
7. **Submit a Support Request:** Centered `<IntakeForm />` + floating bottom-right `<SupportAgentPopup />`.
8. **Rounded Footer Card:** `32px` radius card with `/assets/figma/footer-wave.svg`, `<BrandLogo />`, and navigation links.

---

## 6. Operational Dashboard, Kanban & Human Review

- **Priority Kanban (`Low` / `Medium` / `High`):** Agent-triaged tickets (`proposed_priority ?? priority`) automatically populate `Low`, `Medium`, and `High` columns (`CRITICAL` grouped in `High` with a `critical` badge).
- **Confirm or Change Drawer:** Clicking any card opens `TicketDrawer` with a prominent **Confirm or Change** bar (`Confirm recommendation` or quick-select `low` / `medium` / `high` / `critical`), field locks, RAG sources, Salesforce sync, and audit timeline.
- **Pop-up Support Agent:** Floating bottom-right `<SupportAgentPopup />` allows submitting requests directly from `/board` without leaving the workspace.
