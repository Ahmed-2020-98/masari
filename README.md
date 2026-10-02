# مساري — Masari

Saudi multi-carrier shipping platform: compare carrier rates, issue AWBs and labels, track shipments, collect COD into a wallet, and connect Salla/Zid stores.

```
brand/      Brand assets (logo, mark, icons) + tokens.json for the future Flutter theme
backend/    Laravel 13 API (MySQL) — the single source of truth for web, admin and mobile
frontend/   pnpm monorepo
  apps/web     Next.js 16: landing, tracking, auth, merchant dashboard  → http://localhost:4310
  apps/admin   Next.js 16: back-office                                   → http://localhost:4311
  packages/ui  Design system (RTL, brand tokens, components)
  packages/api Typed client + OpenAPI-generated schema
  packages/i18n Arabic messages + formatters
mobile/     Flutter merchant app (iOS/Android) — see mobile/README.md
```

## Run locally

```bash
# API (http://127.0.0.1:8010, OpenAPI docs at /docs/api)
cd backend
composer install && cp .env.example .env && php artisan key:generate   # first time only
php artisan migrate:fresh --seed
php artisan serve --port=8010
php artisan queue:work          # notifications + outbound webhooks
php artisan schedule:work       # mock carrier tracking (masari:track every minute)

# Web + admin
cd frontend
pnpm install
pnpm dev
```

### Demo accounts (seeded, local only)

| App | Phone | Password |
|---|---|---|
| Merchant (web) | 0500000000 | password123 |
| Admin | 0500000001 | Masari@2026 |

OTP codes are always `1111` outside production (SMS goes to the Laravel log).

## Drivers (swap via `backend/.env`)

| Concern | Dev default | Production |
|---|---|---|
| Carriers | `mock` driver simulates AWB, label and tracking | Add a real driver in `app/Services/Carriers/Drivers` and register it in `CarrierManager` |
| Payments | `PAYMENT_DRIVER=fake` (simulated checkout page) | `PAYMENT_DRIVER=tap` + `TAP_SECRET_KEY` |
| SMS | `SMS_DRIVER=log` | `SMS_DRIVER=unifonic` + `UNIFONIC_APP_SID` |
| Stores | — | `SALLA_*`, `ZID_*` credentials |

## Checks

```bash
cd backend && php artisan test && vendor/bin/pint --test
cd frontend/apps/web && npx tsc --noEmit && npx eslint src && npx next build
cd frontend/apps/admin && npx tsc --noEmit && npx eslint src && npx next build
pnpm --filter @masari/api generate   # regenerate TS types after `php artisan scramble:export --path=storage/api-docs/openapi.json`
```
