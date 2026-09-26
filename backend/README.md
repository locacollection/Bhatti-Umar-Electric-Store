# Industrial Backend

The backend is intentionally separate from the customer frontend. It is structured as an industrial-style service layer so the storefront does not contain database, authentication, order-processing, or administration logic.

## Structure
- `src/config` — environment and service configuration
- `src/routes` — HTTP API routes
- `src/controllers` — request/response orchestration
- `src/services` — business logic
- `src/repositories` — database access
- `src/middleware` — validation, errors, auth and logging
- `src/types` — shared backend types
- `src/app.js` — API composition
- `src/server.js` — server entry point

Do not copy the reference site's backend architecture. This backend is designed specifically for Bhatti Electric Store.