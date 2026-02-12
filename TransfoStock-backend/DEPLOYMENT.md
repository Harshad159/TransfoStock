# TransfoStock Backend - Deployment Guide

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 18+
- PostgreSQL installed locally

### Installation
```bash
cd TransfoStock-backend
npm install
```

### Setup Local Database
```bash
# Create database
createdb transfostock

# The app will auto-create tables on first run
```

### Environment Setup
```bash
cp .env.example .env
# Edit .env and set DATABASE_URL to your local PostgreSQL connection string
```

### Run Locally
```bash
npm run dev
```

Server will run on `http://localhost:3001`

---

## 🌐 Deploy to Render.com

### Step 1: Create Render.com Account
1. Go to [render.com](https://render.com)
2. Sign up with GitHub or email
3. Create a new project

### Step 2: Create PostgreSQL Database on Render

1. Dashboard → **New +** → **PostgreSQL**
2. Fill form:
   - **Name**: `transfostock-db`
   - **Region**: Select closest to you
   - **PostgreSQL Version**: 15
3. Click **Create Database**
4. Wait for database to provision (2-3 minutes)
5. Copy the **External Database URL** (looks like: `postgresql://user:xxx@...`)

### Step 3: Deploy Backend Service on Render

1. Go to Dashboard → **New +** → **Web Service**
2. Connect your GitHub repo (if using Git)
   - Or select **Deploy from GitHub**
   - Choose the repository with `TransfoStock-backend`
3. Fill form:
   - **Name**: `transfostock-api`
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free tier (sufficient for 1GB)
   - **Region**: Same as database

4. **Add Environment Variables**:
   - Click **Add Environment Variable**
   - Key: `DATABASE_URL`
   - Value: Paste the PostgreSQL external URL from Step 2

5. Click **Deploy**
6. Wait for deployment (3-5 minutes)
7. Once deployed, your API URL will be something like:
   ```
   https://transfostock-api.onrender.com
   ```

### Step 4: Update React Frontend

In your React app (`TransfoStock-main/src/`), create or update:

**src/config/api.ts**
```typescript
const API_BASE_URL = 
  process.env.NODE_ENV === "production"
    ? "https://transfostock-api.onrender.com"  // Replace with your actual URL
    : "http://localhost:3001";

export default API_BASE_URL;
```

### Step 5: Update InventoryContext.tsx

Replace localStorage sync with API calls:

**Key Changes:**
```typescript
// Instead of using localStorage, fetch from API
const loadInitial = async () => {
  try {
    const [itemsRes, movementsRes] = await Promise.all([
      fetch(`${API_BASE_URL}/api/items`),
      fetch(`${API_BASE_URL}/api/movements?limit=1000`)
    ]);
    
    const items = await itemsRes.json();
    const movements = await movementsRes.json();
    
    return { items, movements, challans: [] };
  } catch (error) {
    console.error("Failed to load data:", error);
    return { items: [], movements: [], challans: [] };
  }
};

// In reducer, dispatch API calls
case "INWARD":
  await fetch(`${API_BASE_URL}/api/movements`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      item_id: payload.itemId,
      item_name: payload.movement.description,
      quantity: payload.movement.quantity,
      unit: payload.movement.unit,
      movement_type: "INWARD",
      bill_number: payload.movement.billNumber,
      bill_date: payload.movement.billDate,
      price_per_unit: payload.movement.meta?.pricePerUnit
    })
  });
  break;
```

---

## 📊 API Endpoints Reference

### Items
```
GET    /api/items                    # Get all items
GET    /api/items/:id                # Get item by ID
POST   /api/items                    # Create/update item
```

### Movements (Transactions)
```
GET    /api/movements?type=INWARD   # Get filtered movements
POST   /api/movements                # Create movement
DELETE /api/movements/:id            # Delete movement (reverse stock)
```

### Stock & Reports
```
GET    /api/stock-summary           # Get all items with stock levels
GET    /api/dashboard-stats         # Get dashboard statistics
```

### Challans
```
POST   /api/challans                # Create delivery challan
```

### Health
```
GET    /api/health                  # Server health check
```

---

## 🔧 Troubleshooting

### Database Connection Error
- Verify `DATABASE_URL` in Render environment variables
- Check database still exists in Render dashboard
- For local testing, ensure PostgreSQL is running

### Free Tier Limitations
- Render free databases are paused after 7 days of inactivity
- Free services spin down after 15 minutes of inactivity
- Plan to upgrade if using in production

### Upgrade Plan (When Needed)
1. Render Dashboard → Select Service
2. Settings → Change Plan
3. Choose Paid plan (starts ~$12/month)

---

## 📈 Scaling Tips

### When to Upgrade from Free
- More than 100 concurrent users
- Need automatic backups
- Require persistent uptime

### Recommended Paid Plan
- **Web Service**: Starter plan
- **PostgreSQL**: Starter plan with automated backups

---

## 🔐 Security Checklist

- [ ] Never commit `.env` file (add to `.gitignore`)
- [ ] Use strong DATABASE_URL (Render generates this)
- [ ] Enable CORS properly (currently allows all origins)
- [ ] Add authentication for API endpoints (future enhancement)
- [ ] Use HTTPS (Render provides this automatically)

---

## 📱 Mobile Access

Once deployed, access your stock from anywhere using:
```
https://yourdomain.onrender.com/api/stock-summary
```

Example on mobile:
```
https://transfostock-api.onrender.com/api/stock-summary
```

Shows current stock for all items in JSON format.

---

## 🤝 Support

For issues:
1. Check Render Logs: Dashboard → Service → Logs
2. Verify DATABASE_URL environment variable
3. Test local setup first: `npm run dev`
4. Check PostgreSQL is initialized

---

**Last Updated**: February 12, 2026
**Node.js Version**: 18.x
**PostgreSQL Version**: 15
