const db = require('./database.js'); // Naya pool object yahan se aayega

const sampleProducts = [
  // Home Decor
  { name: 'Ceramic Sunset Vase', description: 'Hand-glazed ceramic vase with warm ombre tones.', price: 899, category: 'Home Decor', image_url: 'https://loremflickr.com/400/400/ceramic,vase', stock: 15 },
  { name: 'Woven Rattan Basket', description: 'Handwoven storage basket with leather handles.', price: 1199, category: 'Home Decor', image_url: 'https://loremflickr.com/400/400/rattan,basket', stock: 12 },
  { name: 'Terracotta Planter Set', description: 'Set of 3 minimalist terracotta pots for indoor plants.', price: 749, category: 'Home Decor', image_url: 'https://loremflickr.com/400/400/terracotta,planter', stock: 20 },
  { name: 'Linen Throw Pillow Cover', description: 'Soft washed-linen cushion cover, natural beige.', price: 399, category: 'Home Decor', image_url: 'https://loremflickr.com/400/400/linen,pillow', stock: 25 },
  { name: 'Amber Glass Vase', description: 'Textured amber glass vase, catches light beautifully.', price: 649, category: 'Home Decor', image_url: 'https://loremflickr.com/400/400/glass,vase', stock: 18 },

  // Stationery
  { name: 'Linen Bound Journal', description: 'Soft linen cover, dotted pages, gold foil edges.', price: 449, category: 'Stationery', image_url: 'https://loremflickr.com/400/400/journal,notebook', stock: 30 },
  { name: 'Brass Desk Organizer', description: 'Minimalist brass tray for pens, clips, and cards.', price: 599, category: 'Stationery', image_url: 'https://loremflickr.com/400/400/desk,organizer', stock: 14 },
  { name: 'Wax Seal Stamp Kit', description: 'Vintage-style stamp kit with gold and burgundy wax.', price: 349, category: 'Stationery', image_url: 'https://loremflickr.com/400/400/wax,seal,stamp', stock: 22 },
  { name: 'Recycled Paper Notecards', description: 'Set of 10 handmade notecards with kraft envelopes.', price: 299, category: 'Stationery', image_url: 'https://loremflickr.com/400/400/paper,cards', stock: 40 },

  // Tech
  { name: 'Wireless Earbuds — Cream', description: 'Minimalist matte-finish earbuds with 24hr battery life.', price: 2499, category: 'Tech', image_url: 'https://loremflickr.com/400/400/earbuds,wireless', stock: 10 },
  { name: 'Portable Charger — Sand', description: '10,000mAh slim power bank in a soft sand finish.', price: 1799, category: 'Tech', image_url: 'https://loremflickr.com/400/400/powerbank,charger', stock: 16 },
  { name: 'Fabric-Wrapped Desk Lamp', description: 'Warm LED lamp with a woven fabric cord.', price: 1499, category: 'Tech', image_url: 'https://loremflickr.com/400/400/desk,lamp', stock: 9 },
  { name: 'Bluetooth Speaker — Clay', description: 'Compact speaker with a soft-touch clay finish.', price: 2199, category: 'Tech', image_url: 'https://loremflickr.com/400/400/bluetooth,speaker', stock: 11 },

  // Accessories
  { name: 'Woven Straw Tote Bag', description: 'Everyday tote with leather trim and inner pocket.', price: 999, category: 'Accessories', image_url: 'https://loremflickr.com/400/400/tote,bag', stock: 17 },
  { name: 'Enamel Pin Set — Botanical', description: 'Set of 4 hand-painted enamel pins.', price: 349, category: 'Accessories', image_url: 'https://loremflickr.com/400/400/enamel,pin', stock: 28 },
  { name: 'Marble Coaster Set', description: 'Set of 4 round marble coasters with cork base.', price: 549, category: 'Accessories', image_url: 'https://loremflickr.com/400/400/marble,coaster', stock: 20 },

  // Candles
  { name: 'Sandalwood Soy Candle', description: 'Hand-poured soy candle, 40hr burn time.', price: 449, category: 'Candles', image_url: 'https://loremflickr.com/400/400/candle', stock: 24 },
  { name: 'Fig & Cedar Candle', description: 'Earthy fig and cedar scented candle in amber glass.', price: 499, category: 'Candles', image_url: 'https://loremflickr.com/400/400/candle,jar', stock: 19 }
];

async function seedDatabase() {
  try {
    console.log('Database seeding shuru ho rahi hai...');
    
    // Ek-ek karke saare products insert honge
    for (const p of sampleProducts) {
      const sql = `
        INSERT INTO products (name, description, price, category, image_url, stock)
        VALUES ($1, $2, $3, $4, $5, $6)
      `;
      
      await db.query(sql, [p.name, p.description, p.price, p.category, p.image_url, p.stock]);
    }

    console.log(`Success! Saare ${sampleProducts.length} products Neon database me add ho gaye hain.`);
  } catch (err) {
    console.error('Seeding me error aaya:', err);
  } finally {
    // Agar pool end karna chahein toh yahan kar sakte hain, par abhi zaroorat nahi hai
    process.exit(0);
  }
}

seedDatabase();