# NNC CRM app: Travel CRM + Sales CRM + HRMS (multi-tenant SaaS)

This is the **CRM application only**. The marketing website (features, pricing, "Book a Demo")
is **nncdigital.co.in**, in the `nncdigitalupdate2026` project.

**The admin panel is the main app.** The owner creates every customer CRM. Customers cannot sign up
themselves, and there is no free trial.

```
Website enquiry → /api/leads → Admin ▸ Leads ▸ "Create CRM"
  → company, contact, GSTIN, product (Travel / Sales / HRMS), domain (abc.nnccrm.com),
    plan (Starter / Growth / Enterprise) + term (quarterly / half-yearly / yearly)
  → customer gets an email with login details + Razorpay payment link (+18% GST)
  → after payment the CRM opens at abc.nnccrm.com/login
  → before each renewal: reminder emails with a fresh payment link → grace 7 days → locked
```

## Run locally

Requirements: Node 20+ and MongoDB on `127.0.0.1:27017`.

```bash
npm install
cp .env.example .env.local   # then fill in the values (AUTH_SECRET, SUPERADMIN_EMAIL/PASSWORD …)
npm run seed      # creates the owner / admin login from SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD
npm run build && npm start   # http://localhost:3000 → admin login
```

| URL                         | Who           | What                                                          |
| --------------------------- | ------------- | ------------------------------------------------------------- |
| `/` → `/admin/login`        | owner         | Admin panel: overview, leads, new customer, customers, payments, emails |
| `/admin/workspaces/:id`     | owner         | One customer: details, GSTIN, payment link, change plan, reset login, extend / lock |
| `/w/:sub/login` or `abc.nnccrm.com/login` | customer + team | The customer's own CRM login |
| `/w/:sub/...`               | customer/team | The CRM itself + Team + Billing + My account (change password) |
| `/pay/:id?t=…`              | anyone with link | Razorpay payment page from emails (no login needed)       |
| `POST /api/leads`           | website       | Enquiries from nncdigital.co.in                               |

Without keys, the app runs in test mode:

| Without                  | What happens                                                |
| ------------------------ | ----------------------------------------------------------- |
| `RAZORPAY_KEY_*`         | The Pay button simulates a successful payment.              |
| `SMTP_HOST`              | Emails are only stored, visible in **/admin/emails**. The temporary password and payment link are also shown on screen in the admin panel. |

## Plans (same as nncdigital.co.in/pricing)

Prices are before GST. GST is `NEXT_PUBLIC_GST_RATE`, 18% by default, and is added at checkout and on invoices.

| Plan       | Users | Quarterly | Half yearly | Yearly  |
| ---------- | ----- | --------- | ----------- | ------- |
| Starter    | 1     | ₹4,499    | ₹8,499      | ₹14,999 |
| Growth     | 3     | ₹8,999    | ₹16,999     | ₹29,999 |
| Enterprise | 10    | ₹17,999   | ₹33,999     | ₹59,999 |

Prices are fixed in `src/lib/plans.ts`, the same as the website. Edit there and redeploy to change them.

## Subscription lifecycle (automatic)

```
new CRM: "payment pending" (only Billing opens) until the first payment
paid period (3, 6 or 12 months)
  7 / 3 / 1 days before end  → reminder email with a payment link
  period ended               → grace (7 days, still usable) + email with payment link
  grace ended                → locked (data kept, only Billing opens) + email
  renew                      → active again (early renewal adds to the old end date)
```

From the Billing page inside each CRM, the customer can renew, switch the billing term or plan from
the next renewal, upgrade now, and download GST invoices.

## Connecting the website (nncdigital.co.in)

The website's trial/demo form (`components/trial/TrialModal.jsx`) currently sends enquiries
to `nncdigitalbackend.vercel.app`. To also get them in this CRM's admin panel, add one more call
next to the existing one:

```js
// Send to NNC CRM app as well (does not block the user if it fails)
fetch('https://app.nnccrm.com/api/leads', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(crmPayload), // same payload: name, email, phone, company, requirements, service, site, landingPage
}).catch(() => {})
```

You can also send `product: "travel" | "sales" | "hrms"`. Without it, the product is guessed
from the text (for example "Travel CRM" → travel), or shown as "Not chosen" so the owner can set it.
Allowed browser origins are set in `LEAD_ALLOWED_ORIGINS`.

Customers don't sign up on the app. You create their CRM from **Admin ▸ Leads ▸ Create CRM**.

## Code map

```
src/lib/products.ts      the 3 CRMs and their modules (config driven)
src/lib/plans.ts         fixed plans/prices (same as the website)
src/lib/billing.ts       payments + GST, payment links, activation, renewal, reminder/grace/lock job
src/lib/paylink.ts       signed payment links (/pay/:id?t=…)
src/app/actions/admin.ts create customer, payment link, reset login, change plan
src/lib/leads.ts         lead creation + product guessing + emails
src/lib/razorpay.ts      orders + signature verification
src/middleware.ts        subdomain routing, login protection, hidden admin
src/app/api/leads        website lead intake (CORS)
src/app/api/payments/webhook   Razorpay webhook
src/app/api/cron/billing       cron endpoint (Bearer CRON_SECRET)
```

## Deploy on Vercel

1. **Database:** create a free cluster on [MongoDB Atlas](https://www.mongodb.com/atlas).
   - Add a database user.
   - Under Network Access, allow `0.0.0.0/0` (Vercel has no fixed IP).
   - Copy the `mongodb+srv://…` connection string.
2. **Import the project:** in Vercel, choose *Add New → Project* and import this GitHub repo. The framework (Next.js) is detected automatically.
3. **Environment variables:** in *Settings → Environment Variables*, add each variable from `.env.example`. At minimum set these:

   | Variable | Example |
   | --- | --- |
   | `MONGODB_URI` | `mongodb+srv://user:pass@cluster0.xxxx.mongodb.net/nnc_crm` |
   | `AUTH_SECRET` | a long random string (**required**) |
   | `SUPERADMIN_EMAIL` / `SUPERADMIN_PASSWORD` | your owner login |
   | `CRON_SECRET` | a random string (Vercel Cron uses it automatically) |
   | `NEXT_PUBLIC_APP_URL` | `https://nncnewcrmone.vercel.app` (or your domain) |
   | `ROOT_DOMAIN` / `NEXT_PUBLIC_ROOT_DOMAIN` | `nncnewcrmone.vercel.app` (or `nnccrm.com`) |
   | `NEXT_PUBLIC_USE_SUBDOMAINS` | `false` on *.vercel.app, `true` with your own wildcard domain |
   | `NEXT_PUBLIC_WEBSITE_URL` | `https://nncdigital.co.in` |
   | `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET` | live keys (empty = test mode) |
   | `SMTP_HOST` `SMTP_PORT` `SMTP_USER` `SMTP_PASS` `MAIL_FROM` `ADMIN_EMAIL` | your mail provider |
   | `COMPANY_ADDRESS` / `COMPANY_GSTIN` | printed on invoices |

   `NEXT_PUBLIC_*` values are baked in at build time, so **redeploy** after you change them.
4. **Deploy**, then open `/admin/login` and sign in with `SUPERADMIN_EMAIL` / `SUPERADMIN_PASSWORD`.
   On an empty database, this first login creates the owner account.
5. **Renewal reminders:** `vercel.json` registers a Vercel Cron that calls `/api/cron/billing` every
   day at 03:30 UTC (09:00 IST). It sends the reminders, moves expired plans to grace, and locks lapsed CRMs.
   You can also run it any time from the dashboard ("Run renewal reminders now").
6. **Razorpay webhook:** add `https://<your-domain>/api/payments/webhook` with the events
   `payment.captured` and `order.paid`.
7. **Customer domains (optional):** to give customers `abc.nnccrm.com`, add the domains
   `nnccrm.com` and `*.nnccrm.com` in *Vercel → Settings → Domains*. A wildcard domain requires
   Vercel nameservers. Then set `ROOT_DOMAIN=nnccrm.com`, `NEXT_PUBLIC_USE_SUBDOMAINS=true` and
   `COOKIE_DOMAIN=.nnccrm.com`, and redeploy. Without this, customer CRMs work at `/w/<name>`.
8. **Website leads:** add your Vercel domain to `LEAD_ALLOWED_ORIGINS` if you test from other sites.
   The website should post to `https://<your-domain>/api/leads`.

## Production checklist

1. **DNS:** `app.nnccrm.com` (or your chosen domain) plus a **wildcard `*.nnccrm.com`** pointing
   to the server, with a wildcard SSL certificate.
2. `.env`: `NEXT_PUBLIC_APP_URL=https://app.nnccrm.com`, `ROOT_DOMAIN=nnccrm.com`,
   `NEXT_PUBLIC_ROOT_DOMAIN=nnccrm.com`, `NEXT_PUBLIC_USE_SUBDOMAINS=true`,
   `COOKIE_DOMAIN=.nnccrm.com`. Rebuild after changing any `NEXT_PUBLIC_*` value.
3. **Razorpay:** live keys, plus a webhook at `/api/payments/webhook` (events `payment.captured`, `order.paid`).
4. **SMTP**, `ADMIN_EMAIL`, and `COMPANY_ADDRESS` / `COMPANY_GSTIN` (shown on invoices).
5. Run `npm run build && npm start` (PM2). The reminder job runs hourly. On serverless hosting, call `/api/cron/billing` daily instead.
6. Change the owner password: set `SUPERADMIN_PASSWORD`, then run `npm run seed`.
