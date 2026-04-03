# Design System Document

## 1. Overview & Creative North Star

### The Creative North Star: "Precision Kinetic"
This design system moves away from the static, "grease-monkey" aesthetic often found in the automotive industry. Instead, it adopts "Precision Kinetic"—a philosophy that blends the high-stakes accuracy of professional paintwork with the fluid energy of motion. We achieve this by utilizing a deep, atmospheric dark mode punctuated by high-contrast "laser" red accents.

To break the "template" look, we leverage intentional asymmetry and layered depth. Large-scale typography serves as a structural element, while content is housed in "glass" containers that feel integrated into the dark, charcoal environment rather than floating on top of it. This creates an editorial, high-end feel that remains approachable and clear.

---

## 2. Colors

The palette is rooted in a sophisticated dark theme. It uses a high-chroma red to drive action and a nuanced scale of charcoals to define hierarchy.

### Primary Accents & Interaction
- **Primary (`#ffb4aa` / `primary_container: #e30613`):** This is our "Precision Red." Use the bold red (`primary_container`) for all primary CTAs and critical UI indicators. 
- **Signature Textures:** For hero sections or large buttons, apply a subtle linear gradient from `primary_container` (#e30613) to `inverse_primary` (#c0000c) at a 135-degree angle to provide a "metallic paint" depth.

### The Surface Ecosystem
- **Surface (`#131313`):** The deep charcoal base. 
- **The "No-Line" Rule:** We do not use 1px solid borders to separate sections. Transition between `surface` and `surface_container_low` (#1c1b1b) or `surface_container` (#201f1f) to denote new content areas. 
- **Surface Hierarchy & Nesting:** 
    - **Base Layer:** `surface` (#131313)
    - **Sectional Shifts:** `surface_container_low` (#1c1b1b) for larger background blocks.
    - **Component Cards:** `surface_container_high` (#2a2a2a) to pull interactive elements forward.

### Glassmorphism
For floating navigation or overlay elements, use `surface_variant` (#353534) at 60% opacity with a `backdrop-filter: blur(12px)`. This "Frosted Glass" effect ensures the UI feels premium and modern.

---

## 3. Typography

The system utilizes two distinct typefaces to balance character with readability.

### Display & Headlines: Plus Jakarta Sans
- **Display-LG (3.5rem) / Headline-LG (2rem):** Used for bold value propositions. The wide apertures of Plus Jakarta Sans convey modern professionalism.
- **Editorial Intent:** Use tight letter-spacing (-0.02em) for Display scales to create an authoritative, "automotive brand" presence.

### Body & Labels: Manrope
- **Body-LG (1rem) / Title-MD (1.125rem):** Manrope’s geometric structure ensures high legibility for service descriptions and process steps.
- **Hierarchy:** Use `on_surface` (#e5e2e1) for primary text and `on_surface_variant` (#e9bcb6) for secondary metadata to maintain a soft, tonal contrast that is easy on the eyes.

---

## 4. Elevation & Depth

We convey importance through **Tonal Layering** rather than heavy shadows or rigid boxes.

- **The Layering Principle:** To lift a service card, place a `surface_container_highest` (#353534) object on a `surface` background. The subtle shift in lightness creates a natural physical presence.
- **Ambient Shadows:** For primary action buttons or the Before/After slider handle, use an extra-diffused shadow: `box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4)`. The shadow color should never be pure black; it should feel like an occlusion of the deep charcoal background.
- **The "Ghost Border" Fallback:** If a container needs more definition (e.g., an input field), use the `outline_variant` token at 15% opacity. This "Ghost Border" provides a hint of structure without interrupting the visual flow.

---

## 5. Components

### Buttons
- **Primary (Red):** Background: `primary_container` (#e30613); Text: `on_primary_container` (#fff5f3). Shape: `md` (0.375rem). Use uppercase for high-impact CTAs.
- **Secondary (Outline):** Ghost Border using `outline` (#af8782) at 40% opacity. Text: `on_surface`.

### Service Cards
- **Construction:** No borders. Background: `surface_container_low` (#1c1b1b).
- **Interactive State:** On hover, shift background to `surface_container_high` (#2a2a2a) and apply a subtle 2px "precision line" of `primary` (#ffb4aa) at the top edge.

### Before & After Slider
- **Handle:** A circular `full` radius element using `primary` (#ffb4aa). 
- **Labeling:** Use `label-md` in `surface_container_highest` with 80% opacity, placed in the bottom corners of the images.

### Step-by-Step Process Flow
- **Visual Path:** Use large, low-opacity numbers (using `display-lg` scale) in `surface_variant` behind the `title-md` text. This creates an editorial "layered" look that guides the eye without cluttering the interface.

### Input Fields
- **Default:** Background: `surface_container_lowest` (#0e0e0e); Border: `none`.
- **Focus:** Add a 1px "Ghost Border" using `primary` at 30% opacity.

---

## 6. Do's and Don'ts

### Do
- **Do** use large amounts of vertical whitespace (`spacing-20` or `spacing-24`) between sections to evoke a sense of high-end quality.
- **Do** use `primary_container` (Red) sparingly. It should be a beacon for action, not a background color for large sections.
- **Do** lean into asymmetry. For example, left-align a headline while right-aligning the supporting body text to create dynamic visual tension.

### Don't
- **Don't** use 100% white (#FFFFFF). It is too jarring against the dark theme. Always use `on_surface` (#e5e2e1) for maximum readability and visual comfort.
- **Don't** use standard dividers or lines. If you feel the need for a divider, increase the spacing (`spacing-12`) or change the background tone instead.
- **Don't** use high-radius "bubbly" corners. Stick to the `md` (0.375rem) or `lg` (0.5rem) tokens to maintain a professional, precision-engineered feel.