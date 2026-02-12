# TransfoStock Architecture & System Design

## 🏗️ Complete System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USERS                                   │
│               (Web Browser / Mobile / Desktop)                   │
└──────────────┬──────────────────────────────────────────────────┘
               │
               │ HTTP/HTTPS
               ▼
┌──────────────────────────────────────────────────────────────────┐
│                  REACT FRONTEND APP                              │
│  (TransfoStock-main - Runs in Browser)                          │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Pages:                                                 │    │
│  │  • Dashboard (overview & stats)                        │    │
│  │  • Inward (stock receipts)                            │    │
│  │  • Outward (stock dispatch + PDF challan)            │    │
│  │  • Return (returned items)                           │    │
│  │  • Overview (current stock levels)                   │    │
│  │  • Alerts (stock warnings)                           │    │
│  │  • Reports (history & analytics)                     │    │
│  │  • Login (role-based access)                         │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  State Management:                                      │    │
│  │  • InventoryContext (useReducer + API calls)         │    │
│  │  • localStorage fallback (offline support)           │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  API Service Layer (src/services/api.ts)             │    │
│  │  • apiService.getItems()                             │    │
│  │  • apiService.createMovement()                       │    │
│  │  • apiService.getStockSummary()                      │    │
│  └────────────────────────────────────────────────────────┘    │
└──────────────┬──────────────────────────────────────────────────┘
               │
               │ REST API (JSON)
               │
     ┌─────────┴──────────────┐
     │                        │
     │ OPTION 1: LOCAL        │  OPTION 2: CLOUD
     │ (localhost:3001)       │  (Render.com / Hostinger)
     ▼                        ▼
┌────────────────┐    ┌──────────────────────────────┐
│  EXPRESS API   │    │    EXPRESS API on Cloud      │
│  (Local Dev)   │    │  (https://...onrender.com)   │
│                │    │                              │
│ ┌────────────┐ │    │ ┌──────────────────────────┐│
│ │ Endpoints: │ │    │ │ Same Endpoints:          ││
│ │ /api/items │ │    │ │ /api/items               ││
│ │ /api/mvnts │ │    │ │ /api/movements           ││
│ │ /api/stock │ │    │ │ /api/stock-summary       ││
│ │ /api/stats │ │    │ │ /api/dashboard-stats     ││
│ │ /api/chln. │ │    │ │ /api/challans            ││
│ └────────────┘ │    │ └──────────────────────────┘│
└────┬───────────┘    └────┬────────────────────────┘
     │                     │
     │ SQL Queries         │ SQL Queries
     │                     │
     ▼                     ▼
┌────────────────┐    ┌──────────────────────────────┐
│  PostgreSQL    │    │  PostgreSQL on Cloud         │
│  (Local/Docker)│    │  (Render or Hostinger STG)   │
│                │    │                              │
│ Tables:        │    │ Tables (Same):               │
│ • movements    │    │ • movements                  │
│ • items        │    │ • items                      │
│ • challans     │    │ • challans                   │
└────────────────┘    └──────────────────────────────┘
```

---

## 🔄 Data Flow

### Scenario 1: Adding Stock (Inward)

```
1. User fills Inward form:
   ├─ Item: "Bolt"
   ├─ Qty: 100
   ├─ Unit: "Kg"
   ├─ Bill #: "INV-001"
   └─ Price/Unit: ₹50

2. Frontend validates & submits
   └─> apiService.createMovement({type: "INWARD", ...})

3. API receives POST /api/movements
   ├─ Creates movement record in DB
   └─ Auto-updates items table:
      ├─ stock_quantity: 0 → 100
      ├─ average_cost: 0 → ₹50
      └─ last_updated: NOW()

4. Frontend updates UI
   ├─ Shows success message
   ├─ Adds entry to "Recent Entries" table
   ├─ Updates Dashboard stats
   └─ User sees stock change in real-time
```

### Scenario 2: Checking Stock from Mobile

```
1. User accesses app on phone
   └─> https://transfostock-api.onrender.com (or Hostinger URL)

2. App loads & authenticates
   └─> Fetches from backend API

3. apiService.getStockSummary()
   └─> GET /api/stock-summary

4. Backend queries PostgreSQL
   └─> SELECT items WHERE stock_quantity != 0

5. Returns JSON with all items:
   [
     {id: "bolt", name: "Bolt", stock_quantity: 100, average_cost: 50},
     {id: "screw", name: "Screw", stock_quantity: 250, average_cost: 2},
     ...
   ]

6. Mobile UI renders real-time stock
   └─> User can check from warehouse/yard
```

---

## 🔀 Deployment Options Comparison

| Feature | Local Only | Render.com | Hostinger |
|---------|-----------|-----------|-----------|
| **Access** | This computer only | From anywhere | From anywhere |
| **Team Access** | ❌ No | ✅ Yes | ✅ Yes |
| **Uptime** | While app running | 99.9% | 99.9% |
| **Storage** | 1 GB browser cache | 1 GB disk | 100 GB disk |
| **Cost** | $0 | Free/tier (or $12/mo) | Already paid |
| **Setup Time** | Done | 15 minutes | 30 minutes |
| **Database Backups** | ❌ No | Limited | ✅ Yes |
| **Mobile Access** | ❌ No | ✅ Yes | ✅ Yes |

---

## 🚀 Current Setup Checklist

- ✅ Backend API created (Node.js + Express)
- ✅ PostgreSQL schema designed
- ✅ Frontend API service layer ready
- ✅ Documentation complete
- ⏳ **Next: Deploy to Render.com or Hostinger**

---

## 📋 What Each Backend File Does

### **server.js** (Main Application)
- Starts Express server on port 3001
- Connects to PostgreSQL database
- Defines all 10 API endpoints
- Auto-creates tables on startup
- Handles CORS for frontend

### **package.json** (Dependencies)
- Express - Web framework
- pg - PostgreSQL driver
- cors - Cross-Origin requests
- dotenv - Environment variables
- body-parser - JSON parsing

### **DEPLOYMENT.md** (Setup Guide)
- Step-by-step Render.com setup
- Database creation instructions
- Environment variable config
- Frontend integration steps
- Troubleshooting guide

---

## 🔌 API Endpoints Reference

### Stock Management
```
GET  /api/items                      # List all items
GET  /api/items/:id                  # Get specific item
POST /api/items                      # Create/update item

GET  /api/movements                  # List all transactions
POST /api/movements                  # Record transaction
DELETE /api/movements/:id            # Delete transaction

GET  /api/stock-summary             # Current stock levels
GET  /api/dashboard-stats           # Dashboard metrics
```

### Challans (Delivery Documents)
```
POST /api/challans                  # Create delivery challan
```

### Health
```
GET  /api/health                    # Server status check
```

---

## 🔐 Authentication & Security

**Current Status**: No authentication (development)

**For Production** (Future Enhancement):
1. Add login tokens (JWT)
2. Verify role (Admin/Storekeeper)
3. Restrict endpoints by role
4. Encrypt sensitive data
5. Use HTTPS (automatic on Render/Hostinger)

---

## 📊 Database Schema

### `movements` Table
```sql
id                SERIAL PRIMARY KEY
item_id           TEXT (references items)
item_name         TEXT
quantity          NUMERIC
unit              TEXT ('Kg', 'Nos', etc)
movement_type     VARCHAR (INWARD/OUTWARD/RETURN)
bill_number       TEXT (invoice reference)
bill_date         TIMESTAMP
price_per_unit    NUMERIC
reference_number  TEXT
source_dest       TEXT (warehouse/client name)
mode              VARCHAR (SITE/FACTORY)
created_at        TIMESTAMP (auto-filled)
updated_at        TIMESTAMP (auto-updated)
```

### `items` Table
```sql
id               TEXT PRIMARY KEY
name             TEXT UNIQUE
stock_quantity   NUMERIC (updated on each movement)
unit             TEXT (default 'Nos')
average_cost     NUMERIC (weighted average)
last_updated     TIMESTAMP
```

### `challans` Table
```sql
id               SERIAL PRIMARY KEY
challan_number   TEXT UNIQUE
movement_id      INTEGER (references movements)
mode             VARCHAR (SITE/FACTORY)
company_name     TEXT
items_json       JSONB (line items)
created_at       TIMESTAMP
```

---

## 🔄 Sync Strategy

### How Data Syncs Between Devices

**Device 1 (Admin's Computer):**
1. Adds 100 bolts
2. API updates DB
3. Movement saved

**Device 2 (Storekeeper's Phone):**
1. Next refresh/load
2. Fetches from same API
3. Shows 100 bolts immediately

**Device 3 (Offline):**
1. Saves to localStorage
2. When online, syncs to API
3. All devices see same data

---

## 🎯 Benefits of Cloud Backend

✅ **Real-time Sync Across Devices**
- All team members see live stock
- No duplicate data entry
- Single source of truth

✅ **Remote Access**
- Check stock from warehouse
- Update on-the-go
- Mobile-friendly interface

✅ **Persistent Data**
- Cloud database backup
- Data survives browser cache clear
- Automatic disaster recovery

✅ **Team Collaboration**
- Multiple users simultaneously
- Role-based access (Admin/Storekeeper)
- Shared inventory visibility

✅ **Analytics & Reporting**
- Historical data analysis
- Trend reports
- Performance metrics

---

## 🚀 Next Steps

1. **Choose Hosting**: Render.com (easy, free start) or Hostinger (you own it)
2. **Follow SETUP_BACKEND.md**: Step-by-step deployment guide
3. **Update Frontend ENV**: Enable VITE_USE_BACKEND=true
4. **Test API Connection**: Try adding an item, check Render/Hostinger logs
5. **Invite Team**: Share app link, they all see same stock!

---

**Questions?** See [SETUP_BACKEND.md](./SETUP_BACKEND.md) for detailed deployment steps.

---

**System Version**: 1.0
**Last Updated**: February 12, 2026
