import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { AuthGate } from './components/AuthGate';
import { CatalogView } from './components/CatalogView';
import { CheckoutModal } from './components/CheckoutModal';
import { CommissionView } from './components/CommissionView';
import { EditProductView } from './components/EditProductView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { InventoryView } from './components/InventoryView';
import { RegisterProductView } from './components/RegisterProductView';
import { SidebarDrawer } from './components/SidebarDrawer';
import { TeamLookupView } from './components/TeamLookupView';
import { TopBar } from './components/TopBar';
import { auth } from './firebase';
import {
  createProduct,
  deleteProduct,
  deleteSalesRecords,
  processCheckoutTransaction,
  saveStoreSettings,
  seedInitialProductsIfEmpty,
  subscribeOrders,
  subscribeProducts,
  subscribeStoreSettings,
  subscribeTeams,
  updateProduct,
  updateProductStock,
} from './services/shopService';
import {
  DEFAULT_COMMISSION_RATES,
  type AppView,
  type CheckoutReceipt,
  type Order,
  type PaymentMethod,
  type Product,
  type ProductInput,
  type TeamSummary,
} from './types/shop';
import { roundEuro, sanitizeTeamCode } from './utils/format';

function ShopApp() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [commissionRates, setCommissionRates] = useState<{
    guideRate: number;
    leaderRate: number;
  }>({
    guideRate: DEFAULT_COMMISSION_RATES.guideRate,
    leaderRate: DEFAULT_COMMISSION_RATES.leaderRate,
  });
  const [dataLoading, setDataLoading] = useState(true);
  const [runtimeError, setRuntimeError] = useState<Error | null>(null);

  const [activeView, setActiveView] = useState<AppView>('catalog');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  const [teamCode, setTeamCode] = useState('');
  const [lookupTeamCode, setLookupTeamCode] = useState('');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 2600);
  }, []);

  // Re-throw fatal Firestore subscription errors to ErrorBoundary
  if (runtimeError) {
    throw runtimeError;
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthReady(true);
      if (!firebaseUser) {
        setProducts([]);
        setTeams([]);
        setOrders([]);
        setCart({});
        setDataLoading(false);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!authReady || !user) return;
    let active = true;
    setDataLoading(true);

    // Seed the 8 initial souvenir products on first store launch if empty
    seedInitialProductsIfEmpty(user.uid)
      .then((seeded) => {
        if (seeded && active) {
          showToast('기본 기념품 8종이 클라우드에 자동 등록되었습니다.');
        }
      })
      .catch((err) => {
        if (active && err instanceof Error) {
          setRuntimeError(err);
        }
      });

    const unsubProducts = subscribeProducts(
      user.uid,
      (items) => {
        if (!active) return;
        setProducts(items);
        setDataLoading(false);
      },
      (err) => active && setRuntimeError(err)
    );

    const unsubTeams = subscribeTeams(
      user.uid,
      (items) => {
        if (!active) return;
        setTeams(items);
      },
      (err) => active && setRuntimeError(err)
    );

    const unsubOrders = subscribeOrders(
      user.uid,
      (items) => {
        if (!active) return;
        setOrders(items);
      },
      (err) => active && setRuntimeError(err)
    );

    const unsubSettings = subscribeStoreSettings(
      user.uid,
      (rates) => {
        if (!active) return;
        setCommissionRates(rates);
      },
      (err) => active && setRuntimeError(err)
    );

    return () => {
      active = false;
      unsubProducts();
      unsubTeams();
      unsubOrders();
      unsubSettings();
    };
  }, [authReady, user, showToast]);

  // Clamp cart quantities whenever live Firestore stock updates from another tablet
  useEffect(() => {
    setCart((prev) => {
      let changed = false;
      const next: Record<string, number> = {};
      for (const [productId, qty] of Object.entries(prev)) {
        const product = products.find((p) => p.id === productId);
        if (!product || product.stock <= 0) {
          if (qty > 0) changed = true;
          continue;
        }
        const clamped = Math.min(qty, product.stock);
        if (clamped !== qty) changed = true;
        if (clamped > 0) next[productId] = clamped;
      }
      return changed ? next : prev;
    });
  }, [products]);

  const handleUpdateCartQuantity = useCallback(
    (productId: string, nextQty: number) => {
      const product = products.find((p) => p.id === productId);
      if (!product) return;
      const clamped = Math.max(0, Math.min(product.stock, Math.floor(nextQty)));
      setCart((prev) => {
        const copy = { ...prev };
        if (clamped <= 0) {
          delete copy[productId];
        } else {
          copy[productId] = clamped;
        }
        return copy;
      });
    },
    [products]
  );

  const handleClearCart = useCallback(() => {
    setCart({});
    showToast('장바구니 선택을 초기화했습니다.');
  }, [showToast]);

  const { totalCartItems, cardTotal } = useMemo(() => {
    let count = 0;
    let total = 0;
    for (const product of products) {
      const qty = cart[product.id] ?? 0;
      if (qty > 0) {
        count += qty;
        total = roundEuro(total + product.price * qty);
      }
    }
    return { totalCartItems: count, cardTotal: total };
  }, [products, cart]);

  const lowStockCount = useMemo(
    () => products.filter((p) => p.stock <= 5).length,
    [products]
  );

  const nextDisplayOrder = useMemo(() => {
    if (products.length === 0) return 1;
    return Math.max(...products.map((p) => p.displayOrder || 0)) + 1;
  }, [products]);

  const handleClearTeamCode = useCallback(() => {
    if (!teamCode) return;
    setTeamCode('');
    showToast('팀 코드를 초기화했습니다.');
  }, [teamCode, showToast]);

  const handleConfirmCheckout = async ({
    teamCode: checkoutTeamCode,
    paymentMethod,
  }: {
    teamCode: string;
    paymentMethod: PaymentMethod;
  }): Promise<CheckoutReceipt> => {
    if (!user) throw new Error('로그인이 필요합니다.');
    const cartEntries = Object.entries(cart)
      .filter(([, qty]) => qty > 0)
      .map(([productId, quantity]) => ({ productId, quantity }));

    const receipt = await processCheckoutTransaction({
      ownerId: user.uid,
      teamCode: checkoutTeamCode,
      paymentMethod,
      cartEntries,
    });
    setCart({});
    setLookupTeamCode(receipt.teamCode);
    showToast(`팀 ${receipt.teamCode} · 결제 #${receipt.orderNumber} 완료`);
    return receipt;
  };

  const handleCreateProduct = async (values: ProductInput) => {
    if (!user) return;
    await createProduct(user.uid, values);
    showToast(`"${values.name}" 상품이 등록되었습니다.`);
    setActiveView('catalog');
  };

  const handleUpdateProduct = async (productId: string, values: ProductInput) => {
    await updateProduct(productId, values);
    showToast(`"${values.name}" 상품 정보가 수정되었습니다.`);
  };

  const handleDeleteProduct = async (productId: string) => {
    const target = products.find((p) => p.id === productId);
    await deleteProduct(productId);
    showToast(`"${target?.name ?? '상품'}"이(가) 삭제되었습니다.`);
  };

  const handleUpdateStock = async (productId: string, newStock: number) => {
    await updateProductStock(productId, newStock);
    showToast('재고 수량이 실시간 반영되었습니다.');
  };

  const handleDeleteSalesRecords = async (targetOrders: Order[], label: string) => {
    const result = await deleteSalesRecords({
      targetOrders,
      allOrders: orders,
      teams,
    });
    showToast(`${label} 기록 ${result.deletedOrderCount}건을 삭제했습니다. (재고 유지)`);
  };

  const handleSaveCommissionRates = async (rates: { guideRate: number; leaderRate: number }) => {
    if (!user) return;
    await saveStoreSettings(user.uid, rates);
    showToast(
      `커미션 비율을 저장했습니다. (가이드 ${rates.guideRate}% · 인솔자 ${rates.leaderRate}%)`
    );
  };

  const handleSignOut = async () => {
    setIsSidebarOpen(false);
    await signOut(auth);
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-[#465436]">
          <Loader2 className="w-7 h-7 animate-spin" />
          <p className="text-sm font-medium">매장 환경 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthGate />;
  }

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-[#242A1F] flex flex-col">
      <TopBar
        teamCode={teamCode}
        onTeamCodeChange={setTeamCode}
        onClearTeamCode={handleClearTeamCode}
        onToggleSidebar={() => setIsSidebarOpen((open) => !open)}
        totalCartItems={totalCartItems}
        cardTotal={cardTotal}
        onOpenCheckout={() => setIsCheckoutOpen(true)}
      />

      <SidebarDrawer
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        activeView={activeView}
        onSelectView={(view) => {
          if (view === 'teamLookup' && !lookupTeamCode && teamCode) {
            setLookupTeamCode(sanitizeTeamCode(teamCode));
          }
          setActiveView(view);
        }}
        lowStockCount={lowStockCount}
        teamCount={teams.length}
        user={user}
        onSignOut={handleSignOut}
      />

      <main className="flex-1">
        {dataLoading ? (
          <div className="max-w-6xl mx-auto px-6 py-24 flex flex-col items-center justify-center gap-3 text-[#58644B]">
            <Loader2 className="w-7 h-7 animate-spin text-[#465436]" />
            <p className="text-sm font-medium">상품 및 실시간 재고 동기화 중...</p>
          </div>
        ) : (
          <>
            {activeView === 'catalog' && (
              <CatalogView
                products={products}
                cart={cart}
                onUpdateCartQuantity={handleUpdateCartQuantity}
                onClearCart={handleClearCart}
                activeTeamCode={sanitizeTeamCode(teamCode)}
              />
            )}

            {activeView === 'teamLookup' && (
              <TeamLookupView
                teams={teams}
                orders={orders}
                guideRate={commissionRates.guideRate}
                leaderRate={commissionRates.leaderRate}
                selectedTeamCode={lookupTeamCode}
                onSelectTeamCode={(code) => {
                  setLookupTeamCode(code);
                  if (code) setTeamCode(code);
                }}
                onDeleteSalesRecords={handleDeleteSalesRecords}
                onNotify={showToast}
                onBackToCatalog={() => setActiveView('catalog')}
              />
            )}

            {activeView === 'commission' && (
              <CommissionView
                guideRate={commissionRates.guideRate}
                leaderRate={commissionRates.leaderRate}
                orders={orders}
                onSaveRates={handleSaveCommissionRates}
                onOpenTeamLookup={(code) => {
                  setLookupTeamCode(code);
                  setActiveView('teamLookup');
                }}
                onBackToCatalog={() => setActiveView('catalog')}
              />
            )}

            {activeView === 'inventory' && (
              <InventoryView
                products={products}
                onUpdateStock={handleUpdateStock}
                onBackToCatalog={() => setActiveView('catalog')}
              />
            )}

            {activeView === 'editProduct' && (
              <EditProductView
                products={products}
                onUpdateProduct={handleUpdateProduct}
                onDeleteProduct={handleDeleteProduct}
                onBackToCatalog={() => setActiveView('catalog')}
              />
            )}

            {activeView === 'registerProduct' && (
              <RegisterProductView
                nextDisplayOrder={nextDisplayOrder}
                onCreateProduct={handleCreateProduct}
                onBackToCatalog={() => setActiveView('catalog')}
              />
            )}
          </>
        )}
      </main>

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        products={products}
        cart={cart}
        teamCode={teamCode}
        recentTeams={teams}
        onTeamCodeChange={setTeamCode}
        onUpdateCartQuantity={handleUpdateCartQuantity}
        onConfirmCheckout={handleConfirmCheckout}
      />

      {/* Subtle Bottom Completion Toast */}
      <div
        aria-live="polite"
        className={`fixed bottom-5 left-1/2 -translate-x-1/2 z-50 transition-all duration-200 pointer-events-none ${
          toastMessage ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
        }`}
      >
        {toastMessage && (
          <div className="px-4 py-2.5 rounded-full bg-[#242A1F] text-[#FDFCF9] text-xs sm:text-sm font-medium shadow-lg flex items-center gap-2 whitespace-nowrap">
            <CheckCircle2 className="w-4 h-4 text-[#C9A66B] shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ShopApp />
    </ErrorBoundary>
  );
}
