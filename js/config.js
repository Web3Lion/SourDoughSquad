// ==================== SOURDOUGH SQUAD SETTINGS ====================
// Edit this file to connect the order log and payments. See README.md.

window.SQUAD_CONFIG = {
  // Web app URL from your Google Apps Script deployment (ends in /exec).
  // Leave empty to test the site without logging orders.
  ORDER_LOG_URL: "",

  // "paypal" or "square"
  PAYMENT_PROVIDER: "paypal",

  // PayPal: your paypal.me username (the part after paypal.me/).
  // The customer is sent to paypal.me/<username>/<total>USD with the total filled in.
  PAYPAL_ME_USERNAME: "",

  // Square: one Payment Link per loaf (Square Dashboard > Payment Links).
  // Square links have a fixed price, so the customer gets one button per loaf type.
  SQUARE_LINKS: {
    classic: "",
    jalapeno: "",
    pumpkin: ""
  },

  // Retired loaves people can vote to bring back. Each name must match a
  // data-vote="..." button in index.html and RETIRED in google-apps-script/Code.gs.
  RETIRED: ["The Garlic Goblin"],

  // Menu. Prices here must match PRICES in google-apps-script/Code.gs.
  MENU: {
    classic:  { name: "Classic Sourdough",            price: 8.00,  emoji: "🍞" },
    jalapeno: { name: "Jalapeño Cheddar",              price: 12.00, emoji: "🌶️" },
    pumpkin:  { name: "The Pumpkin King (Limited)",   price: 12.00, emoji: "🎃" }
  }
};
