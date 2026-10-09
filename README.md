# 🦸 The Sourdough Squad

A comic-book themed sourdough bakery website with online ordering, PayPal/Square payments,
an order log in Google Sheets, revival votes for retired loaves, and an owner dashboard.

It runs entirely on **GitHub Pages**. No server, hosting bill or database to manage.

- **Store:** `https://web3lion.github.io/SourDoughSquad/`
- **Owner dashboard:** `https://web3lion.github.io/SourDoughSquad/dashboard.html`

---

## Contents

1. [How it works](#how-it-works)
2. [What's in this repo](#whats-in-this-repo)
3. [Setup (about 15 minutes)](#setup-about-15-minutes)
4. [Using the owner dashboard](#using-the-owner-dashboard)
5. [Everyday tasks](#everyday-tasks)
6. [Privacy & security](#privacy--security)
7. [Troubleshooting](#troubleshooting)
8. [FAQ](#faq)

---

## How it works

```
 Customer on the store                 Google Sheet (your order log)           Owner
 ─────────────────────                 ─────────────────────────────           ─────
 1. Adds loaves to cart
 2. Checks out as a guest   ──order──▶  New row on the "Orders" tab
    (name, email, pickup date)
 3. Gets an order # (SQ-7KD3P)
 4. Pays with PayPal/Square                                        ◀──reads──  dashboard.html
    (puts order # in the note)                                                  • bake list
                                        "Paid?" / "Picked Up?" ◀──updates──     • % completed
 5. Votes to revive a       ──vote──▶   New row on the "Votes" tab              • mark paid / picked up
    retired loaf                                                                • revival votes
```

- **Customers check out as guests.** There are no accounts or passwords.
- **Payment is matched by hand.** When money arrives in PayPal or Square, find the order number in the
  payment note and tap **Mark Paid** on the dashboard.
- **The Google Sheet is the source of truth.** You can open it and edit rows directly at any time.

---

## What's in this repo

| File | What it is |
| --- | --- |
| `index.html` | The storefront: menu cards, seasonal villain, cart, checkout, revival votes |
| `dashboard.html` | The owner dashboard (password protected) |
| `js/config.js` | **The settings file you edit:** order log URL, payment settings, menu, retired loaves |
| `js/order.js` | Cart, checkout and voting code for the storefront |
| `js/dashboard.js` | Dashboard code |
| `google-apps-script/Code.gs` | Script you paste into Google Sheets. It saves orders and votes and powers the dashboard |
| `*.jpeg` | Logo, hero cards and comic art |

---

## Setup (about 15 minutes)

You'll need a Google account, and a PayPal or Square account.

> **The PayPal or Square account must belong to an adult** (parent, teacher or the business owner).

### Step 1: Turn on GitHub Pages

1. On GitHub, open the repo → **Settings** → **Pages**.
2. Under **Build and deployment**, set **Source** to *Deploy from a branch*.
3. Pick branch **`main`**, folder **`/ (root)`**, and click **Save**.
4. After a minute or two, the site is live at `https://web3lion.github.io/SourDoughSquad/`.

### Step 2: Create the order log (Google Sheet)

1. Go to [sheets.new](https://sheets.new) to make a new Google Sheet. Name it something like **Sourdough Squad Orders**.
2. In the sheet, click **Extensions → Apps Script**.
3. Delete the code that's there. Copy **everything** from
   [`google-apps-script/Code.gs`](google-apps-script/Code.gs), paste it in, and click **Save** (💾).

You don't need to make any tabs. **Orders** and **Votes** are created automatically the first time they're needed.

### Step 3: Choose your dashboard password

The dashboard password (`DASHBOARD_KEY`) is something **you make up**. It's stored only in Google, never on GitHub.

1. In Apps Script, click **Project Settings** (⚙️ on the left).
2. Scroll down to **Script Properties** → **Add script property**.
3. Fill in:
   - **Property:** `DASHBOARD_KEY`
   - **Value:** a long password only you know, e.g. `pumpkin-king-defeated-2026!`
4. Click **Save script properties**.

> ⚠️ Never put this password in any file in this repo. If you forget it, come back here to see or change it.

### Step 4: Publish the script as a web app

1. In Apps Script, click **Deploy → New deployment**.
2. Click the ⚙️ next to *Select type* and choose **Web app**.
3. Set:
   - **Description:** `Sourdough Squad`
   - **Execute as:** **Me**
   - **Who has access:** **Anyone**
4. Click **Deploy**. Google will ask you to **Authorize access**. Choose your account.
   If you see *"Google hasn't verified this app"*, click **Advanced → Go to (project name)**. It's your own script.
5. Copy the **Web app URL**. It looks like `https://script.google.com/macros/s/AKfy.../exec`.

**Test it:** paste that URL into your browser with `?action=votes` on the end. You should see something like
`{"ok":true,"votes":{"The Garlic Goblin":0}}`.

### Step 5: Connect the website to the order log

Open [`js/config.js`](js/config.js) (on GitHub, click the file, then the ✏️ pencil to edit) and paste your URL:

```js
ORDER_LOG_URL: "https://script.google.com/macros/s/AKfy.../exec",
```

### Step 6: Connect payments

Still in `js/config.js`, pick **one** option.

**Option A: PayPal (recommended).** The exact cart total is filled in for the customer.

1. Make sure you have a PayPal.me link: [paypal.me](https://www.paypal.com/paypalme/).
2. Set:
   ```js
   PAYMENT_PROVIDER: "paypal",
   PAYPAL_ME_USERNAME: "yourname",   // the part after paypal.me/
   ```

**Option B: Square**

1. In the Square Dashboard, go to **Payment Links** and create **one link per loaf**, each at that loaf's price.
2. Set:
   ```js
   PAYMENT_PROVIDER: "square",
   SQUARE_LINKS: {
     classic:  "https://square.link/u/...",
     jalapeno: "https://square.link/u/...",
     pumpkin:  "https://square.link/u/..."
   },
   ```
   Square links have a fixed price, so customers get one pay button per loaf type and are told what quantity to choose.

If you leave both blank, customers are told to **pay at pickup**.

Click **Commit changes** to save `config.js`. GitHub Pages updates within a couple of minutes.

### Step 7: Test the whole thing

1. Open the store, add a loaf to the cart, and check out with your own name and email.
2. Check that a new row shows up on the **Orders** tab of your Google Sheet.
3. Click **Summon Back (Vote)** on a retired loaf. A row should appear on the **Votes** tab.
4. Open `dashboard.html`, enter your password, and find your test order.
5. Delete the test rows from the sheet when you're done.

🎉 You're open for business!

---

## Using the owner dashboard

Go to **`/dashboard.html`** and bookmark it. It isn't linked from the store, so customers won't stumble onto it.
Enter your `DASHBOARD_KEY` to unlock it. Click **Try with sample data** to explore without real orders.

| Section | What it shows |
| --- | --- |
| **Date chips** | *Upcoming*, *All Time*, or one pickup day. Everything below follows this filter. |
| **Top tiles** | Number of orders, loaves to bake, sales vs. money collected, and % paid |
| **🔥 Bake List** | How many of each loaf to bake, with a bar that fills as loaves are picked up |
| **Mission Progress** | The % of orders completed (picked up). Hits "POW! ALL DELIVERED!" at 100% |
| **📋 Order Board** | Every order with search and filters (*Waiting*, *Unpaid*, *Picked Up*). Tap **Mark Paid** or **Mark Picked Up**. |
| **⚡ Villain Revival Votes** | Votes for each retired loaf, highest first |

- It refreshes every minute, or tap **⟳ Refresh**.
- Changes save to the Google Sheet.
- Tap **Lock** when you're done on a shared or school computer.

### A typical bake day

1. Pick the pickup day's chip and check the **Bake List** to see how many of each loaf to bake.
2. Check PayPal/Square and **Mark Paid** on orders whose payment came in.
3. As customers pick up, tap **Mark Picked Up** and watch Mission Progress climb.

---

## Everyday tasks

### Change a price or loaf name

Change it in **both** places so they match:

1. `MENU` in `js/config.js` (what the store shows and charges)
2. `PRICES` in `google-apps-script/Code.gs` (what the order log records), then [redeploy the script](#update-the-google-script)

Then update the price text on the loaf's card in `index.html`.

### Add a new loaf to the menu

1. Pick a short id with no spaces, e.g. `cinnamon`.
2. Add it to `MENU` in `js/config.js`:
   ```js
   cinnamon: { name: "Cinnamon Swirl", price: 10.00, emoji: "🌀" }
   ```
3. Add the same id to `PRICES` in `Code.gs`, then [redeploy the script](#update-the-google-script).
   Its quantity is saved in a new `qty_cinnamon` column at the end of the Orders tab (see the note below).
4. In `index.html`, copy a `flip-card` block and set its button to `data-add="cinnamon"`.
5. If you use Square, add `cinnamon: "https://square.link/..."` to `SQUARE_LINKS`.

> Adding a new loaf changes the sheet's columns. If you already have an Orders tab, add a heading cell named
> `qty_cinnamon` at the end of row 1 yourself, or rename the old tab (e.g. `Orders - Fall`) so a fresh one is made.

### Retire a seasonal loaf (and let people vote to bring it back)

1. In `index.html`, copy the `defeated-card` block in the **Hall of Defeated Villains** section and set
   **both** `data-vote="..."` and `data-vote-count="..."` to the loaf's name, e.g. `The Pumpkin King`.
2. Add that exact name to `RETIRED` in `js/config.js`.
3. Add that exact name to `RETIRED` in `Code.gs`, then [redeploy the script](#update-the-google-script).
4. To stop selling it, remove its order button from the page (you can leave it in `MENU` so old orders still display).

How voting works:
- Each retired loaf shows its live count, e.g. "⚡ 14 votes to revive".
- Each browser can vote once per loaf.
- Votes for names that aren't in `RETIRED` are ignored.
- See the tally on the dashboard, or count rows on the **Votes** tab.

### Update the Google script

Whenever you change `Code.gs`:

1. Paste the new code into Apps Script and **Save**.
2. Click **Deploy → Manage deployments** → ✏️ **Edit** → **Version: New version** → **Deploy**.

This keeps the **same URL**, so you don't need to change `config.js`.
(Choosing *New deployment* instead would give you a new URL.)

### Change the dashboard password

In Apps Script, go to **Project Settings → Script Properties**, edit `DASHBOARD_KEY`, and save.
It takes effect immediately, and anyone using the old one is locked out.

### Test the site on your computer

From the repo folder, run `python3 -m http.server 8000` and open `http://localhost:8000`.
(Opening `index.html` by double-clicking also works for browsing.)
If `ORDER_LOG_URL` is empty, checkout still works but nothing is logged.
The dashboard's **Try with sample data** button works without any setup.

---

## Privacy & security

- **Customers are guests.** The only data collected is what's needed to fill an order: name, email,
  optional phone, pickup date and notes. It lives in your Google Sheet, which only you can open unless you share it.
- **Nothing secret is in this repo.** The Apps Script URL, PayPal username and Square links are all meant to be
  public. The only secret, `DASHBOARD_KEY`, lives in Google Script Properties.
- **The dashboard is locked.** Anyone can load `dashboard.html`, but without the password it can't read or change orders.
  The password is remembered in your browser until you tap **Lock**.
- **Prices can't be faked.** The script recalculates every total from its own price list.
- **Spreadsheet formulas are blocked.** Text that starts with `=`, `+`, `-` or `@` is saved as plain text.
- **Spam is possible.** Like any public order form, someone could submit fake orders. Delete those rows from the sheet.
  The dashboard's *Paid* column is your real check.

---

## Troubleshooting

| Problem | Fix |
| --- | --- |
| Orders aren't showing up in the sheet | Check that `ORDER_LOG_URL` in `config.js` is the **/exec** URL, and that the deployment's access is **Anyone**. Test it with `?action=votes`. |
| Dashboard says **"wrong dashboard key"** | The password doesn't match Script Properties. Check for extra spaces or capital letters. |
| Dashboard says **"DASHBOARD_KEY is not set"** | Do [Step 3](#step-3-choose-your-dashboard-password). |
| Dashboard says **"ORDER_LOG_URL is empty"** | Do [Step 5](#step-5-connect-the-website-to-the-order-log). |
| I changed `Code.gs` but nothing changed | You need to [deploy a new version](#update-the-google-script). Saving isn't enough. |
| Vote counts don't show on the store | Counts only appear once `ORDER_LOG_URL` is set. Make sure the loaf's name matches exactly in `index.html`, `config.js` and `Code.gs`. |
| The site didn't update after I edited a file | GitHub Pages can take a few minutes. Then hard-refresh (Ctrl+Shift+R, or Cmd+Shift+R on Mac). |
| PayPal button says payment isn't set up | Fill in `PAYPAL_ME_USERNAME`, and make sure `PAYMENT_PROVIDER` is `"paypal"`. |

---

## FAQ

**Do I need Vercel, Netlify or a server?**
No. Everything runs on GitHub Pages plus your Google Sheet. You'd only need a server to confirm payments
automatically through PayPal's or Square's developer tools, because those need a secret key that can't live in a public website.

**Can customers see their past orders?**
Not yet. Right now they keep their order number from the confirmation screen. Possible next steps, with no accounts needed:
email receipts sent from the Google script, a "Find My Order" page (order # + email), and remembering contact
details in the customer's browser.

**Can more than one person use the dashboard?**
Yes. Give them the dashboard password. To let someone see the raw data, share the Google Sheet with them.

**Where is my data, and can I export it?**
Everything is in your Google Sheet. Use **File → Download** for Excel or CSV.
