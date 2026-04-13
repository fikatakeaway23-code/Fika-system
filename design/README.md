# Fika Takeaway — Design System

Complete design system for the Fika Takeaway digital product suite.

---

## Folder Structure

```
design/
├── tokens.json              ← All design tokens (colors, type, spacing, etc.)
├── figma-export.json        ← Figma-compatible component + screen definitions
├── README.md                ← This file
├── components/              ← SVG exports of every UI component
│   ├── button-primary.svg
│   ├── button-secondary.svg
│   ├── button-danger.svg
│   ├── button-ghost.svg
│   ├── input-default.svg
│   ├── input-focused.svg
│   ├── input-error.svg
│   ├── pin-pad.svg
│   ├── card-default.svg
│   ├── card-elevated.svg
│   ├── card-alert.svg
│   ├── bottom-nav.svg
│   ├── checklist-item.svg
│   ├── badge.svg
│   ├── step-progress.svg
│   ├── metric-card.svg
│   ├── alert-banner.svg
│   ├── avatar-circle.svg
│   ├── toggle-switch.svg
│   ├── select-dropdown.svg
│   └── photo-upload-box.svg
├── screens/
│   ├── mobile/              ← 375×812px wireframes (19 screens)
│   └── web/                 ← 1280×900px wireframes (7 screens)
```

---

## How to Import into Figma

### Method 1: Tokens Studio Plugin (Recommended)

1. Open Figma → Plugins → Search **"Tokens Studio for Figma"** → Install
2. Open the plugin
3. Click **Import** → paste the full contents of `tokens.json`
4. Click **Apply to Document**
5. All color styles, type styles, and spacing will be applied

### Method 2: Manual Style Creation

Using the values in `tokens.json`, create:
- **Color Styles** in Figma (Local Styles → +)
- **Text Styles** for each typography entry
- **Effect Styles** for shadows

### Method 3: SVG Screen Import

1. In Figma: **File → Place Image** (or drag-drop the SVG files)
2. Each SVG wireframe imports as an editable vector frame
3. Organize screens on a single canvas: mobile on left, web on right

### Method 4: figma-export.json for Plugin Automation

The `figma-export.json` is compatible with:
- **Tokens Studio for Figma** — import color/type tokens
- **Figma Tokens** plugin — full token system
- **Style Dictionary** — generate platform-specific output (iOS Swift, Android XML, CSS variables, etc.)

---

## Using Design Tokens in Code

### CSS Variables (Web)

```css
:root {
  /* Colors */
  --color-primary:     #6BCB77;
  --color-secondary:   #2D6A4F;
  --color-surface:     #F7F9F7;
  --color-danger:      #E53E3E;
  --color-warning:     #F6AD55;
  --color-text:        #1A202C;
  --color-text-muted:  #718096;
  --color-border:      #E2E8F0;

  /* Typography */
  --font-family:       'Inter', system-ui, sans-serif;
  --font-size-base:    16px;
  --font-size-sm:      14px;
  --font-size-lg:      18px;
  --font-size-xl:      20px;
  --font-size-2xl:     24px;

  /* Spacing */
  --spacing-1: 4px;
  --spacing-2: 8px;
  --spacing-3: 12px;
  --spacing-4: 16px;
  --spacing-6: 24px;
  --spacing-8: 32px;

  /* Radius */
  --radius-sm:   4px;
  --radius-md:   8px;
  --radius-lg:   12px;
  --radius-xl:   16px;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-card:     0 2px 8px rgba(0,0,0,0.08);
  --shadow-elevated: 0 8px 24px rgba(0,0,0,0.12);
}
```

### Tailwind CSS Config (Web)

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary:   '#6BCB77',
        secondary: '#2D6A4F',
        surface:   '#F7F9F7',
        danger:    '#E53E3E',
        warning:   '#F6AD55',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'xl':  '16px',
        '2xl': '20px',
      },
    },
  },
}
```

### React Native StyleSheet

```js
// theme.js
export const colors = {
  primary:   '#6BCB77',
  secondary: '#2D6A4F',
  surface:   '#F7F9F7',
  background:'#FFFFFF',
  danger:    '#E53E3E',
  warning:   '#F6AD55',
  text:      '#1A202C',
  textMuted: '#718096',
  border:    '#E2E8F0',
};

export const spacing = {
  xs: 4, sm: 8, md: 12, base: 16,
  lg: 20, xl: 24, '2xl': 32,
};

export const radius = {
  sm: 4, md: 8, lg: 12, xl: 16, full: 9999,
};

export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
};
```

---

## Component Naming Conventions

Components follow this naming pattern in Figma:

```
ComponentName/Variant
```

Examples:
- `Button/Primary`
- `Button/Secondary`
- `Button/Danger`
- `Button/Ghost`
- `Card/Default`
- `Card/Elevated`
- `Card/Alert`
- `Badge/Active`
- `Badge/Pending`
- `Badge/Alert`
- `Badge/Cancelled`
- `Input/Default`
- `Input/Focused`
- `Input/Error`
- `Alert/Danger`
- `Alert/Warning`
- `Alert/Success`
- `Toggle/On`
- `Toggle/Off`

---

## Screen Naming Conventions

Screens follow:

```
[Platform]/[Role]/[ScreenName]
```

Examples:
- `Mobile/Auth/SplashScreen`
- `Mobile/Auth/PINScreen`
- `Mobile/Barista/HomeScreen`
- `Mobile/Barista/ShiftForm_Step1`
- `Mobile/Owner/Dashboard`
- `Web/Public/Landing`
- `Web/App/OwnerDashboard`

---

## Brand Quick Reference

| Token           | Value     | Usage                          |
|-----------------|-----------|--------------------------------|
| Primary Green   | `#6BCB77` | Buttons, active states, badges |
| Dark Green      | `#2D6A4F` | Headers, sidebar, emphasis     |
| Background      | `#FFFFFF` | Page backgrounds               |
| Surface         | `#F7F9F7` | Card backgrounds, inputs       |
| Danger Red      | `#E53E3E` | Errors, discrepancy alerts     |
| Warning Amber   | `#F6AD55` | Pending states, warnings       |
| Text Primary    | `#1A202C` | Main body copy                 |
| Text Secondary  | `#718096` | Labels, captions               |
| Border          | `#E2E8F0` | Input borders, dividers        |
| Font            | Inter     | All text across all platforms  |

---

## Accessibility Notes

- All tap targets are minimum **48×48px**
- Color contrast: Dark Green `#2D6A4F` on White passes **WCAG AA** (7.3:1)
- Color contrast: Light Green `#6BCB77` on White fails AA alone — always pair with bold weight or dark text on light backgrounds
- Never rely on color alone — pair with icon or label for status indicators
