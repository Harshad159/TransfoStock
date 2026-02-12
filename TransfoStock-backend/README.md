# TransfoStock Backend API

RESTful API backend for TransfoStock inventory management system built with Express.js and PostgreSQL.

## Features

✅ Complete inventory management (stock in/out/returns)
✅ Real-time sync across web and mobile
✅ PostgreSQL data persistence
✅ RESTful API design
✅ CORS enabled for frontend integration
✅ Automatic stock calculations
✅ Delivery challan generation tracking

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js 4.18
- **Database**: PostgreSQL 15
- **ORM**: Raw pg module (lightweight)
- **Environment**: dotenv for config

## Quick Start

```bash
# Install dependencies
npm install

# Setup .env file
cp .env.example .env
# Edit .env with your database URL

# Run development server
npm run dev

# Run production
npm start
```

## Database Schema

### movements
- id (PK, auto-increment)
- item_id (FK to items)
- item_name
- quantity
- unit
- movement_type (INWARD, OUTWARD, RETURN)
- bill_number, bill_date
- price_per_unit
- reference_number, source_destination, mode
- created_at, updated_at

### items
- id (PK, string)
- name (UNIQUE)
- stock_quantity
- unit
- average_cost
- last_updated

### challans
- id (PK, auto-increment)
- challan_number (UNIQUE)
- movement_id (FK)
- mode, company_name
- items_json (JSONB)
- created_at

## API Endpoints Summary

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/items` | List all items |
| GET | `/api/items/:id` | Get item details |
| POST | `/api/items` | Create/update item |
| GET | `/api/movements` | List movements with filters |
| POST | `/api/movements` | Create movement |
| DELETE | `/api/movements/:id` | Delete movement |
| GET | `/api/stock-summary` | Get stock overview |
| GET | `/api/dashboard-stats` | Get statistics |
| POST | `/api/challans` | Create challan |
| GET | `/api/health` | Health check |

## Environment Variables

```env
DATABASE_URL=postgresql://user:pass@host:port/database
PORT=3001
```

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions to deploy on Render.com.

## Project Structure

```
TransfoStock-backend/
├── server.js              # Main Express app
├── package.json           # Dependencies
├── .env.example           # Environment template
├── .gitignore             # Git exclusions
├── DEPLOYMENT.md          # Render.com setup guide
└── README.md              # This file
```

## Local Testing

Start the backend:
```bash
npm run dev
```

Test endpoints:
```bash
# Check health
curl http://localhost:3001/api/health

# Get items
curl http://localhost:3001/api/items

# Create item
curl -X POST http://localhost:3001/api/items \
  -H "Content-Type: application/json" \
  -d '{"id":"item1","name":"Bolt","unit":"Nos"}'

# Get stock summary
curl http://localhost:3001/api/stock-summary
```

## Notes

- Tables auto-create on first run
- Stock calculations automatic on movement creation
- Supports concurrent requests via connection pooling
- CORS allows all origins (configure for production)

---

**For Frontend Integration**: See InventoryContext.tsx integration example in main repository.
