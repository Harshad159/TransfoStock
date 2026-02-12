// API Service for Backend Communication
// Switch between local and remote backend

const API_BASE_URL =
  import.meta.env.MODE === "production"
    ? "https://transfostock-api.onrender.com" // Replace with your actual Render.com URL
    : "http://localhost:3001";

const USE_BACKEND = import.meta.env.VITE_USE_BACKEND === "true";

export const apiService = {
  async getItems() {
    if (!USE_BACKEND) return [];
    try {
      const response = await fetch(`${API_BASE_URL}/api/items`);
      return response.json();
    } catch (error) {
      console.error("Failed to fetch items:", error);
      return [];
    }
  },

  async createItem(item: { id: string; name: string; unit: string }) {
    if (!USE_BACKEND) return { success: false };
    try {
      const response = await fetch(`${API_BASE_URL}/api/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
      return response.json();
    } catch (error) {
      console.error("Failed to create item:", error);
      return { success: false };
    }
  },

  async getMovements(filters?: {
    type?: string;
    item_id?: string;
    limit?: number;
    offset?: number;
  }) {
    if (!USE_BACKEND) return [];
    try {
      const params = new URLSearchParams();
      if (filters?.type) params.append("type", filters.type);
      if (filters?.item_id) params.append("item_id", filters.item_id);
      if (filters?.limit) params.append("limit", filters.limit.toString());
      if (filters?.offset) params.append("offset", filters.offset.toString());

      const response = await fetch(
        `${API_BASE_URL}/api/movements?${params.toString()}`
      );
      return response.json();
    } catch (error) {
      console.error("Failed to fetch movements:", error);
      return [];
    }
  },

  async createMovement(movement: {
    item_id: string;
    item_name: string;
    quantity: number;
    unit: string;
    movement_type: "INWARD" | "OUTWARD" | "RETURN";
    bill_number?: string;
    bill_date?: string;
    price_per_unit?: number;
    reference_number?: string;
    source_destination?: string;
    mode?: string;
  }) {
    if (!USE_BACKEND) return { success: false };
    try {
      const response = await fetch(`${API_BASE_URL}/api/movements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(movement),
      });
      return response.json();
    } catch (error) {
      console.error("Failed to create movement:", error);
      return { success: false };
    }
  },

  async deleteMovement(id: string | number) {
    if (!USE_BACKEND) return { success: false };
    try {
      const response = await fetch(`${API_BASE_URL}/api/movements/${id}`, {
        method: "DELETE",
      });
      return response.json();
    } catch (error) {
      console.error("Failed to delete movement:", error);
      return { success: false };
    }
  },

  async getStockSummary() {
    if (!USE_BACKEND) return [];
    try {
      const response = await fetch(`${API_BASE_URL}/api/stock-summary`);
      return response.json();
    } catch (error) {
      console.error("Failed to fetch stock summary:", error);
      return [];
    }
  },

  async getDashboardStats() {
    if (!USE_BACKEND) return {};
    try {
      const response = await fetch(`${API_BASE_URL}/api/dashboard-stats`);
      return response.json();
    } catch (error) {
      console.error("Failed to fetch dashboard stats:", error);
      return {};
    }
  },

  async createChallan(challan: {
    challan_number: string;
    movement_id: number;
    mode: string;
    company_name: string;
    items: any[];
  }) {
    if (!USE_BACKEND) return { success: false };
    try {
      const response = await fetch(`${API_BASE_URL}/api/challans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(challan),
      });
      return response.json();
    } catch (error) {
      console.error("Failed to create challan:", error);
      return { success: false };
    }
  },

  async healthCheck() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/health`);
      return response.ok;
    } catch {
      return false;
    }
  },
};
