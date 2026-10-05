# Paystack checkout setup

The checkout requires deployment to Vercel. Do not put secret keys in HTML or browser JavaScript, and do not commit them to this project.

## Configure Vercel

1. Import this project into Vercel and deploy the project root. The `api/` directory contains the serverless functions.
2. In the Vercel project settings, add these environment variables for Production (and Preview if needed):
   - `PAYSTACK_SECRET_KEY`: the secret key from your Paystack dashboard. Use the live key only when you are ready to accept real payments.
   - `RESEND_API_KEY`: an API key from Resend.
   - `RESEND_FROM_EMAIL`: a sender address on a domain verified in Resend, for example `Buy Now <orders@your-verified-domain.com>`.
   - `ORDER_NOTIFICATION_EMAIL`: `mensahrobert892@gmail.com`.
   - `SITE_URL`: the full deployed site URL, including `https://` and no trailing slash.
3. Redeploy after adding or changing environment variables.
4. In Paystack Dashboard, add a webhook URL pointing to `https://your-site-domain/api/paystack-webhook`.
5. In Paystack, enable the payment channels you intend to accept. The checkout requests GHS and supports the channels available to your Paystack account.
6. Test with Paystack test credentials and test payment methods before switching to live credentials.

The server calculates the total from its own product-price list, creates the Paystack transaction, and verifies successful transactions directly with Paystack. Customers provide a delivery method and destination, which are included in the verified order notification email. A signed Paystack `charge.success` webhook also verifies the transaction and sends the order email, so notification does not depend only on the customer returning to the site. Resend uses the Paystack reference as an idempotency key to avoid duplicate notification emails.

This project does not store customer accounts or card details. Paystack collects payment details on its hosted checkout. Delivery or pickup charges are not included in checkout and must be confirmed with the customer before fulfilment.
