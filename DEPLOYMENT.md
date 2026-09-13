# Deploying Journal by Noel — step by step

This covers three things, in order:

1. **Supabase** — a real database + real user accounts (replaces the old browser-only demo)
2. **GitHub** — where your code lives
3. **Vercel** — hosts the live site, connected to GitHub so every push auto-deploys

Budget about 30–45 minutes the first time. Everything below assumes you're starting from zero on all three services.

---

## Part 1 — Supabase (database + auth)

### 1.1 Create your account and project

1. Go to **[supabase.com](https://supabase.com)** → **Start your project** → sign up (GitHub sign-in is easiest).
2. Click **New project**.
3. Pick an organization (Supabase creates a personal one for you automatically), then fill in:
   - **Name**: anything, e.g. `journal-by-noel`
   - **Database password**: generate one and **save it somewhere** (a password manager). You won't need it for this app directly, but you'll want it if you ever connect a Postgres client directly.
   - **Region**: pick whatever's closest to you or your users.
4. Click **Create new project**. It takes 1–2 minutes to provision — grab a coffee.

### 1.2 Run the database schema

1. Once the project is ready, open the left sidebar → **SQL Editor**.
2. Click **New query**.
3. Open [`supabase/schema.sql`](./supabase/schema.sql) from this repo, copy its entire contents, and paste it into the SQL editor.
4. Click **Run** (bottom right, or Cmd/Ctrl+Enter).
5. You should see "Success. No rows returned." This created every table, enabled Row Level Security on all of them, set up a storage bucket for trade screenshots, and added a trigger that auto-creates a profile the moment someone signs up.

If you ever want to inspect the tables visually: left sidebar → **Table Editor**.

### 1.3 Get your API keys

1. Left sidebar → **Project Settings** (gear icon) → **API**.
2. You need two values from this page:
   - **Project URL** — looks like `https://abcdefgh.supabase.co`
   - **`anon` `public` key** — a long string under "Project API keys"
3. Scroll down slightly further and also copy the **`service_role` key** (also under "Project API keys", marked **secret**). This one is different from the anon key and must never be shared publicly or committed to git.

### 1.4 Put the keys into your local project

Open `.env.local` in the project root (already created for you, currently has placeholder values) and replace them:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-role-key
```

This file is already in `.gitignore` — it will never be committed. Restart `npm run dev` after editing it.

### 1.5 Configure allowed redirect URLs (important, easy to miss)

Signup confirmation, password reset, and OAuth logins all redirect back to your app through `/auth/callback`. Supabase only allows redirects to URLs you've explicitly approved.

1. Left sidebar → **Authentication** → **URL Configuration**.
2. **Site URL**: set to `http://localhost:3000` for now (you'll change this to your real domain once you deploy — see Part 3.4).
3. **Redirect URLs**: add:
   ```
   http://localhost:3000/auth/callback
   ```
   You'll come back here and add your production URL after deploying to Vercel.

### 1.6 (Optional) Set a stronger minimum password length

Left sidebar → **Authentication** → **Policies** (or **Providers** → **Email**, depending on your Supabase version) → look for **Minimum password length** and set it to `8` to match what the signup form already checks client-side.

### 1.7 (Optional) Enable Google / Apple sign-in

The app already calls `supabase.auth.signInWithOAuth(...)` for both buttons — they just won't work until you configure the providers:

- **Google**: Authentication → Providers → Google. You'll need a Google Cloud OAuth Client ID/Secret — [Supabase's guide](https://supabase.com/docs/guides/auth/social-login/auth-google) walks through creating one.
- **Apple**: Authentication → Providers → Apple. Requires an Apple Developer account — [Supabase's guide](https://supabase.com/docs/guides/auth/social-login/auth-apple).

Skip this if email/password is enough for now — nothing else in the app depends on it.

### 1.8 Set up real email sending (required before real users sign up)

Supabase's built-in email sender is **testing-only** and rate-limited to a
handful of emails per hour — fine for your own testing, but it will block
real signups almost immediately. Fix it once, permanently, with a free
[Resend](https://resend.com) account:

1. **[resend.com](https://resend.com)** → sign up (GitHub sign-in is fastest).
2. Dashboard → **API Keys** → **Create API Key** → copy it (starts with `re_...`).
   You don't need to verify a custom domain to start — Resend lets you send
   from `onboarding@resend.dev` immediately.
3. Supabase Dashboard → **Authentication** → **Emails** → **SMTP Settings** →
   toggle **Enable Custom SMTP** and fill in:

   | Field | Value |
   |---|---|
   | Sender email | `onboarding@resend.dev` (or your own verified domain later) |
   | Sender name | `Journal by Noel` |
   | Host | `smtp.resend.com` |
   | Port | `465` |
   | Username | `resend` |
   | Password | *(your Resend API key)* |

4. Save. Confirmation, password-reset, and any future transactional emails
   now go through Resend instead of Supabase's rate-limited default.

---

## Part 2 — GitHub

### 2.1 Create the repository

1. Go to **[github.com/new](https://github.com/new)**.
2. **Repository name**: e.g. `journal-by-noel`.
3. Leave it **Public** or set to **Private** — your call.
4. Do **not** check "Add a README" or "Add .gitignore" — this project already has both.
5. Click **Create repository**. GitHub will show you a page with a remote URL like `https://github.com/your-username/journal-by-noel.git` — copy it.

### 2.2 Push your code

The project is already a git repo with everything committed locally except your `.env.local` (which is correctly excluded). From the project root:

```bash
git remote add origin https://github.com/your-username/journal-by-noel.git
git branch -M main
git push -u origin main
```

Refresh the GitHub page — your code should be there.

---

## Part 3 — Vercel

### 3.1 Create your account

Go to **[vercel.com](https://vercel.com)** → **Sign Up** → choose **Continue with GitHub** (this makes step 3.2 one click instead of a manual token setup).

### 3.2 Import the project

1. From the Vercel dashboard: **Add New…** → **Project**.
2. Under "Import Git Repository", find `journal-by-noel` and click **Import**.
3. Vercel auto-detects Next.js — leave the build settings as default.

### 3.3 Add environment variables

Before clicking Deploy, expand **Environment Variables** and add the same three values from your `.env.local`:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | your service role key (keep this one secret — Vercel encrypts it, but never expose it in client code) |

Click **Deploy**. It takes about a minute.

### 3.4 Connect the deployed URL back to Supabase

Once deployed, Vercel gives you a URL like `https://journal-by-noel.vercel.app`.

1. Back in Supabase → **Authentication** → **URL Configuration**:
   - **Site URL**: change to `https://journal-by-noel.vercel.app` — **include the `https://`**. If Supabase can't match the redirect it was asked for against an allowed URL, it silently falls back to this field verbatim, protocol and all, so a bare domain here breaks every auth redirect rather than erroring loudly.
   - **Redirect URLs**: add `https://journal-by-noel.vercel.app/auth/callback` (keep the `localhost` one too, so local dev keeps working)
2. Save.

Without this step, email confirmation/password-reset/OAuth links will redirect to the wrong place once you're live. If they still do after this, double check neither field has a stray bare domain (no `https://`) or missing `/auth/callback` path.

### 3.5 Try it

Open your Vercel URL, sign up with a real email address you can check, click the confirmation link, and you should land in onboarding. From Settings → Data, you can click **Load sample data** to populate realistic fictional trades for exploring the rest of the app.

---

## Part 4 — Premium subscriptions (Stripe)

Free tier: 1 account, 10 trades/month. Premium ($15/month) removes both caps. This needs a Stripe account and three env vars.

### 4.1 Create the product and price

1. **[stripe.com](https://stripe.com)** → sign up (or log in). Keep **test mode** on until you're ready to charge real cards.
2. **Product catalog → Add product**: name `Premium`, pricing **Recurring**, `$15.00`, **Monthly**, USD.
3. Copy the **Price ID** (`price_...`).
4. **Developers → API keys** → copy the **Secret key** (`sk_test_...`).

### 4.2 Create the webhook endpoint

The webhook is what keeps Supabase in sync with Stripe (who's subscribed, who cancelled, etc.) — it's the only thing ever allowed to write to the `subscriptions` table.

**Dashboard → Developers → Webhooks → Add endpoint**:
- Endpoint URL: `https://<your-domain>/api/stripe/webhook`
- Events to send: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`

After creating it, click into the endpoint and copy its **Signing secret** (`whsec_...`).

(If your assistant has a Stripe secret key already, this can be done in one API call instead — `POST https://api.stripe.com/v1/webhook_endpoints` — which returns the signing secret directly in the response.)

### 4.3 Set the three env vars

Locally in `.env.local`, and in Vercel → Project → Settings → Environment Variables (Production **and** Preview):

```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PREMIUM_PRICE_ID=price_...
```

Redeploy after adding these to Vercel — env var changes only apply to new deployments.

### 4.4 Test it

Stripe's test mode accepts a magic card number: `4242 4242 4242 4242`, any future expiry, any CVC, any ZIP. From Settings → Billing → **Upgrade to Premium**, complete checkout with that card, and you should land back on Settings with a "Welcome to Premium" toast and the plan badge flipped to Premium.

### 4.5 Go live

When ready to accept real payments: flip Stripe out of test mode, create a **live-mode** Product/Price (test and live are separate), repeat 4.1–4.3 with the live keys, and update `STRIPE_PREMIUM_PRICE_ID` accordingly.

---

## Ongoing: shipping changes

Every `git push` to `main` triggers a new Vercel deployment automatically. Typical loop:

```bash
git add -A
git commit -m "whatever you changed"
git push
```

**When a change adds a new database table** (like the Payouts feature did), the
app's code will look for that table the moment it deploys — so the table has
to exist in Supabase *before* you push, or the whole app will fail to load for
every signed-in user (not just the new feature). Re-run [`supabase/schema.sql`](./supabase/schema.sql)
in the Supabase SQL Editor (Part 1.2) any time you pull a change that touches
it — it's written so re-running the entire file is always safe, even if most
of it already exists.

## What's still worth knowing

- **No automated tests** were part of this build — if you plan to keep extending this, consider adding some before it grows much further.
- **Background writes aren't retried.** Every trade/account/etc. write happens optimistically (the UI updates instantly, then syncs to Supabase in the background). If that background write fails — e.g. a dropped connection — it's only logged to the browser console, not surfaced to the user. Fine for a single-person journal; worth hardening if this becomes collaborative or higher-stakes.
- **Trade screenshots are public.** The `trade-screenshots` storage bucket is public-read so `<img>` tags can load them directly without signed URLs. Anyone with the exact URL (which includes your user id and a random suffix) could view an image, but URLs aren't discoverable or listed anywhere. If you want stricter privacy, switch the bucket to private and generate signed URLs instead (`supabase.storage.from(...).createSignedUrl(...)`).
- **Two-factor authentication** isn't wired up (Settings just links to Supabase's own docs for it). Supabase supports real TOTP-based MFA if you want to add it later.
- **Stripe test vs. live mode are separate universes** — separate API keys, separate Products/Prices, separate webhook endpoints. Switching to live mode means redoing Part 4.1–4.3 with live-mode values, not just flipping a toggle.
- **The webhook is the only source of truth for who's Premium.** The `subscriptions` table's Row Level Security policy is read-only for regular users specifically so nobody can grant themselves Premium by writing to it directly — all writes go through `/api/stripe/webhook` using the service-role key, triggered only by real Stripe events.
