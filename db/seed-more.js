const db = require('./database.js'); // Naya pool object yahan se aayega

const moreProducts = [
  // Skincare
  { name: 'Vitamin C Face Serum', description: 'Brightening serum with 10% Vitamin C, 30ml.', price: 599, category: 'Skincare', image_url: 'https://loremflickr.com/400/400/serum,skincare', stock: 25 },
  { name: 'Aloe Vera Gel Moisturizer', description: 'Lightweight daily moisturizer with pure aloe vera.', price: 349, category: 'Skincare', image_url: 'https://loremflickr.com/400/400/moisturizer,gel', stock: 30 },
  { name: 'Charcoal Face Wash', description: 'Deep-cleansing face wash with activated charcoal.', price: 249, category: 'Skincare', image_url: 'https://loremflickr.com/400/400/facewash,charcoal', stock: 35 },
  { name: 'Rose Water Toner', description: 'Alcohol-free toner made with pure rose water.', price: 199, category: 'Skincare', image_url: 'https://loremflickr.com/400/400/rosewater,toner', stock: 28 },
  { name: 'SPF 50 Sunscreen', description: 'Lightweight, non-greasy sunscreen, matte finish.', price: 449, category: 'Skincare', image_url: 'https://loremflickr.com/400/400/sunscreen,spf', stock: 22 },
  { name: 'Hyaluronic Acid Lip Balm', description: 'Hydrating lip balm with hyaluronic acid, 4.5g.', price: 149, category: 'Skincare', image_url: 'https://loremflickr.com/400/400/lipbalm', stock: 40 },

  // Stationery — pens, colors, etc.
  { name: 'Gel Pen Set — 10 Colors', description: 'Smooth-writing gel pens in 10 vibrant colors.', price: 199, category: 'Stationery', image_url: 'https://loremflickr.com/400/400/gelpens,colors', stock: 45 },
  { name: 'Watercolor Paint Set', description: '24-color watercolor palette with brush included.', price: 399, category: 'Stationery', image_url: 'https://loremflickr.com/400/400/watercolor,paint', stock: 20 },
  { name: 'Wooden Color Pencils — 24 Shades', description: 'Pre-sharpened wooden color pencils, smooth blending.', price: 299, category: 'Stationery', image_url: 'https://loremflickr.com/400/400/colorpencils', stock: 32 },
  { name: 'Premium Fountain Pen', description: 'Classic fountain pen with medium nib, refillable ink.', price: 649, category: 'Stationery', image_url: 'https://loremflickr.com/400/400/fountainpen', stock: 15 },
  { name: 'Highlighter Set — 6 Pack', description: 'Pastel-toned highlighters, chisel tip, low bleed.', price: 179, category: 'Stationery', image_url: 'https://loremflickr.com/400/400/highlighters', stock: 38 },
  { name: 'Sticky Notes Bundle', description: 'Set of 5 sticky note pads in assorted colors.', price: 129, category: 'Stationery', image_url: 'https://loremflickr.com/400/400/stickynotes', stock: 50 },

  // Daily Essentials
  { name: 'Bamboo Toothbrush Set', description: 'Pack of 4 eco-friendly bamboo toothbrushes.', price: 249, category: 'Daily Essentials', image_url: 'https://loremflickr.com/400/400/toothbrush,bamboo', stock: 35 },
  { name: 'Stainless Steel Water Bottle', description: 'Double-wall insulated bottle, keeps cold 24hrs, 1L.', price: 699, category: 'Daily Essentials', image_url: 'https://loremflickr.com/400/400/waterbottle,steel', stock: 26 },
  { name: 'Cotton Face Towels — Pack of 6', description: 'Soft, quick-dry cotton face towels.', price: 349, category: 'Daily Essentials', image_url: 'https://loremflickr.com/400/400/towels,cotton', stock: 24 },
  { name: 'Reusable Grocery Bags — Set of 3', description: 'Foldable, washable jute grocery bags.', price: 299, category: 'Daily Essentials', image_url: 'https://loremflickr.com/400/400/grocerybags,jute', stock: 30 },
  { name: 'Multi-Purpose Cleaning Spray', description: 'Plant-based all-surface cleaner, 500ml.', price: 199, category: 'Daily Essentials', image_url: 'https://loremflickr.com/400/400/cleaningspray', stock: 40 },
  { name: 'Handwash Refill Pack', description: 'Gentle foaming handwash, aloe-infused, 500ml refill.', price: 179, category: 'Daily Essentials', image_url: 'https://loremflickr.com/400/400/handwash', stock: 42 }
];

async function seedMoreProducts() {
  try {
    console.log('Extra products add hona shuru ho rahe hain...');
    
    for (const p of moreProducts) {
      const sql = `
        INSERT INTO products (name, description, price, category, image_url, stock)
        VALUES ($1, $2, $3, $4, $5, $6)
      `;
      
      await db.query(sql, [p.name, p.description, p.price, p.category, p.image_url, p.stock]);
    }

    console.log(`Success! ${moreProducts.length} aur products Neon database me add ho gaye hain.`);
  } catch (err) {
    console.error('Seeding me error aaya:', err);
  } finally {
    process.exit(0);
  }
}

seedMoreProducts();