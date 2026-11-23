import React from 'react';
import { ArrowLeft } from 'lucide-react';
import type { ProductInput } from '../types/shop';
import { ProductForm } from './ProductForm';

interface RegisterProductViewProps {
  nextDisplayOrder: number;
  onCreateProduct: (values: ProductInput) => Promise<void>;
  onBackToCatalog: () => void;
}

export const RegisterProductView: React.FC<RegisterProductViewProps> = ({
  nextDisplayOrder,
  onCreateProduct,
  onBackToCatalog,
}) => {
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
        <h1 className="text-2xl font-bold text-[#242A1F] tracking-tight">상품 등록</h1>
        <p className="text-sm text-[#616B57] mt-0.5">
          새 기념품을 등록하면 모든 매장 태블릿의 손님 판매 화면에 즉시 추가됩니다.
        </p>
      </div>

      <ProductForm
        submitLabel="신규 상품 등록"
        onSubmit={(values) =>
          onCreateProduct({
            ...values,
            displayOrder: nextDisplayOrder,
          })
        }
      />
    </section>
  );
};
