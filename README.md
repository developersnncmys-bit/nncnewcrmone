# NNC CRM (UI only): Travel CRM + Sales CRM + HRMS

This version of the app is **UI only**. There is no database, login, payment gateway or email
sending. Every screen reads from dummy data in [`src/lib/demo-data.ts`](src/lib/demo-data.ts).
Forms and buttons respond (success messages, redirects, CSV export), but **nothing is saved**.
Refreshing a page always shows the same dummy data.

The full version with MongoDB, logins, Razorpay and emails is in the git history (commit `aad5f68`).

## Run locally

Requirements: Node 20+.

```bash
npm install
npm run dev        # http://localhost:3000 → admin login (any email + password works)
```

## Screens

| URL                              | What                                                            |
| -------------------------------- | --------------------------------------------------------------- |
| `/admin/login`                   | Owner login (any email + password)                              |
| `/admin`                         | Dashboard: revenue, renewals, leads                             |
| `/admin/renewals`                | Plans due / expired / locked / unpaid / renewed                 |
| `/admin/workspaces`              | All customers, plus one page per customer                       |
| `/admin/workspaces/new`          | Create a customer CRM (form only)                               |
| `/admin/payments`                | Payments and invoices                                           |
| `/admin/leads`                   | Leads                                                           |
| `/admin/emails`, `/admin/settings` | Email log, settings                                           |
| `/w/<name>`                      | A customer's CRM, e.g. `/w/balajitours` (Travel), `/w/apexrealty` (Sales), `/w/greenleaf` (HRMS) |
| `/w/<name>/login`                | That CRM's login screen                                         |
| `/pay/<id>`                      | Payment page, e.g. `/pay/pay-1` (button simulates payment)      |

## Changing the dummy data

Edit [`src/lib/demo-data.ts`](src/lib/demo-data.ts): customers (`SEEDS`), leads (`LEADS`),
CRM records per module (`SAMPLE`) and emails (`EMAILS`). Dates are relative to today, so
renewals and charts always look current. Plans and prices are in [`src/lib/plans.ts`](src/lib/plans.ts),
products and their modules in [`src/lib/products.ts`](src/lib/products.ts).
