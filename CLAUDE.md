# Veenus — Project Guide

## Project Overview

Static website for Veenus — a PVC interior solutions company (wall panels, ceiling panels, louvers, doors, laminated sheets). Uses a custom Node.js build system (`build.js`) for HTML component inclusion and templating, with Tailwind CSS v4 processed via PostCSS.

## Build & Dev Commands

**Package manager: `yarn` (not npm)**

```bash
yarn dev          # Build HTML once, then watch CSS (development)
yarn build        # Full production build (HTML + minified CSS)
yarn build:js     # Build HTML only (process includes/components)
yarn build:css    # Build CSS only (production, minified)
yarn dev:css      # Watch CSS only
```

## Architecture

### HTML Build System (`build.js`)
- **Source:** `src/*.html` → **Output:** `./*.html` (root)
- Always edit source files in `src/` — never edit root output files directly
- Two templating mechanisms:

**1. Includes** — embed a component file as-is:
```html
<div data-include="Header.html"></div>
```
Resolves to `src/components/Header.html`

**2. Components** — embed with props:
```html
<div data-component="button" data-type="primary" data-label="Click me" data-url="#"></div>
```
Resolves to `src/components/buttons/primary.html`, replacing `{{label}}` and `{{url}}`.

Supported component types:
- `data-component="button"` → `src/components/buttons/{data-type}.html`
- `data-component="card"` → `src/components/cards/{data-type}.html`
- `data-component="label"` → `src/components/labels/{data-type}.html`
- `data-component="slider"` → `src/components/sliders/{data-slider}.html`

Props use `{{propName}}` syntax inside component files.

### CSS Pipeline
- **Source:** `src/css/style.css` → **Output:** `src/css/main.css`
- PostCSS plugins: `postcss-nested`, `postcss-media-minmax`, `@csstools/postcss-oklab-function`, `@csstools/postcss-color-mix-function`, `@tailwindcss/postcss`, `autoprefixer`
- Production only: `cssnano` minification (triggered by `NODE_ENV=production`)

### Fonts — `src/font/`
All fonts are local (no Google Fonts). Declared via `@font-face` in `style.css`.

| Font | Weight | Style | File |
|---|---|---|---|
| Inter | 400 | normal | `Inter-Regular.woff2` |
| Inter | 300 | normal | `Inter-Light.woff2` |
| Playfair Display | 400 | normal | `PlayfairDisplay-Regular.woff2` |
| Playfair Display | 400 | italic | `PlayfairDisplay-Italic.woff2` |

- Use `font-light` (Tailwind) for Inter 300 — stats/display numbers
- Use `.font-serif-display` (custom class) for Playfair Display

### Slider
- Embla slider

## Directory Structure

```
src/
  css/          # style.css (source) → main.css (compiled, do not edit)
  components/   # Reusable HTML partials
    buttons/    # primary.html, secondary.html
    cards/      # (to be created)
    labels/     # (to be created)
    sliders/    # (to be created)
  font/         # Local web fonts (.woff2 + .woff)
  images/       # Image assets
  js/           # main.js
  *.html        # Page source files
*.html          # Built output — do not edit directly
build.js
tailwind.config.js
postcss.config.mjs
package.json
```

## CSS Architecture (`style.css`)

### Layer rule — CRITICAL
**Never place CSS rules outside `@layer` when Tailwind is used.**
Unlayered CSS has higher cascade priority than `@layer utilities`, silently overriding all Tailwind spacing/margin/padding utilities. Tailwind v4's preflight already handles `box-sizing`, `margin: 0`, `padding: 0` resets — do not duplicate them.

### Style.css structure order
1. `@import "tailwindcss"`
2. Custom properties (`:root`)
3. Font declarations (`@font-face`)
4. Layout (`.container`)
5. Base (`html`, `body`)
6. Button component (`.btn`, variants)
7. Header (custom CSS — no Tailwind)
8. Footer (custom CSS — no Tailwind)
9. Section-specific overrides if needed

### Container
Always use the `.container` class for page section wrappers — never inline `max-w-[1660px] mx-auto`:

```css
.container {
  max-width: var(--container-max); /* 1660px */
  margin-inline: auto;
  width: 100%;
  padding-inline: 1.25rem;        /* 20px mobile */
}
@media (min-width: 1024px) {
  .container {
    padding-inline: 0.9375rem;    /* 15px desktop */
  }
}
```

### Button system
All buttons extend `.btn` base class. Variants in `style.css`:

| Class | Use |
|---|---|
| `.btn--primary` | Rounded, dark bg — hero / nav CTAs |
| `.btn--secondary` | Rounded, outlined — secondary actions |
| `.btn--ghost` | Transparent — subtle actions |
| `.btn--dark` | Sharp rectangle, black — content section CTAs |

Mobile: add `w-full` on `.btn--dark`. Desktop: `lg:w-auto`.

### Header & Footer
Custom CSS only — no Tailwind classes. Reason: faster initial parse/render.

## HTML Conventions

### Section naming
Every `<section>` gets a semantic identifier class as the first class:
```html
<section class="crafting-section py-[3.75rem] lg:py-[8.125rem]">
```
Pattern: `[content-name]-section`

### Layout pattern — two-column sections
```html
<section class="[name]-section py-[mobile] lg:py-[desktop]">
  <div class="container">
    <!-- content -->
  </div>
</section>
```

### Responsive images
- Mobile: `w-full aspect-W/H` — fluid with locked ratio (Tailwind v4: `aspect-820/561`, not `aspect-[820/561]`)
- Desktop: `lg:w-[X%] lg:max-w-NNN` — percentage-based, capped at design max (Tailwind v4: `lg:max-w-205`, not `lg:max-w-[820px]`)
- Always include `width`, `height`, `loading="lazy"`, and descriptive `alt`
- **Never use fixed `h-[Xpx]`** for images — always use `aspect-W/H` so the ratio is preserved at every viewport width

**Every image wrapper must have an HTML comment** recording the source dimensions, ratio, and responsive behavior for future reference:

```html
<!-- Image
     Source: 820×561px
     Ratio : 820:561 (≈ 1.46:1)
     Mobile : w-full + aspect-820/561  → fluid width, ratio-locked height
     Desktop: w-[45%] max-w-205        → same ratio, capped at 820px
-->
<div class="w-full aspect-820/561 lg:w-[45%] lg:max-w-205 shrink-0 overflow-hidden">
  <img src="..." width="820" height="561" class="w-full h-full object-cover" loading="lazy" alt="...">
</div>
```

If mobile and desktop use **different crop ratios**, document both:

```html
<!-- Image
     Source: 1200×800px
     Ratio : 3:2 (≈ 1.5:1)
     Mobile : w-full + aspect-4/3   → tighter crop on small screens
     Desktop: w-[50%] max-w-[600px] + aspect-3/2
-->
```

### Responsive fluid sizing
Use `clamp()` for all sizes that need to scale between mobile and desktop:
```html
<!-- Font size -->
text-[clamp(2.1875rem,3.6vw,3.75rem)]

<!-- Gap / spacing -->
gap-[clamp(2rem,5vw,6rem)]
gap-x-[clamp(1.5rem,8vw,8.6875rem)]
```

### Responsive layout pattern (stacked → side-by-side)
```html
<div class="flex flex-col lg:flex-row gap-10 lg:gap-[clamp(...)]">
```

## Design Style

- PVC interior products — premium, editorial aesthetic
- Clean whitespace, strong typography hierarchy
- Stripe / Linear / Vercel inspired minimalism
- `rounded-2xl` default for cards; sharp (`rounded-none`) for dark CTAs
- Subtle shadows, neutral palette

## Typography

| Element | Mobile | Desktop | Font |
|---|---|---|---|
| Section heading | `2.1875rem` (35px) | `clamp(..., 2.875rem)` | Inter Regular |
| Heading italic accent | same | same | Playfair Display Italic |
| Body / description | `1rem` (16px) | `1.125rem` (18px) | Inter Regular |
| Stat numbers | `2.1875rem` | `clamp(..., 3.75rem)` | Inter Light (300) |
| Stat labels | `1rem` | `1.25rem` | Playfair Display Regular |

- Always use `clamp()` for fluid headings
- Proper heading order: h1 → h2 → h3
- `leading-[1.3]` for headings, `leading-[1.5]` for body, `leading-[1.6]` for small text blocks

## Accessibility Rules

- Proper semantic HTML
- `aria-label` when necessary
- `aria-hidden="true"` on decorative SVGs
- Keyboard focus states and visible focus rings
- Logical tab order

## Performance Rules

- Local fonts only with `font-display: swap`
- `width` + `height` on all `<img>` elements
- `loading="lazy"` on below-fold images
- Avoid unnecessary DOM wrappers
- Header/Footer use custom CSS (no Tailwind scan overhead)

## Figma Workflow

Use the MCP Figma plugin to read design specs directly:
1. Get desktop design context from Figma URL
2. Get mobile/responsive design from separate Figma frame URL
3. Convert React+Tailwind output to plain HTML following project conventions
4. Cross-reference both frames for breakpoint values

Key conversions from Figma output:
- Fixed `px` widths on images → percentage + `max-w`
- Fixed gaps → `clamp()` ranges
- `font-['Inter:Light']` → `font-light` (Tailwind) + Inter 300 `@font-face`
- `font-['Playfair_Display:Italic']` → `.font-serif-display italic`

## Before Generating Code

1. Read the relevant source files first
2. Analyze layout balance and spacing consistency
3. Check mobile AND desktop Figma frames
4. Use `.container` for all section wrappers
5. Give every section a semantic class name
6. Use `clamp()` for all fluid values
7. Verify no unlayered CSS overrides exist
