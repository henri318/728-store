'use client';

import {
  createContext,
  use,
  useState,
  useCallback,
  type ReactNode,
} from 'react';

interface CartPopupContextType {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

const CartPopupContext = createContext<CartPopupContextType | null>(null);

export function CartPopupProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  return (
    <CartPopupContext value={{ isOpen, open, close }}>
      {children}
    </CartPopupContext>
  );
}

export function useCartPopup(): CartPopupContextType {
  const ctx = use(CartPopupContext);
  if (!ctx)
    throw new Error('useCartPopup must be used within a CartPopupProvider');
  return ctx;
}
