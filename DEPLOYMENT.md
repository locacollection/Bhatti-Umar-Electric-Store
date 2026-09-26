# Bhatti Electric Store — production deployment

## Architecture
- Customer storefront: `frontend/`
- Admin studio: `frontend/admin.html`
- Express API: `backend/`
- Supabase database/auth: `supabase/`
- Public storefront uses only the Supabase publishable key.
- Service-role credentials stay in the backend hosting environment.

## Deploy the API
Use the included `render.yaml` with Render. Set `SUPABASE_SERVICE_ROLE_KEY` as a secret in Render; never commit it. The service uses `/api/health` as its health check and listens on Render's `PORT`.

Render can automatically redeploy from the linked GitHub branch after each push.

## Deploy the storefront
The included GitHub Actions workflow publishes only `frontend/` to GitHub Pages. In GitHub:
1. Settings → Pages.
2. Set Source to GitHub Actions.
3. Pushes to `main` deploy the storefront automatically.

## First admin
1. Open the storefront and create a normal customer account.
2. In Supabase SQL Editor, promote that already-created account by replacing the placeholder with the account email:

```sql
update public.profiles p
set role='admin', updated_at=now()
from auth.users u
where u.id=p.id
  and lower(u.email)=lower('YOUR-ADMIN-EMAIL');
```

Do not put an admin password, service-role key, or database password in this repository.

## Production checklist
- Confirm Supabase Auth email/redirect URLs include the final GitHub Pages/custom-domain URL.
- Confirm Render `CORS_ORIGIN` matches the storefront origin.
- Replace starter inventory quantities with real stock through Admin Studio.
- Add real product images/SKUs/prices.
- Test signup → email verification → login → address → cart → checkout → order → admin status → delivered → review → admin approval.
- Use a custom domain when ready; update `CORS_ORIGIN` and Supabase Auth redirect URLs.
