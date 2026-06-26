'use client';

import {
  createContext,
  use,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';

// --- Types ---

export interface GuestCartItem {
  productId: string;
  sellerId: string;
  quantity: number;
  /** Plain number (not Money) — guest cart lives in localStorage. */
  unitPriceSnapshot: number;
  customizationText?: string | null;
  customizationColor?: string | null;
  customizationSize?: string | null;
  customizationImageUrl?: string | null;
  /** Display metadata — populated by the Add to Cart flow. */
  productName?: string;
  productImageUrl?: string | null;
  sellerName?: string;
}

interface GuestCartShape {
  items: GuestCartItem[];
  updatedAt: string;
}

export interface GuestCartContextType {
  items: GuestCartItem[];
  addItem: (item: GuestCartItem) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  /** Number of distinct line items (not sum of quantities). */
  itemCount: number;
  /** True once localStorage has been read. False during SSR and initial render. */
  hydrated: boolean;
}

// --- Constants ---

export const GUEST_CART_STORAGE_KEY = 'cart:guest:v1';

// --- Context ---

const GuestCartContext = createContext<GuestCartContextType | null>(null);

// --- Helpers ---

function readFromStorage(): GuestCartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(GUEST_CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as GuestCartShape;
    if (!parsed.items || !Array.isArray(parsed.items)) return [];
    return parsed.items;
  } catch {
    return [];
  }
}

function writeToStorage(items: GuestCartItem[]): void {
  if (typeof window === 'undefined') return;
  const shape: GuestCartShape = {
    items,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(shape));
}

// --- Provider ---

export function GuestCartProvider({ children }: { children: ReactNode }) {
  // Always start with empty array to match server render (avoid hydration mismatch).
  // Hydrate from localStorage in useEffect after mount.
  const [items, setItems] = useState<GuestCartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage after mount.
  /* eslint-disable react-hooks/set-state-in-effect, @eslint-react/set-state-in-effect -- intentional hydration from localStorage */
  useEffect(() => {
    const stored = readFromStorage();
    setItems(stored);
    setHydrated(true);
  }, []);

  // Persist to localStorage whenever items change (but only after hydration).
  useEffect(() => {
    if (!hydrated) return;
    if (items.length === 0) {
      localStorage.removeItem(GUEST_CART_STORAGE_KEY);
    } else {
      writeToStorage(items);
    }
  }, [items, hydrated]);
  /* eslint-enable react-hooks/set-state-in-effect, @eslint-react/set-state-in-effect */

  const addItem = useCallback((item: GuestCartItem) => {
    setItems((prev) => [...prev, item]);
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    setItems((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, quantity } : i)),
    );
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const value = useMemo<GuestCartContextType>(
    () => ({
      items,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      itemCount: items.length,
      hydrated,
    }),
    [items, addItem, updateQuantity, removeItem, clearCart, hydrated],
  );

  return <GuestCartContext value={value}>{children}</GuestCartContext>;
}

// --- Hook ---

export function useGuestCart(): GuestCartContextType {
  const ctx = use(GuestCartContext);
  if (!ctx) {
    throw new Error('useGuestCart must be used within a GuestCartProvider');
  }
  return ctx;
}
