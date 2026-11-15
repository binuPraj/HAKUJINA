"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  authApi,
  cartApi,
  clearStoredTokens,
  getStoredTokens,
  type Cart,
  type User,
} from "./api";

interface ToastInfo {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

interface StoreContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  cart: Cart | null;
  cartCount: number;
  isCartOpen: boolean;
  toasts: ToastInfo[];
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  addToCart: (productId: number, quantity?: number) => Promise<boolean>;
  updateQuantity: (cartItemId: number, quantity: number) => Promise<boolean>;
  removeFromCart: (cartItemId: number) => Promise<boolean>;
  clearCart: () => Promise<boolean>;
  refreshCart: () => Promise<void>;
  refreshUser: () => Promise<void>;
  logout: () => void;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
  removeToast: (id: number) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

let toastCounter = 0;

export function StoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [cart, setCart] = useState<Cart | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastInfo[]>([]);

  const showToast = useCallback(
    (message: string, type: "success" | "error" | "info" = "info") => {
      const id = ++toastCounter;
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    [],
  );

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const refreshCart = useCallback(async () => {
    const { access } = getStoredTokens();
    if (!access) {
      setCart(null);
      return;
    }
    try {
      const cartData = await cartApi.getCart();
      setCart(cartData);
    } catch {
      // Cart may fail if token is invalid or server unavail
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const { access } = getStoredTokens();
    if (!access) {
      setUser(null);
      setCart(null);
      setIsAuthLoading(false);
      return;
    }
    try {
      const userData = await authApi.getMe();
      setUser(userData);
      await refreshCart();
    } catch {
      clearStoredTokens();
      setUser(null);
      setCart(null);
    } finally {
      setIsAuthLoading(false);
    }
  }, [refreshCart]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const openCart = useCallback(() => setIsCartOpen(true), []);
  const closeCart = useCallback(() => setIsCartOpen(false), []);
  const toggleCart = useCallback(() => setIsCartOpen((prev) => !prev), []);

  const addToCart = useCallback(
    async (productId: number, quantity: number = 1): Promise<boolean> => {
      const { access } = getStoredTokens();
      if (!access) {
        showToast("Please log in to add pieces to your bag.", "info");
        return false;
      }
      try {
        const updatedCart = await cartApi.addItem(productId, quantity);
        setCart(updatedCart);
        showToast("Added to your shopping bag.", "success");
        setIsCartOpen(true);
        return true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Could not add to bag.";
        showToast(msg, "error");
        return false;
      }
    },
    [showToast],
  );

  const updateQuantity = useCallback(
    async (cartItemId: number, quantity: number): Promise<boolean> => {
      try {
        const updatedCart = await cartApi.updateItem(cartItemId, quantity);
        setCart(updatedCart);
        return true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Could not update quantity.";
        showToast(msg, "error");
        return false;
      }
    },
    [showToast],
  );

  const removeFromCart = useCallback(
    async (cartItemId: number): Promise<boolean> => {
      try {
        const updatedCart = await cartApi.removeItem(cartItemId);
        setCart(updatedCart);
        showToast("Piece removed from bag.", "info");
        return true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Could not remove item.";
        showToast(msg, "error");
        return false;
      }
    },
    [showToast],
  );

  const clearCart = useCallback(async (): Promise<boolean> => {
    try {
      const updatedCart = await cartApi.clearCart();
      setCart(updatedCart);
      return true;
    } catch {
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    clearStoredTokens();
    setUser(null);
    setCart(null);
    setIsCartOpen(false);
    showToast("You have been signed out.", "info");
  }, [showToast]);

  const cartCount = cart?.item_count ?? 0;
  const isAuthenticated = Boolean(user);

  return (
    <StoreContext.Provider
      value={{
        user,
        isAuthenticated,
        isAuthLoading,
        cart,
        cartCount,
        isCartOpen,
        toasts,
        openCart,
        closeCart,
        toggleCart,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        refreshCart,
        refreshUser,
        logout,
        showToast,
        removeToast,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore(): StoreContextType {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error("useStore must be used within a StoreProvider");
  }
  return context;
}

