---
version: alpha
name: GiaPha-OS
description: A modern, elegant, and secure open-source family tree platform designed for Vietnamese families to preserve their lineage and heritage.
colors:
  primary: '#1c1917'
  secondary: '#57534e'
  tertiary: '#d97706'
  neutral: '#fafaf9'
  surface: '#ffffff'
  border: '#e7e5e4'
  error: '#dc2626'
typography:
  headline-display:
    fontFamily: Playfair Display
    fontSize: 64px
    fontWeight: 600
    lineHeight: 1.1
  headline-lg:
    fontFamily: Playfair Display
    fontSize: 30px
    fontWeight: 600
    lineHeight: 1.2
  headline-md:
    fontFamily: Playfair Display
    fontSize: 24px
    fontWeight: 600
    lineHeight: 1.3
  body-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.4
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 600
    lineHeight: 1.4
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.4
rounded:
  sm: 4px
  md: 8px
  lg: 12px
  xl: 16px
  '3xl': 24px
  full: 9999px
spacing:
  base: 16px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  '2xl': 48px
  '3xl': 64px
  gutter: 24px
  margin: 32px
components:
  button-primary:
    backgroundColor: '{colors.primary}'
    textColor: '{colors.surface}'
    rounded: '{rounded.xl}'
    padding: 16px
  button-primary-hover:
    backgroundColor: '#292524'
  button-amber:
    backgroundColor: '{colors.tertiary}'
    textColor: '{colors.primary}'
    rounded: '{rounded.full}'
    padding: 10px
  button-outline:
    backgroundColor: 'transparent'
    textColor: '{colors.secondary}'
    rounded: '{rounded.xl}'
    padding: 16px
  button-outline-hover:
    backgroundColor: '{colors.neutral}'
  divider:
    backgroundColor: '{colors.border}'
    height: 1px
  badge-error:
    backgroundColor: '{colors.error}'
    textColor: '{colors.surface}'
    rounded: '{rounded.sm}'
    padding: 4px 8px
  card-feature:
    backgroundColor: 'rgba(255, 255, 255, 0.7)'
    rounded: '{rounded.3xl}'
    padding: 32px
---

# GiaPha-OS design system

## Overview

GiaPha-OS is a modern and secure open-source family tree platform for Vietnamese families to preserve, trace, and pass down lineage, history, and cultural traditions. The interface balances professional clarity with visual indicators of respect and tradition.

The visual language uses warm limestone backgrounds, crisp typography, restrained amber accents, and clear grouping. Every screen should feel calm, legible, and easy to scan.

## Core UI rules

- Use `14px` for all content text: body copy, buttons, data, labels, form controls, metadata, and other interactive text. Reserve `16px` and larger sizes for headings and subheadings only.
- Use sentence case for headings. Do not capitalize or uppercase headings. Product names keep their official title case.
- Do not alter font tracking. Do not use tracking utility classes or custom letter spacing.
- Do not use bold weight utilities. Use `font-semibold` for headings and `font-medium` for bold inline text.
- Keep related text closer together than the spacing around the content group it belongs to. Prefer a small gap or margin between a heading and its supporting copy, then a larger gap before the next group.
- Optically align spacing around text. Account for line height; vertical spacing is typically slightly smaller than horizontal spacing.
- Never combine a border with a drop shadow. Use a border for definition or a shadow for elevation, not both on the same element.
- Use concentric border radii. When borders or rings are separated by `8px` or less, the outer radius equals the inner radius plus the padding between them. Circular elements remain `rounded-full`.

## Colors

- **Primary (#1C1917):** Deep charcoal for headlines, branding, and important actions.
- **Secondary (#57534E):** Granite grey for metadata, inactive states, icons, and supporting structure.
- **Tertiary (#D97706):** Golden amber for focus outlines, badges, and key interactive highlights.
- **Neutral (#FAFAF9):** Warm limestone for the main canvas.
- **Surface (#FFFFFF):** White for content layers and navigation surfaces.
- **Border (#E7E5E4):** Subtle stone border for component definition when no shadow is used.

## Typography

Playfair Display is used for branding and headings. Inter is used for body copy, controls, dense data, and family tree structures. Body and control text is always 14px. Headings start at 16px and use semibold weight. Do not use visual transforms to force text into uppercase or title case; write the copy in sentence case instead.

## Layout and spacing

Use a fluid, mobile-first layout with a maximum content width of 1280px. Group related controls and content with consistent spacing. Keep the gap between a heading and its supporting text smaller than the gap between that group and the next section. For text blocks, use line height to preserve readability and reduce vertical gaps slightly when the text has multiple lines.

The family tree uses standardized spacing for nodes and relationship lines. Large structures may scroll horizontally, but controls and labels remain 14px for consistent scanning.

## Elevation and shapes

Use tonal layers such as `bg-white/70` and `backdrop-blur-xl` before adding elevation. A surface may use the existing soft shadow tokens or an existing border, but never both at once. Focus rings are allowed; when a ring surrounds a bordered or nested surface, use concentric radii and keep the separation at or below 8px only when the radii mathematically match.

Use the existing rounded tokens. Main content cards use the established organic curves, controls use the established button and input radii, and circular shapes are reserved for avatars, indicators, and compact icon controls.

## Components

- **Primary button:** Deep stone background, white 14px text, semibold or medium weight as appropriate, and the existing rounded-xl shape.
- **Action button:** Amber background, primary 14px text, and the existing rounded-full shape.
- **Outline button:** Transparent surface with a border and secondary 14px text. It has no shadow.
- **Family node card:** Semi-transparent white surface with the existing rounded shape and a clear, non-conflicting border or shadow treatment. Avatars are circular.
- **Dialogs and modals:** Full-screen masks on mobile and centered rounded drawers on desktop. Use either a border or a shadow for the dialog surface, with clean dividers and consistent internal padding.
- **Popup menus:** A button that opens a menu (account, export) uses `hooks/usePopupMenu.ts`: a press outside or Esc closes it, Esc puts focus back on the button, and the button carries `aria-haspopup` and `aria-expanded`. Dialogs use `hooks/useModalA11y.ts` instead.
- **Icon-only buttons:** Give the button `type='button'` and an `aria-label` with the same translated text as its `title`, and mark the icon `aria-hidden='true'`. Buttons whose text is hidden on small screens (`hidden sm:inline`) need the `aria-label` too. A button repeated per item (expand/collapse of a tree branch) names its item in the `aria-label` (`branchOf`: "Nhánh {name}") and carries the state in `aria-expanded`/`aria-pressed`, not in the label.
- **Photos and icons next to a name:** an avatar beside the person's visible name gets `alt=''` so the name is read once. `MaleIcon`/`FemaleIcon` take `label` (`t('male')`/`t('female')`) when no text says the gender; without it they are `aria-hidden`.
- **Animation:** Import `m` (never `motion`) from `framer-motion`. `components/MotionProvider.tsx` loads the animation features after the first render (`LazyMotion strict`, so `motion.*` throws); until then `m` elements show their `initial` state, so keep entrance animations short and never hide content that has no animation.
- **Hover-only content:** Content shown on `group-hover` must also show for keyboard focus and touch screens: add `group-focus-within:` and `[@media(hover:none)]:` variants (see `components/galleryCardReveal.ts`).

## Do's and don'ts

- Do pair Playfair Display for branding and headings with Inter for UI text and data.
- Do write visible headings in sentence case, including Vietnamese headings such as “Chi tiết thành viên”.
- Do verify contrast for amber actions.
- Do use spacing and line height to establish hierarchy before adding decoration.
- Don't use tracking utilities, forced capitalization, bold weight utilities, or body text larger than 14px.
- Don't combine borders and drop shadows on one element.
- Don't invent new colors, radii, spacing, or shadow tokens; use the tokens defined above.
