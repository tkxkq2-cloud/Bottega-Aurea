import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpDown,
  Check,
  ChevronDown,
  ChevronUp,
  GripVertical,
  X,
} from 'lucide-react';
import type { Product, ProductInput } from '../types/shop';
import { formatEuro, formatSingleLineName } from '../utils/format';
import { ProductForm } from './ProductForm';
import { ProductImage } from './ProductImage';

interface EditProductViewProps {
  products: Product[];
  onUpdateProduct: (productId: string, values: ProductInput) => Promise<void>;
  onDeleteProduct: (productId: string) => Promise<void>;
  onReorderProducts: (orderedProducts: Product[]) => Promise<void>;
  onBackToCatalog: () => void;
}

export const EditProductView: React.FC<EditProductViewProps> = ({
  products,
  onUpdateProduct,
  onDeleteProduct,
  onReorderProducts,
  onBackToCatalog,
}) => {
  const [selectedId, setSelectedId] = useState<string>(products[0]?.id ?? '');
  const [isReordering, setIsReordering] = useState(false);
  const [draftOrder, setDraftOrder] = useState<Product[]>([]);
  const [savingOrder, setSavingOrder] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  useEffect(() => {
    if (products.length > 0 && !products.some((p) => p.id === selectedId)) {
      setSelectedId(products[0].id);
    }
  }, [products, selectedId]);

  const selectedProduct = products.find((p) => p.id === selectedId) ?? null;

  const hasOrderChanged = useMemo(() => {
    if (draftOrder.length !== products.length) return false;
    return draftOrder.some((item, idx) => item.id !== products[idx]?.id);
  }, [draftOrder, products]);

  const openReorderMode = () => {
    setDraftOrder([...products]);
    setOrderError(null);
    setDragIndex(null);
    setDragOverIndex(null);
    setIsReordering(true);
  };

  const cancelReorderMode = () => {
    if (savingOrder) return;
    setIsReordering(false);
    setOrderError(null);
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const moveItem = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= draftOrder.length || fromIndex === toIndex) return;
    setDraftOrder((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const handleSaveOrder = async () => {
    if (savingOrder) return;
    if (!hasOrderChanged) {
      setIsReordering(false);
      return;
    }
    setSavingOrder(true);
    setOrderError(null);
    try {
      await onReorderProducts(draftOrder);
      setIsReordering(false);
    } catch (err) {
      setOrderError(
        err instanceof Error
          ? err.message
          : '진열 순서 저장 중 오류가 발생했습니다. 다시 시도해 주세요.'
      );
    } finally {
      setSavingOrder(false);
    }
  };

  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 pb-14">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <button
            type="button"
            onClick={onBackToCatalog}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#5A674C] hover:text-[#242A1F] mb-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            판매 화면으로 돌아가기
          </button>
          <h1 className="text-2xl font-bold text-[#242A1F] tracking-tight">
            {isReordering ? '상품 진열 순서 변경' : '상품 수정'}
          </h1>
          <p className="text-sm text-[#616B57] mt-0.5">
            {isReordering
              ? '위·아래 버튼이나 드래그로 판매 화면에 표시될 상품 순서를 조정한 뒤 저장하세요.'
              : '수정할 상품을 선택한 뒤 가격, 설명, 카테고리, 인기 표시 또는 이미지를 변경하세요.'}
          </p>
        </div>

        {products.length >= 2 && !isReordering && (
          <button
            type="button"
            onClick={openReorderMode}
            className="min-h-[42px] px-4 rounded-xl bg-[#EEF2E6] hover:bg-[#E2E9D6] text-[#2F3E20] border border-[#D4DEC4] text-sm font-semibold inline-flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer"
          >
            <ArrowUpDown className="w-4 h-4 text-[#465436]" />
            진열 순서 변경
          </button>
        )}

        {isReordering && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={savingOrder}
              onClick={cancelReorderMode}
              className="min-h-[42px] px-4 rounded-xl bg-white hover:bg-[#F3F5ED] text-[#3E4933] border border-[#D4DCC8] text-sm font-semibold inline-flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer disabled:opacity-50"
            >
              <X className="w-4 h-4" />
              취소
            </button>
            <button
              type="button"
              disabled={savingOrder || !hasOrderChanged}
              onClick={handleSaveOrder}
              className="min-h-[42px] px-4 rounded-xl bg-[#465436] hover:bg-[#364129] disabled:opacity-45 text-white text-sm font-semibold inline-flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              <Check className="w-4 h-4" />
              {savingOrder ? '저장 중...' : '순서 저장'}
            </button>
          </div>
        )}
      </div>

      {products.length === 0 ? (
        <div className="bg-white border border-[#DCE2D2] rounded-2xl p-12 text-center text-sm text-[#6B7462]">
          등록된 상품이 없습니다. 먼저 &lsquo;상품 등록&rsquo;에서 상품을 추가해 주세요.
        </div>
      ) : isReordering ? (
        <div className="bg-white border border-[#DCE2D2] rounded-2xl p-4 sm:p-5 space-y-3">
          {orderError && (
            <div className="px-4 py-3 rounded-xl bg-[#FDF2F2] border border-[#F1D0D0] text-xs text-[#9E3030]">
              {orderError}
            </div>
          )}

          <div className="space-y-2">
            {draftOrder.map((product, index) => {
              const originalIndex = products.findIndex((p) => p.id === product.id);
              const moved = originalIndex !== index;
              const isDragOver = dragOverIndex === index && dragIndex !== null && dragIndex !== index;

              return (
                <div
                  key={product.id}
                  draggable={!savingOrder}
                  onDragStart={() => setDragIndex(index)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (dragOverIndex !== index) setDragOverIndex(index);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragIndex !== null && dragIndex !== index) {
                      moveItem(dragIndex, index);
                    }
                    setDragIndex(null);
                    setDragOverIndex(null);
                  }}
                  onDragEnd={() => {
                    setDragIndex(null);
                    setDragOverIndex(null);
                  }}
                  className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition-all ${
                    isDragOver
                      ? 'border-[#465436] bg-[#EEF2E6] ring-2 ring-[#465436]/20'
                      : moved
                        ? 'border-[#C4D1B1] bg-[#F7F9F2]'
                        : 'border-[#E4E8DB] bg-[#FAFBF7]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="hidden sm:flex items-center justify-center text-[#939E86] cursor-grab active:cursor-grabbing">
                      <GripVertical className="w-4 h-4" />
                    </div>

                    <span
                      className={`w-7 h-7 rounded-lg text-xs font-bold font-sans-num flex items-center justify-center shrink-0 ${
                        moved
                          ? 'bg-[#465436] text-white'
                          : 'bg-[#E9EDE0] text-[#3F4B32]'
                      }`}
                    >
                      {index + 1}
                    </span>

                    <div className="w-10 h-12 rounded-lg overflow-hidden border border-black/10 shrink-0 bg-white">
                      <ProductImage
                        src={product.imageUrl}
                        alt={product.name}
                        category={product.category}
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-[#242A1F] truncate">
                          {formatSingleLineName(product.name)}
                        </p>
                        {product.volume?.trim() && (
                          <span className="text-xs font-medium text-[#6B7462] font-sans-num shrink-0">
                            {product.volume.trim()}
                          </span>
                        )}
                        {product.isPopular && (
                          <span className="px-1.5 py-0.5 rounded bg-[#B68B40] text-[#FFFDF8] text-[10px] font-semibold leading-none shrink-0">
                            인기 상품
                          </span>
                        )}
                        {moved && (
                          <span className="text-[11px] font-semibold text-[#465436] shrink-0">
                            이동됨
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#6B7462] font-sans-num mt-0.5">
                        {product.category === 'food' ? '식품' : '뷰티'} · {formatEuro(product.price)}
                      </p>
                    </div>
                  </div>

                  {/* Touch-Friendly Up / Down Reorder Buttons */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      disabled={savingOrder || index === 0}
                      onClick={() => moveItem(index, index - 1)}
                      aria-label={`${product.name} 위로 이동`}
                      className="min-w-[40px] min-h-[40px] rounded-xl bg-white hover:bg-[#EEF2E6] disabled:opacity-35 border border-[#D4DCC8] text-[#354426] flex items-center justify-center transition-colors cursor-pointer disabled:cursor-not-allowed"
                    >
                      <ChevronUp className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      disabled={savingOrder || index === draftOrder.length - 1}
                      onClick={() => moveItem(index, index + 1)}
                      aria-label={`${product.name} 아래로 이동`}
                      className="min-w-[40px] min-h-[40px] rounded-xl bg-white hover:bg-[#EEF2E6] disabled:opacity-35 border border-[#D4DCC8] text-[#354426] flex items-center justify-center transition-colors cursor-pointer disabled:cursor-not-allowed"
                    >
                      <ChevronDown className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-[#ECEEE6] flex items-center justify-end gap-2">
            <button
              type="button"
              disabled={savingOrder}
              onClick={cancelReorderMode}
              className="min-h-[44px] px-4 rounded-xl bg-white hover:bg-[#F3F5ED] text-[#3E4933] border border-[#D4DCC8] text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
              취소
            </button>
            <button
              type="button"
              disabled={savingOrder || !hasOrderChanged}
              onClick={handleSaveOrder}
              className="min-h-[44px] px-5 rounded-xl bg-[#465436] hover:bg-[#364129] disabled:opacity-45 text-white text-sm font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              <Check className="w-4 h-4" />
              {savingOrder ? '저장 중...' : '순서 저장'}
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Horizontal Product Picker */}
          <div className="mb-6">
            <p className="text-xs font-semibold text-[#5B664E] mb-2">
              수정할 상품 선택 ({products.length})
            </p>
            <div className="flex gap-2.5 overflow-x-auto pt-2.5 pb-1.5">
              {products.map((product, idx) => {
                const active = product.id === selectedId;
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => setSelectedId(product.id)}
                    className={`relative shrink-0 flex items-center gap-2.5 px-3 py-2 rounded-xl border text-left transition-all cursor-pointer ${
                      active
                        ? 'bg-[#465436] text-white border-[#465436] shadow-sm'
                        : 'bg-white text-[#242A1F] border-[#DCE2D2] hover:bg-[#F3F5ED]'
                    }`}
                  >
                    {product.isPopular && (
                      <span className="absolute -top-2 right-2.5 bg-[#B68B40] text-[#FFFDF8] px-1.5 py-0.5 rounded text-[10px] font-semibold leading-none shadow-xs">
                        인기 상품
                      </span>
                    )}
                    <div className="w-8 h-10 rounded-md overflow-hidden border border-black/10 shrink-0 bg-white">
                      <ProductImage
                        src={product.imageUrl}
                        alt={product.name}
                        category={product.category}
                      />
                    </div>
                    <div className="pr-1">
                      <p className="text-xs font-bold whitespace-nowrap">
                        <span
                          className={`mr-1 font-sans-num ${
                            active ? 'text-[#DCE3D2]' : 'text-[#7C8770]'
                          }`}
                        >
                          {idx + 1}.
                        </span>
                        {formatSingleLineName(product.name)}
                      </p>
                      <p
                        className={`text-[11px] font-sans-num ${
                          active ? 'text-[#DCE3D2]' : 'text-[#6B7462]'
                        }`}
                      >
                        {formatEuro(product.price)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedProduct && (
            <ProductForm
              key={selectedProduct.id}
              initialValues={{
                name: selectedProduct.name,
                volume: selectedProduct.volume,
                category: selectedProduct.category,
                price: selectedProduct.price,
                stock: selectedProduct.stock,
                description: selectedProduct.description,
                isPopular: selectedProduct.isPopular,
                imageUrl: selectedProduct.imageUrl,
                displayOrder: selectedProduct.displayOrder,
                bundleEnabled: selectedProduct.bundleEnabled,
                bundleQuantity: selectedProduct.bundleQuantity,
                bundlePrice: selectedProduct.bundlePrice,
              }}
              submitLabel="변경 사항 저장"
              onSubmit={(values) => onUpdateProduct(selectedProduct.id, values)}
              onDelete={() => onDeleteProduct(selectedProduct.id)}
            />
          )}
        </>
      )}
    </section>
  );
};
