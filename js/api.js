/**
 * AK Cars - Centralized API Service
 * Handles communication with the FastAPI backend (http://127.0.0.1:8000/api)
 * Gracefully provides offline/demo fallback when the server is initializing.
 */

const API_BASE_URL = "http://127.0.0.1:8000/api";

const AK_API = {
  /**
   * Health Check
   */
  async checkHealth() {
    try {
      const res = await fetch(`${API_BASE_URL}/health`, { signal: AbortSignal.timeout(2000) });
      return await res.json();
    } catch (err) {
      return { status: "offline", error: err.message };
    }
  },

  /**
   * Fetch all car listings with search, filter, and sorting parameters
   */
  async getCars(params = {}) {
    try {
      const query = new URLSearchParams();
      if (params.search) query.append("search", params.search);
      if (params.brand && params.brand.length > 0) {
        query.append("brand", Array.isArray(params.brand) ? params.brand.join(",") : params.brand);
      }
      if (params.minPrice) query.append("min_price", params.minPrice);
      if (params.maxPrice && params.maxPrice !== Infinity) query.append("max_price", params.maxPrice);
      if (params.minYear) query.append("min_year", params.minYear);
      if (params.maxKm && params.maxKm !== Infinity) query.append("max_km", params.maxKm);
      if (params.fuel && params.fuel.length > 0) {
        query.append("fuel", Array.isArray(params.fuel) ? params.fuel.join(",") : params.fuel);
      }
      if (params.transmission && params.transmission.length > 0) {
        query.append("transmission", Array.isArray(params.transmission) ? params.transmission.join(",") : params.transmission);
      }
      if (params.owners && params.owners.length > 0) {
        query.append("owners", Array.isArray(params.owners) ? params.owners.join(",") : params.owners);
      }
      if (params.city && params.city !== "all") query.append("city", params.city);
      if (params.sortBy) query.append("sort_by", params.sortBy);

      const url = `${API_BASE_URL}/cars?${query.toString()}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return { source: "database", total: data.total, cars: data.cars };
    } catch (err) {
      console.warn("[AK Cars API] Live backend unavailable, using local cache/fallback:", err.message);
      // Fallback to CARS_DATA if offline
      if (typeof CARS_DATA !== "undefined") {
        return { source: "local_cache", total: CARS_DATA.length, cars: CARS_DATA };
      }
      return { source: "error", total: 0, cars: [] };
    }
  },

  /**
   * Fetch single car listing by ID
   */
  async getCarById(listingId) {
    try {
      const res = await fetch(`${API_BASE_URL}/cars/${encodeURIComponent(listingId)}`, {
        signal: AbortSignal.timeout(4000)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn(`[AK Cars API] Could not fetch car ${listingId} from API:`, err.message);
      if (typeof CARS_DATA !== "undefined") {
        return CARS_DATA.find(c => c.id === listingId) || null;
      }
      return null;
    }
  },

  /**
   * Upload multiple photos to persistent backend storage
   */
  async uploadPhotos(files) {
    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append("files", files[i]);
      }

      const res = await fetch(`${API_BASE_URL}/upload`, {
        method: "POST",
        body: formData
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Upload failed with status ${res.status}`);
      }
      return await res.json();
    } catch (err) {
      console.error("[AK Cars API] Photo upload error:", err);
      throw err;
    }
  },

  /**
   * Publish new car listing to PostgreSQL database
   */
  async createListing(listingData) {
    try {
      const res = await fetch(`${API_BASE_URL}/cars`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(listingData)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Listing creation failed with status ${res.status}`);
      }
      return await res.json();
    } catch (err) {
      console.error("[AK Cars API] Create listing error:", err);
      throw err;
    }
  }
};

window.AK_API = AK_API;
