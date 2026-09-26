# Architecture

Bhatti Electric Store follows a separated storefront/admin/database layout while preserving the proven customer-store interaction model from the reference application.

### Runtime
Customer UI: `frontend/index.html`\nAdmin UI: `frontend/admin/index.html` and `frontend/admin/store.html`\nDatabase: Supabase\n
### Catalogue
Products are read from `public.products`. Category navigation is electrical-specific and backed by `public.catalog_categories`.

### Security
RLS remains authoritative. The browser uses only the Supabase publishable key. Privileged admin operations remain server-side/Edge Function based.
