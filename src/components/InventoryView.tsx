import React, { useMemo, useState } from 'react';
import { ArrowLeft, Check, Minus, Plus, Search } from 'lucide-react';
import type { Product, ProductCategory } from '../types/shop';
import { formatEuro } from '../utils/format';
import { ProductImage } from './ProductImage';

interface InventoryViewProps {
  products: Product[];
  onUpdateStock: (productId: string, newStock: number) => Promise<void>;
  onBackToCatalog: () => void;
}

type InventoryFilter = 'all' | ProductCategory | 'low';

export const InventoryView: React.FC<InventoryViewProps> = ({
  products,
  onUpdateStock,
  onBackToCatalog,
}) => {
  const [filter, setFilter] = useState<InventoryFilter>('all');
  const [search, setSearch] = useState('');
  const [draftStocks, setDraftStocks] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const summary = useMemo(() => {
    let totalUnits = 0;
    let lowCount = 0;
    let outCount = 0;
    for (const p of products) {
      totalUnits += p.stock;
      if (p.stock === 0) outCount += 1;
      else if (p.stock <= 5) lowCount += 1;
    }
    return { totalProducts: products.length, totalUnits, lowCount, outCount };
  }, [products]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (filter === 'food' && p.category !== 'food') return false;
      if (filter === 'beauty' && p.category !== 'beauty') return false;
      if (filter === 'low' && p.stock > 5) return false;
      if (q && !p.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [products, filter, search]);

  const applyStock = async (productId: string, nextStock: number) => {
    setSavingId(productId);
    try {
      await onUpdateStock(productId, Math.max(0, Math.floor(nextStock)));
      setDraftStocks((prev) => {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 pb-14">
      <div className="mb-6">
        <button
          type="button"
          onClick={onBackToCatalog}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#5A674C] hover:text-[#242A1F] mb-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          판매 화면으로 돌아가기
        </button>
        <h1 className="text-2xl font-bold text-[#242A1F] tracking-tight">재고 관리</h1>
        <p className="text-sm text-[#616B57] mt-0.5">
          수량을 조정하면 매장 내 연결된 모든 태블릿에 실시간으로 반영됩니다.
        </p>
      </div>

      {/* 4-Column KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white border border-[#DCE2D2] rounded-2xl p-4">
          <p className="text-xs text-[#646E5A]">등록 상품</p>
          <p className="text-2xl font-bold font-sans-num text-[#242A1F] mt-1">
            {summary.totalProducts}종
          </p>
        </div>
        <div className="bg-white border border-[#DCE2D2] rounded-2xl p-4">
          <p className="text-xs text-[#646E5A]">전체 보유 수량</p>
          <p className="text-2xl font-bold font-sans-num text-[#465436] mt-1">
            {summary.totalUnits.toLocaleString()}개
          </p>
        </div>
        <div className="bg-white border border-[#DCE2D2] rounded-2xl p-4">
          <p className="text-xs text-[#646E5A]">재고 부족 (5개 이하)</p>
          <p className="text-2xl font-bold font-sans-num text-[#A85B2A] mt-1">
            {summary.lowCount}종
          </p>
        </div>
        <div className="bg-white border border-[#DCE2D2] rounded-2xl p-4">
          <p className="text-xs text-[#646E5A]">품절 상품</p>
          <p className="text-2xl font-bold font-sans-num text-[#9E3C2F] mt-1">
            {summary.outCount}종
          </p>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="inline-flex items-center p-1 rounded-xl bg-[#EFEFE6] border border-[#E2E4D9]">
          {(
            [
              { id: 'all', label: '전체' },
              { id: 'food', label: '식품' },
              { id: 'beauty', label: '뷰티' },
              { id: 'low', label: `부족/품절 (${summary.lowCount + summary.outCount})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`min-h-[38px] px-3.5 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-colors cursor-pointer ${
                filter === tab.id
                  ? 'bg-white text-[#242A1F] shadow-xs font-semibold'
                  : 'text-[#5E6755] hover:text-[#242A1F]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="상품명 검색"
            className="w-full h-[42px] pl-4 pr-9 rounded-xl bg-white border border-[#D4DCC8] text-sm text-[#242A1F] focus:outline-none focus:ring-2 focus:ring-[#465436]"
          />
          <Search className="w-4 h-4 text-[#7D8772] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Inventory Rows */}
      <div className="bg-white border border-[#DCE2D2] rounded-2xl divide-y divide-[#EFEFE7] overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-[#6B7462]">
            조건에 맞는 상품이 없습니다.
          </div>
        ) : (
          filtered.map((product) => {
            const draftVal = draftStocks[product.id];
            const displayVal = draftVal !== undefined ? draftVal : String(product.stock);
            const hasDraftChange =
              draftVal !== undefined && parseInt(draftVal, 10) !== product.stock;
            const isSaving = savingId === product.id;

            return (
              <div
                key={product.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#FAFBF7] transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-12 h-16 rounded-xl overflow-hidden border border-[#E2E6D9] shrink-0">
                    <ProductImage
                      src={product.imageUrl}
                      alt={product.name}
                      category={product.category}
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-[#242A1F] truncate">
                        {product.name}
                      </h3>
                      <span className="text-xs text-[#6B7462]">
                        {product.category === 'food' ? '식품' : '뷰티'}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs font-sans-num">
                      <span className="font-semibold text-[#465436]">
                        {formatEuro(product.price)}
                      </span>
                      <span className="text-[#BCC4B3]">·</span>
                      {product.stock === 0 ? (
                        <span className="font-semibold text-[#9E3C2F]">품절 (입고 필요)</span>
                      ) : product.stock <= 5 ? (
                        <span className="font-semibold text-[#A85B2A]">
                          재고 부족 ({product.stock}개)
                        </span>
                      ) : (
                        <span className="text-[#5C6652]">정상 ({product.stock}개)</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Touch-Friendly Stock Controls */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={isSaving || product.stock <= 0}
                    onClick={() => applyStock(product.id, product.stock - 1)}
                    aria-label={`${product.name} 재고 1 감소`}
                    className="min-w-[42px] min-h-[42px] rounded-xl bg-[#F2F4EC] hover:bg-[#E4E9D9] disabled:opacity-35 text-[#2E3823] flex items-center justify-center transition-colors cursor-pointer disabled:cursor-not-allowed"
                  >
                    <Minus className="w-4 h-4" />
                  </button>

                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    aria-label={`${product.name} 재고 수량 입력`}
                    value={displayVal}
                    onChange={(e) =>
                      setDraftStocks((prev) => ({ ...prev, [product.id]: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && hasDraftChange) {
                        const parsed = parseInt(displayVal, 10);
                        if (!Number.isNaN(parsed)) {
                          applyStock(product.id, parsed);
                        }
                      }
                    }}
                    className="w-20 h-[42px] rounded-xl bg-[#FAF9F5] border border-[#D4DCC8] text-center text-sm font-bold font-sans-num text-[#242A1F] focus:outline-none focus:ring-2 focus:ring-[#465436]"
                  />

                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => applyStock(product.id, product.stock + 1)}
                    aria-label={`${product.name} 재고 1 증가`}
                    className="min-w-[42px] min-h-[42px] rounded-xl bg-[#F2F4EC] hover:bg-[#E4E9D9] disabled:opacity-35 text-[#2E3823] flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => applyStock(product.id, product.stock + 10)}
                    className="min-h-[42px] px-3 rounded-xl bg-[#E8EDE0] hover:bg-[#DCE4D0] text-[#354326] text-xs font-semibold font-sans-num transition-colors cursor-pointer"
                  >
                    +10 입고
                  </button>

                  {hasDraftChange && (
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => {
                        const parsed = parseInt(displayVal, 10);
                        if (!Number.isNaN(parsed)) {
                          applyStock(product.id, parsed);
                        }
                      }}
                      className="min-h-[42px] px-3.5 rounded-xl bg-[#465436] hover:bg-[#364129] text-white text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      저장
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};
