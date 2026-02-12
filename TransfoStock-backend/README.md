# TransfoStock Backend API

RESTful API backend for TransfoStock inventory management system built with Express.js and PostgreSQL.

## Quick Start

```bash
npm install
cp .env.example .env
# Edit .env with your DATABASE_URL
npm start
```

## API Endpoints

- `GET /api/items` - List all items
- `POST /api/items` - Create/update item
- `GET /api/movements` - List transactions
- `POST /api/movements` - Create transaction
- `DELETE /api/movements/:id` - Delete transaction
- `GET /api/stock-summary` - Stock overview
- `GET /api/dashboard-stats` - Dashboard stats
- `POST /api/challans` - Create challan
- `GET /api/health` - Health check

## Environment Variables

```env
DATABASE_URL=postgresql://user:password@host:port/database
PORT=3001
```

## Database

Tables auto-created on startup:
- `movements` - Transaction records
- `items` - Item master data
- `challans` - Delivery challans
