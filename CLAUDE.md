# CLAUDE.md — EbbaTrust

> **Read [AGENTS.md](AGENTS.md) first. It is the operating contract for this repository.**
> This file exists so Claude Code loads it automatically; `AGENTS.md` holds the substance.

---

## Start here, every session

1. **`/remember restore`** — read [MEMORY.md](MEMORY.md) and report where we left off. Wait
   for confirmation before continuing.
2. Read **[AGENTS.md](AGENTS.md)** — persona, architecture boundaries, rules, design tokens,
   out-of-scope.
3. Read **[PLAN.md](PLAN.md)** — the build sequence and which step we are on.
4. If the work touches UI, read **[ui-registry.md](ui-registry.md)** *before* writing any
   component, so the new one matches what already exists.

## End here, every session

**`/remember save`** — write the session state to [MEMORY.md](MEMORY.md). No secrets.

---

## The loop

```
/architect  →  build  →  /imprint  →  /review  →  /remember save
                 ↑                        |
                 └──── /recover ──────────┘   (when something breaks)
```

| Skill | When | What it does |
|---|---|---|
| `/architect` | Before any feature | Aligns on language and decisions, produces a plan you confirm |
| `/imprint` | After any UI component | Captures visual patterns to `ui-registry.md` |
| `/review` | After any feature | Checks plan alignment, system integrity, production readiness |
| `/recover` | When something breaks | Diagnoses the failure mode before prescribing a response |
| `/remember` | Session start and end | Restores and saves context across sessions |

Skills live in [`skills/`](skills/). Read the relevant `SKILL.md` before running one.

---

## The five things most likely to go wrong

Shortcuts from `AGENTS.md`, repeated because these are the mistakes that actually happen:

1. **Never reference `UgNLIS`, `NIRA`, `MTN` or `Airtel` outside `src/services/adapters/`.**
   This boundary is what lets the product ship before any government agreement exists.
   See AGENTS.md §4.3.
2. **Never hardcode a colour, size, spacing or radius.** Tokens only. AGENTS.md §6.
3. **Never let a verification result look authoritative while adapters are mocked.** Every
   result card shows "Demo data — not a real registry check". AGENTS.md §5.3.
4. **Never swallow an error.** In this app a silent failure can read as a successful
   verification. AGENTS.md §4.5.
5. **Never commit a secret**, and never write one into `MEMORY.md`. AGENTS.md §5.2.

---

## Ask, don't guess

If a requirement is ambiguous, ask one clear question and wait. This app tells people whether
it is safe to spend their savings on a piece of land. A confident wrong assumption here is
worse than a delay.

---

## Commands

```bash
npx expo start              # dev server
npx expo start --dev-client # required once maps are added (Expo Go won't work)
npx tsc --noEmit            # type check — must pass clean
npx supabase db reset       # reapply migrations + seed locally
npx eas build --profile development --platform android
```
