# Deployment

GitHub Pages publishes the `frontend/` directory through `.github/workflows/deploy-pages.yml`.

Supabase remains the production data/auth layer. Keep the browser publishable key only in frontend configuration; never commit a service-role or secret key.
