# EbbaTrust

A mobile app that helps Ugandans verify land titles before they buy.

**The promise:** you should not be able to lose your money to a fake title while using this app.

---

## The problem

Land fraud in Uganda is endemic — forged titles, the same plot sold twice, land grabbing, and
boundaries no ordinary buyer can independently confirm. A diaspora buyer sending money home has
almost no way to check what they are actually buying. People lose their life savings to
paperwork they had no means to question.

## The approach

Uganda's government runs **UgNLIS**, the authoritative national land registry. EbbaTrust does
not replace it and does not compete with it. EbbaTrust is the **consumer trust layer on top of
it**: the app that helps an ordinary buyer ask the right question of the right authority before
money moves, and holds that money in escrow until the transfer is verified.

We route to the registry. We never claim to be it.

## What the prototype does

1. **Identity** — sign in with a Ugandan phone number, capture your NIN
2. **Listings** — browse land and property, each showing its verification status plainly
3. **Boundaries** — see a parcel's real outline on satellite imagery
4. **Verification** — request a title check routed to the national registry
5. **Escrow** — pay via mobile money, released only once transfer conditions are verified

## Current status

**Pre-development.** Planning and governance files are complete; no application code yet.
See [PLAN.md](PLAN.md) for the build sequence and [MEMORY.md](MEMORY.md) for exactly where
things stand.

> **Important:** the registry, identity and payment integrations are **mocked**. EbbaTrust has
> no data-sharing agreement with MLHUD, no NIRA integration and no mobile-money licence.
> Every external service sits behind an adapter interface with a working mock, so the product
> can be built and tested now and switched to live data later by changing one function.
> While mocks are in use, the UI says so on every verification result.

## Stack

Expo (React Native) · TypeScript strict · expo-router · NativeWind v4 · TanStack Query ·
Supabase (Postgres + PostGIS, RLS, phone OTP, Storage, Edge Functions) · react-native-maps

## Documentation

| File | What it holds |
|---|---|
| [AGENTS.md](AGENTS.md) | The operating contract — persona, boundaries, rules, design tokens, out-of-scope |
| [CLAUDE.md](CLAUDE.md) | Session protocol for Claude Code; points to AGENTS.md |
| [PLAN.md](PLAN.md) | The nine-step build sequence |
| [MEMORY.md](MEMORY.md) | Current state, decisions, what's next |
| [ui-registry.md](ui-registry.md) | Component visual patterns — read before building UI |
| [skills/](skills/) | The five skills that govern how work is done |

## Working on this

```
/remember restore   →   /architect   →   build   →   /imprint   →   /review   →   /remember save
```

Start every session by restoring memory. Plan before building. Imprint after every component.
Review before moving on. Save before you stop.

## Getting started

Nothing to run yet — Step 1 (scaffold) has not been done. Once it is:

```bash
npm install
npx expo start
```

Copy `.env.example` to `.env` and fill it in. **Never commit `.env`.**
