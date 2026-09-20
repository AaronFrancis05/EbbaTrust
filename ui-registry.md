# ui-registry.md — EbbaTrust

Visual patterns for every component in this app. Written by the `/imprint` skill.

**Read this before building any UI component.** When building a new card, check how existing
cards were built. When building a new button, match the button patterns already here. This
file is what stops the interface drifting into something that looks like it was built by five
different people.

---

## Baseline — Established 2026-09-20

> Established from the design tokens in `AGENTS.md §6` before any component existed, rather
> than via `/imprint audit`. Every component built from here must match this table.

| Property | Correct class |
|---|---|
| Screen background | `bg-surface` |
| Screen padding | `px-4 py-4` |
| Card background | `bg-surface` |
| Card border | `border border-border` |
| Card radius | `rounded-xl` |
| Card padding | `p-4` |
| Gap between cards | `gap-3` |
| Section gap | `gap-6` |
| Button primary | `bg-brand-600 rounded-lg px-4 py-3` · text `text-white text-base font-medium` |
| Button primary pressed | `active:bg-brand-900` |
| Button secondary | `bg-surface border border-border rounded-lg px-4 py-3` · text `text-ink-900` |
| Button secondary pressed | `active:bg-surface-2` |
| Button destructive | `bg-danger-600 rounded-lg px-4 py-3` · text `text-white` |
| Button destructive pressed | `active:bg-danger-900` |
| Button disabled | `bg-surface-2` · text `text-ink-400` |
| Input background | `bg-surface` |
| Input border | `border border-border rounded-lg` |
| Input focused | `border-brand-600` |
| Input error | `border-danger-600` · message `text-danger-600 text-sm` |
| Input padding | `px-3 py-3` |
| Text — screen title | `text-2xl font-semibold text-ink-900` |
| Text — section heading | `text-xl font-semibold text-ink-900` |
| Text — card title | `text-lg font-medium text-ink-900` |
| Text — body | `text-base text-ink-900` |
| Text — secondary | `text-sm text-ink-600` |
| Text — muted | `text-sm text-ink-400` |
| Badge / pill | `rounded-full px-3 py-1` · text `text-xs font-medium` |
| Divider | `h-px bg-border` |
| Shadow | none on cards — hairline border instead. Shadows only on sheets, modals, floating map controls. |

### Status colour semantics — fixed, never reinterpret

| State | Surface | Text / icon | Meaning |
|---|---|---|---|
| Verified | `bg-verified-50` | `text-verified-600` | Title valid, escrow funded, KYC passed |
| Pending | `bg-caution-50` | `text-caution-600` | Unverified, awaiting registry or review |
| Flagged | `bg-danger-50` | `text-danger-600` | Title flagged, dispute, payment failed |
| Neutral | `bg-brand-50` | `text-brand-600` | Informational, no judgement implied |

**Every status must pair colour with an icon and a text label.** Colour alone is not enough:
users may be colour-blind, and they are often reading this screen in direct sunlight while
standing on the land in question.

### Rules that apply to every component

1. **No hardcoded values.** No hex colours, no arbitrary `[13px]`, no raw pixel spacing.
   Tokens only. A raw value here is a Critical `/review` finding.
2. **Minimum tap target 44×44**, including icon-only buttons.
3. **Never go below `text-base` (16) for content.** `text-sm` is for metadata, `text-xs` for
   badge labels only.
4. **Every component handles three states**: loading (skeleton, not spinner, past 300ms),
   empty (with guidance on what to do), and error (with a retry).
5. **`accessibilityLabel` on every interactive element.**

---

## Components

Imprinted 2026-09-20 from Step 2. Source: `src/components/ui/`, rendered together in the
gallery screen `app/index.tsx`. Every entry below was read from the component file.

---

### Button

File: `src/components/ui/Button.tsx`
Last updated: 2026-09-20

| Property | Class |
|---|---|
| Background — primary | `bg-brand-600` |
| Background — secondary | `bg-surface` |
| Background — destructive | `bg-danger-600` |
| Background — disabled / loading | `bg-surface-2` |
| Border | `border border-border` (secondary and disabled only) |
| Border radius | `rounded-lg` |
| Text — primary / destructive | `text-base font-medium text-white` |
| Text — secondary | `text-base font-medium text-ink-900` |
| Text — disabled | `text-base font-medium text-ink-400` |
| Spacing | `px-4 py-3` · `gap-2` between icon and label |
| Pressed state | `active:bg-brand-900` · `active:bg-surface-2` · `active:bg-danger-900` |
| Shadow | none |
| Accent usage | `bg-brand-600`, one primary action per screen |

**Pattern notes:**
Takes `label: string`, not children — the label doubles as the default `accessibilityLabel`,
so a button cannot ship without one. `minHeight` comes from `MIN_TAP_TARGET` (44) in `style`,
not a class, because it is a native accessibility floor rather than a visual choice.

`loading` shows an `ActivityIndicator` and sets `accessibilityState.busy`. This is the one
place a spinner is correct: it reports an in-flight action, not page load. Disabled and
loading share a single visual state — from the user's side both mean "not now".

Icon and spinner colours are read from `colors`, never a hex literal, so they track the label.

`danger-900` (`#7A2222`) was added to the token set during this step. Before it, the
destructive pressed state resolved to the same colour as its rest state, leaving the most
dangerous button in the app with no press feedback. It mirrors the existing `brand` 50/600/900
shape rather than introducing a new idiom.

---

### Card

File: `src/components/ui/Card.tsx`
Last updated: 2026-09-20

| Property | Class |
|---|---|
| Background | `bg-surface` |
| Border | `border border-border` |
| Border radius | `rounded-xl` |
| Text — title | `text-lg font-medium text-ink-900` |
| Spacing | `p-4` |
| Pressed state | `active:bg-surface-2` (tappable variant only) |
| Shadow | none — hairline border instead |
| Accent usage | none |

**Pattern notes:**
The optional `title` renders at card-title scale so callers never re-declare it and drift.

Passing `onPress` turns the card into a single `Pressable` tap target and requires an
`accessibilityLabel` — a screen reader should hear "open listing, Plot 42 Nansana" rather than
the concatenation of every text node inside.

`className` is a **layout-only** escape hatch: `gap-*`, `mt-*`, `flex-1`. A colour, radius or
padding value passed through it is a `/review` finding, because that is exactly how card
styling drifts across a codebase.

---

### Input

File: `src/components/ui/Input.tsx`
Last updated: 2026-09-20

| Property | Class |
|---|---|
| Background | `bg-surface` · disabled `bg-surface-2` |
| Border | `border border-border` |
| Border — focused | `border-brand-600` |
| Border — error | `border-danger-600` |
| Border radius | `rounded-lg` |
| Text — value | `text-base text-ink-900` · disabled `text-ink-400` |
| Text — label | `text-sm text-ink-600` |
| Text — hint | `text-sm text-ink-400` |
| Text — error | `text-sm text-danger-600` |
| Spacing | `px-3 py-3` · `gap-1` between label, field and message |
| Shadow | none |
| Accent usage | `border-brand-600` on focus only |

**Pattern notes:**
Error outranks focus: a field holding a wrong value stays red while being edited, so the
problem does not appear to fix itself the moment the user taps back in.

`hint` and `error` occupy the same slot and never render together — one message, one meaning.
The error carries `accessibilityLiveRegion="polite"` so it is announced rather than silently
appearing below the fold.

`placeholderTextColor` reads `colors.ink[400]`, since a placeholder cannot be styled with a
class. Minimum height is `MIN_TAP_TARGET`.

---

### Badge

File: `src/components/ui/Badge.tsx`
Last updated: 2026-09-20

| Property | Class |
|---|---|
| Background | `bg-surface-2` |
| Border | none |
| Border radius | `rounded-full` |
| Text | `text-xs font-medium text-ink-600` |
| Spacing | `px-3 py-1` · `gap-1` icon to label |
| Shadow | none |
| Accent usage | none — deliberately |

**Pattern notes:**
Badge has **no tone, status or colour prop, and never gets one.** It is the neutral pill:
district, tenure type, photo count. If a badge could be tinted green, a decorative badge would
eventually read as "this title is verified" to someone about to spend their savings. Anything
carrying verification meaning uses `StatusPill` instead.

The two are visually siblings (`rounded-full px-3 py-1 text-xs font-medium`) so they sit
together in a row without looking mismatched, and differ only by colour and icon.

---

### StatusPill

File: `src/components/ui/StatusPill.tsx`
Last updated: 2026-09-20

| Property | Class |
|---|---|
| Background | `bg-verified-50` · `bg-caution-50` · `bg-danger-50` · `bg-brand-50` |
| Border | none |
| Border radius | `rounded-full` |
| Text / icon | `text-verified-600` · `text-caution-600` · `text-danger-600` · `text-brand-600` |
| Text size | `text-xs font-medium` |
| Spacing | `px-3 py-1` · `gap-1` icon to label |
| Shadow | none |
| Accent usage | fixed by status — never chosen by the caller |

**Pattern notes:**
The single place a `VerificationStatus` becomes pixels. Three rules it exists to enforce:

1. **Colour is never the only signal.** Surface, icon and text label always ship together.
   Users may be colour-blind, and are often reading this in direct sunlight while standing on
   the land in question.
2. **The mapping is fixed.** Surfaces and content colours mirror `statusTokens`; callers pass
   a `status`, never a colour.
3. **There is no icon-only variant and never will be.** A green shield with no word beside it
   is precisely how someone comes to believe an unverified title was checked.

Icons come from lucide, keyed by status: `shield-check` / `clock` / `alert-triangle` / `info`
— the same names `statusTokens` already used, so there is no rename map and no second place
for status semantics to live.

The optional `label` prop refines wording only ("Pending registry check"); it must never
contradict the status, whose colour and icon stay fixed regardless. `accessibilityLabel` is
always `Status: <text>`.

---

### Skeleton · SkeletonText · SkeletonCard

File: `src/components/ui/Skeleton.tsx`
Last updated: 2026-09-20

| Property | Class |
|---|---|
| Background | `bg-surface-2` |
| Border | none · `SkeletonCard` `border border-border` |
| Border radius | `rounded-md` · `rounded-full` for pill placeholders · `rounded-xl` for `SkeletonCard` |
| Spacing | `gap-2` between text lines · `SkeletonCard` `p-4 gap-3` |
| Animation | opacity `0.4 → 1`, 900ms each way, `Easing.inOut` |
| Shadow | none |
| Accent usage | none |

**Pattern notes:**
Skeleton, never a spinner, past 300ms. A skeleton holds the layout so a slow mobile connection
reads as *working* rather than broken, and never flashes an empty result card — which in this
app would look like "no such land exists".

`SkeletonCard` mirrors `Card`'s border, radius and padding exactly, so the swap to real
content does not shift the page. `SkeletonText`'s last line is `w-1/2`, the way a real
paragraph ends.

Driven by React Native `Animated` with `useNativeDriver`, not Reanimated: a two-value opacity
loop needs nothing more, and it keeps `react-native-worklets` out of the primitives. The
animation value lives in a lazy `useState` initialiser rather than a `useRef`, because it is
read during render and the `react-hooks/refs` lint rule correctly rejects the ref form.

Honours the OS **reduce-motion** setting and subscribes to changes to it; with motion reduced
the placeholder rests at `0.4` opacity.

---

### EmptyState

File: `src/components/ui/EmptyState.tsx`
Last updated: 2026-09-20

| Property | Class |
|---|---|
| Background | none — inherits its container |
| Border | none — place inside a `Card` when it needs one |
| Border radius | n/a |
| Text — title (empty) | `text-lg font-medium text-ink-900` |
| Text — title (error) | `text-lg font-medium text-danger-600` |
| Text — message | `text-base text-ink-600`, centred |
| Icon | 32px · `colors.ink[400]` (empty) · `colors.danger[600]` (error) |
| Spacing | `px-4 py-8` · `gap-3` |
| Shadow | none |
| Accent usage | `text-danger-600` on the error tone only |

**Pattern notes:**
Empty and error are one component with a `tone` prop, not two components. Baseline rule 4
requires every component to handle both, and they differ only in wording, icon colour and
whether the action is a retry — never in layout. Keeping them together is what stops the error
case from quietly going unbuilt.

Default icons: `search-x` (empty) and `alert-triangle` (error, matching `StatusPill` flagged).

An error tone always offers an action. AGENTS.md §4.5 — in this app a silent failure can read
as a successful verification, so a failure must be both visible and recoverable. `message` is
guidance in plain words: never a raw error string, never an apology. The action renders as a
`secondary` Button so a recovery step never looks like the screen's primary call to action.

---

### Disclosure

File: `src/components/ui/Disclosure.tsx`
Last updated: 2026-09-20

| Property | Class |
|---|---|
| Background | `bg-surface` |
| Border | `border border-border` |
| Border radius | `rounded-xl` |
| Text — title | `text-lg font-medium text-ink-900` |
| Text — summary | `text-sm text-ink-600` |
| Text — body | `text-base text-ink-900` |
| Spacing | header `p-4` · body `px-4 pb-4 gap-3` |
| Divider | `h-px bg-border` above the expanded body |
| Pressed state | `active:bg-surface-2` |
| Shadow | none |
| Accent usage | none |

**Pattern notes:**
Shares `Card`'s background, border and radius on purpose — an expandable section is a card
that opens, not a different species.

Collapsed by default, with the optional `summary` line visible in both states, so nothing that
changes a purchase decision is ever hidden behind a tap: "1 caveat on record" is readable
before anything is expanded.

Only the chevron animates (160ms, 0° → 180°). Height animation on Android needs
`LayoutAnimation`, whose behaviour on the new architecture is inconsistent; a rotating chevron
says the same thing and cannot glitch the layout. `accessibilityState.expanded` is set so
screen readers announce the state rather than just "button".
