# Supabase setup for Derzhava

Production project:
- Project ref: `ffmuypfbosvazwyjuvoi`
- Project URL: `https://ffmuypfbosvazwyjuvoi.supabase.co`
- Public browser key: configured in `backend-config.js`
- Public order endpoint: Edge Function `create-order`

## Security model

- The browser only has the publishable key.
- Customers cannot read the `orders` table.
- Customers cannot insert directly into `orders`.
- New orders are validated and written by the `create-order` Edge Function.
- Administrators sign in with Supabase Auth.
- RLS allows only users listed in `public.admin_users` to read/update orders.
- Never commit a secret/service-role key to GitHub.

## Create the first administrator

1. In Supabase Dashboard open Authentication -> Users.
2. Create a user with your administrator email and password.
3. Then add that Auth user to `public.admin_users`:
   ```sql
   insert into public.admin_users(user_id)
   select id from auth.users where email = 'YOUR_ADMIN_EMAIL'
   on conflict (user_id) do nothing;
   ```
4. Open `admin.html` and sign in.

The current database schema is stored in `supabase-schema.sql`.
