# Production backend: Yandex Cloud

Architecture: GitHub Pages frontend -> Yandex Cloud Function -> Yandex Managed Service for PostgreSQL.

Real customer personal data must be stored only in the Russian-hosted PostgreSQL database. Database passwords and the admin token secret are not stored in GitHub.

## Create in Yandex Cloud

1. VPC network and subnet.
2. Managed Service for PostgreSQL cluster in the same VPC. PostgreSQL 16 is sufficient.
3. Database: `derzhava`.
4. Application DB user: `derzhava_app`.
5. Run `yandex-backend/schema.sql` in WebSQL.
6. Create Lockbox secrets:
   - `PGPASSWORD`
   - `ADMIN_TOKEN_SECRET` (random string at least 32 characters)
7. Create a Cloud Function:
   - Runtime: Node.js 22
   - Entry point: `index.handler`
   - Code: the contents of `yandex-backend/`
   - Network: same VPC as PostgreSQL
   - Public invocation: enabled
   - Environment:
     - `PGHOST` = internal PostgreSQL host/FQDN
     - `PGPORT` = PostgreSQL port for the cluster
     - `PGDATABASE=derzhava`
     - `PGUSER=derzhava_app`
     - `PGSSL=false`
     - `ALLOWED_ORIGINS=https://lulopuz.github.io`
   - Inject `PGPASSWORD` and `ADMIN_TOKEN_SECRET` from Lockbox.

## First administrator

Create the administrator in Yandex WebSQL yourself so the password never enters ChatGPT or GitHub:

```sql
insert into admin_users(email, password_hash)
values ('YOUR_EMAIL', crypt('YOUR_PASSWORD', gen_salt('bf', 12)));
```

## Activate the site

After deployment, copy the HTTPS invocation URL of the function into:

`backend-config.js -> apiBaseUrl`

The function URL is not a secret. Until apiBaseUrl is filled, the site stays in local-preview mode and sends no real customer data to a remote database.
