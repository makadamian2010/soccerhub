# Kashish Apparel redesign

Next.js App Router, React, Tailwind CSS, Framer Motion, Supabase and Stripe. Deployment target: Vercel.

## Preview

`npm install` then `npm run dev` opens http://localhost:3007. `npm run build` verifies a production build.

## Official data

125 products and 20 collections imported from https://kashishapparel.com public Shopify feeds on the timestamp in data/catalog.json. Run `npm run import:catalog` to refresh before launch. Product images, prices, variants and availability are source snapshots; actual stock quantities are not public. Product galleries show only images actually published, never fabricated detail photos. The official logo is in the footer; the masthead is a new typographic treatment. Policies preserve US-only shipping, 3–5 business day processing, free shipping at $200 and all sales final. Address and phone are supplied in the brief. Instagram and Facebook were found on the official site. No verified public email, TikTok account or jewelry inventory was found.

## Connect Supabase

1. Copy `.env.example` to `.env.local` and set project URL, anon key and server-only service role key.
2. Apply `supabase/schema.sql` in a new Supabase database.
3. Run `node --env-file=.env.local scripts/seed-supabase.mjs`.
4. Verify physical stock and set variants.stock and variants.active. Imported variants intentionally start inactive and stock 0; public availability is not a stock count.
5. Configure Auth site URL and allow `/account` redirects on the local and deployment domains. Enable email magic links and configure the production SMTP provider.

Account order access is protected by row-level security. Contact messages and newsletter records are service-role only; staff can read them in Supabase. Newsletter signup stores consent but does not send campaigns. Contact form stores enquiries but does not send staff notifications. Reviews require a paid order and moderator approval. Bag, wishlist and recent views persist on the current device, not across accounts/devices.

## Prepare Stripe

1. Add Stripe test secret, webhook secret and an approved shipping rate ID for orders below $200. Enable/configure Stripe Tax.
2. Register `/api/webhooks/stripe` for `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, and `checkout.session.expired`.
3. Set `NEXT_PUBLIC_SITE_URL` to the canonical HTTPS deployment origin.
4. Set `ENABLE_CHECKOUT=true` only after catalog prices, stock, taxes and shipping rates are verified.
5. Exercise Stripe test checkout, duplicate webhooks, expiration/restock, delayed payments and failed payment before switching to live keys.

Checkout reads prices from the server database and atomically reserves stock. Webhooks verify Stripe signatures and settle orders idempotently. Failed or expired sessions restore reserved stock. Guest orders become visible after sign-in using the checkout email. Staff update tracking_url and fulfillment status in Supabase. A rare process interruption between inventory reservation and saving the Stripe session can leave a pending reservation; reconcile these against Stripe before launch and configure an operational recovery job. Do not automatically release orders with an active payment session.

## Deploy to Vercel

Import this directory as the Vercel project root. Framework preset: Next.js; build: `npm run build`. Set the variables above in Vercel, apply the schema and seed to the production Supabase project, configure auth redirects and Stripe webhooks. No live deployment, account creation, payment, domain change or existing Shopify store modification has been performed.

## Remaining launch work

Real project credentials are required to activate accounts, forms, order storage and checkout. End-to-end payment, RLS and SQL integration checks must be run against a configured test Supabase/Stripe environment. Keep checkout disabled until those pass. Confirm whether worldwide shipping is an approved policy change, obtain a verified email/TikTok URL if desired, and request additional product photos or videos from the merchant. Existing orders/customers must be migrated through authorized private Shopify exports; the public catalog contains neither.

Product video support: add approved merchant video URLs under their product handle in `data/product-videos.json` (array of URLs). The player supports native controls and inline mobile playback; no videos were supplied by the public product feed.

## Verification completed

- Production build and TypeScript checks pass.
- `npm test`: seven in-memory PostgreSQL tests cover reservations, overselling rollback, duplicate payment events, expiration/restocking, customer RLS, anonymous access denial and submission throttling.
- Desktop (1440px) and mobile (390px) browser checks completed; mobile homepage has no document overflow or detected broken images.
- Product navigation, add-to-bag, quantity totals, wishlist and mobile search exercised in the browser.
- Catalog WebMCP read tool tested with valid and invalid input.
- Dependency audit reports zero vulnerabilities after the PostCSS patch.

These local tests do not replace Stripe test-mode checkout and a Supabase deployment integration test. Product pages query live Supabase variant availability when configured; the imported catalog remains the merchandising snapshot and should be refreshed when merchandise changes.
