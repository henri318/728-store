'use client';

import { createContext, use } from 'react';
import type { ReactNode } from 'react';
import es from '@/shared/i18n/locales/es.json';

export interface SellerDetailDictionary {
  editTitle: string;
  nameLabel: string;
  descriptionLabel: string;
  save: string;
  saved: string;
}

export interface AdminDictionary {
  sellersTitle: string;
  noSellers: string;
  sellerName: string;
  sellerStatus: string;
  sellerCreated: string;
  actions: string;
  edit: string;
  viewProducts: string;
  suspend: string;
  activate: string;
  ban: string;
  status_draft: string;
  status_active: string;
  status_archived: string;
  status_suspended: string;
  status_banned: string;
  status_eliminated: string;
  createSeller: string;
  createSellerTitle: string;
  sellerBusinessName: string;
  sellerDescription: string;
  sellerDescriptionList: string;
  delete: string;
  deleteConfirm: string;
  deleteConfirmMessage: string;
  createSellerError: string;
  deleteSellerError: string;
  deletedSuccess: string;
  pagePrev: string;
  pageNext: string;
  pageXofY: string;
  createSellerSuccess: string;
  backToSellers: string;
  sellerProductsTitle: string;
  noProducts: string;
  productName: string;
  productStatus: string;
  productPrice: string;
  productUpdated: string;
  searchSellers: string;
  searchSellersPlaceholder: string;
  searchProductsPlaceholder: string;
  searchProducts: string;
  productCount: string;
  untranslatedProduct: string;
  paginationAriaLabel: string;
  suspendProduct: string;
  activateProduct: string;
  eliminateProduct: string;
  eliminateProductConfirm: string;
  sellerDetail: SellerDetailDictionary;
}

export interface Dictionary {
  common: Record<string, string>;
  auth: Record<string, string>;
  profile: Record<string, string>;
  userMenu: Record<string, string>;
  sellerDashboard: Record<string, string>;
  passwordStrength: Record<string, string>;
  admin: AdminDictionary;
}

const DictionaryContext = createContext<Dictionary | null>(null);

export function DictionaryProvider({
  dict,
  children,
}: {
  dict: Dictionary;
  children: ReactNode;
}) {
  return <DictionaryContext value={dict}>{children}</DictionaryContext>;
}

/**
 * Returns the current locale dictionary.
 * Must be used inside a <DictionaryProvider> (provided by the root layout).
 * Falls back to Spanish (es.json) when no provider is present — this keeps
 * tests working without requiring every test to wrap in a provider.
 */
export function useDictionary(): Dictionary {
  const dict = use(DictionaryContext);
  return dict ?? (es as Dictionary);
}
