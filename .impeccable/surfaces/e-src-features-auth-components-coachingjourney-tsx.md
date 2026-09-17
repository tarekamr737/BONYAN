---
version: 1
slug: "e-src-features-auth-components-coachingjourney-tsx"
primary_target: "apps/mobile/src/features/auth/components/CoachingJourney.tsx"
related_targets: ["apps/mobile/src/features/auth/components/CoachingUI.tsx","apps/mobile/src/features/auth/components/ProfileOverview.tsx","apps/mobile/src/features/auth/components/AssessmentEditor.tsx","apps/mobile/src/features/auth/screens/OnboardingScreen.tsx","apps/mobile/src/features/auth/screens/ProfileScreen.tsx"]
---

# Coaching journey, profile, assessment, and history

Mode: Operate.

## Scope and task
Help a member establish a goal and starting point, revise preferences, add body data, and return to a source-labelled history. Audience: a person privately setting up or reviewing their training on a phone. Optional personal details stay within the existing labelled field and choice system.

## Pinned direction
Premium dark glass coaching UI with charcoal and cool translucent task surfaces, retaining BONYAN's bronze identity and existing fonts. This direction is user-pinned. The later authorized pass extends it to the home dashboard and InBody upload, updates shared cool theme tokens, and makes SurfaceCard use GlassSurface. Other feature layouts retain their structure while inheriting shared dependencies. DESIGN.md owns the material and control rules.

## Built expression
The opening step connects a conversational prompt, progress rail, concise privacy explanation, and Continue action. Subsequent prompts personalize the journey by goal. Selected options expose a clear border, goal icon, and check-circle indicator. The optional persistent footer holds actions outside scrolling content; changing steps returns the scroll to the top. The recurring moment is a personal target-progress card with input coverage and explanation, followed by source-labelled assessments and historical entries. Body entry offers manual measurements or an existing confirmed InBody report; skipping body data remains possible.

Profile presents the saved goal, preferences, progress, and current assessment. Editing and history remain explicit actions. History entries retain timestamps and source labels. Shared controls provide loading, disabled, retry, and saved states. Step changes use the existing reduced-motion-aware reveal; keyboard and safe-area handling remain native.

## Evidence and limits
Recorded from CoachingUI.tsx, CoachingJourney.tsx, ProfileOverview.tsx, AssessmentEditor.tsx, and shared theme/control code. No browser, screenshot, device inspection, or visual approval was available. The implemented shared glass uses a tinted base, light edge, and subtle gradient, with an additional dark blur layer only on iOS when Reduce Transparency is disabled. Other platforms keep the tinted gradient fallback. There are no authored shadows in the inspected components. Arabic-aware styling and copy exist; complete localization and device behavior have not been visually verified. This brief makes no production-readiness claim.

## Dashboard and upload extension
The dashboard uses goal-aware next-action content, a target-progress card, and wrapping icon/title/hint destinations. InBody upload pairs file-state icons with the existing choose, upload, and review sequence, and a manual-entry alternative. Progress rails animate to their values with a reduced-motion check. These observations are grounded in HomeScreen.tsx and InBodyUploadScreen.tsx, alongside shared GlassSurface.tsx and AppButton.tsx; they are not visual verification.
