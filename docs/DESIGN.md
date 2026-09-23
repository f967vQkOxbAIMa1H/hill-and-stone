# Hill & Stone design system

Built with the `frontend-design` skill (`.claude/skills/frontend-design`). Read both before adding UI.

## Subject

A premium home repair company in Northwest Arkansas. Audience: homeowners in Bentonville, Rogers, Springdale and Fayetteville, many of them busy professionals who want one reliable, tidy pro. The site's job is to get a quote request (and later, to get a quote approved and paid).

## Color

Fixed by the brief. Tokens live in `src/app/globals.css`.

| Token | Hex | Use |
|---|---|---|
| `navy-950` | `#0F172A` | Ink, dark sections, text on copper buttons |
| `navy-900` | `#1E293B` | Secondary dark surface |
| `copper-500` | `#D97706` | Primary button fill, accents on navy |
| `copper-700` | `#B45309` | Copper text and links on light backgrounds |
| `stone-50` | `#F8FAFC` | Page background |
| `stone-100` | `#F1F5F9` | Alternate section surface |

Contrast rules (checked):
- White on `#D97706` is **3.19:1 and fails AA**. Copper buttons always use navy text (5.6:1). Hover brightens to `#F59E0B` (8.3:1).
- Copper text on light backgrounds uses `copper-700` (4.8:1 on stone-50).
- Muted text is `navy-600` `#475569` (7.2:1), never lighter on light surfaces.

## Type

**Archivo only**, as a variable font using both the weight and width axes. The width axis is the type's personality: extra-wide, heavy headlines read like trade signage and lumber-grade stamps. Body text stays at normal width.

Scale (px, from the classic typographic scale): 14 · 16 · 18 · 21 · 24 · 36 · 48 · 60 · 72

| Role | Size | Weight | Width | Leading |
|---|---|---|---|---|
| Display (hero) | 48 → 72 | 800 | 125 | 1.0 |
| H1 page title | 36 → 60 | 800 | 125 | 1.05 |
| H2 section | 36 | 700 | 112 | 1.1 |
| H3 | 21–24 | 700 | 100 | 1.25 |
| Body | 16–18 | 400 | 100 | 1.6, max 68ch |
| Small / label | 14 | 600 | 100 | 1.4, sentence case |

## Layout

- Left-aligned by default. Center only short confirmation states.
- Container 1200px, 20px gutters on mobile.
- Radius follows hierarchy: controls 4px, panels 8px, photos 14px.
- Borders over shadows. One elevation shadow (navy-tinted) for overlays only.

## Principles

1. **The work is the proof.** The home hero is a before/after slider. That's the one bold moment on the site; keep everything around it quiet.
2. **Read like a real estimate.** Services are scope sheets (what we do and what we don't), not icon-card grids.
3. **No template chrome.** No all-caps eyebrows, no `→` on buttons, no middle-dot meta strings, no 01/02/03 unless the content is a real sequence (the quote process is one).
4. **Motion only answers actions**, plus one page-load moment on the hero. Always respect `prefers-reduced-motion`.
5. **Plain, specific copy.** Buttons say what happens ("Request a quote", "Approve and pay"). Errors say what went wrong and how to fix it.

## Patterns in use (Phase 2)

- **Spec-sheet grid**: shared 1px hairlines (`gap-px` over a `navy-200` background) instead of floating cards. Used for the home services grid.
- **Scope sheet**: `components/site/scope-sheet.tsx`. White "what we do" column, stone "what we don't" column.
- **Commitment list**: `components/site/trust-list.tsx`. Each promise carries a checkable detail (license number, insurance amount).
- **Big-type city row**: core cities in wide 800 on navy. Reserved for the service-area banner; don't reuse it elsewhere.
- **Closing CTA band**: `components/site/cta-band.tsx` at the bottom of each marketing page.
- **Placeholders**: unknown facts appear as visible `[brackets]` (About page) or "Placeholder" text (testimonials, photos), never as invented specifics.

## Patterns in use (Phase 3)

- **Radio tiles** (`components/ui/radio-tiles.tsx`): native radios styled as tiles; the checked tile fills navy. Used for contact method, work type and budget.
- **Split preview**: portfolio tiles show before and after side by side as a static image; the interactive slider lives in the project dialog.
- **Native disclosure**: FAQ uses `<details name>` so one answer is open per topic, with an animated height where the browser supports `::details-content`.
- **Dialogs** use native `<dialog>` with a short scale or slide in answer to the click, and Esc and backdrop clicks close them.
- **Numbered steps** appear only for real sequences: how quoting works, and the certificate-of-insurance request.

## Patterns in use (Phase 4)

- **Quote portal** is a document, not a dashboard: white sheet on stone, sections separated by rules, a real `<table>` for the price breakdown, and the total in wide 800 type (the one number that matters).
- **Action card** (navy) holds the single next step for the quote's state. On phones a fixed bottom bar keeps the total and "Review and pay" in reach.
- The portal has no site navigation: it's a transaction page.

## Patterns in use (Phase 5, admin)

- Internal tool, quieter than the public site: navy sidebar, stone-50 work area, hairline tables, semi-wide type for titles and metrics. Wide type isn't used in the admin.
- **Metric strip**: four figures in one ruled strip, not four floating cards. Each links to the filtered list behind it.
- **Status tabs** are plain links with counts, so filtered views can be bookmarked.
- **Irreversible actions** (send quote, void) confirm inline and name exactly what will happen ("Send $612.95 quote to …?").
- **History** merges quote events and email outcomes in time order; green = money in, red = declined, voided or failed.

## Patterns in use (Phase 6)

- **Brand panel** (`components/brand/brand-panel.tsx`): ridge contours on navy over a copper course. The stand-in for any missing photo, the 404 art, and the social image's motif.
- **Error pages** say what happened in one line, then offer the useful next steps (phone, quote, main pages) rather than a big "404".
- **Admin content screens** follow the builder: the form on one side, the live consequence spelled out in helper text ("Shows on Our Work", "Before and after are set, so the site shows the slider").

## Patterns in use (Phase 7, team and settings)

- **Role tiles** say in one line what each role can do, so choosing a role doesn't need a separate help page.
- **Secrets are shown once** in a copper panel with a Copy button (temporary passwords) and never emailed.
- **Settings page**: one section per topic, each with a line saying where on the site it appears; a sticky save bar, with fields given bottom scroll margin so they're never hidden behind it.
