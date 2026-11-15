/**
 * Hakujina Ceramic Studio API Client
 * Systematic linking to Django REST Framework backend
 */

export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1"
).replace(/\/+$/, "");

export const BACKEND_ROOT = API_BASE_URL.replace(/\/api\/v1\/?$/, "");

/* =========================================================================
   TypeScript Models & Interfaces (Aligned 100% with DRF Serializers)
   ========================================================================= */

export interface CategoryRef {
  id: number;
  name: string;
  slug: string;
}

export interface ProductCategory extends CategoryRef {
  parent?: CategoryRef | null;
}

export interface Category extends CategoryRef {
  children?: CategoryRef[];
}

export interface ProductImage {
  id: number;
  image: string;
  alt_text: string;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  price: string;
  stock: number;
  in_stock: boolean;
  primary_image: ProductImage | null;
  category: ProductCategory;
  description?: string;
  images?: ProductImage[];
  created_at?: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface CartItem {
  id: number;
  product: Product;
  quantity: number;
  line_total: string;
}

export interface Cart {
  items: CartItem[];
  subtotal: string;
  item_count: number;
}

export interface OrderItem {
  id: number;
  product_name: string;
  product_slug: string;
  unit_price: string;
  quantity: number;
  line_total: string;
}

export type OrderStatus =
  | "pending_payment"
  | "payment_submitted"
  | "confirmed"
  | "shipped"
  | "delivered"
  | "cancelled";

export interface Order {
  order_number: string;
  status: OrderStatus;
  status_label: string;
  full_name: string;
  phone: string;
  city: string;
  address_line: string;
  landmark: string;
  notes: string;
  subtotal: string;
  delivery_fee: string;
  total: string;
  payment_screenshot: string | null;
  payment_submitted_at: string | null;
  payment_note: string;
  items: OrderItem[];
  created_at: string;
}

export interface OrderCreatePayload {
  full_name: string;
  phone: string;
  city: string;
  address_line: string;
  landmark?: string;
  notes?: string;
  cart_item_ids?: number[];
}

export interface User {
  id: number;
  email: string;
  name: string;
  phone?: string;
  is_email_verified?: boolean;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

/* =========================================================================
   Error Parsing & Token Management
   ========================================================================= */

export function parseApiError(data: unknown): string {
  if (!data || typeof data !== "object") {
    return "An unexpected error occurred. Please try again.";
  }

  // Check detail / error message
  const obj = data as Record<string, unknown>;
  if (typeof obj.detail === "string") return obj.detail;
  if (typeof obj.error === "string") return obj.error;
  if (typeof obj.message === "string") return obj.message;

  // Flatten DRF field errors (e.g. { phone: ["Enter a valid phone number..."] })
  const messages: string[] = [];
  for (const [key, val] of Object.entries(obj)) {
    const label = key === "non_field_errors" ? "" : `${key.replace(/_/g, " ")}: `;
    if (typeof val === "string") {
      messages.push(`${label}${val}`);
    } else if (Array.isArray(val)) {
      messages.push(`${label}${val.map(String).join(" ")}`);
    } else if (typeof val === "object" && val !== null) {
      messages.push(`${label}${parseApiError(val)}`);
    }
  }

  return messages.length > 0
    ? messages.join(" | ")
    : "Something went wrong. Please check your information.";
}

export function getStoredTokens(): { access: string | null; refresh: string | null } {
  if (typeof window === "undefined") return { access: null, refresh: null };
  return {
    access: window.localStorage.getItem("hakujina.access"),
    refresh: window.localStorage.getItem("hakujina.refresh"),
  };
}

export function setStoredTokens(tokens: { access?: string; refresh?: string }) {
  if (typeof window === "undefined") return;
  if (tokens.access) window.localStorage.setItem("hakujina.access", tokens.access);
  if (tokens.refresh) window.localStorage.setItem("hakujina.refresh", tokens.refresh);
}

export function clearStoredTokens() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("hakujina.access");
  window.localStorage.removeItem("hakujina.refresh");
}

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

async function refreshAccessToken(): Promise<string | null> {
  const { refresh } = getStoredTokens();
  if (!refresh) return null;

  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });

    if (!res.ok) {
      clearStoredTokens();
      return null;
    }

    const data = await res.json();
    if (data.access) {
      setStoredTokens({ access: data.access });
      return data.access;
    }
  } catch {
    clearStoredTokens();
  }
  return null;
}

/* =========================================================================
   Base Request Helper
   ========================================================================= */

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
  params?: Record<string, string | number | boolean | undefined | null>;
}

export async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { requiresAuth = false, params, ...fetchOptions } = options;

  let url = `${API_BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  if (params) {
    const query = new URLSearchParams();
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null && val !== "") {
        query.set(key, String(val));
      }
    }
    const queryString = query.toString();
    if (queryString) {
      url += (url.includes("?") ? "&" : "?") + queryString;
    }
  }

  const headers = new Headers(fetchOptions.headers || {});
  if (!headers.has("Content-Type") && !(fetchOptions.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (requiresAuth) {
    let { access } = getStoredTokens();
    if (access) {
      headers.set("Authorization", `Bearer ${access}`);
    }
  }

  let response: Response;
  try {
    response = await fetch(url, { ...fetchOptions, headers });
  } catch (err) {
    if (err instanceof TypeError) {
      throw new Error("Unable to connect to the studio server. Please check your network connection.");
    }
    throw err;
  }

  // Handle Token Expiry (401) with refresh token retry
  if (response.status === 401 && requiresAuth) {
    const { refresh } = getStoredTokens();
    if (refresh) {
      if (!isRefreshing) {
        isRefreshing = true;
        const newAccess = await refreshAccessToken();
        isRefreshing = false;
        if (newAccess) {
          onRefreshed(newAccess);
        } else {
          refreshSubscribers = [];
          throw new Error("Session expired. Please log in again.");
        }
      }

      const retryPromise = new Promise<T>((resolve, reject) => {
        subscribeTokenRefresh(async (newToken) => {
          try {
            headers.set("Authorization", `Bearer ${newToken}`);
            const retryRes = await fetch(url, { ...fetchOptions, headers });
            if (!retryRes.ok) {
              const errData = await retryRes.json().catch(() => null);
              return reject(new Error(parseApiError(errData)));
            }
            const data = await retryRes.json();
            resolve(data as T);
          } catch (e) {
            reject(e);
          }
        });
      });

      return await retryPromise;
    } else {
      throw new Error("Please log in to continue.");
    }
  }

  let responseData: unknown = null;
  const contentType = response.headers.get("Content-Type") || "";
  if (contentType.includes("application/json")) {
    responseData = await response.json().catch(() => null);
  } else {
    responseData = await response.text().catch(() => null);
  }

  if (!response.ok) {
    throw new Error(parseApiError(responseData));
  }

  return responseData as T;
}

/* =========================================================================
   Image URL Helper
   ========================================================================= */

export function resolveImageUrl(urlOrPath: string | null | undefined, fallback: string = "/images/hero-tero.jpg"): string {
  if (!urlOrPath) return fallback;
  if (urlOrPath.startsWith("http://") || urlOrPath.startsWith("https://")) {
    return urlOrPath;
  }
  const cleanPath = urlOrPath.startsWith("/") ? urlOrPath : `/${urlOrPath}`;
  return `${BACKEND_ROOT}${cleanPath}`;
}

/* =========================================================================
   Catalog API
   ========================================================================= */

export interface ProductFilterParams {
  category?: string;
  search?: string;
  min_price?: number;
  max_price?: number;
  in_stock?: boolean;
  ordering?: string;
  page?: number;
}

export const catalogApi = {
  getCategories: () =>
    request<Category[]>("/categories/"),

  getCategory: (slug: string) =>
    request<Category>(`/categories/${slug}/`),

  getProducts: (params?: ProductFilterParams) =>
    request<PaginatedResponse<Product>>("/products/", {
      params: params as Record<string, string | number | boolean | undefined | null>,
    }),

  getProduct: (slug: string) =>
    request<Product>(`/products/${slug}/`),
};

/* =========================================================================
   Cart API (requires authentication)
   ========================================================================= */

export const cartApi = {
  getCart: () =>
    request<Cart>("/cart/", { requiresAuth: true }),

  clearCart: () =>
    request<Cart>("/cart/", { method: "DELETE", requiresAuth: true }),

  addItem: (productId: number, quantity: number = 1) =>
    request<Cart>("/cart/items/", {
      method: "POST",
      requiresAuth: true,
      body: JSON.stringify({ product_id: productId, quantity }),
    }),

  updateItem: (itemId: number, quantity: number) =>
    request<Cart>(`/cart/items/${itemId}/`, {
      method: "PATCH",
      requiresAuth: true,
      body: JSON.stringify({ quantity }),
    }),

  removeItem: (itemId: number) =>
    request<Cart>(`/cart/items/${itemId}/`, {
      method: "DELETE",
      requiresAuth: true,
    }),
};

/* =========================================================================
   Orders API (requires authentication)
   ========================================================================= */

export const ordersApi = {
  getOrders: () =>
    request<PaginatedResponse<Order> | Order[]>("/orders/", { requiresAuth: true }),

  getOrder: (orderNumber: string) =>
    request<Order>(`/orders/${orderNumber}/`, { requiresAuth: true }),

  createOrder: (payload: OrderCreatePayload) =>
    request<Order>("/orders/", {
      method: "POST",
      requiresAuth: true,
      body: JSON.stringify(payload),
    }),

  uploadPaymentProof: async (orderNumber: string, file: File): Promise<Order> => {
    const formData = new FormData();
    formData.append("screenshot", file);

    return request<Order>(`/orders/${orderNumber}/payment-proof/`, {
      method: "POST",
      requiresAuth: true,
      body: formData,
    });
  },

  cancelOrder: (orderNumber: string) =>
    request<Order>(`/orders/${orderNumber}/cancel/`, {
      method: "POST",
      requiresAuth: true,
    }),
};

/* =========================================================================
   Auth API
   ========================================================================= */

export const authApi = {
  getMe: () =>
    request<User>("/auth/me/", { requiresAuth: true }),

  login: (credentials: { email: string; password: string }) =>
    request<AuthTokens>("/auth/login/", {
      method: "POST",
      body: JSON.stringify(credentials),
    }),

  register: (payload: { name: string; email: string; password: string; phone?: string }) =>
    request<{ user: { email: string; name: string }; access: string; refresh: string }>("/auth/register/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  verifyEmail: (token: string) =>
    request<{ detail: string }>("/auth/verify-email/", {
      method: "POST",
      body: JSON.stringify({ token }),
    }),

  resendVerification: (email: string) =>
    request<{ detail: string }>("/auth/resend-verification/", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
};

