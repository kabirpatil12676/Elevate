---
name: Elevate Design System
colors:
  surface: '#f7f9fc'
  surface-dim: '#d8dadd'
  surface-bright: '#f7f9fc'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f7'
  surface-container: '#eceef1'
  surface-container-high: '#e6e8eb'
  surface-container-highest: '#e0e3e6'
  on-surface: '#191c1e'
  on-surface-variant: '#454652'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f4'
  outline: '#757684'
  outline-variant: '#c5c5d4'
  surface-tint: '#4355b9'
  primary: '#24389c'
  on-primary: '#ffffff'
  primary-container: '#3f51b5'
  on-primary-container: '#cacfff'
  inverse-primary: '#bac3ff'
  secondary: '#4c56af'
  on-secondary: '#ffffff'
  secondary-container: '#959efd'
  on-secondary-container: '#27308a'
  tertiary: '#3f434c'
  on-tertiary: '#ffffff'
  tertiary-container: '#575a64'
  on-tertiary-container: '#cfd2dd'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dee0ff'
  primary-fixed-dim: '#bac3ff'
  on-primary-fixed: '#00105c'
  on-primary-fixed-variant: '#293ca0'
  secondary-fixed: '#e0e0ff'
  secondary-fixed-dim: '#bdc2ff'
  on-secondary-fixed: '#000767'
  on-secondary-fixed-variant: '#343d96'
  tertiary-fixed: '#e0e2ee'
  tertiary-fixed-dim: '#c4c6d2'
  on-tertiary-fixed: '#181b24'
  on-tertiary-fixed-variant: '#434750'
  background: '#f7f9fc'
  on-background: '#191c1e'
  surface-variant: '#e0e3e6'
typography:
  headline-xl:
    fontFamily: Manrope
    fontSize: 48px
    fontWeight: '800'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.3'
  headline-lg-mobile:
    fontFamily: Manrope
    fontSize: 28px
    fontWeight: '700'
    lineHeight: '1.3'
  headline-md:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1.2'
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.2'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-max: 1280px
  gutter: 24px
  margin-desktop: 64px
  margin-mobile: 20px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
  section-gap: 80px
---

## Brand & Style

The design system is engineered to facilitate professional growth and educational mastery. It embodies a **Corporate Modern** aesthetic—combining the reliability of enterprise platforms with the accessibility of consumer education. The visual language focuses on clarity, authority, and structured progress.

The brand personality is mentorship-driven: encouraging, expert-led, and high-impact. It uses high-quality photography and expansive white space to create a premium, undistracted learning environment. Key characteristics include:
- **Professionalism:** High-contrast layouts and precise typography.
- **Momentum:** Subtle gradients and dynamic card-based structures that suggest forward motion.
- **Trust:** A dependable blue-anchored palette that evokes stability and institutional knowledge.

## Colors

The palette is rooted in a spectrum of blues to establish a "professional-first" hierarchy.

- **Primary (#3F51B5):** Used for actionable elements, highlights within text, and brand-identifying motifs.
- **Secondary (#1A237E):** A deep navy used for footers, large hero sections, and high-level headings to provide weight and gravitas.
- **Tertiary (#E8EAF6):** A soft, tinted wash for card backgrounds, icon containers, and secondary buttons.
- **Neutral (#F5F7FA):** A cool-toned off-white for page backgrounds to reduce eye strain during long reading or learning sessions.

**Color Mode:** The default mode is `light`, utilizing the secondary navy for deep structural contrast in footers and banners.

## Typography

This design system utilizes a dual-font approach to balance personality with utility. 

**Manrope** is used for headlines. Its geometric yet slightly soft proportions feel modern and approachable for an educational platform.
**Inter** is used for all body text, labels, and UI elements. Its high legibility and neutral character make it ideal for data-heavy course listings and community forums.

**Styling Rules:**
- Use `headline-xl` sparingly for main landing hero sections.
- Emphasize key terms within headlines by applying the `primary_color` or a semi-bold weight.
- Labels for chips and metadata should use a tight tracking to maintain a compact, "tag-like" appearance.

## Layout & Spacing

The layout follows a **Fixed Grid** philosophy for desktop to maintain a premium "editorial" feel, transitioning to a fluid model for mobile devices.

- **Desktop:** A 12-column grid with a max-width of 1280px. Section gaps are generous (80px+) to allow the content to breathe.
- **Tablet:** 8-column grid with reduced margins (40px).
- **Mobile:** 4-column fluid grid.

**Spacing Rhythm:**
Elements are spaced using an 8px base unit. Card interiors use 24px padding (`stack-lg`) to ensure information doesn't feel cramped. Course grids should utilize a 3-column layout on desktop, collapsing to 1-column on mobile.

## Elevation & Depth

Hierarchy is established through **Tonal Layers** and extremely subtle **Ambient Shadows**.

1.  **Base Layer:** The neutral background (`#F5F7FA`).
2.  **Surface Layer:** Pure white (`#FFFFFF`) cards and containers.
3.  **Elevation:** Use a soft, large-radius shadow (e.g., `0 4px 20px rgba(0, 0, 0, 0.05)`) to lift active cards or hovering elements.
4.  **Structural Depth:** The footer and specific hero banners use the `secondary_color` to create a "grounding" effect, visually anchoring the lighter content layers above it.
5.  **Interactive Depth:** Buttons use a slight vertical offset on hover to simulate a tactile press.

## Shapes

The shape language is consistently **Rounded**, reflecting a modern and welcoming user experience.

- **Standard Radius:** 0.5rem (8px) for buttons, small input fields, and chips.
- **Large Radius (`rounded-lg`):** 1rem (16px) for course cards, content containers, and image masks.
- **Extra Large Radius (`rounded-xl`):** 1.5rem (24px) for prominent featured sections or "Join Community" banners.

Images should always carry the `rounded-lg` or `rounded-xl` treatment to align with the soft, modern UI containers.

## Components

### Buttons
- **Primary:** Solid `primary_color` with white text. Rounded (8px). 
- **Secondary:** Outlined `primary_color` or solid `tertiary_color` with `primary_color` text.
- **Login/Nav:** Ghost buttons or secondary styles to maintain hierarchy.

### Cards
- **Course Cards:** White background, `rounded-lg` corners, and a 1px border (`#E0E0E0`). Metadata (rating, learner count) is displayed in the footer of the card with `label-md` typography.
- **Community Chips:** Rounded (pill-shaped) with icons. Use `tertiary_color` as the background for inactive states and `primary_color` for active states.

### Input Fields
- Understated borders (1px solid `#D1D5DB`). On focus, the border transitions to `primary_color` with a subtle 2px outer glow.

### Lists & Navigation
- Top navigation is clean with significant horizontal spacing. Active links are indicated by a 2px bottom border in `primary_color` rather than a color change alone.

### Progress Indicators
- Use slim, horizontal bars in `primary_color` on a `tertiary_color` track to show course completion or account setup progress.