---
name: SOC Console Telemetry System
colors:
  surface: '#0e1320'
  surface-dim: '#0e1320'
  surface-bright: '#343948'
  surface-container-lowest: '#090e1b'
  surface-container-low: '#161b29'
  surface-container: '#1a1f2d'
  surface-container-high: '#252a38'
  surface-container-highest: '#303443'
  on-surface: '#dee2f5'
  on-surface-variant: '#bbcac6'
  inverse-surface: '#dee2f5'
  inverse-on-surface: '#2b303e'
  outline: '#859490'
  outline-variant: '#3c4947'
  surface-tint: '#4fdbc8'
  primary: '#4fdbc8'
  on-primary: '#003731'
  primary-container: '#14b8a6'
  on-primary-container: '#00423b'
  inverse-primary: '#006b5f'
  secondary: '#5de6ff'
  on-secondary: '#00363e'
  secondary-container: '#00cbe6'
  on-secondary-container: '#00515d'
  tertiary: '#bcc7de'
  on-tertiary: '#263143'
  tertiary-container: '#9aa5bb'
  on-tertiary-container: '#303b4e'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#71f8e4'
  primary-fixed-dim: '#4fdbc8'
  on-primary-fixed: '#00201c'
  on-primary-fixed-variant: '#005048'
  secondary-fixed: '#a2eeff'
  secondary-fixed-dim: '#2fd9f4'
  on-secondary-fixed: '#001f25'
  on-secondary-fixed-variant: '#004e5a'
  tertiary-fixed: '#d8e3fb'
  tertiary-fixed-dim: '#bcc7de'
  on-tertiary-fixed: '#111c2d'
  on-tertiary-fixed-variant: '#3c475a'
  background: '#0e1320'
  on-background: '#dee2f5'
  surface-variant: '#303443'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: 0em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.04em
  code-md:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0em
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style

This design system delivers an operational interface tailored for real-time threat investigation, telemetry analysis, and rapid incident response. It is engineered for Tier 1 to Tier 3 SOC analysts, incident responders, and security engineers operating in high-stress, low-light environments. 

The aesthetic is precision-driven, corporate, and functional. Visual hierarchy emphasizes immediate threat classification, uncompromised signal-to-noise ratio, and cognitive ergonomics during extended investigations. Information density is calibrated to display complex audit logs, forensic artifacts, and correlation graphs without inducing operational fatigue. Every visual cue communicates status and certainty. The system avoids frivolous ornamentation, grounding all visual affordances in high-contrast data legibility, structured telemetry presentation, and strict semantic triage rules.

## Colors

The color system is optimized for high-density dark displays, utilizing structural slate blues and deep navy tones to minimize optical strain.

- **Background & Canvas:** `#0A0F1C` forms the foundational base surface.
- **Card Surfaces:** `#111827` defines card and container planes, separated from the base with 1px borders of `#1E293B`.
- **Surface Variant & Active Panels:** `#1E293B` provides raised elevation for toolbars, inspect drawers, and filter bars.
- **Primary Telemetry Accent:** `#14B8A6` serves as the primary actionable anchor for verified operational states, critical CTAs, and active navigation items.
- **Secondary Accent:** `#22D3EE` provides supplemental telemetry highlights and data visualization metrics.

### Incident Triage & Risk Palette
Verdicts and threat tiers rely on strict, multi-modal semantic colors paired with persistent iconography:
- **Low Risk:** `#22C55E` (Green) with check-circle glyph.
- **Suspicious:** `#F59E0B` (Amber) with alert-triangle glyph.
- **High Risk:** `#EF4444` (Bright Red) with octagonal alert glyph.
- **Confirmed Malicious:** `#B91C1C` (Deep Crimson) accompanied by a shield glyph and a controlled crimson drop shadow.
- **Inconclusive:** `#64748B` (Slate Grey) with help-circle glyph.

*Operational Constraint:* The term "Safe" is strictly forbidden in verdict taxonomies; use "Low Risk" or "Benign / Verified".

## Typography

Typography prioritizes legibility, scannability, and structural order. `Inter` acts as the primary typeface across all structural headers, body text, data matrices, and action items. Its neutral geometric proportions and tall x-height prevent eye strain during intense analytical sessions.

Technical artifacts—including defanged URLs (`hxxps[:]//`), SHA-256 hashes, IPv4/IPv6 addresses, MITRE ATT&CK technique IDs, and payload strings—must strictly use `JetBrains Mono`. Monospaced text preserves character-level differentiation (such as zero versus O and 1 versus l), ensuring rapid string inspection without ambiguity.

## Layout & Spacing

The layout is built on a responsive 12-column fluid grid system engineered for multi-monitor workstations, security dashboards, and wide-aspect display setups.

- **Grid Architecture:** Column gutters are set to `1rem` (16px) with dynamic outer margins starting at `1.5rem` (24px) for screens ≥1440px. On compact monitors (1024px–1439px), margins tighten to `1rem` to preserve screen real estate for audit logs and forensic tables.
- **Docked Panels:** Side drawers (artifact triage, packet inspector, event timelines) operate with a fixed width of 380px or 480px, sitting beside the primary fluid telemetry panel.
- **Component Padding Scale:** Internal card and container padding follows the strict 4px/8px rhythm: `space-xs` (4px) for badge and chip insets, `space-sm` (8px) for compact table cells and action bars, `space-md` (12px) for standard form groups, and `space-lg` (16px) to `space-xl` (24px) for incident summary cards and structural containers.

## Elevation & Depth

Visual hierarchy uses tonal surface layering combined with low-contrast structural outlines rather than heavy drop shadows:

- **Layer 0 (Canvas Base):** `#0A0F1C` paired with an optional 32px structural slate grid (`rgba(30, 41, 59, 0.35)`) and faint radial teal gradients (`rgba(20, 184, 166, 0.03)`) centered around primary analytical widgets.
- **Layer 1 (Card/Container Surfaces):** `#111827` featuring a 1px border of `#1E293B`. For actionable or focused modules, the outline elevates to `rgba(56, 189, 248, 0.2)`.
- **Layer 2 (Elevated Drawers, Menus, Modals):** `#1E293B` surrounded by a dual boundary: a 1px solid stroke (`rgba(148, 163, 184, 0.15)`) coupled with an ambient shadow `0 12px 32px -4px rgba(0, 0, 0, 0.6)`.
- **Layer 3 (Confirmed Malicious Warning State):** Structural cards displaying active malicious verdicts employ an inner boundary stroke of `#B91C1C` with an ambient glow of `0 0 24px -2px rgba(185, 28, 28, 0.25)`.

## Shapes

The design system maintains a uniform roundedness level of 2 (base `0.5rem` / 8px border-radius, with `rounded-lg` resolving to `0.75rem` / 12px). 

Containers, analytical cards, modals, and forensic detail frames consistently adopt the 12px corner radius (`rounded-lg`), delivering a modern, engineered contour while preserving space efficiency in tight grid partitions. Inline controls—including primary buttons, text input fields, search filters, and severity tags—leverage the base 8px radius to keep interactive touchpoints crisp and clearly delineated. Micro-indicators and risk level badges use a structured 6px to 8px radius to prevent visual competition with circular indicator pips.

## Components

### Buttons
- **Primary:** Solid `#14B8A6` background, `#0A0F1C` bold typography, 8px radius. Hover state transitions to `#22D3EE` with an ambient `0 0 12px rgba(20, 184, 166, 0.3)` glow.
- **Secondary / Ghost:** Transparent background with a 1px border of `#1E293B`, `#F8FAFC` text. Hover shifts to `#1E293B` background and `#14B8A6` border.
- **Destructive / Containment:** `#B91C1C` background with `#FFFFFF` text, utilized strictly for host isolation, token revocation, and rule blocking.

### Severity & Verdict Badges
Badges are non-pill shapes (6px corner radius) with multi-modal architecture: an explicit SVG icon, uppercase label (`label-sm`), and a high-contrast container.
- **Format:** `[Icon] VERDICT_LABEL`
- **Low Risk:** `#22C55E` border & icon, background `rgba(34, 197, 94, 0.1)`.
- **Suspicious:** `#F59E0B` border & icon, background `rgba(245, 158, 11, 0.1)`.
- **High Risk:** `#EF4444` border & icon, background `rgba(239, 68, 68, 0.12)`.
- **Confirmed Malicious:** `#B91C1C` border & shield icon, background `rgba(185, 28, 28, 0.2)`, faint red shadow.
- **Inconclusive:** `#64748B` border & question icon, background `rgba(100, 116, 139, 0.1)`.

### Form Controls & Inputs
- **Search & Filter Bars:** `#111827` background, 1px `#1E293B` border, 8px radius, placeholder in `#64748B`. Focus state initiates a 1px stroke of `#14B8A6` and an inner cyan ring.
- **Checkboxes & Radios:** 18px square with 4px radius; unchecked state has a 1.5px `#64748B` border. Checked state displays solid `#14B8A6` with high-contrast `#0A0F1C` mark.

### Telemetry Tables & Artifact Cards
- **Table Rows:** Compact height (36px), `#111827` background alternating with `#0F172A`, 1px bottom border of `#1E293B`. Hover states highlight rows with `rgba(20, 184, 166, 0.05)`.
- **Monospace Code Snippets:** Defanged indicators (`hxxp[:]//bad[.]domain`, `192[.]168[.]1[.]1`) render in `JetBrains Mono` at 12px with inline copy-to-clipboard triggers.
- **Cards:** `#111827` background, 12px radius, 1px border (`#1E293B`), headers separated by subtle divider strokes with action menus aligned to the top-right corner.