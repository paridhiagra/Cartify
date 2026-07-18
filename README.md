# Cartify 🛒

A comprehensive, production-ready Full-Stack E-Commerce application built with Node.js, Express, and Neon PostgreSQL. The application features a dynamic responsive frontend, secure session-based authentication, cloud-hosted product image pipelines, and a secure payment integration with Stripe. Deployed live on Vercel's serverless infrastructure.

## 🚀 Live Demo
Check out the live application: **[https://cartify-kohl-seven.vercel.app/]**

---

## 🛠️ Tech Stack

*   **Frontend:** HTML5, CSS3, JavaScript (ES6+), Theme Engine
*   **Backend:** Node.js, Express.js (RESTful API Design)
*   **Database:** Neon PostgreSQL (Cloud Relational Database)
*   **Authentication:** Session-based via `express-session` with persistent database storage (`connect-pg-simple`)
*   **Image Management:** Cloudinary API Pipeline
*   **Payment Gateway:** Stripe API Integration
*   **Deployment:** Vercel (Production Serverless Environment)

---

## ✨ Features

*   **Robust Authentication:** Full User Signup, Login, and secure Session Tracking.
*   **Database-Backed Sessions:** Restarts on serverless environments won't log users out—sessions are safely tracked directly inside PostgreSQL.
*   **Admin Dashboard:** Protected routes allowing administrators to visually add, delete, and manage products.
*   **Cloud Image Pipeline:** Uploaded product images are systematically stored, scaled, and served via Cloudinary CDN.
*   **Persistent Shopping Cart:** Add, update quantities, remove items, and preserve state effortlessly.
*   **Secure Checkout & Payments:** End-to-end Stripe transaction pipeline with production success and cancel routes.

---

## 📂 Architecture Overview

```text
Cartify/
├── db/                   # Database configurations, schemas & seeding scripts
│   ├── database.js       # Neon PostgreSQL connection pool initialization
│   ├── seed.js           # Production product database seeder
│   └── make-admin.js     # Script to elevate explicit user roles to Admin
├── public/               # Client-facing static assets
│   ├── css/              # Visual styling sheets
│   └── js/               # Frontend scripts, DOM actions & network requests
├── views/                # EJB/HTML rendering templates for visual pages
├── .env.example          # Sample environment variable declarations
├── package.json          # Node.js dependencies and operational scripts
├── vercel.json           # Serverless architecture deployment parameters
└── server.js             # Application core entryway & primary controller
```

---

## 🔧 Installation & Local Setup

### Prerequisite Checklist
Ensure you have the following installed locally:
*   [Node.js](https://nodejs.org/) (v16.x or higher)
*   [Git](https://git-scm.com/)

### Step 1: Clone the Repository
```bash
git clone https://github.com/paridhiagra/Cartify.git
cd Cartify
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Configure Environment Variables
Create a `.env` file in the root directory and populate it with your specific API credentials:
```env
PORT=3000
SESSION_SECRET=your_custom_secure_session_secret

# Database Configuration (Neon PostgreSQL)
DATABASE_URL=postgres://user:password@host/dbname?sslmode=require

# Cloudinary Credentials
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Stripe Keys
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

### Step 4: Database Setup & Data Seeding
Create the explicit data tables inside your cloud PostgreSQL instance and seed initial product inventory:
```bash
# Seed the initial setup values
node db/seed.js
```

### Step 5: Boot Up the Application
```bash
npm start
```
Open your browser and navigate to `http://localhost:3000` to interact with the system locally.

---

## 🛡️ Production Deployment (Vercel)

This application is fully optimized to run on Vercel's Serverless Edge network. 

1.  **Repository Synchronization:** Push all latest code modifications to your primary remote repository (`git push origin main`).
2.  **Vercel Import:** Navigate to your Vercel Console, select **Add New Project**, and import the `Cartify` codebase.
3.  **Environment Variable Ingestion:** Add all `6` distinct values from your `.env` configuration dashboard panel into Vercel's environment settings.
4.  **Deployment Execution:** Trigger the deploy cycle. The project's root `vercel.json` file auto-configures the serverless routing architecture smoothly.
