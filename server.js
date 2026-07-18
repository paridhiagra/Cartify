require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const db = require('./db/database.js'); // Naya pool export yahan use hoga
const bcrypt = require('bcrypt');
const upload = require('./db/cloudinary.js');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const PDFDocument = require('pdfkit');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

app.set('trust proxy', 1);

app.use(session({
  secret: 'cartify-secret-key-change-later',
  resave: false,
  saveUninitialized: false, // Production ke liye false rakhna better hota hai
  cookie: { 
    maxAge: 1000 * 60 * 60 * 24,
    secure: true,   
    sameSite: 'lax'
  }
}));

// 1. Cart initialize
app.use((req, res, next) => {
  if (!req.session.cart) {
    req.session.cart = [];
  }
  next();
});

// 2. Cart count calculate
app.use((req, res, next) => {
  res.locals.cartCount = req.session.cart.reduce((sum, item) => sum + item.quantity, 0);
  next();
});

// 3. Current user info middleware (Async banaya gaya)
app.use(async (req, res, next) => {
  if (req.session.userId) {
    try {
      const result = await db.query('SELECT id, name, email, role FROM users WHERE id = $1', [req.session.userId]);
      res.locals.currentUser = result.rows[0] || null;
    } catch (err) {
      console.error(err);
      res.locals.currentUser = null;
    }
  } else {
    res.locals.currentUser = null;
  }
  next();
});

// Reusable middleware — Auth
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  next();
}

// Reusable middleware — Admin (Async banaya gaya)
async function requireAdmin(req, res, next) {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  try {
    const result = await db.query('SELECT role FROM users WHERE id = $1', [req.session.userId]);
    const user = result.rows[0];
    if (!user || user.role !== 'admin') {
      return res.status(403).send('Access denied. Sirf admin ye page dekh sakte hain.');
    }
    next();
  } catch (err) {
    res.status(500).send('Server Error');
  }
}

// Home Route
app.get('/', async (req, res) => {
  const selectedCategory = req.query.category;
  const searchQuery = req.query.search;

  let sql = 'SELECT * FROM products WHERE 1=1';
  const params = [];
  let paramIndex = 1;

  if (selectedCategory) {
    sql += ` AND category = $${paramIndex}`;
    params.push(selectedCategory);
    paramIndex++;
  }

  if (searchQuery) {
    sql += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
    params.push(`%${searchQuery}%`);
    paramIndex++;
  }

  sql += ' ORDER BY created_at DESC';

  try {
    const productsResult = await db.query(sql, params);
    const categoriesResult = await db.query('SELECT DISTINCT category FROM products ORDER BY category');
    
    res.render('home', { 
      products: productsResult.rows, 
      categories: categoriesResult.rows, 
      selectedCategory, 
      searchQuery 
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading products');
  }
});

// Product Detail
app.get('/products/:id', async (req, res) => {
  try {
    const productResult = await db.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    const product = productResult.rows[0];
    if (!product) {
      return res.status(404).send('Product not found');
    }

    const reviewsResult = await db.query(`
      SELECT reviews.*, users.name AS reviewer_name
      FROM reviews
      JOIN users ON users.id = reviews.user_id
      WHERE reviews.product_id = $1
      ORDER BY reviews.created_at DESC
    `, [product.id]);
    const reviews = reviewsResult.rows;

    const avgRating = reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : null;

    let canReview = false;
    if (req.session.userId) {
      const hasPurchasedResult = await db.query(`
        SELECT order_items.id
        FROM order_items
        JOIN orders ON orders.id = order_items.order_id
        WHERE orders.user_id = $1 AND order_items.product_id = $2
        LIMIT 1
      `, [req.session.userId, product.id]);

      const hasReviewedResult = await db.query(
        'SELECT id FROM reviews WHERE user_id = $1 AND product_id = $2',
        [req.session.userId, product.id]
      );

      canReview = hasPurchasedResult.rows.length > 0 && hasReviewedResult.rows.length === 0;
    }

    res.render('product-detail', { product, reviews, avgRating, canReview });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Review submit
app.post('/products/:id/review', requireAuth, async (req, res) => {
  const { rating, comment } = req.body;
  const productId = req.params.id;

  const ratingNum = parseInt(rating);
  if (!ratingNum || ratingNum < 1 || ratingNum > 5) {
    return res.status(400).send('Rating 1 se 5 ke beech honi chahiye.');
  }

  try {
    const hasPurchasedResult = await db.query(`
      SELECT order_items.id
      FROM order_items
      JOIN orders ON orders.id = order_items.order_id
      WHERE orders.user_id = $1 AND order_items.product_id = $2
      LIMIT 1
    `, [req.session.userId, productId]);

    if (hasPurchasedResult.rows.length === 0) {
      return res.status(403).send('Sirf khareede hue products pe hi review de sakti ho.');
    }

    const hasReviewedResult = await db.query(
      'SELECT id FROM reviews WHERE user_id = $1 AND product_id = $2',
      [req.session.userId, productId]
    );

    if (hasReviewedResult.rows.length > 0) {
      return res.status(400).send('Tum is product pe pehle se review de chuki ho.');
    }

    await db.query(
      'INSERT INTO reviews (product_id, user_id, rating, comment) VALUES ($1, $2, $3, $4)',
      [productId, req.session.userId, ratingNum, comment]
    );

    res.redirect('/products/' + productId);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Cart Add
app.post('/cart/add', async (req, res) => {
  const productId = parseInt(req.body.product_id);
  const quantity = parseInt(req.body.quantity) || 1;

  try {
    const productResult = await db.query('SELECT * FROM products WHERE id = $1', [productId]);
    const product = productResult.rows[0];
    if (!product) {
      return res.status(404).send('Product not found');
    }

    const existingItem = req.session.cart.find(item => item.productId === productId);

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      req.session.cart.push({ productId, quantity });
    }

    res.redirect('/cart');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Cart Page
app.get('/cart', async (req, res) => {
  try {
    const cartItems = [];
    for (const item of req.session.cart) {
      const productResult = await db.query('SELECT * FROM products WHERE id = $1', [item.productId]);
      const product = productResult.rows[0];
      if (product) {
        cartItems.push({
          ...product,
          quantity: item.quantity,
          subtotal: parseFloat(product.price) * item.quantity
        });
      }
    }

    const total = cartItems.reduce((sum, item) => sum + item.subtotal, 0);
    res.render('cart', { cartItems, total });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Cart Remove
app.post('/cart/remove/:id', (req, res) => {
  const productId = parseInt(req.params.id);
  req.session.cart = req.session.cart.filter(item => item.productId !== productId);
  res.redirect('/cart');
});

// Cart Update
app.post('/cart/update/:id', (req, res) => {
  const productId = parseInt(req.params.id);
  const newQuantity = parseInt(req.body.quantity);

  if (newQuantity <= 0) {
    req.session.cart = req.session.cart.filter(item => item.productId !== productId);
  } else {
    const item = req.session.cart.find(item => item.productId === productId);
    if (item) {
      item.quantity = newQuantity;
    }
  }
  res.redirect('/cart');
});

// Checkout Page
app.get('/checkout', requireAuth, async (req, res) => {
  if (req.session.cart.length === 0) {
    return res.redirect('/cart');
  }

  try {
    const cartItems = [];
    for (const item of req.session.cart) {
      const productResult = await db.query('SELECT * FROM products WHERE id = $1', [item.productId]);
      const product = productResult.rows[0];
      if (product) {
        cartItems.push({
          ...product,
          quantity: item.quantity,
          subtotal: parseFloat(product.price) * item.quantity
        });
      }
    }

    const total = cartItems.reduce((sum, item) => sum + item.subtotal, 0);
    res.render('checkout', { cartItems, total, error: null });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Place Order
app.post('/checkout', requireAuth, async (req, res) => {
  const { full_name, phone, address_line, city, pincode, payment_method } = req.body;

  try {
    const cartItems = [];
    for (const item of req.session.cart) {
      const productResult = await db.query('SELECT * FROM products WHERE id = $1', [item.productId]);
      const product = productResult.rows[0];
      if (product) {
        cartItems.push({ ...product, quantity: item.quantity, subtotal: parseFloat(product.price) * item.quantity });
      }
    }
    const total = cartItems.reduce((sum, item) => sum + item.subtotal, 0);

    if (!full_name || !phone || !address_line || !city || !pincode) {
      return res.render('checkout', { cartItems, total, error: 'Saare fields bharna zaroori hai.' });
    }

    if (req.session.cart.length === 0) {
      return res.redirect('/cart');
    }

    const outOfStockItem = cartItems.find(item => item.quantity > item.stock);
    if (outOfStockItem) {
      return res.render('checkout', {
        cartItems,
        total,
        error: `"${outOfStockItem.name}" ka sirf ${outOfStockItem.stock} stock bacha hai. Quantity kam karo.`
      });
    }

    // ----- COD Flow -----
    if (payment_method === 'cod') {
      const orderResult = await db.query(
        'INSERT INTO orders (user_id, total_amount, status) VALUES ($1, $2, $3) RETURNING id',
        [req.session.userId, total, 'pending']
      );
      const orderId = orderResult.rows[0].id;

      for (const item of cartItems) {
        await db.query(
          'INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase) VALUES ($1, $2, $3, $4)',
          [orderId, item.id, item.quantity, item.price]
        );
        await db.query('UPDATE products SET stock = stock - $1 WHERE id = $2', [item.quantity, item.id]);
      }

      req.session.cart = [];
      return res.redirect('/order-confirmation/' + orderId);
    }

    // ----- Online Flow -----
    req.session.pendingAddress = { full_name, phone, address_line, city, pincode };
    const userResult = await db.query('SELECT * FROM users WHERE id = $1', [req.session.userId]);
    const user = userResult.rows[0];

    const line_items = cartItems.map(item => ({
      price_data: {
        currency: 'inr',
        product_data: { name: item.name },
        unit_amount: Math.round(item.price * 100)
      },
      quantity: item.quantity
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      customer_email: user.email,
      success_url: `${req.protocol}://${req.get('host')}/order-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.protocol}://${req.get('host')}/checkout`
    });

    res.redirect(303, session.url);
  } catch (err) {
    console.error(err);
    res.status(500).send('Checkout Error');
  }
});

// Stripe Success Route
app.get('/order-success', requireAuth, async (req, res) => {
  const sessionId = req.query.session_id;
  if (!sessionId) {
    return res.redirect('/');
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid') {
      return res.status(400).send('Payment complete nahi hua.');
    }

    const existingOrderResult = await db.query('SELECT * FROM orders WHERE stripe_session_id = $1', [sessionId]);
    if (existingOrderResult.rows.length > 0) {
      return res.redirect('/order-confirmation/' + existingOrderResult.rows[0].id);
    }

    const cartItems = [];
    for (const item of req.session.cart) {
      const productResult = await db.query('SELECT * FROM products WHERE id = $1', [item.productId]);
      const product = productResult.rows[0];
      if (product) {
        cartItems.push({ ...product, quantity: item.quantity, subtotal: parseFloat(product.price) * item.quantity });
      }
    }
    const total = cartItems.reduce((sum, item) => sum + item.subtotal, 0);

    const orderResult = await db.query(
      'INSERT INTO orders (user_id, total_amount, status, stripe_session_id) VALUES ($1, $2, $3, $4) RETURNING id',
      [req.session.userId, total, 'paid', sessionId]
    );
    const orderId = orderResult.rows[0].id;

    for (const item of cartItems) {
      await db.query(
        'INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase) VALUES ($1, $2, $3, $4)',
        [orderId, item.id, item.quantity, item.price]
      );
      await db.query('UPDATE products SET stock = stock - $1 WHERE id = $2', [item.quantity, item.id]);
    }

    req.session.cart = [];
    delete req.session.pendingAddress;
    res.redirect('/order-confirmation/' + orderId);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error processing online order');
  }
});

// Order Confirmation Page
app.get('/order-confirmation/:id', requireAuth, async (req, res) => {
  try {
    const orderResult = await db.query('SELECT * FROM orders WHERE id = $1 AND user_id = $2', [req.params.id, req.session.userId]);
    const order = orderResult.rows[0];
    if (!order) {
      return res.status(404).send('Order not found');
    }

    const itemsResult = await db.query(`
      SELECT order_items.*, products.name, products.image_url
      FROM order_items
      JOIN products ON products.id = order_items.product_id
      WHERE order_items.order_id = $1
    `, [order.id]);

    res.render('order-confirmation', { order, items: itemsResult.rows });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// PDF Invoice Route
app.get('/order-confirmation/:id/invoice', requireAuth, async (req, res) => {
  try {
    const orderResult = await db.query('SELECT * FROM orders WHERE id = $1 AND user_id = $2', [req.params.id, req.session.userId]);
    const order = orderResult.rows[0];
    if (!order) {
      return res.status(404).send('Order not found');
    }

    const itemsResult = await db.query(`
      SELECT order_items.*, products.name
      FROM order_items
      JOIN products ON products.id = order_items.product_id
      WHERE order_items.order_id = $1
    `, [order.id]);
    const items = itemsResult.rows;

    const userResult = await db.query('SELECT * FROM users WHERE id = $1', [req.session.userId]);
    const user = userResult.rows[0];

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-order-${order.id}.pdf`);
    doc.pipe(res);

    doc.fontSize(22).text('Cartify', { align: 'left' });
    doc.fontSize(10).fillColor('#666').text('Small things, chosen carefully.', { align: 'left' });
    doc.moveDown(2);

    doc.fillColor('#000').fontSize(16).text(`Invoice — Order #${order.id}`, { align: 'left' });
    doc.fontSize(10).fillColor('#444');
    doc.text(`Date: ${new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`);
    doc.text(`Status: ${order.status}`);
    doc.moveDown();

    doc.fontSize(12).fillColor('#000').text('Billed To:');
    doc.fontSize(10).fillColor('#444').text(user.name);
    doc.text(user.email);
    doc.moveDown();

    const tableTop = doc.y;
    doc.fontSize(10).fillColor('#000');
    doc.text('Item', 50, tableTop);
    doc.text('Qty', 300, tableTop);
    doc.text('Price', 370, tableTop);
    doc.text('Subtotal', 460, tableTop);
    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

    let y = tableTop + 25;
    items.forEach(item => {
      const subtotal = item.price_at_purchase * item.quantity;
      doc.fontSize(10).fillColor('#333');
      doc.text(item.name, 50, y, { width: 240 });
      doc.text(String(item.quantity), 300, y);
      doc.text(`Rs. ${item.price_at_purchase}`, 370, y);
      doc.text(`Rs. ${subtotal}`, 460, y);
      y += 25;
    });

    doc.moveTo(50, y + 5).lineTo(550, y + 5).stroke();
    doc.fontSize(12).fillColor('#000').text(`Total: Rs. ${order.total_amount}`, 400, y + 20);
    doc.moveDown(4);
    doc.fontSize(9).fillColor('#888').text('Thank you for shopping with Cartify!', 50, doc.y, { align: 'center' });
    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).send('Error generating invoice');
  }
});

// My Orders
app.get('/my-orders', requireAuth, async (req, res) => {
  try {
    const ordersResult = await db.query('SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC', [req.session.userId]);
    const orders = ordersResult.rows;

    const ordersWithItems = [];
    for (const order of orders) {
      const itemsResult = await db.query(`
        SELECT order_items.*, products.name, products.image_url
        FROM order_items
        JOIN products ON products.id = order_items.product_id
        WHERE order_items.order_id = $1
      `, [order.id]);
      ordersWithItems.push({ ...order, items: itemsResult.rows });
    }

    res.render('my-orders', { orders: ordersWithItems });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Cancel Order
app.post('/my-orders/:id/cancel', requireAuth, async (req, res) => {
  try {
    const orderResult = await db.query('SELECT * FROM orders WHERE id = $1 AND user_id = $2', [req.params.id, req.session.userId]);
    const order = orderResult.rows[0];

    if (!order) {
      return res.status(404).send('Order not found');
    }
    if (order.status !== 'pending') {
      return res.status(400).send('Ye order ab cancel nahi ho sakta.');
    }

    const itemsResult = await db.query('SELECT * FROM order_items WHERE order_id = $1', [order.id]);
    for (const item of itemsResult.rows) {
      await db.query('UPDATE products SET stock = stock + $1 WHERE id = $2', [item.quantity, item.product_id]);
    }

    await db.query('UPDATE orders SET status = $1 WHERE id = $2', ['cancelled', order.id]);
    res.redirect('/my-orders');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Admin Add Product Page
app.get('/admin/add-product', requireAdmin, (req, res) => {
  res.render('add-product', { error: null });
});

// Admin Add Product Post
app.post('/admin/add-product', requireAdmin, upload.single('image'), async (req, res) => {
  const { name, description, price, category, stock } = req.body;

  if (!name || !price || !category || !stock) {
    return res.render('add-product', { error: 'Saare fields bharna zaroori hai.' });
  }
  if (!req.file) {
    return res.render('add-product', { error: 'Product image upload karna zaroori hai.' });
  }

  try {
    const imageUrl = req.file.path;
    await db.query(
      'INSERT INTO products (name, description, price, category, image_url, stock) VALUES ($1, $2, $3, $4, $5, $6)',
      [name, description, parseFloat(price), category, imageUrl, parseInt(stock)]
    );
    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Admin Edit Product Page
app.get('/admin/edit-product/:id', requireAdmin, async (req, res) => {
  try {
    const productResult = await db.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    if (productResult.rows.length === 0) {
      return res.status(404).send('Product not found');
    }
    res.render('edit-product', { product: productResult.rows[0], error: null });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Admin Edit Product Post
app.post('/admin/edit-product/:id', requireAdmin, upload.single('image'), async (req, res) => {
  const { name, description, price, category, stock } = req.body;
  const productId = req.params.id;

  try {
    if (!name || !price || !category || !stock) {
      const productResult = await db.query('SELECT * FROM products WHERE id = $1', [productId]);
      return res.render('edit-product', { product: productResult.rows[0], error: 'Saare required fields bharna zaroori hai.' });
    }

    if (req.file) {
      const imageUrl = req.file.path;
      await db.query(
        'UPDATE products SET name = $1, description = $2, price = $3, category = $4, image_url = $5, stock = $6 WHERE id = $7',
        [name, description, parseFloat(price), category, imageUrl, parseInt(stock), productId]
      );
    } else {
      await db.query(
        'UPDATE products SET name = $1, description = $2, price = $3, category = $4, stock = $5 WHERE id = $6',
        [name, description, parseFloat(price), category, parseInt(stock), productId]
      );
    }
    res.redirect('/products/' + productId);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Admin Delete Product
app.post('/admin/delete-product/:id', requireAdmin, async (req, res) => {
  const productId = req.params.id;
  try {
    const usedResult = await db.query('SELECT id FROM order_items WHERE product_id = $1 LIMIT 1', [productId]);
    if (usedResult.rows.length > 0) {
      return res.status(400).send('Ye product kisi order me use ho chuka hai. Isko "Out of Stock" kar sakti ho.');
    }

    await db.query('DELETE FROM products WHERE id = $1', [productId]);
    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Admin Orders
app.get('/admin/orders', requireAdmin, async (req, res) => {
  try {
    const ordersResult = await db.query(`
      SELECT orders.*, users.name AS customer_name, users.email AS customer_email
      FROM orders
      JOIN users ON users.id = orders.user_id
      ORDER BY orders.created_at DESC
    `);
    const orders = ordersResult.rows;

    const ordersWithItems = [];
    for (const order of orders) {
      const itemsResult = await db.query(`
        SELECT order_items.*, products.name
        FROM order_items
        JOIN products ON products.id = order_items.product_id
        WHERE order_items.order_id = $1
      `, [order.id]);
      ordersWithItems.push({ ...order, items: itemsResult.rows });
    }

    res.render('admin-orders', { orders: ordersWithItems });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Admin Order Status Update
app.post('/admin/orders/:id/status', requireAdmin, async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['pending', 'shipped', 'delivered'];

  if (!validStatuses.includes(status)) {
    return res.status(400).send('Invalid status');
  }

  try {
    await db.query('UPDATE orders SET status = $1 WHERE id = $2', [status, req.params.id]);
    res.redirect('/admin/orders');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Signup Page
app.get('/signup', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/');
  }
  res.render('signup', { error: null });
});

// Signup Post
app.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.render('signup', { error: 'Saare fields bharna zaroori hai.' });
  }

  try {
    const existingResult = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existingResult.rows.length > 0) {
      return res.render('signup', { error: 'Ye email pehle se registered hai.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await db.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
      [name, email, passwordHash]
    );

    req.session.userId = result.rows[0].id;
    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.status(500).send('Signup Error');
  }
});

// Login Page
app.get('/login', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/');
  }
  res.render('login', { error: null });
});

// Login Post
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      return res.render('login', { error: 'Email ya password galat hai.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.render('login', { error: 'Email ya password galat hai.' });
    }

    req.session.userId = user.id;
    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.status(500).send('Login Error');
  }
});

// Logout
app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});