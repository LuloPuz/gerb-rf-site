# Supabase setup for Derzhava

1. Create a Supabase project.
2. Open SQL Editor and run `supabase-schema.sql`.
3. In Authentication -> Users create the administrator account with email + password.
4. In SQL Editor replace the email and run:
   ```sql
   insert into public.admin_users(user_id)
   select id from auth.users where email = 'YOUR_ADMIN_EMAIL';
   ```
5. In Project Settings copy:
   - Project URL
   - Publishable key
6. Put only those two public values into `backend-config.js`:
   ```js
   window.DERZHAVA_BACKEND_CONFIG = {
     supabaseUrl: "https://YOUR_PROJECT.supabase.co",
     supabasePublishableKey: "YOUR_PUBLISHABLE_KEY"
   };
   ```
7. Never put a Secret key / service_role key into GitHub or browser JavaScript.
8. Open `admin.html` and sign in with the administrator account.

The public checkout calls the `create_public_order` RPC. The browser receives no direct read access to the orders table. Authenticated administrators can select and update orders through RLS.
