# Hill & Stone design system

Built with the `frontend-design` skill (`.claude/skills/frontend-design`). Read both before adding UI.

## Subject

A new home repair company in Northwest Arkansas, founded by Aidan Sanders and Tucker Davidson. It has few job photos and no long track record yet, so the site leans on clear process and drawn illustrations instead of portfolio claims. Audience: homeowners in Bentonville, Rogers, Springdale and Fayetteville, many of them busy professionals who want one reliable, tidy pro. The site's job is to get a quote request (and later, to get a quote approved and paid).

## Revision 1 (client mockup, October 2026)

The client supplied a coastal navy + cream mockup. Where it conflicts with older notes below, this section wins.

### Patterns in use (Revision 1)

- **Adaptive header** (`components/site/header-shell.tsx`): the sticky header reads the `data-header-theme` of the section under it and flips the logo and links between navy (on light) and cream (on dark), so it never sits low-contrast over a band.
- **Drawn illustrations instead of photos** (`components/illustrations/`): line drawings of a house and of each service category, built from the `.ill-*` classes in `globals.css` (draw, fade, pop, wipe). The hero plays once on load (`.ill-autoplay`); the rest play once when 40% in view (`components/ui/play-on-view.tsx`) and replay on card hover or focus. Timing lives in `illustrations/timing.ts`. Server HTML and reduced motion show the finished drawing. This is the site's one motion system: no before/after sliders, no photo carousels.
- **Founder frames** (`components/site/founders.tsx`): two portrait frames, the second set lower like stacked stone, holding a brand panel until photos arrive. Names and "Co-founder" captions always show.
- **Claims are switches, not copy.** Licensed, insured, bonded, background-checked, warranty and guarantee are admin settings, all off by default. Each sentence that states one is built from `SiteConfig` and disappears when it's off; there is no empty badge or "pending" state. `/trust` falls back to "Paying for your job" (secure payments only).
- **Dormant pages**: Our work and Reviews stay out of the nav, footer and sitemap until real content exists, and say what's coming ("Project gallery coming soon") with an estimate button rather than showing an empty grid. They're `noindex` while empty.

## Color

Fixed by the brief and mapped onto the existing tokens (no parallel system). Tokens live in `src/app/globals.css`.

| Token | Hex | Use |
|---|---|---|
| `navy-950` | `#10243A` | Primary: buttons, dark sections, headings, body ink |
| `navy-900` / `navy-800` | `#183252` / `#24405F` | Button hover, rules and borders on navy |
| `navy-700` / `navy-600` | `#34495F` / `#4F5D6B` | Secondary and muted text on light surfaces |
| `navy-400` / `navy-300` | `#A9B3BE` / `#C5CCD3` | Muted text on navy; decorative lines. Form fields use `navy-600/70` borders (3.3:1, passes the 3:1 UI rule) |
| `navy-200` | `#DDD8CF` | Warm hairlines and dividers |
| `stone-50` | `#F4F2ED` | Page background (cream, replaces stark white) |
| `stone-100` | `#E3DACD` | Sand band / secondary surface; the accent color on navy |
| `white` | `#FFFFFF` | Cards and raised surfaces |
| `accent-700` | `#113360` | Logo blue. Sparing: links and small markers on light |
| `accent-500` | `#2E5B8A` | Focus ring, progress bars, stars (derived from logo blue) |
| `accent-100` | `#DFE6EE` | Notice backgrounds |
| `success-*` / `danger-*` | `#146C36` on `#DCEFE1` / `#A61B1B` on `#F8E1DE` | Re-tuned to pass on cream |

Contrast (WCAG 2.1, checked with `scratchpad/contrast.mjs`-style math):

| Pair | Ratio | Needs |
|---|---|---|
| Body `navy-950` on cream | 14.06:1 | 4.5 |
| Muted `navy-600` on cream | 6.03:1 | 4.5 |
| Muted `navy-600` on sand | 4.88:1 | 4.5 |
| Cream on navy (dark sections) | 14.06:1 | 4.5 |
| Muted `navy-300` on navy | 9.70:1 | 4.5 |
| Primary button: cream on `navy-950` | 14.06:1 | 4.5 |
| Primary hover: cream on `navy-800` | 9.51:1 | 4.5 |
| Sand band text: `navy-950` on sand | 11.36:1 | 4.5 |
| Focus ring `accent-500` on cream | 6.30:1 | 3 |
| Focus ring sand on navy | 11.36:1 | 3 |
| Logo blue `accent-700` on cream | 11.26:1 | 4.5 |

Rules:
- Never put `accent-500`/`accent-700` on navy (about 2:1). On navy, accents are sand (`stone-100`).
- On navy sections, buttons use the `light` variant (cream fill, navy text).

## Type

Two families, clearly distinct.

- **Newsreader** (serif, `font-serif`) for headlines. Chosen over Source Serif 4 and Fraunces for its real drawn italic and an optical-size axis that stays calm and low-contrast at headline sizes. Regular weight (400); hierarchy comes from size.
- **Archivo** (sans) for body, UI, labels, prices, and the admin. The wide axis is now only used for money figures in the quote portal and for admin titles.

Devices from the client mockup:
- **Second-line italic**: key headlines put their second sentence in `<em>` ("Thoughtful repairs. *Properly finished.*"). The `Heading` component styles `em` as serif italic.
- **Eyebrows** (`eyebrow` utility): 12px Archivo, uppercase, 0.2em tracking, muted. Above section headings only.
- **Serif numerals** (`numeral` utility): "01", "02" for real sequences and the numbered promise list.

| Role | Face | Size (mobile → desktop) | Leading |
|---|---|---|---|
| Display (hero) | Newsreader 400 | 42 → 72 | 1.02 |
| H1 page title | Newsreader 400 | 36 → 48 | 1.05 |
| H2 section | Newsreader 400 | 30 → 36 | 1.1 |
| H3 | Newsreader 500 | 21 → 24 | 1.35 |
| Body | Archivo 400 | 16–18 | 1.6, max 68ch |
| Eyebrow | Archivo 600 caps | 12 | 1.4, 0.2em |

## Layout

- Left-aligned by default. Center only short confirmation states.
- Container 1200px, 20px gutters on mobile.
- **Section rhythm**: cream → white cards → navy panel → sand band. Generous whitespace, hairline dividers.
- Radius follows hierarchy: controls 4px, panels 8px, photos 14px. Square-ish; no pill buttons.
- Borders over shadows. The **slate** card is solid white with a warm hairline that darkens to navy on hover.
- Every full-width public section carries `data-header-theme="light"` or `"dark"` so the sticky header can match it.

## Principles

1. **Quiet, finished, local.** Navy and cream, an editorial serif, plenty of room. The one bold moment per page is the headline.
2. **Read like a real estimate.** Services are scope sheets (what we do and what we don't), not icon-card grids.
3. **Only the chrome the mockup asks for.** Eyebrows above section headings and serif numerals are part of the brand; still no `→` on buttons, and numbering only for real sequences or the promise list.
4. **Motion is restrained.** Fade/slide-in on scroll at 300ms or less, once. No parallax, carousels or auto-playing sliders. Everything respects `prefers-reduced-motion`.
5. **Plain, specific copy.** Public buttons say "Request an Estimate". Errors say what went wrong and how to fix it.
6. **Never claim what the owner hasn't confirmed.** Trust claims render only when switched on in admin settings.

## Patterns in use (Phase 2)

- **Spec-sheet grid**: shared 1px hairlines (`gap-px` over a `navy-200` background) instead of floating cards. Used for the home services grid.
- **Scope sheet**: `components/site/scope-sheet.tsx`. White "what we do" column, sand "what we don't" column.
- **Commitment list**: `components/site/trust-list.tsx`. Each promise carries a checkable detail (license number, insurance amount), and only promises switched on in settings render.
- **Big-type city row**: core cities in wide 800 on navy. Reserved for the service-area banner; don't reuse it elsewhere.
- **Closing CTA band**: `components/site/cta-band.tsx` at the bottom of each marketing page.
- **Placeholders**: unknown facts are left out entirely; missing photos keep a brand panel. Placeholder reviews and sample projects exist only in local demo data (`SEED_DEMO=true`), never in production.

## Patterns in use (Phase 3)

- **Radio tiles** (`components/ui/radio-tiles.tsx`): native radios styled as tiles; the checked tile fills navy. Used for contact method, work type and budget.
- **Split preview** (dormant): portfolio tiles can show before and after side by side, with the slider in the project dialog. Unused while Our work is unlinked; don't bring before/after back to the marketing pages.
- **Native disclosure**: FAQ uses `<details name>` so one answer is open per topic, with an animated height where the browser supports `::details-content`.
- **Dialogs** use native `<dialog>` with a short scale or slide in answer to the click, and Esc and backdrop clicks close them.
- **Numbered steps** appear only for real sequences: how quoting works, and the certificate-of-insurance request.

## Patterns in use (Phase 4)

- **Quote portal** is a document, not a dashboard: white sheet on stone, sections separated by rules, a real `<table>` for the price breakdown, and the total in wide 800 Archivo (the one number that matters).
- **Action card** (navy) holds the single next step for the quote's state. On phones a fixed bottom bar keeps the total and "Review and pay" in reach.
- The portal has no site navigation: it's a transaction page.

## Patterns in use (Phase 5, admin)

- Internal tool, quieter than the public site: navy sidebar, stone-50 work area, hairline tables, semi-wide type for titles and metrics. Wide type isn't used in the admin.
- **Metric strip**: four figures in one ruled strip, not four floating cards. Each links to the filtered list behind it.
- **Status tabs** are plain links with counts, so filtered views can be bookmarked.
- **Irreversible actions** (send quote, void) confirm inline and name exactly what will happen ("Send $612.95 quote to …?").
- **History** merges quote events and email outcomes in time order; green = money in, red = declined, voided or failed.

## Patterns in use (Phase 6)

- **Brand panel** (`components/brand/brand-panel.tsx`): ridge contours on navy over a sand course. The stand-in for any missing photo, the 404 art, and the social image's motif.
- **Error pages** say what happened in one line, then offer the useful next steps (phone, quote, main pages) rather than a big "404".
- **Admin content screens** follow the builder: the form on one side, the live consequence spelled out in helper text ("Shows on Our Work", "Before and after are set, so the site shows the slider").

## Patterns in use (Phase 7, team and settings)

- **Role tiles** say in one line what each role can do, so choosing a role doesn't need a separate help page.
- **Secrets are shown once** in an accent panel with a Copy button (temporary passwords) and never emailed.
- **Settings page**: one section per topic, each with a line saying where on the site it appears; a sticky save bar, with fields given bottom scroll margin so they're never hidden behind it.

## Patterns in use (admin on phones)

- **Tab bar** below `lg`: Overview, Requests and Quotes in thumb reach, with More opening a bottom sheet (native `<dialog>`, slides up) for the rest of the sections, the account and Sign out. The active tab carries the same accent edge as the status tabs. The top of the screen keeps only a slim brand bar.
- **Phone lists** (`components/admin/phone-list.tsx`): below `md`, list tables become one tappable row per record, name and detail left, the figure or status that matters right. Tables no longer scroll sideways on phones.
- **Metric strip** reads as rows on phones: label and detail left, the number right.
- Tables that must stay tables (price breakdown) fold secondary columns under the description; the quote builder turns each line into a small form with its own field labels.
- Anything sticky at the bottom (settings save bar) sits above the tab bar, and `main` is padded so the last row is never under it.
