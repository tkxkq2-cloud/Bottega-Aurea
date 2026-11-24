import type { Timestamp } from 'firebase/firestore';

export type ProductCategory = 'food' | 'beauty';
export type PaymentMethod = 'card' | 'cash' | 'mixed';
export type AppView =
  | 'catalog'
  | 'teamLookup'
  | 'commission'
  | 'inventory'
  | 'editProduct'
  | 'registerProduct';

export const DEFAULT_COMMISSION_RATES = {
  guideRate: 10,
  leaderRate: 10,
} as const;

/**
 * Validation constants synchronized verbatim with firebase-blueprint.json & firestore.rules.
 */
export const SCHEMA_LIMITS = {
  ID_PATTERN: /^[a-zA-Z0-9_-]+$/,
  TEAM_CODE_MAX: 40,
  PRODUCT_NAME_MAX: 80,
  PRODUCT_VOLUME_MAX: 40,
  PRODUCT_DESC_MAX: 240,
  PRODUCT_IMAGE_MAX: 200000,
  MAX_PRICE: 100000,
  MAX_BUNDLE_QUANTITY: 1000,
  MAX_BUNDLE_PRICE: 1000000,
  MAX_STOCK: 1000000,
  MAX_ORDER_ITEMS: 50,
} as const;

export interface Product {
  id: string;
  ownerId: string;
  name: string;
  volume?: string;
  category: ProductCategory;
  price: number;
  description: string;
  stock: number;
  isPopular: boolean;
  imageUrl: string;
  displayOrder: number;
  bundleEnabled?: boolean;
  bundleQuantity?: number;
  bundlePrice?: number;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface ProductInput {
  name: string;
  volume?: string;
  category: ProductCategory;
  price: number;
  description: string;
  stock: number;
  isPopular: boolean;
  imageUrl: string;
  displayOrder?: number;
  bundleEnabled?: boolean;
  bundleQuantity?: number;
  bundlePrice?: number;
}

export interface OrderItem {
  productId: string;
  name: string;
  category: ProductCategory;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface TeamSummary {
  id: string;
  ownerId: string;
  teamCode: string;
  orderCount: number;
  totalCardAmount: number;
  totalCashAmount: number;
  totalRevenue: number;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface Order {
  id: string;
  ownerId: string;
  teamDocId: string;
  teamCode: string;
  orderNumber: number;
  paymentMethod: PaymentMethod;
  cardAmount?: number;
  cashAmount?: number;
  items: OrderItem[];
  totalQuantity: number;
  originalTotal: number;
  discountAmount: number;
  finalTotal: number;
  createdAt?: Timestamp | null;
}

export interface CheckoutReceipt {
  orderId: string;
  teamCode: string;
  orderNumber: number;
  paymentMethod: PaymentMethod;
  cardAmount?: number;
  cashAmount?: number;
  items: OrderItem[];
  totalQuantity: number;
  originalTotal: number;
  discountAmount: number;
  finalTotal: number;
}

export interface StoreSettings {
  ownerId: string;
  guideRate: number;
  leaderRate: number;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}
