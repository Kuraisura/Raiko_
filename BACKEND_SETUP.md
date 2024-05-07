# Raiko backend setup

1. Open the Supabase SQL Editor and run `supabase.sql` once. It creates the contact, newsletter, product, order, and order-item tables and seeds all 16 products with stable IDs and zero stock.
2. Fill in the three values in `.env.local`.
3. Stop the Python static server if it is running.
4. Start the site with `node server.js`.
5. Open `http://127.0.0.1:4173`.

`SUPABASE_URL` and `SUPABASE_ANON` are used only by `server.js`. `RESEND_EMAIL` is stored as the intended notification recipient with each contact message. Sending email through Resend itself also requires a Resend API key, which is intentionally not assumed or exposed here.

To make a product purchasable later, update its stock in the Supabase SQL Editor, for example:

```sql
update public.products set stock = 10 where id = 'lovesick-girls';
```

Then change the matching front-end `data-stock` state or product catalog rendering when you are ready to open sales.
