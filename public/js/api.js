/**
 * CIVICPULSE — CLIENT API SERVICE
 * Modern Fetch API wrapper with centralized error handling
 */

const API = {
  baseUrl: '/api',

  /**
   * Performs a JSON GET request
   */
  async get(endpoint, params = {}) {
    try {
      const url = new URL(`${this.baseUrl}${endpoint}`, window.location.origin);
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
          url.searchParams.append(key, params[key]);
        }
      });

      const response = await fetch(url.toString(), {
        headers: { 'Accept': 'application/json' }
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }
      return data;
    } catch (error) {
      console.error(`API GET ${endpoint} error:`, error);
      throw error;
    }
  },

  /**
   * Performs a JSON POST request
   */
  async post(endpoint, body = {}) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }
      return data;
    } catch (error) {
      console.error(`API POST ${endpoint} error:`, error);
      throw error;
    }
  },

  /**
   * Performs a multipart/form-data POST request (for image uploads)
   */
  async postFormData(endpoint, formData) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }
      return data;
    } catch (error) {
      console.error(`API FormData POST ${endpoint} error:`, error);
      throw error;
    }
  },

  /**
   * Performs a PATCH request (supports multipart for admin evidence upload)
   */
  async patch(endpoint, body, isFormData = false) {
    try {
      const options = { method: 'PATCH' };
      if (isFormData) {
        options.body = body;
      } else {
        options.headers = {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        };
        options.body = JSON.stringify(body);
      }

      const response = await fetch(`${this.baseUrl}${endpoint}`, options);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }
      return data;
    } catch (error) {
      console.error(`API PATCH ${endpoint} error:`, error);
      throw error;
    }
  },

  /**
   * Performs a DELETE request
   */
  async delete(endpoint) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'DELETE',
        headers: { 'Accept': 'application/json' }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }
      return data;
    } catch (error) {
      console.error(`API DELETE ${endpoint} error:`, error);
      throw error;
    }
  }
};
