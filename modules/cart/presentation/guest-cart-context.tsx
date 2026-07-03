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
  /** Unique identifier — always present after hydration. */
  id?: string;
  productId: string;
  sellerId: string;
  quantity: number;
  /** Plain number (not Money) — guest cart lives in localStorage. */
  unitPriceSnapshot: number;
  customizationText?: string | null;
  customizationColor?: string | null;
  customizationSize?: string | null;
  customizationImageUrl?: string | null;
  customizationImageUploadId?: string | null;
  /**
   * Buyer-side design position captured by the mockup canvas. Survives
   * localStorage round-trips so the next page can restore the placement
   * the user chose before adding to cart.
   */
  customizationDesignPosition?: {
    imageUrl: string;
    x: number;
    y: number;
    scale: number;
    rotation_deg: number;
    opacity: number;
    blend_mode: string;
  } | null;
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
  /** Update quantity by productId (affects all items matching productId). */
  updateQuantity: (productId: string, quantity: number) => void;
  /** Remove ALL items with the given productId. */
  removeItem: (productId: string) => void;
  /** Update customization on ALL items matching productId. */
  updateCustomization: (
    productId: string,
    customization: {
      text?: string | null;
      color?: string | null;
      size?: string | null;
      imageUrl?: string | null;
      imageUploadId?: string | null;
      designPosition?: Record<string, unknown> | null;
    },
  ) => void;
  /** Update quantity for a specific item by ID. */
  updateItemQuantity: (itemId: string, quantity: number) => void;
  /** Remove a specific item by ID. */
  removeItemById: (itemId: string) => void;
  /** Update customization on a specific item by ID. */
  updateItemCustomization: (
    itemId: string,
    customization: {
      text?: string | null;
      color?: string | null;
      size?: string | null;
      imageUrl?: string | null;
      imageUploadId?: string | null;
      designPosition?: Record<string, unknown> | null;
    },
  ) => void;
  clearCart: () => void;
  /** Sum of all item quantities. */
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

  // Hydrate from localStorage after mount, assigning IDs to legacy items.
  /* eslint-disable react-hooks/set-state-in-effect, @eslint-react/set-state-in-effect -- intentional hydration from localStorage */
  useEffect(() => {
    const stored = readFromStorage();
    setItems(
      stored.map((item) =>
        item.id ? item : { ...item, id: crypto.randomUUID() },
      ),
    );
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
    setItems((prev) => [
      ...prev,
      { ...item, id: item.id ?? crypto.randomUUID() },
    ]);
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    const clamped = Math.max(1, Math.min(99, Math.floor(quantity)));
    setItems((prev) =>
      prev.map((i) =>
        i.productId === productId ? { ...i, quantity: clamped } : i,
      ),
    );
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const updateCustomization = useCallback(
    (
      productId: string,
      customization: {
        text?: string | null;
        color?: string | null;
        size?: string | null;
        imageUrl?: string | null;
        imageUploadId?: string | null;
        designPosition?: Record<string, unknown> | null;
      },
    ) => {
      setItems((prev) =>
        prev.map((item) =>
          item.productId === productId
            ? {
                ...item,
                customizationText:
                  customization.text !== undefined
                    ? customization.text
                    : item.customizationText,
                customizationColor:
                  customization.color !== undefined
                    ? customization.color
                    : item.customizationColor,
                customizationSize:
                  customization.size !== undefined
                    ? customization.size
                    : item.customizationSize,
                customizationImageUrl:
                  customization.imageUrl !== undefined
                    ? customization.imageUrl
                    : item.customizationImageUrl,
                customizationImageUploadId:
                  customization.imageUploadId !== undefined
                    ? customization.imageUploadId
                    : item.customizationImageUploadId,
                customizationDesignPosition:
                  customization.designPosition !== undefined
                    ? (customization.designPosition as GuestCartItem['customizationDesignPosition'])
                    : item.customizationDesignPosition,
              }
            : item,
        ),
      );
    },
    [],
  );

  const updateItemQuantity = useCallback((itemId: string, quantity: number) => {
    const clamped = Math.max(1, Math.min(99, Math.floor(quantity)));
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, quantity: clamped } : i)),
    );
  }, []);

  const removeItemById = useCallback((itemId: string) => {
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  }, []);

  const updateItemCustomization = useCallback(
    (
      itemId: string,
      customization: {
        text?: string | null;
        color?: string | null;
        size?: string | null;
        imageUrl?: string | null;
        imageUploadId?: string | null;
        designPosition?: Record<string, unknown> | null;
      },
    ) => {
      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? {
                ...item,
                customizationText:
                  customization.text !== undefined
                    ? customization.text
                    : item.customizationText,
                customizationColor:
                  customization.color !== undefined
                    ? customization.color
                    : item.customizationColor,
                customizationSize:
                  customization.size !== undefined
                    ? customization.size
                    : item.customizationSize,
                customizationImageUrl:
                  customization.imageUrl !== undefined
                    ? customization.imageUrl
                    : item.customizationImageUrl,
                customizationImageUploadId:
                  customization.imageUploadId !== undefined
                    ? customization.imageUploadId
                    : item.customizationImageUploadId,
                customizationDesignPosition:
                  customization.designPosition !== undefined
                    ? (customization.designPosition as GuestCartItem['customizationDesignPosition'])
                    : item.customizationDesignPosition,
              }
            : item,
        ),
      );
    },
    [],
  );

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const value = useMemo<GuestCartContextType>(
    () => ({
      items,
      addItem,
      updateQuantity,
      removeItem,
      updateCustomization,
      updateItemQuantity,
      removeItemById,
      updateItemCustomization,
      clearCart,
      itemCount: items
        .filter((i) => i.quantity > 0)
        .reduce((sum, i) => sum + i.quantity, 0),
      hydrated,
    }),
    [
      items,
      addItem,
      updateQuantity,
      removeItem,
      updateCustomization,
      updateItemQuantity,
      removeItemById,
      updateItemCustomization,
      clearCart,
      hydrated,
    ],
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
