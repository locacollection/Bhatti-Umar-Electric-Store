# Bhatti Electric Store

Industrial electrical supply storefront, rebranded and adapted from the LOCA Collection storefront architecture.

## Architecture
- `frontend/` — customer storefront and admin UI
- `frontend/assets/` — static assets
- `frontend/styles/` — presentation layer
- `frontend/scripts/` — browser modules and admin modules
- `supabase/` — database migrations and Edge Functions
- `tests/` — catalog/auth/address checks
- `docs/` — architecture and deployment notes

The storefront uses Supabase project `ewldqjmyijfhrdenwqfn` with a publishable browser key only. No service-role secret belongs in frontend code.
