# Divine Network SVG Animation Design

## Context

The homepage hero visualization in `src/components/landing-v2/concepts/divine-network.tsx` currently animates message dots with the Web Animations API on SVG circle elements. Mobile browsers are not reliably running those transforms, so the hero appears static on phones even when motion is enabled.

## Goals

- Replace imperative SVG dot animation with SVG-native animation primitives.
- Preserve the current visual language: straight-line traffic between deities plus inbound traffic toward the center icon.
- Keep a reduced-motion mode, but make it lighter rather than fully static.

## Approach

1. Remove the runtime `Element.animate()` setup from the network component.
2. Render each moving dot inside SVG `<g>` wrappers anchored at the dot's start point.
3. Use declarative SVG animation:
   - `<animateTransform type="translate">` for travel.
   - Nested wrapper transforms for inbound dot shrink behavior.
   - `<animate attributeName="opacity">` for fade-in and fade-out.
4. Preserve the seeded timing data already generated in the component so the animation cadence remains familiar.
5. Introduce a reduced-motion profile that:
   - renders fewer moving dots,
   - extends durations,
   - lowers peak opacity,
   - disables glow and node flash pulsing.

## Risks

- SVG SMIL animation support is broadly reliable on mobile Safari and Chromium-based mobile browsers, but nested transform behavior needs lint/build verification.
- Reduced-motion tuning is a product choice rather than a binary accessibility off-switch, so the implementation should stay visibly calmer than the default mode.

## Validation

- Run lint on the affected files.
- Run a production build if lint passes cleanly.
