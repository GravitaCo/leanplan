# Rename: Tali to Tilo, and tali.fit to tilo.fit

Checklist for Benn, 5 Nov 2026, from an audit of `main` (c5fd4c0). Benn owns tilo.fit and has
done the new Tilo branding. Nothing here has been changed yet.

## Read this first: moving the app's address moves where its data lives

The app keeps each person's log in the browser (`localStorage`, key `leanplan.v1`), and browsers
keep that per address. **A person who opens app.tilo.fit starts with an empty device.** For
someone who has synced, the cloud copy comes back after sign-in. Anything not yet synced does not,
and nor does a log kept only on the device because the person has not given health consent, since
those logs never reach the cloud.

The same move also affects:
- **Sign-in:** everyone is signed out and signs in again.
- **Home-screen installs:** people who installed the app keep opening app.tali.fit until they
  reinstall from app.tilo.fit.
- **Push reminders:** subscriptions belong to the old address. People need to switch reminders on
  again at app.tilo.fit.

So **app.tali.fit must not simply redirect** to app.tilo.fit. It needs a short hand-over: the old
address keeps serving the app, makes sure everything has synced, warns anyone with device-only
data (offering the existing export), and then sends people to app.tilo.fit. Only after that does it
become a redirect. GitHub Pages serves one custom domain per site, so the old address needs a
small second Pages site (or Cloudflare) for the hand-over. Engineering designs this, and
`security-data` and `ship-critic` review it before the switch. How much it matters depends on
how many people use the app today; that's worth checking first.

Keep paying for tali.fit for at least a year so the redirects keep working.

## 1. DNS for tilo.fit (at the registrar where you bought it)

| Record | Points to | For |
|---|---|---|
| `app.tilo.fit` CNAME | `gravitaco.github.io` | The app on GitHub Pages |
| `www.tilo.fit` | The records Webflow shows under Site settings, Publishing, Custom domains | The website |
| `tilo.fit` (bare domain) | Webflow's records for the bare domain, set to redirect to www | The website |
| MX, SPF, DKIM, DMARC | Your email provider | Only if you want email at tilo.fit |

Also, in GitHub organisation settings, add tilo.fit as a **verified domain for Pages**, so no one
else can claim app.tilo.fit on GitHub.

## 2. The old domain (tali.fit)

- `www.tali.fit` and `tali.fit`: 301 redirect to the same path on www.tilo.fit. This keeps
  `/legals/privacy`, `/legals/terms` and `/legals/cookie-policy` working, including links in
  versions of the app people still have cached.
- `app.tali.fit`: the hand-over above first, then a redirect.

## 3. Services and dashboards (outside the repo)

| Where | What to change |
|---|---|
| GitHub Pages (repo settings) | Custom domain to `app.tilo.fit` and Enforce HTTPS, once DNS is live. Goes with the `public/CNAME` change in the same deploy |
| Supabase: Authentication, URL configuration | Site URL to `https://app.tilo.fit`. Add app.tilo.fit to the redirect URLs and keep app.tali.fit until the hand-over ends. Without this, sign-up confirmation, password reset and Google sign-in fail on the new address |
| Supabase: Authentication, email templates | Replace "Tali" in the confirmation, reset and magic-link emails (and the sender name, if you use custom email) |
| Google Cloud: OAuth consent screen | App name, logo, homepage, privacy and terms links, authorised domains (add tilo.fit). Google may re-review the consent screen when these change |
| Bunny Stream library | If the library limits which sites may play clips (the allowed referrers list), add app.tilo.fit, or every exercise video stops on the new address |
| Webflow | Add www.tilo.fit and tilo.fit as custom domains and make www.tilo.fit the default; then rebrand the site (copy, logo, favicon, sharing images, page titles), the early-access form's name and notification email, and the Legals collection |
| Cloudflare Turnstile (on the early-access form) | Add the new domain to the widget's allowed hostnames, or the form stops accepting sign-ups |
| Google Search Console | Add tilo.fit and use Change of Address from tali.fit |
| Social, email signatures, anywhere else that links to tali.fit | Update |

## 4. In the repo (one change on a working branch)

- **Domain:** `public/CNAME` to `app.tilo.fit`; the comment in `vite.config.ts`;
  `scripts/wellbeing/wind-down.ts`; `scripts/e2e-shared-products.cjs` (expects the www.tali.fit
  terms link).
- **Edge Functions:** add `app.tilo.fit` to the allowed origins in
  `supabase/functions/_shared/product-fn.ts`, `ai-read-label/index.ts` and
  `delete-account/index.ts` (keep app.tali.fit during the hand-over), then redeploy all six
  functions (the three product functions share `product-fn.ts`). Otherwise label reading, the
  shared product list and account deletion are refused on the new address. Also update the
  `User-Agent` in `submit-product` and the notification titles in `_shared/reminders.ts`.
- **App shell:** `public/manifest.webmanifest` (name, short name, colours if they change); the icons
  and favicons in `public/` regenerated from the new app icon (`Tali-App.svg` replaced); `index.html`
  title and meta; notification titles in `public/sw.js`; bump the service worker `CACHE`.
- **Brand in the app:** `src/ui/brand.tsx` (the mark, `TaliMark`) and tokens in
  `src/styles/theme.css` if the palette changes; "Tali" in user-facing copy (about 330 mentions in
  83 files under `src/`), including onboarding, notifications, consent and feedback text.
- **Legal (goes past `compliance`):** `SITE` in `src/core/legal/index.ts`; `privacy.ts`,
  `terms.ts`, `cookies.ts`, `website.ts`; the `check:legal` fixtures in `scripts/`; then
  `npm run legal:html` and republish the three pages in Webflow; update the register and DPIA in
  `docs/compliance/`. The privacy policy names the service and its addresses, so `compliance`
  should say whether existing users need telling about the change.
- **Docs and agents:** `CLAUDE.md`, `.claude/agents/` (README, compliance, design, ship-critic),
  `docs/local-preview.md`, plans that mention tali.fit.

**Keep as they are** (internal names users never see; renaming them loses data or breaks
matching): the `leanplan.v1` storage key and the Supabase table and column names (CLAUDE.md
rule); the `tali-notify` IndexedDB name; the `tali-checkin` and other notification tags shared
between the server and `sw.js`; CSS class names such as `.tali-mark`; the `tali-v…` cache prefix
(changing it is harmless but unnecessary); the repo name `leanplan`.

## 5. Approvals and reviews

- The new branding and every visual change goes past the `design` agent and needs Benn's (or
  Sara's) approval on the Design canvas before it ships.
- Legal text and the register: `compliance`. Auth, redirects, the data hand-over: `security-data`.
- Everything: `ship-critic` before `main`.

## 6. Not technical, but worth doing

- File the UK trade mark for Tilo (class 9 at minimum) before the name goes public. It starts the
  six-month window to file in the US with the same date.
- Tell the early-access list about the new name (`compliance` to confirm the email is a service
  message they agreed to).
- Claim the Tilo social handles you want.
- Update the ICO registration if it names Tali.

## Suggested order

1. Check how many people use the app; agree the hand-over approach.
2. DNS for tilo.fit; verify the domain in GitHub.
3. Webflow: add the domains, rebrand the site, republish legal pages; redirect www.tali.fit.
4. Supabase, Google, Bunny and Turnstile settings (both addresses allowed).
5. The repo change (domain, functions, shell, brand, legal), reviewed and deployed together with
   the GitHub Pages domain switch.
6. The app.tali.fit hand-over, then its redirect.
7. Search Console change of address; tidy up the old address after the hand-over period.
