# Raiko backend setup

1. Open the Supabase SQL Editor and run `supabase.sql` once. It creates the contact, newsletter, product, order, and order-item tables and seeds all 16 products with stable IDs and zero stock.
2. Fill in the Supabase and Resend values in `.env.local` using `.env.example` as the key list.
3. Stop the Python static server if it is running.
4. Start the site with `node server.js`.
5. Open `http://127.0.0.1:4173`.

`SUPABASE_URL` and `SUPABASE_ANON` connect the contact and checkout APIs to Supabase. `RESEND_API_KEY` authorizes notification delivery, `RESEND_TO_EMAIL` is your notification inbox, and `RESEND_FROM_EMAIL` is the sender. During testing, use `Raiko Website <onboarding@resend.dev>` and send only to the email associated with your Resend account. For production recipients, verify a domain in Resend and use an address on that domain as `RESEND_FROM_EMAIL`.

To make a product purchasable later, update its stock in the Supabase SQL Editor, for example:

```sql
update public.products set stock = 10 where id = 'lovesick-girls';
```

Then change the matching front-end `data-stock` state or product catalog rendering when you are ready to open sales.

## Deploying to Vercel

1. Import the GitHub repository into Vercel.
2. Choose **Other** for the framework preset.
3. Keep the root directory as the repository root.
4. Leave the build command and output directory empty. The HTML, CSS, images, and browser JavaScript are static files.
5. In **Project Settings → Environment Variables**, add `SUPABASE_URL`, `SUPABASE_ANON`, `RESEND_API_KEY`, `RESEND_TO_EMAIL`, and `RESEND_FROM_EMAIL` for Production, Preview, and Development as needed.
6. Redeploy after saving environment variables. Vercel only applies new environment-variable values to new deployments.

The files in `api/` are Vercel Functions. `server.js` remains the local development server and must not be entered as Vercel's build or start command.
