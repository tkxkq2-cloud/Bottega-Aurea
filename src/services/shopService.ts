import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { INITIAL_SEED_PRODUCTS } from '../data/seedProducts';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  DEFAULT_COMMISSION_RATES,
  SCHEMA_LIMITS,
  type CheckoutReceipt,
  type CommissionRates,
  type Order,
  type OrderItem,
  type PaymentMethod,
  type Product,
  type ProductInput,
  type StoreSettings,
  type TeamSummary,
} from '../types/shop';
import {
  calculateCashDiscount,
  calculateCashPrice,
  calculateProductLinePricing,
  formatSingleLineName,
  getOrderPaymentBreakdown,
  roundEuro,
  sanitizeTeamCode,
} from '../utils/format';

function generateSafeId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now()}_${rand}`.replace(/[^a-zA-Z0-9_-]/g, '');
}

function buildTeamDocId(ownerId: string, teamCode: string): string {
  const safeOwner = ownerId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
  const safeCode = sanitizeTeamCode(teamCode).slice(0, 40);
  return `${safeOwner}_${safeCode}`;
}

function sanitizeProductPayload(input: ProductInput) {
  const name = input.name.replace(/\r\n/g, '\n').trim().slice(0, SCHEMA_LIMITS.PRODUCT_NAME_MAX);
  const volume = (input.volume || '').trim().slice(0, SCHEMA_LIMITS.PRODUCT_VOLUME_MAX);
  const description = input.description
    .replace(/\r\n/g, '\n')
    .trim()
    .slice(0, SCHEMA_LIMITS.PRODUCT_DESC_MAX);
  const price = Math.min(SCHEMA_LIMITS.MAX_PRICE, Math.max(0, roundEuro(Number(input.price) || 0)));
  const stock = Math.min(SCHEMA_LIMITS.MAX_STOCK, Math.max(0, Math.floor(Number(input.stock) || 0)));
  const imageUrl = (input.imageUrl || '').trim().slice(0, SCHEMA_LIMITS.PRODUCT_IMAGE_MAX);
  const category = input.category === 'beauty' ? 'beauty' : 'food';
  const isPopular = Boolean(input.isPopular);
  const displayOrder = Math.min(100000, Math.max(0, Number(input.displayOrder ?? 99)));
  const bundleEnabled = Boolean(input.bundleEnabled);
  const rawBundleQty = Math.floor(Number(input.bundleQuantity) || 0);
  const bundleQuantity = bundleEnabled
    ? Math.min(SCHEMA_LIMITS.MAX_BUNDLE_QUANTITY, Math.max(2, rawBundleQty))
    : 0;
  const bundlePrice = bundleEnabled
    ? Math.min(SCHEMA_LIMITS.MAX_BUNDLE_PRICE, Math.max(0, roundEuro(Number(input.bundlePrice) || 0)))
    : 0;

  if (!name) {
    throw new Error('상품명을 입력해 주세요.');
  }
  return {
    name,
    volume,
    category,
    price,
    description,
    stock,
    isPopular,
    imageUrl,
    displayOrder,
    bundleEnabled,
    bundleQuantity,
    bundlePrice,
  };
}

export async function seedInitialProductsIfEmpty(ownerId: string): Promise<boolean> {
  const path = 'products';
  try {
    const existingSnap = await getDocs(
      query(collection(db, path), where('ownerId', '==', ownerId))
    );
    if (!existingSnap.empty) {
      return false;
    }

    const batch = writeBatch(db);
    for (const item of INITIAL_SEED_PRODUCTS) {
      const safeOwnerPrefix = ownerId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24);
      const docId = `seed_${safeOwnerPrefix}_${item.seedSlug}`;
      const productRef = doc(db, path, docId);
      batch.set(productRef, {
        ownerId,
        name: item.name,
        category: item.category,
        price: item.price,
        description: item.description,
        stock: item.stock,
        isPopular: item.isPopular,
        imageUrl: item.imageUrl,
        displayOrder: item.displayOrder,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeProducts(
  ownerId: string,
  onData: (products: Product[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'products';
  const q = query(collection(db, path), where('ownerId', '==', ownerId));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: Product[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Product, 'id'>),
      }));
      items.sort((a, b) => {
        if (a.displayOrder !== b.displayOrder) {
          return a.displayOrder - b.displayOrder;
        }
        return a.name.localeCompare(b.name, 'ko');
      });
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) {
          onError(wrapped);
        }
      }
    }
  );
}

export function subscribeTeams(
  ownerId: string,
  onData: (teams: TeamSummary[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'teams';
  const q = query(collection(db, path), where('ownerId', '==', ownerId));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: TeamSummary[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<TeamSummary, 'id'>),
      }));
      items.sort((a, b) => {
        const aTime = a.updatedAt?.toMillis() ?? 0;
        const bTime = b.updatedAt?.toMillis() ?? 0;
        return bTime - aTime;
      });
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) {
          onError(wrapped);
        }
      }
    }
  );
}

export function subscribeOrders(
  ownerId: string,
  onData: (orders: Order[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'orders';
  const q = query(collection(db, path), where('ownerId', '==', ownerId));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: Order[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Order, 'id'>),
      }));
      items.sort((a, b) => {
        const aTime = a.createdAt?.toMillis() ?? 0;
        const bTime = b.createdAt?.toMillis() ?? 0;
        return bTime - aTime;
      });
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) {
          onError(wrapped);
        }
      }
    }
  );
}

export async function createProduct(ownerId: string, input: ProductInput): Promise<string> {
  const payload = sanitizeProductPayload(input);
  const productId = generateSafeId('prod');
  const path = `products/${productId}`;
  try {
    await setDoc(doc(db, 'products', productId), {
      ownerId,
      ...payload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return productId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateProduct(productId: string, input: ProductInput): Promise<void> {
  const payload = sanitizeProductPayload(input);
  const path = `products/${productId}`;
  try {
    await updateDoc(doc(db, 'products', productId), {
      ...payload,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateProductStock(productId: string, newStock: number): Promise<void> {
  const safeStock = Math.min(SCHEMA_LIMITS.MAX_STOCK, Math.max(0, Math.floor(newStock)));
  const path = `products/${productId}`;
  try {
    await updateDoc(doc(db, 'products', productId), {
      stock: safeStock,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteProduct(productId: string): Promise<void> {
  const path = `products/${productId}`;
  try {
    await deleteDoc(doc(db, 'products', productId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function reorderProducts(orderedProducts: Product[]): Promise<void> {
  const updates = orderedProducts
    .map((product, index) => ({
      id: product.id,
      prevOrder: product.displayOrder,
      nextOrder: Math.min(100000, index + 1),
    }))
    .filter((item) => item.prevOrder !== item.nextOrder);

  if (updates.length === 0) return;

  const CHUNK_SIZE = 400;
  try {
    for (let i = 0; i < updates.length; i += CHUNK_SIZE) {
      const chunk = updates.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      for (const item of chunk) {
        batch.update(doc(db, 'products', item.id), {
          displayOrder: item.nextOrder,
          updatedAt: serverTimestamp(),
        });
      }
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, 'products');
  }
}

export interface CheckoutParams {
  ownerId: string;
  teamCode: string;
  paymentMethod: PaymentMethod;
  cardAmount?: number;
  cashAmount?: number;
  cartEntries: { productId: string; quantity: number; customLineTotal?: number }[];
}

export async function processCheckoutTransaction(params: CheckoutParams): Promise<CheckoutReceipt> {
  const normalizedCode = sanitizeTeamCode(params.teamCode);
  if (!normalizedCode) {
    throw new Error('유효한 영문/숫자 팀 코드를 입력해 주세요.');
  }
  const activeEntries = params.cartEntries.filter((e) => e.quantity > 0);
  if (activeEntries.length === 0) {
    throw new Error('장바구니에 담긴 상품이 없습니다.');
  }
  if (activeEntries.length > SCHEMA_LIMITS.MAX_ORDER_ITEMS) {
    throw new Error(`한 번에 최대 ${SCHEMA_LIMITS.MAX_ORDER_ITEMS}개 품목까지 결제할 수 있습니다.`);
  }

  const teamDocId = buildTeamDocId(params.ownerId, normalizedCode);
  const orderId = generateSafeId('ord');
  const teamRef = doc(db, 'teams', teamDocId);
  const orderRef = doc(db, 'orders', orderId);

  try {
    const receipt = await runTransaction(db, async (tx) => {
      // 1. Read all required documents first (Firestore transaction requirement)
      const teamSnap = await tx.get(teamRef);
      const productSnaps = await Promise.all(
        activeEntries.map((entry) => tx.get(doc(db, 'products', entry.productId)))
      );

      // 2. Validate stock & build authoritative order line items
      const orderItems: OrderItem[] = [];
      const stockUpdates: { ref: ReturnType<typeof doc>; nextStock: number }[] = [];
      let totalQuantity = 0;
      let originalTotal = 0;

      for (let i = 0; i < activeEntries.length; i++) {
        const entry = activeEntries[i];
        const snap = productSnaps[i];
        if (!snap.exists()) {
          throw new Error('장바구니에 삭제된 상품이 포함되어 있습니다. 목록을 확인해 주세요.');
        }
        const productData = snap.data() as Omit<Product, 'id'>;
        const singleLineName = formatSingleLineName(productData.name);
        if (productData.stock < entry.quantity) {
          throw new Error(
            `"${singleLineName}" 재고가 부족합니다. (현재 재고: ${productData.stock}개)`
          );
        }
        const pricing = calculateProductLinePricing(productData, entry.quantity);
        const hasValidOverride =
          typeof entry.customLineTotal === 'number' &&
          !Number.isNaN(entry.customLineTotal) &&
          entry.customLineTotal >= 0 &&
          entry.customLineTotal <= SCHEMA_LIMITS.MAX_BUNDLE_PRICE;
        const finalLineTotal = hasValidOverride
          ? roundEuro(entry.customLineTotal as number)
          : pricing.lineTotal;
        const finalUnitPrice = hasValidOverride
          ? roundEuro(finalLineTotal / entry.quantity)
          : pricing.effectiveUnitPrice;

        totalQuantity += entry.quantity;
        originalTotal = roundEuro(originalTotal + finalLineTotal);

        orderItems.push({
          productId: snap.id,
          name: singleLineName,
          category: productData.category,
          unitPrice: finalUnitPrice,
          quantity: entry.quantity,
          lineTotal: finalLineTotal,
        });

        stockUpdates.push({
          ref: snap.ref,
          nextStock: productData.stock - entry.quantity,
        });
      }

      const discountAmount =
        params.paymentMethod === 'cash' ? calculateCashDiscount(originalTotal) : 0;
      const finalTotal =
        params.paymentMethod === 'cash' ? calculateCashPrice(originalTotal) : originalTotal;

      let orderCardAmount = 0;
      let orderCashAmount = 0;
      if (params.paymentMethod === 'mixed') {
        orderCardAmount = roundEuro(Math.max(0, Number(params.cardAmount) || 0));
        orderCashAmount = roundEuro(Math.max(0, Number(params.cashAmount) || 0));
        if (Math.abs(roundEuro(orderCardAmount + orderCashAmount) - finalTotal) > 0.009) {
          throw new Error(
            `현금과 카드 결제 금액의 합계가 총 금액(${finalTotal}€)과 일치해야 합니다.`
          );
        }
      } else if (params.paymentMethod === 'card') {
        orderCardAmount = finalTotal;
      } else {
        orderCashAmount = finalTotal;
      }

      // 3. Determine sequential team order number and update/create TeamSummary
      let nextOrderNumber = 1;
      if (teamSnap.exists()) {
        const prev = teamSnap.data() as Omit<TeamSummary, 'id'>;
        nextOrderNumber = prev.orderCount + 1;
        const nextCard = roundEuro(prev.totalCardAmount + orderCardAmount);
        const nextCash = roundEuro(prev.totalCashAmount + orderCashAmount);
        const nextRev = roundEuro(prev.totalRevenue + finalTotal);

        tx.update(teamRef, {
          orderCount: nextOrderNumber,
          totalCardAmount: nextCard,
          totalCashAmount: nextCash,
          totalRevenue: nextRev,
          updatedAt: serverTimestamp(),
        });
      } else {
        tx.set(teamRef, {
          ownerId: params.ownerId,
          teamCode: normalizedCode,
          orderCount: 1,
          totalCardAmount: orderCardAmount,
          totalCashAmount: orderCashAmount,
          totalRevenue: finalTotal,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      // 4. Deduct stock from every purchased product
      for (const update of stockUpdates) {
        tx.update(update.ref, {
          stock: update.nextStock,
          updatedAt: serverTimestamp(),
        });
      }

      // 5. Create immutable numbered order record
      const orderPayload: Record<string, unknown> = {
        ownerId: params.ownerId,
        teamDocId,
        teamCode: normalizedCode,
        orderNumber: nextOrderNumber,
        paymentMethod: params.paymentMethod,
        items: orderItems,
        totalQuantity,
        originalTotal,
        discountAmount,
        finalTotal,
        createdAt: serverTimestamp(),
      };
      if (params.paymentMethod === 'mixed') {
        orderPayload.cardAmount = orderCardAmount;
        orderPayload.cashAmount = orderCashAmount;
      }
      tx.set(orderRef, orderPayload);

      return {
        orderId,
        teamCode: normalizedCode,
        orderNumber: nextOrderNumber,
        paymentMethod: params.paymentMethod,
        ...(params.paymentMethod === 'mixed'
          ? { cardAmount: orderCardAmount, cashAmount: orderCashAmount }
          : {}),
        items: orderItems,
        totalQuantity,
        originalTotal,
        discountAmount,
        finalTotal,
      };
    });

    return receipt;
  } catch (error) {
    // Re-throw user-facing business validation errors directly (e.g., insufficient stock)
    if (
      error instanceof Error &&
      (error.message.includes('재고가 부족합니다') ||
        error.message.includes('삭제된 상품') ||
        error.message.includes('팀 코드') ||
        error.message.includes('일치해야 합니다'))
    ) {
      throw error;
    }
    handleFirestoreError(error, OperationType.WRITE, `orders/${orderId}`);
  }
}

/**
 * Atomically voids a single mistaken or cancelled order:
 * - Deletes the order document
 * - Restores product inventory for every still-existing product in the order
 * - Decrements or removes the parent team summary document
 */
export async function voidOrderTransaction(
  order: Order
): Promise<{ restoredUnits: number; skippedMissingProducts: number }> {
  const orderRef = doc(db, 'orders', order.id);
  const teamRef = doc(db, 'teams', order.teamDocId);

  // Aggregate quantities by productId in case duplicate lines exist
  const qtyByProductId = new Map<string, number>();
  for (const item of order.items) {
    if (!item.productId || item.quantity <= 0) continue;
    qtyByProductId.set(item.productId, (qtyByProductId.get(item.productId) ?? 0) + item.quantity);
  }
  const uniqueProductIds = Array.from(qtyByProductId.keys());

  try {
    return await runTransaction(db, async (tx) => {
      // 1. Perform all reads before any writes (Firestore transaction requirement)
      const orderSnap = await tx.get(orderRef);
      if (!orderSnap.exists()) {
        throw new Error('이미 삭제되었거나 존재하지 않는 결제 건입니다.');
      }
      const liveOrder = orderSnap.data() as Omit<Order, 'id'>;
      const teamSnap = await tx.get(teamRef);
      const productSnaps = await Promise.all(
        uniqueProductIds.map((pid) => tx.get(doc(db, 'products', pid)))
      );

      // 2. Restore inventory for every product still present in the catalog
      let restoredUnits = 0;
      let skippedMissingProducts = 0;

      for (let i = 0; i < uniqueProductIds.length; i++) {
        const pid = uniqueProductIds[i];
        const qtyToRestore = qtyByProductId.get(pid) ?? 0;
        const pSnap = productSnaps[i];
        if (!pSnap.exists()) {
          skippedMissingProducts += 1;
          continue;
        }
        const pData = pSnap.data() as Omit<Product, 'id'>;
        const nextStock = Math.min(SCHEMA_LIMITS.MAX_STOCK, pData.stock + qtyToRestore);
        tx.update(pSnap.ref, {
          stock: nextStock,
          updatedAt: serverTimestamp(),
        });
        restoredUnits += qtyToRestore;
      }

      // 3. Revert or remove TeamSummary totals
      if (teamSnap.exists()) {
        const prev = teamSnap.data() as Omit<TeamSummary, 'id'>;
        if (prev.orderCount <= 1) {
          tx.delete(teamRef);
        } else {
          const nextOrderCount = prev.orderCount - 1;
          const breakdown = getOrderPaymentBreakdown(liveOrder);
          const nextCard = Math.max(0, roundEuro(prev.totalCardAmount - breakdown.cardAmount));
          const nextCash = Math.max(0, roundEuro(prev.totalCashAmount - breakdown.cashAmount));
          const nextRevenue = roundEuro(nextCard + nextCash);

          tx.update(teamRef, {
            orderCount: nextOrderCount,
            totalCardAmount: nextCard,
            totalCashAmount: nextCash,
            totalRevenue: nextRevenue,
            updatedAt: serverTimestamp(),
          });
        }
      }

      // 4. Delete the voided order document
      tx.delete(orderRef);

      return { restoredUnits, skippedMissingProducts };
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('이미 삭제')) {
      throw error;
    }
    handleFirestoreError(error, OperationType.WRITE, `orders/${order.id}`);
  }
}

export interface DeleteSalesRecordsParams {
  targetOrders: Order[];
  allOrders: Order[];
  teams: TeamSummary[];
}

/**
 * Deletes archived orders and cleans up/recalculates affected team summaries.
 * Strictly NEVER modifies the `products` collection so inventory counts remain untouched.
 */
export async function deleteSalesRecords({
  targetOrders,
  allOrders,
  teams,
}: DeleteSalesRecordsParams): Promise<{ deletedOrderCount: number; affectedTeamCount: number }> {
  if (targetOrders.length === 0) {
    return { deletedOrderCount: 0, affectedTeamCount: 0 };
  }

  const targetOrderIds = new Set(targetOrders.map((o) => o.id));
  const affectedTeamDocIds = new Set<string>();
  for (const order of targetOrders) {
    affectedTeamDocIds.add(order.teamDocId);
  }

  type BatchOp =
    | { kind: 'deleteOrder'; id: string }
    | { kind: 'deleteTeam'; id: string }
    | {
        kind: 'updateTeam';
        id: string;
        orderCount: number;
        totalCardAmount: number;
        totalCashAmount: number;
        totalRevenue: number;
      };

  const ops: BatchOp[] = [];

  for (const order of targetOrders) {
    ops.push({ kind: 'deleteOrder', id: order.id });
  }

  const teamById = new Map(teams.map((t) => [t.id, t]));

  for (const teamDocId of affectedTeamDocIds) {
    const teamDoc = teamById.get(teamDocId);
    if (!teamDoc) continue;

    const remainingOrders = allOrders.filter(
      (o) => o.teamDocId === teamDocId && !targetOrderIds.has(o.id)
    );

    if (remainingOrders.length === 0) {
      ops.push({ kind: 'deleteTeam', id: teamDocId });
    } else {
      let cardAmt = 0;
      let cashAmt = 0;
      for (const rem of remainingOrders) {
        const breakdown = getOrderPaymentBreakdown(rem);
        cardAmt = roundEuro(cardAmt + breakdown.cardAmount);
        cashAmt = roundEuro(cashAmt + breakdown.cashAmount);
      }
      const nextCount = Math.min(remainingOrders.length, Math.max(1, teamDoc.orderCount - 1));
      ops.push({
        kind: 'updateTeam',
        id: teamDocId,
        orderCount: nextCount,
        totalCardAmount: cardAmt,
        totalCashAmount: cashAmt,
        totalRevenue: roundEuro(cardAmt + cashAmt),
      });
    }
  }

  // Commit in safe chunks of 400 operations (well below Firestore's 500-op batch ceiling)
  const CHUNK_SIZE = 400;
  try {
    for (let i = 0; i < ops.length; i += CHUNK_SIZE) {
      const chunk = ops.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      for (const op of chunk) {
        if (op.kind === 'deleteOrder') {
          batch.delete(doc(db, 'orders', op.id));
        } else if (op.kind === 'deleteTeam') {
          batch.delete(doc(db, 'teams', op.id));
        } else {
          batch.update(doc(db, 'teams', op.id), {
            orderCount: op.orderCount,
            totalCardAmount: op.totalCardAmount,
            totalCashAmount: op.totalCashAmount,
            totalRevenue: op.totalRevenue,
            updatedAt: serverTimestamp(),
          });
        }
      }
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, 'orders');
  }

  return {
    deletedOrderCount: targetOrders.length,
    affectedTeamCount: affectedTeamDocIds.size,
  };
}

function sanitizeRate(value: number, fallback: number): number {
  const num = Number(value);
  if (Number.isNaN(num)) return fallback;
  return Math.min(100, Math.max(0, roundEuro(num)));
}

export function subscribeStoreSettings(
  ownerId: string,
  onData: (settings: CommissionRates) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = `settings/${ownerId}`;
  const ref = doc(db, 'settings', ownerId);
  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        onData({
          guideCashRate: DEFAULT_COMMISSION_RATES.guideCashRate,
          guideCardRate: DEFAULT_COMMISSION_RATES.guideCardRate,
          leaderCashRate: DEFAULT_COMMISSION_RATES.leaderCashRate,
          leaderCardRate: DEFAULT_COMMISSION_RATES.leaderCardRate,
        });
        return;
      }
      const data = snap.data() as Partial<StoreSettings>;
      const guideCashRate =
        typeof data.guideCashRate === 'number'
          ? sanitizeRate(data.guideCashRate, DEFAULT_COMMISSION_RATES.guideCashRate)
          : typeof data.guideRate === 'number'
            ? sanitizeRate(data.guideRate, DEFAULT_COMMISSION_RATES.guideCashRate)
            : DEFAULT_COMMISSION_RATES.guideCashRate;
      const guideCardRate =
        typeof data.guideCardRate === 'number'
          ? sanitizeRate(data.guideCardRate, DEFAULT_COMMISSION_RATES.guideCardRate)
          : DEFAULT_COMMISSION_RATES.guideCardRate;
      const leaderCashRate =
        typeof data.leaderCashRate === 'number'
          ? sanitizeRate(data.leaderCashRate, DEFAULT_COMMISSION_RATES.leaderCashRate)
          : typeof data.leaderRate === 'number'
            ? sanitizeRate(data.leaderRate, DEFAULT_COMMISSION_RATES.leaderCashRate)
            : DEFAULT_COMMISSION_RATES.leaderCashRate;
      const leaderCardRate =
        typeof data.leaderCardRate === 'number'
          ? sanitizeRate(data.leaderCardRate, DEFAULT_COMMISSION_RATES.leaderCardRate)
          : DEFAULT_COMMISSION_RATES.leaderCardRate;

      onData({
        guideCashRate,
        guideCardRate,
        leaderCashRate,
        leaderCardRate,
      });
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) {
          onError(wrapped);
        }
      }
    }
  );
}

export async function saveStoreSettings(
  ownerId: string,
  rates: CommissionRates
): Promise<void> {
  const path = `settings/${ownerId}`;
  const ref = doc(db, 'settings', ownerId);
  const guideCashRate = sanitizeRate(rates.guideCashRate, DEFAULT_COMMISSION_RATES.guideCashRate);
  const guideCardRate = sanitizeRate(rates.guideCardRate, DEFAULT_COMMISSION_RATES.guideCardRate);
  const leaderCashRate = sanitizeRate(rates.leaderCashRate, DEFAULT_COMMISSION_RATES.leaderCashRate);
  const leaderCardRate = sanitizeRate(rates.leaderCardRate, DEFAULT_COMMISSION_RATES.leaderCardRate);

  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await updateDoc(ref, {
        guideRate: guideCashRate,
        leaderRate: leaderCashRate,
        guideCashRate,
        guideCardRate,
        leaderCashRate,
        leaderCardRate,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        ownerId,
        guideRate: guideCashRate,
        leaderRate: leaderCashRate,
        guideCashRate,
        guideCardRate,
        leaderCashRate,
        leaderCardRate,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

