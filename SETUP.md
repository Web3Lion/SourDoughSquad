# Ordering, Payments & Owner Dashboard Setup

How it fits together:

1. A customer adds loaves to the cart on `index.html` and fills in name, email and pickup date.
2. The order is logged as a new row in a **Google Sheet** (through a small Google Apps Script).
3. The customer gets an order number (like `SQ-7KD3P`) and a button to pay with **PayPal** or **Square**.
4. The owner opens `dashboard.html` to see the bake list and progress, and to mark orders paid or picked up.

Payment is not checked automatically. When money arrives in PayPal or Square, match the order number in
the payment note and click **Mark Paid** on the dashboard.

> The PayPal or Square account must belong to an adult (parent, teacher or the business owner).

## 1. Create the order log (Google Sheet + Apps Script)

1. Create a new Google Sheet, e.g. "Sourdough Squad Orders".
2. In the sheet, open **Extensions → Apps Script**.
3. Delete what's there, paste in everything from `google-apps-script/Code.gs`, and save.
4. Set the dashboard password: **Project Settings (⚙️) → Script Properties → Add script property**
   - Property: `DASHBOARD_KEY`
   - Value: a long password only the owner knows
5. Click **Deploy → New deployment**, choose type **Web app**, and set:
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Click **Deploy**, approve the permissions, and copy the **Web app URL** (it ends in `/exec`).
7. Paste that URL into `js/config.js` as `ORDER_LOG_URL`.

The `Orders` and `Votes` tabs are created automatically the first time an order or vote comes in.

If you edit `Code.gs` later, use **Deploy → Manage deployments → Edit → Version: New version** so the
URL stays the same.

## 2. Connect payments

Open `js/config.js` and choose one:

**PayPal** (recommended, since the exact cart total is filled in for the customer)
```js
PAYMENT_PROVIDER: "paypal",
PAYPAL_ME_USERNAME: "yourname",   // from paypal.me/yourname
```

**Square**
1. In Square Dashboard → **Payment Links**, make one link per loaf at its price.
2. Paste them in:
```js
PAYMENT_PROVIDER: "square",
SQUARE_LINKS: { classic: "https://square.link/...", jalapeno: "...", pumpkin: "..." },
```
Square links have fixed prices, so customers get one pay button per loaf type and are told what quantity to pick.

If nothing is filled in, customers are told to pay at pickup.

## 3. Use the owner dashboard

Go to `dashboard.html` (for example `https://<your-site>/dashboard.html`) and enter the `DASHBOARD_KEY`.
It isn't linked from the storefront. Click **Try with sample data** to explore it before any real orders exist.

- **Date chips**: Upcoming, All Time, or a single pickup day
- **Bake List**: how many of each loaf to bake, with a bar for how many have been picked up
- **Mission Progress**: % of orders completed (picked up)
- **Order Board**: search, filter (Waiting / Unpaid / Picked Up), and tap **Mark Paid** / **Mark Picked Up**
- **Villain Revival Votes**: tally of "Summon Back" votes

The dashboard refreshes every minute. Changes are saved to the Google Sheet, so you can also edit the sheet directly.

## Retiring a loaf (revival votes)

Each retired loaf in the "Hall of Defeated Villains" shows its vote count, and each browser can vote once per loaf.
The dashboard's **Villain Revival Votes** panel ranks them. To add a newly retired loaf:

1. Copy a `defeated-card` block in `index.html` and change both `data-vote="..."` and `data-vote-count="..."` to the loaf's name.
2. Add the same name to `RETIRED` in `js/config.js`.
3. Add the same name to `RETIRED` in `google-apps-script/Code.gs`, then redeploy as a new version.

Votes for names not in `RETIRED` are ignored.

## Changing the menu or prices

Update the item in **both** places so they match:
- `MENU` in `js/config.js` (what the website shows and charges)
- `PRICES` in `google-apps-script/Code.gs` (what the log records), then redeploy as a new version

The `data-add="..."` on each order button in `index.html` must match the item's id.
