# Passport Photo -- Enterprise Design System

**Stitch Project ID:** `18047477797600754077`
**Design System Asset:** `assets/7347767274704808666` (v2)

## Aesthetic

Bold, authoritative, no-nonsense utility app. Enterprise SaaS feel (Vercel, Linear, Stripe). Zero emojis.

## Color Tokens

| Role | Hex | Usage |
|---|---|---|
| Primary | `#0A0A0A` | Headlines, primary buttons, text |
| Accent Blue | `#2563EB` | Primary CTA only (Export button) |
| Slate Gray | `#64748B` | Secondary text, descriptions, borders |
| Background | `#FFFFFF` | Page background |
| Surface | `#F8FAFC` | Section dividers, info bars |
| Border | `#E2E8F0` | Card/input borders |
| Divider | `#F1F5F9` | List row dividers |
| Cut Lines | `#CBD5E1` | Dashed crop marks on print preview |

## Typography

| Level | Font | Weight | Size | Tracking |
|---|---|---|---|---|
| Display | Space Grotesk | 700 | 36px | -0.02em |
| Headline | Space Grotesk | 700 | 24px | -0.01em |
| Body | Inter | 400 | 16px | 0 |
| Label | Inter | 500 | 13px | 0.02em |
| Fine Print | Inter | 400 | 12px | 0 |

## Shape

- Corner radius: 4px (sharp, not bubbly)
- No shadows, no gradients, no decorative elements
- 1px solid borders only

## Components

- **Buttons (Primary):** Solid black fill, white text, 4px radius, 52px height
- **Buttons (Outline):** 1px black border, black text, white fill, 4px radius, 52px height
- **Buttons (CTA):** Solid #2563EB fill, white text, 4px radius, 52px height
- **Search Input:** Full-width, 1px #E2E8F0 border, 48px height, line search icon
- **Filter Chips:** Active = black bg/white text, Inactive = 1px border/black text, 4px radius
- **List Rows:** 64px height, 1px dividers, no cards
- **Navigation:** Text-only "< Back", no icons

## Screens

| Screen | Stitch ID | Local File |
|---|---|---|
| Select Photo | `c10fc67e95a9445084e38b4778d94c49` | `.stitch/designs/select-photo.html` |
| Choose Template | `f739c5cc0c5b442b86449a9dd9d02a23` | `.stitch/designs/choose-template.html` |
| Preview & Export | `51fad187aed941bdb9b155bccb53cc65` | `.stitch/designs/preview-export.html` |

## Rules

- NO emojis anywhere -- use text labels and minimal line icons only
- Country flags as small rectangular images, never emoji
- Flat monochromatic icon style (Material Symbols Outlined)
- High contrast: near-black on white for maximum legibility
