import React, { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import type { Product, ProductInput } from '../types/shop';
import { formatEuro } from '../utils/format';
import { ProductForm } from './ProductForm';
import { ProductImage } from './ProductImage';

interface EditProductViewProps {
  products: Product[];
  onUpdateProduct: (productId: string, values: ProductInput) => Promise<void>;
  onDeleteProduct: (productId: string) => Promise<void>;
  onBackToCatalog: () => void;
}

export const EditProductView: React.FC<EditProductViewProps> = ({
  products,
  onUpdateProduct,
  onDeleteProduct,
  onBackToCatalog,
}) => {
  const [selectedId, setSelectedId] = useState<string>(products[0]?.id ?? '');

  useEffect(() => {
    if (products.length > 0 && !products.some((p) => p.id === selectedId)) {
      setSelectedId(products[0].id);
    }
  }, [products, selectedId]);

  const selectedProduct = products.find((p) => p.id === selectedId) ?? null;

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
        <h1 className="text-2xl font-bold text-[#242A1F] tracking-tight">상품 수정</h1>
        <p className="text-sm text-[#616B57] mt-0.5">
          수정할 상품을 선택한 뒤 가격, 설명, 카테고리, 인기 표시 또는 이미지를 변경하세요.
        </p>
      </div>

      {products.length === 0 ? (
        <div className="bg-white border border-[#DCE2D2] rounded-2xl p-12 text-center text-sm text-[#6B7462]">
          등록된 상품이 없습니다. 먼저 &lsquo;상품 등록&rsquo;에서 상품을 추가해 주세요.
        </div>
      ) : (
        <>
          {/* Horizontal Product Picker */}
          <div className="mb-6">
            <p className="text-xs font-semibold text-[#5B664E] mb-2">
              수정할 상품 선택 ({products.length})
            </p>
            <div className="flex gap-2.5 overflow-x-auto pb-1.5">
              {products.map((product) => {
                const active = product.id === selectedId;
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => setSelectedId(product.id)}
                    className={`shrink-0 flex items-center gap-2.5 px-3 py-2 rounded-xl border text-left transition-all cursor-pointer ${
                      active
                        ? 'bg-[#465436] text-white border-[#465436] shadow-sm'
                        : 'bg-white text-[#242A1F] border-[#DCE2D2] hover:bg-[#F3F5ED]'
                    }`}
                  >
                    <div className="w-8 h-10 rounded-md overflow-hidden border border-black/10 shrink-0 bg-white">
                      <ProductImage
                        src={product.imageUrl}
                        alt={product.name}
                        category={product.category}
                      />
                    </div>
                    <div className="pr-1">
                      <p className="text-xs font-bold whitespace-nowrap">{product.name}</p>
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
                category: selectedProduct.category,
                price: selectedProduct.price,
                stock: selectedProduct.stock,
                description: selectedProduct.description,
                isPopular: selectedProduct.isPopular,
                imageUrl: selectedProduct.imageUrl,
                displayOrder: selectedProduct.displayOrder,
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
