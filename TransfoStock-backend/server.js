import express from "express";
import cors from "cors";
import pkg from "pg";
import dotenv from "dotenv";
import bodyParser from "body-parser";

const { Client } = pkg;
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const DB_URL = process.env.DATABASE_URL;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Database client
let db;

async function connectDB() {
  db = new Client({
    connectionString: DB_URL,
    ssl: DB_URL.includes("localhost") ? false : { rejectUnauthorized: false },
  });

  try {
    await db.connect();
    console.log("✅ Connected to PostgreSQL database");
    await initializeDatabase();
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    process.exit(1);
  }
}

async function initializeDatabase() {
  const queries = [
    `CREATE TABLE IF NOT EXISTS movements (
      id SERIAL PRIMARY KEY,
      item_id TEXT NOT NULL,
      item_name TEXT NOT NULL,
      quantity NUMERIC NOT NULL,
      unit TEXT,
      movement_type VARCHAR(50) NOT NULL,
      bill_number TEXT,
      bill_date TIMESTAMP,
      price_per_unit NUMERIC,
      reference_number TEXT,
      source_destination TEXT,
      mode VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      stock_quantity NUMERIC DEFAULT 0,
      unit TEXT DEFAULT 'Nos',
      average_cost NUMERIC DEFAULT 0,
      last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS challans (
      id SERIAL PRIMARY KEY,
      challan_number TEXT NOT NULL UNIQUE,
      movement_id INTEGER NOT NULL REFERENCES movements(id),
      mode VARCHAR(50),
      company_name TEXT,
      challan_date TIMESTAMP,
      items_json JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE INDEX IF NOT EXISTS idx_movements_item_id ON movements(item_id)`,
    `CREATE INDEX IF NOT EXISTS idx_movements_type ON movements(movement_type)`,
    `CREATE INDEX IF NOT EXISTS idx_movements_date ON movements(created_at)`,
  ];

  for (const query of queries) {
    try {
      await db.query(query);
    } catch (error) {
      console.error("Database initialization error:", error.message);
    }
  }
  console.log("✅ Database tables ready");
}

// ==================== API ENDPOINTS ====================

// Get all items
app.get("/api/items", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM items ORDER BY name ASC"
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get item by ID
app.get("/api/items/:id", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM items WHERE id = $1", [
      req.params.id,
    ]);
    res.json(result.rows[0] || {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create or update item
app.post("/api/items", async (req, res) => {
  const { id, name, unit } = req.body;
  try {
    await db.query(
      `INSERT INTO items (id, name, unit, stock_quantity, average_cost)
       VALUES ($1, $2, $3, 0, 0)
       ON CONFLICT (id) DO UPDATE SET
       name = COALESCE($2, items.name),
       unit = COALESCE($3, items.unit),
       last_updated = CURRENT_TIMESTAMP`,
      [id, name, unit]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all movements (with optional filters)
app.get("/api/movements", async (req, res) => {
  const { type, item_id, limit = 100, offset = 0 } = req.query;
  try {
    let query = "SELECT * FROM movements WHERE 1=1";
    const params = [];

    if (type) {
      query += ` AND movement_type = $${params.length + 1}`;
      params.push(type);
    }
    if (item_id) {
      query += ` AND item_id = $${params.length + 1}`;
      params.push(item_id);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${
      params.length + 2
    }`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create movement (Inward/Outward/Return)
app.post("/api/movements", async (req, res) => {
  const {
    item_id,
    item_name,
    quantity,
    unit,
    movement_type,
    bill_number,
    bill_date,
    price_per_unit,
    reference_number,
    source_destination,
    mode,
  } = req.body;

  try {
    const movementResult = await db.query(
      `INSERT INTO movements 
       (item_id, item_name, quantity, unit, movement_type, bill_number, bill_date, price_per_unit, reference_number, source_destination, mode)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id`,
      [
        item_id,
        item_name,
        quantity,
        unit,
        movement_type,
        bill_number,
        bill_date,
        price_per_unit,
        reference_number,
        source_destination,
        mode,
      ]
    );

    const movementId = movementResult.rows[0].id;

    // Update item stock and average cost
    await db.query(
      `INSERT INTO items (id, name, unit, stock_quantity, average_cost)
       VALUES ($1, $2, $3, 
         CASE WHEN $4 = 'INWARD' THEN $5 WHEN $4 = 'RETURN' THEN $5 ELSE -$5 END,
         CASE WHEN $4 = 'INWARD' THEN $6 WHEN $4 = 'RETURN' THEN $6 ELSE 0 END)
       ON CONFLICT (id) DO UPDATE SET
       stock_quantity = items.stock_quantity + 
         CASE WHEN $4 = 'INWARD' THEN $5 WHEN $4 = 'RETURN' THEN $5 ELSE -$5 END,
       average_cost = CASE 
         WHEN $4 = 'INWARD' OR $4 = 'RETURN' THEN
           (items.average_cost * items.stock_quantity + $6 * $5) / (items.stock_quantity + $5)
         ELSE items.average_cost
       END,
       last_updated = CURRENT_TIMESTAMP`,
      [item_id, item_name, unit, movement_type, quantity, price_per_unit || 0]
    );

    res.json({ success: true, movementId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete movement (with stock adjustment)
app.delete("/api/movements/:id", async (req, res) => {
  try {
    const movement = await db.query(
      "SELECT * FROM movements WHERE id = $1",
      [req.params.id]
    );

    if (movement.rows.length === 0) {
      return res.status(404).json({ error: "Movement not found" });
    }

    const { item_id, quantity, movement_type } = movement.rows[0];

    await db.query("DELETE FROM movements WHERE id = $1", [req.params.id]);

    // Reverse stock update
    const multiplier =
      movement_type === "OUTWARD" ? 1 : -1;
    await db.query(
      `UPDATE items SET stock_quantity = stock_quantity + $1, last_updated = CURRENT_TIMESTAMP WHERE id = $2`,
      [quantity * multiplier, item_id]
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get stock summary
app.get("/api/stock-summary", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT 
        id, name, stock_quantity, unit, average_cost,
        (stock_quantity * average_cost) as total_value,
        last_updated
       FROM items
       WHERE stock_quantity != 0
       ORDER BY name ASC`
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get dashboard stats
app.get("/api/dashboard-stats", async (req, res) => {
  try {
    const stats = await db.query(
      `SELECT
        (SELECT COUNT(*) FROM items WHERE stock_quantity != 0) as total_items,
        (SELECT SUM(stock_quantity) FROM items) as total_quantity,
        (SELECT SUM(stock_quantity * average_cost) FROM items) as total_value,
        (SELECT COUNT(*) FROM movements WHERE movement_type = 'INWARD' AND created_at >= NOW() - INTERVAL '7 days') as inward_7days,
        (SELECT COUNT(*) FROM movements WHERE movement_type = 'OUTWARD' AND created_at >= NOW() - INTERVAL '7 days') as outward_7days`
    );
    res.json(stats.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create delivery challan
app.post("/api/challans", async (req, res) => {
  const { challan_number, movement_id, mode, company_name, items } = req.body;
  try {
    await db.query(
      `INSERT INTO challans (challan_number, movement_id, mode, company_name, items_json)
       VALUES ($1, $2, $3, $4, $5)`,
      [challan_number, movement_id, mode, company_name, JSON.stringify(items)]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Start server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Database URL configured: ${DB_URL ? "✅" : "❌"}`);
  });
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("Shutting down...");
  await db.end();
  process.exit(0);
});
