---
name: BONYAN
description: A private, disciplined system for measurable body and training progress.
colors:
  charcoal-ground: "#0B0B0B"
  forged-surface: "#151515"
  raised-graphite: "#20201F"
  quiet-steel: "#2B2B29"
  warm-porcelain: "#F7F4EE"
  cool-ash: "#8C9099"
  warm-ash: "#B6B2A9"
  measured-bronze: "#C8A86B"
  bronze-ember: "#2B251A"
  aged-bronze-edge: "#4B402B"
  progress-mint: "#6FCF97"
  direct-coral: "#EB5757"
typography:
  display:
    fontFamily: "Space Grotesk"
    fontSize: "58px"
    fontWeight: 700
    lineHeight: 1.07
    letterSpacing: "-3.2px"
  headline:
    fontFamily: "Space Grotesk"
    fontSize: "38px"
    fontWeight: 600
    lineHeight: 1.13
    letterSpacing: "-1.4px"
  title:
    fontFamily: "Space Grotesk"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.7px"
  body:
    fontFamily: "Manrope"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.53
    letterSpacing: "normal"
  label:
    fontFamily: "Manrope"
    fontSize: "10px"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "1.4px"
rounded:
  control: "16px"
  card: "24px"
  pill: "999px"
spacing:
  xxs: "4px"
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  xxl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.measured-bronze}"
    textColor: "{colors.charcoal-ground}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0 24px"
    height: "50px"
  button-secondary:
    backgroundColor: "{colors.charcoal-ground}"
    textColor: "{colors.measured-bronze}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0 24px"
    height: "50px"
  button-danger:
    backgroundColor: "{colors.charcoal-ground}"
    textColor: "{colors.direct-coral}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0 24px"
    height: "50px"
  input:
    backgroundColor: "{colors.raised-graphite}"
    textColor: "{colors.warm-porcelain}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "50px"
  surface-card:
    backgroundColor: "{colors.forged-surface}"
    textColor: "{colors.warm-porcelain}"
    rounded: "{rounded.card}"
    padding: "24px"
  status-chip:
    backgroundColor: "{colors.bronze-ember}"
    textColor: "{colors.measured-bronze}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "8px 12px"
---

# Design System: BONYAN

## 1. Overview

**Creative North Star: "The Human Foundry"**

BONYAN is used in private, high-attention moments: signing in, reviewing body composition,
logging training, and generating an identity-adjacent Avatar. The dark charcoal environment suits
focused use on a personal device, while rare bronze cues make the next trusted action unmistakable.

The Human Foundry combines measurement precision with deliberate progress. It should feel sculptural
without becoming ornamental, premium without becoming luxurious, and technical without resembling a
clinical dashboard. Familiar mobile affordances must disappear into the task. The interface rejects
fitness neon, sterile medical white, gamified noise, and generic AI-assistant decoration.

**Key Characteristics:**

- Restrained charcoal and graphite surfaces with one measured bronze accent.
- Strong editorial identity in headings, calm operational clarity everywhere else.
- Large, touchable controls with explicit privacy and system-state language.
- Tonal layering and quiet borders instead of decorative shadows.
- Consistent task flows that preserve BONYAN's existing visual and product baseline.

## 2. Colors

The palette is warm, restrained, and high-contrast. Bronze identifies intent; it never decorates an
inactive surface.

### Primary

- **Measured Bronze:** The sole primary accent for actions, selected controls, compact section labels,
  and progress emphasis.
- **Bronze Ember:** The low-contrast selected or informative surface behind bronze content.
- **Aged Bronze Edge:** The quiet outline for secondary actions and bronze-tinted states.

### Secondary

- **Progress Mint:** Successful, ready, or completed status only. Never use it as a second brand accent.
- **Direct Coral:** Validation, destructive actions, and recoverable failure messages only.

### Neutral

- **Charcoal Ground:** The uninterrupted application canvas and primary-button text.
- **Forged Surface:** Cards, bounded tasks, and grouped controls.
- **Raised Graphite:** Input fields and controls that must read as editable.
- **Quiet Steel:** One-pixel dividers and boundaries.
- **Warm Porcelain:** Primary text and high-priority values.
- **Warm Ash:** Supporting copy that must remain comfortably readable.
- **Cool Ash:** Metadata, inactive text, and low-priority labels.

### Named Rules

**The Bronze Is Earned Rule.** Bronze marks the next meaningful action, current selection, or measured
progress. If everything is bronze, nothing is actionable.

**The Semantic Color Rule.** Mint means success and coral means error or danger. Neither color is
allowed as decoration.

## 3. Typography

**Display Font:** Space Grotesk (with the native sans-serif fallback)
**Body Font:** Manrope (with the native sans-serif fallback)

**Character:** Space Grotesk gives BONYAN a compact, engineered silhouette. Manrope stays warm and
highly legible for private data, instructions, forms, and actions.

### Hierarchy

- **Display** (700, 58px, 1.07): The BONYAN wordmark and rare identity moments only.
- **Headline** (600, 38px, 1.13): Primary screen titles; smaller 34px and 40px sizes are allowed when
  the available mobile width demands them.
- **Title** (600, 24px, 1.25): Task headings, prominent measurements, and card titles.
- **Body** (400, 15px, 1.53): Instructions and supporting content. Prose stays within roughly 65 to
  75 characters per line on wide surfaces.
- **Label** (600, 10px, 1.4px tracking, uppercase): Eyebrows, section markers, compact status, and
  metadata headings.

### Named Rules

**The One Display Voice Rule.** Space Grotesk is reserved for identity, hierarchy, and numeric
landmarks. Buttons, inputs, explanatory copy, and operational labels always use Manrope.

**The Tracked Label Rule.** Uppercase tracking belongs only to short labels. Never apply it to
sentences, errors, button copy, or user data.

## 4. Elevation

BONYAN is flat by default and uses no shadow vocabulary. Depth comes from the ordered sequence of
Charcoal Ground, Forged Surface, and Raised Graphite, reinforced by one-pixel Quiet Steel or Aged
Bronze Edge boundaries. Native overlays may use platform-standard elevation only when the operating
system requires it for an established affordance.

### Named Rules

**The Tonal Depth Rule.** Raise a surface by changing its tone and boundary, never by adding a dark,
tight, decorative shadow.

**The No Nested Cards Rule.** A card owns one bounded task. Group content inside it with spacing and
dividers, not another card.

## 5. Components

Components feel deliberate and substantial. Their states are quiet, immediate, and consistent.

### Buttons

- **Shape:** Gently rounded controls (16px) with a minimum 50px touch height.
- **Primary:** Measured Bronze fill, Charcoal Ground text, 24px horizontal padding, Manrope semibold.
- **Pressed / Focus:** Pressed opacity is 78 percent. Web focus uses a visible bronze outline. Loading
  replaces the label with a small activity indicator; disabled opacity is 45 percent.
- **Secondary:** Transparent against its parent with a one-pixel Aged Bronze Edge and bronze label.
- **Danger:** Transparent with a one-pixel Direct Coral boundary and coral label.

### Chips

- **Style:** Fully rounded (999px), compact 8px by 12px padding, short uppercase or semibold labels.
- **State:** Selected and status chips use Bronze Ember with Aged Bronze Edge. Success adds a small
  Progress Mint indicator rather than flooding the entire chip.

### Cards / Containers

- **Corner Style:** Broad, calm curves (24px).
- **Background:** Forged Surface over Charcoal Ground.
- **Shadow Strategy:** None. Follow the Tonal Depth Rule.
- **Border:** One pixel of Quiet Steel; bronze boundaries are reserved for selected or actionable state.
- **Internal Padding:** 24px, with 16px or 24px gaps according to information hierarchy.

### Inputs / Fields

- **Style:** Raised Graphite fill, Quiet Steel one-pixel stroke, 16px radius, and a minimum 50px height.
- **Focus:** A clear bronze boundary without glow or layout movement.
- **Error / Disabled:** Direct Coral replaces the boundary for errors, with concise coral help text.
  Disabled controls reduce opacity but preserve readable labels and an accessibility state.

### Navigation

Navigation uses familiar Expo Router stack behavior with restrained text back actions. Current
screens use Charcoal Ground continuously, no decorative header chrome, and no surprise modal
navigation. Protected-route, onboarding, and session-restore gates must never flash private content.

### Screen States

Loading, empty, and error states occupy the task area and use the same type hierarchy as ordinary
content. Loading uses a small bronze activity indicator. Empty states teach the next action. Error
states use Direct Coral for the message and a standard secondary retry button.

## 6. Do's and Don'ts

### Do:

- **Do** use Charcoal Ground as the continuous canvas and preserve the ordered tonal surface hierarchy.
- **Do** reserve Measured Bronze for primary actions, selection, progress, and compact labels.
- **Do** use the 4, 8, 12, 16, 24, 32, and 48px spacing scale for deliberate mobile rhythm.
- **Do** keep controls at least 50px high and expose disabled, loading, error, and accessibility states.
- **Do** state privacy, ownership, and irreversible consequences in plain language near the action.
- **Do** preserve the current prototype and implemented BONYAN screens as the visual source of truth.

### Don't:

- **Don't** redesign BONYAN into fitness neon, sterile medical white, a gamified dashboard, or a
  generic AI-assistant interface.
- **Don't** use bronze as decoration or apply full-saturation color to inactive states.
- **Don't** add gradients, gradient text, glassmorphism, decorative blur, or ornamental glow.
- **Don't** use colored side-stripe borders, identical card grids, or cards nested inside cards.
- **Don't** add shadows to simulate depth when the tonal surface hierarchy already communicates it.
- **Don't** use Space Grotesk for body copy, form labels, buttons, or long operational text.
- **Don't** invent navigation, custom form controls, or modal flows when a standard mobile affordance
  already solves the task.
- **Don't** add decorative motion. Feedback transitions stay between 150 and 250ms and communicate state.

## 7. Implemented Product Surfaces

The central Home hierarchy is Header / Daily Score / primary actions / Current Avatar to Next Avatar / recent progress. Talk to Bunyan is the earned bronze action; Analyze Food and Start Workout are secondary task controls. Daily Score comes from authenticated meals and workout sessions and is recalculated by the backend.

Food analysis, manual workout search, AI workout generation, session logging, profile history, InBody, avatar, notifications, and the coach use the existing authenticated API client. Food entries and training state are persisted per owner. The compatibility component named GlassSurface now renders the normative opaque Forged Surface with a Quiet Steel edge; it contains no blur, gradient, translucency, or shadow. Motion stays short, state-driven, and honors system reduced-motion settings.

Source evidence: apps/mobile/src/core/theme/tokens.ts, apps/mobile/src/core/components/GlassSurface.tsx, apps/mobile/src/core/screens/HomeScreen.tsx, apps/mobile/src/features/nutrition/NutritionScreen.tsx, apps/mobile/src/features/training/screens/TrainingHomeScreen.tsx, apps/mobile/src/features/training/screens/ManualWorkoutScreen.tsx, apps/mobile/src/features/training/screens/WorkoutDayScreen.tsx, and the backend nutrition and training domains. This records implemented source behavior; physical-device visual approval remains separate.
