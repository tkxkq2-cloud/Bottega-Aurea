import React, { useMemo, useState } from 'react';
import { Minus, Plus, RotateCcw } from 'lucide-react';
import type { Product, ProductCategory } from '../types/shop';
import {
  calculateProductLinePricing,
  formatEuro,
  formatSingleLineName,
  hasActiveBundlePricing,
} from '../utils/format';
import { ProductImage } from './ProductImage';

interface CatalogViewProps {
  products: Product[];
  cart: Record<string, number>;
  onUpdateCartQuantity: (productId: string, nextQty: number) => void;
  onClearCart: () => void;
  activeTeamCode: string;
}

type CategoryFilter = 'all' | ProductCategory;

export const CatalogView: React.FC<CatalogViewProps> = ({
  products,
  cart,
  onUpdateCartQuantity,
  onClearCart,
  activeTeamCode,
}) => {
  const [filter, setFilter] = useState<CategoryFilter>('all');

  const filteredProducts = useMemo(() => {
    if (filter === 'all') return products;
    return products.filter((p) => p.category === filter);
  }, [products, filter]);

  const totalCartCount = useMemo(
    () => Object.values(cart).reduce((sum, q) => sum + q, 0),
    [cart]
  );

  const foodCount = useMemo(() => products.filter((p) => p.category === 'food').length, [products]);
  const beautyCount = useMemo(
    () => products.filter((p) => p.category === 'beauty').length,
    [products]
  );

  return (
    <section className="max-w-6xl mx-auto px-3.5 sm:px-6 pt-5 pb-12">
      {/* Subtle Filter & Session Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div
          role="tablist"
          aria-label="상품 카테고리 필터"
          className="inline-flex items-center p-1 rounded-xl bg-[#EFEFE6] border border-[#E2E4D9]"
        >
          {(
            [
              { id: 'all', label: `전체 ${products.length}` },
              { id: 'food', label: `식품 ${foodCount}` },
              { id: 'beauty', label: `뷰티 ${beautyCount}` },
            ] as const
          ).map((tab) => {
            const active = filter === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                type="button"
                aria-selected={active}
                onClick={() => setFilter(tab.id)}
                className={`min-h-[38px] px-4 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all cursor-pointer ${
                  active
                    ? 'bg-white text-[#242A1F] shadow-xs font-semibold'
                    : 'text-[#5E6755] hover:text-[#242A1F]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3 text-xs text-[#5E6755]">
          {activeTeamCode && (
            <span className="font-medium text-[#465436]">
              진행 팀 <strong className="font-sans-num tracking-wide">{activeTeamCode}</strong>
            </span>
          )}
          {totalCartCount > 0 && (
            <button
              type="button"
              onClick={onClearCart}
              className="inline-flex items-center gap-1 text-xs font-medium text-[#7A4B3A] hover:text-[#5B3527] min-h-[36px] px-2.5 rounded-lg hover:bg-[#F3EAE5] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              선택 초기화
            </button>
          )}
        </div>
      </div>

      {/* Product Grid — Portrait Tablet 2-Column Core Layout */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white border border-[#E2E5D9] rounded-2xl p-12 text-center">
          <p className="text-base font-medium text-[#2F3629] mb-1">표시할 상품이 없습니다</p>
          <p className="text-sm text-[#6C7563]">
            좌측 메뉴의 &lsquo;상품 등록&rsquo;에서 기념품을 추가해 주세요.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
          {filteredProducts.map((product) => {
            const qty = cart[product.id] ?? 0;
            const pricing = calculateProductLinePricing(product, qty);
            const lineSubtotal = pricing.lineTotal;
            const hasBundle = hasActiveBundlePricing(product);
            const isFood = product.category === 'food';
            const isOutOfStock = product.stock <= 0;
            const maxReached = qty >= product.stock;

            return (
              <article
                key={product.id}
                className={`relative rounded-2xl border p-3.5 sm:p-4 transition-all duration-150 flex gap-3.5 sm:gap-4 ${
                  isFood
                    ? 'bg-[#F3F5ED] border-[#D8DFCE]'
                    : 'bg-[#F0F5FA] border-[#D0DFEC]'
                } ${
                  qty > 0
                    ? isFood
                      ? 'ring-2 ring-[#465436]/55 shadow-sm'
                      : 'ring-2 ring-[#3B5874]/55 shadow-sm'
                    : 'hover:shadow-sm'
                } ${isOutOfStock ? 'opacity-75' : ''}`}
              >
                {/* Tasteful Champagne-Gold Popular Marker */}
                {product.isPopular && (
                  <div
                    aria-label="인기 상품"
                    className="absolute -top-2.5 right-3.5 bg-[#B68B40] text-[#FFFDF8] px-2.5 py-0.5 rounded-md text-[11px] font-semibold tracking-tight shadow-xs"
                  >
                    인기 상품
                  </div>
                )}

                {/* Left Column: Studio Image + Quantity Stepper & Subtotal Dock */}
                <div className="w-[38%] shrink-0 flex flex-col justify-between gap-2.5">
                  <div
                    className={`relative aspect-[3/4] w-full rounded-xl overflow-hidden border bg-white ${
                      isFood ? 'border-[#D4DCC8]' : 'border-[#C8D9EA]'
                    }`}
                  >
                    <ProductImage
                      src={product.imageUrl}
                      alt={product.name}
                      category={product.category}
                    />
                    {isOutOfStock && (
                      <div className="absolute inset-0 bg-[#1F241A]/55 flex items-center justify-center">
                        <span className="text-xs font-semibold text-white tracking-wide px-2.5 py-1 bg-[#1F241A]/80 rounded-md">
                          품절
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Quantity & Subtotal Control Dock (Aligned under Photo) */}
                  <div
                    className={`w-full rounded-xl p-1.5 ${
                      isFood ? 'bg-[#4A5A39]' : 'bg-[#3B5874]'
                    }`}
                  >
                    {/* Stepper Row */}
                    <div className="flex items-center justify-between gap-1">
                      <button
                        type="button"
                        disabled={qty <= 0}
                        onClick={() => onUpdateCartQuantity(product.id, qty - 1)}
                        aria-label={`${formatSingleLineName(product.name)} 수량 감소`}
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/15 hover:bg-white/25 active:bg-white/30 disabled:opacity-35 text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer disabled:cursor-not-allowed"
                      >
                        <Minus className="w-3.5 h-3.5" strokeWidth={2.5} />
                      </button>

                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={product.stock}
                        disabled={isOutOfStock}
                        aria-label={`${formatSingleLineName(product.name)} 수량`}
                        value={qty}
                        onChange={(e) => {
                          const parsed = parseInt(e.target.value, 10);
                          const safeVal = Number.isNaN(parsed)
                            ? 0
                            : Math.max(0, Math.min(product.stock, parsed));
                          onUpdateCartQuantity(product.id, safeVal);
                        }}
                        className="w-full min-w-[28px] h-7 sm:h-8 rounded-md bg-white text-center text-[13px] font-bold font-sans-num text-[#242A1F] focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />

                      <button
                        type="button"
                        disabled={isOutOfStock || maxReached}
                        onClick={() => onUpdateCartQuantity(product.id, qty + 1)}
                        aria-label={`${formatSingleLineName(product.name)} 수량 증가`}
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/15 hover:bg-white/25 active:bg-white/30 disabled:opacity-35 text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer disabled:cursor-not-allowed"
                      >
                        <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                      </button>
                    </div>

                    {/* Line Subtotal Row */}
                    <div className="mt-1 px-1.5 py-0.5 flex items-center justify-between text-white font-sans-num">
                      <span className="text-[11px] font-medium opacity-85 flex items-center gap-1">
                        <span>€</span>
                        {pricing.bundleApplied && (
                          <span className="text-[10px] font-semibold text-[#F0DBA8]">
                            묶음가
                          </span>
                        )}
                      </span>
                      <span className="text-[13px] font-bold tracking-tight">
                        {lineSubtotal.toLocaleString('en-US', {
                          minimumFractionDigits: Number.isInteger(lineSubtotal) ? 0 : 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Column: Title, Volume, Full Description & Bottom-Right Price/Category */}
                <div className="flex-1 min-w-0 flex flex-col justify-between pt-0.5">
                  <div>
                    <h2
                      className={`text-[15.5px] sm:text-[17px] font-bold tracking-tight leading-snug pr-3 break-keep whitespace-pre-line ${
                        product.volume?.trim() ? 'mb-0.5' : 'mb-1.5'
                      } ${isFood ? 'text-[#242B1D]' : 'text-[#1D3044]'}`}
                    >
                      {product.name}
                    </h2>
                    {product.volume?.trim() && (
                      <p
                        className={`text-[12.5px] sm:text-[13px] font-semibold font-sans-num leading-snug mb-1.5 ${
                          isFood ? 'text-[#5A6A47]' : 'text-[#496783]'
                        }`}
                      >
                        {product.volume.trim()}
                      </p>
                    )}
                    <p
                      className={`text-[13px] sm:text-[13.5px] leading-[1.52] break-keep whitespace-pre-line ${
                        isFood ? 'text-[#4C5543]' : 'text-[#455B70]'
                      }`}
                    >
                      {product.description || '정성껏 엄선한 부티크 시그니처 기념품입니다.'}
                    </p>
                  </div>

                  {/* Bottom-Right Price, Bundle Hint & Category Strip */}
                  <div className="mt-3 pt-1 flex flex-col items-end">
                    {hasBundle && product.bundleQuantity && product.bundlePrice !== undefined && (
                      <p
                        className={`mb-0.5 text-[11px] font-semibold font-sans-num leading-tight ${
                          isFood ? 'text-[#876222]' : 'text-[#3B5874]'
                        }`}
                      >
                        {product.bundleQuantity}개 {formatEuro(product.bundlePrice)}
                      </p>
                    )}
                    <div className="flex items-baseline justify-end gap-2">
                      <span
                        className={`text-xl sm:text-[22px] font-bold font-sans-num tracking-tight leading-none ${
                          isFood ? 'text-[#242B1D]' : 'text-[#1D3044]'
                        }`}
                      >
                        {formatEuro(product.price)}
                      </span>
                      <span
                        className={`text-xs sm:text-[13px] font-semibold leading-none ${
                          isFood ? 'text-[#5A6C46]' : 'text-[#4B6C8B]'
                        }`}
                      >
                        {isFood ? '식품' : '뷰티'}
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};
