import React, { useRef, useState } from 'react';
import { ImagePlus, Trash2, Upload } from 'lucide-react';
import { SCHEMA_LIMITS, type ProductCategory, type ProductInput } from '../types/shop';
import { compressImageFileToDataUrl, formatEuro } from '../utils/format';
import { ProductImage } from './ProductImage';

interface ProductFormProps {
  initialValues?: ProductInput;
  submitLabel: string;
  onSubmit: (values: ProductInput) => Promise<void>;
  onDelete?: () => Promise<void>;
}

export const ProductForm: React.FC<ProductFormProps> = ({
  initialValues,
  submitLabel,
  onSubmit,
  onDelete,
}) => {
  const [name, setName] = useState(initialValues?.name ?? '');
  const [category, setCategory] = useState<ProductCategory>(initialValues?.category ?? 'food');
  const [price, setPrice] = useState(
    initialValues !== undefined ? String(initialValues.price) : ''
  );
  const [stock, setStock] = useState(
    initialValues !== undefined ? String(initialValues.stock) : '20'
  );
  const [description, setDescription] = useState(initialValues?.description ?? '');
  const [isPopular, setIsPopular] = useState(initialValues?.isPopular ?? false);
  const [imageUrl, setImageUrl] = useState(initialValues?.imageUrl ?? '');
  const [saving, setSaving] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const parsedPrice = Math.max(0, Number(price) || 0);
  const parsedStock = Math.max(0, Math.floor(Number(stock) || 0));

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCompressing(true);
    setErrorMsg(null);
    try {
      const compressed = await compressImageFileToDataUrl(file);
      setImageUrl(compressed);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '이미지 처리 중 오류가 발생했습니다.');
    } finally {
      setCompressing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMsg('상품명을 입력해 주세요.');
      return;
    }
    if (price.trim() === '' || Number.isNaN(Number(price)) || Number(price) < 0) {
      setErrorMsg('0 이상의 올바른 유로(€) 가격을 입력해 주세요.');
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    try {
      await onSubmit({
        name: trimmedName,
        category,
        price: parsedPrice,
        stock: parsedStock,
        description: description.trim(),
        isPopular,
        imageUrl: imageUrl.trim(),
        displayOrder: initialValues?.displayOrder,
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      await onDelete();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '삭제 중 오류가 발생했습니다.');
      setSaving(false);
    }
  };

  const isFood = category === 'food';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Form Fields */}
        <div className="lg:col-span-7 bg-white border border-[#DCE2D2] rounded-2xl p-5 sm:p-6 space-y-4">
          <div>
            <label htmlFor="prod-name" className="block text-xs font-semibold text-[#4A5540] mb-1.5">
              상품명 <span className="text-[#9E3C2F]">*</span>
            </label>
            <input
              id="prod-name"
              type="text"
              required
              maxLength={SCHEMA_LIMITS.PRODUCT_NAME_MAX}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 올리브 오일"
              className="w-full h-[46px] px-4 rounded-xl bg-[#FAF9F5] border border-[#D4DCC8] text-sm font-medium text-[#242A1F] focus:outline-none focus:ring-2 focus:ring-[#465436]"
            />
          </div>

          {/* Category Segmented Toggle */}
          <div>
            <span className="block text-xs font-semibold text-[#4A5540] mb-1.5">
              카테고리 (카드 색상 자동 적용)
            </span>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setCategory('food')}
                className={`min-h-[44px] rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                  category === 'food'
                    ? 'bg-[#4A5A39] text-white border-[#4A5A39]'
                    : 'bg-[#F3F5ED] text-[#4A5A39] border-[#D8DFCE] hover:bg-[#E9EEE0]'
                }`}
              >
                식품 (세이지 톤)
              </button>
              <button
                type="button"
                onClick={() => setCategory('beauty')}
                className={`min-h-[44px] rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                  category === 'beauty'
                    ? 'bg-[#3B5874] text-white border-[#3B5874]'
                    : 'bg-[#F0F5FA] text-[#3B5874] border-[#D0DFEC] hover:bg-[#E4EEF8]'
                }`}
              >
                뷰티 (포슬린 블루 톤)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label
                htmlFor="prod-price"
                className="block text-xs font-semibold text-[#4A5540] mb-1.5"
              >
                카드 정가 (€) <span className="text-[#9E3C2F]">*</span>
              </label>
              <input
                id="prod-price"
                type="number"
                inputMode="decimal"
                step="0.5"
                min={0}
                max={SCHEMA_LIMITS.MAX_PRICE}
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="25"
                className="w-full h-[46px] px-4 rounded-xl bg-[#FAF9F5] border border-[#D4DCC8] text-sm font-bold font-sans-num text-[#242A1F] focus:outline-none focus:ring-2 focus:ring-[#465436]"
              />
            </div>

            <div>
              <label
                htmlFor="prod-stock"
                className="block text-xs font-semibold text-[#4A5540] mb-1.5"
              >
                보유 재고 (개)
              </label>
              <input
                id="prod-stock"
                type="number"
                inputMode="numeric"
                min={0}
                max={SCHEMA_LIMITS.MAX_STOCK}
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="20"
                className="w-full h-[46px] px-4 rounded-xl bg-[#FAF9F5] border border-[#D4DCC8] text-sm font-bold font-sans-num text-[#242A1F] focus:outline-none focus:ring-2 focus:ring-[#465436]"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="prod-desc" className="text-xs font-semibold text-[#4A5540]">
                상품 설명
              </label>
              <span className="text-[11px] text-[#7D8772] font-sans-num">
                {description.length}/{SCHEMA_LIMITS.PRODUCT_DESC_MAX}
              </span>
            </div>
            <textarea
              id="prod-desc"
              rows={3}
              maxLength={SCHEMA_LIMITS.PRODUCT_DESC_MAX}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="손님에게 보여질 간결하고 매력적인 상품 소개를 입력해 주세요."
              className="w-full p-3.5 rounded-xl bg-[#FAF9F5] border border-[#D4DCC8] text-sm text-[#242A1F] leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#465436] resize-none"
            />
          </div>

          {/* Popular Toggle */}
          <label className="flex items-center justify-between p-3.5 rounded-xl bg-[#FAF9F5] border border-[#E2E6D9] cursor-pointer">
            <div>
              <p className="text-sm font-semibold text-[#242A1F]">인기 상품 표시</p>
              <p className="text-xs text-[#6B7462]">
                카드 우측 상단에 골드 &lsquo;인기 상품&rsquo; 리본을 표시합니다.
              </p>
            </div>
            <input
              type="checkbox"
              checked={isPopular}
              onChange={(e) => setIsPopular(e.target.checked)}
              className="w-5 h-5 accent-[#B68B40] rounded cursor-pointer"
            />
          </label>

          {/* Image Upload or URL */}
          <div>
            <span className="block text-xs font-semibold text-[#4A5540] mb-1.5">상품 이미지</span>
            <div className="flex flex-wrap items-center gap-2.5 mb-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                disabled={compressing}
                onClick={() => fileInputRef.current?.click()}
                className="min-h-[42px] px-4 rounded-xl bg-[#EEF1E6] hover:bg-[#E2E7D6] text-[#354326] text-xs font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                {compressing ? '이미지 최적화 중...' : '태블릿에서 사진 선택'}
              </button>
              {imageUrl && (
                <button
                  type="button"
                  onClick={() => setImageUrl('')}
                  className="min-h-[42px] px-3 rounded-xl text-xs font-medium text-[#8C3B31] hover:bg-[#F8EBE9] transition-colors cursor-pointer"
                >
                  이미지 제거
                </button>
              )}
            </div>
            <input
              type="text"
              value={imageUrl.startsWith('data:') ? '' : imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder={
                imageUrl.startsWith('data:')
                  ? '업로드된 사진이 적용되었습니다 (URL로 덮어쓰기 가능)'
                  : '또는 이미지 경로 / URL 입력'
              }
              className="w-full h-[42px] px-3.5 rounded-xl bg-[#FAF9F5] border border-[#D4DCC8] text-xs text-[#242A1F] focus:outline-none focus:ring-2 focus:ring-[#465436]"
            />
          </div>

          {errorMsg && (
            <div className="px-4 py-3 rounded-xl bg-[#FDF2F2] border border-[#F1D0D0] text-xs text-[#9E3030] font-medium">
              {errorMsg}
            </div>
          )}

          {/* Action Row */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
            <button
              type="submit"
              disabled={saving || compressing}
              className="min-h-[48px] px-6 rounded-xl bg-[#465436] hover:bg-[#364129] disabled:opacity-50 text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              {saving ? '저장 중...' : submitLabel}
            </button>

            {onDelete && (
              <div>
                {confirmingDelete ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#9E3C2F] font-medium">정말 삭제할까요?</span>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={handleDelete}
                      className="min-h-[40px] px-3.5 rounded-lg bg-[#9E3C2F] hover:bg-[#822E23] text-white text-xs font-semibold cursor-pointer"
                    >
                      삭제 확인
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingDelete(false)}
                      className="min-h-[40px] px-3 rounded-lg bg-[#EFEFE6] text-[#444D3C] text-xs font-medium cursor-pointer"
                    >
                      취소
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(true)}
                    className="min-h-[44px] px-3.5 rounded-xl text-xs font-semibold text-[#9E3C2F] hover:bg-[#FBECE9] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    상품 삭제
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Live Customer Card Preview */}
        <div className="lg:col-span-5 space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#5A674C]">
            <ImagePlus className="w-3.5 h-3.5" />
            손님 화면 미리보기
          </div>
          <div
            className={`relative rounded-2xl border p-4 flex gap-4 ${
              isFood ? 'bg-[#F3F5ED] border-[#D8DFCE]' : 'bg-[#F0F5FA] border-[#D0DFEC]'
            }`}
          >
            {isPopular && (
              <div className="absolute -top-2.5 right-3.5 bg-[#B68B40] text-white px-2.5 py-0.5 rounded-md text-[11px] font-semibold">
                인기 상품
              </div>
            )}
            <div className="w-[42%] shrink-0">
              <div className="aspect-[3/4] rounded-xl overflow-hidden border border-black/10 bg-white">
                <ProductImage
                  src={imageUrl}
                  alt={name || '상품 미리보기'}
                  category={category}
                />
              </div>
              <div className="mt-2 flex items-baseline justify-between px-0.5">
                <span className="text-base font-bold font-sans-num text-[#242A1F]">
                  {formatEuro(parsedPrice)}
                </span>
                <span
                  className={`text-[11px] font-semibold ${
                    isFood ? 'text-[#5A6C46]' : 'text-[#4B6C8B]'
                  }`}
                >
                  {isFood ? '식품' : '뷰티'}
                </span>
              </div>
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-[#242A1F] leading-snug mb-1.5">
                  {name || '상품명을 입력하세요'}
                </h3>
                <p className="text-xs text-[#4F5847] leading-relaxed line-clamp-4">
                  {description || '상품 설명이 여기에 표시됩니다.'}
                </p>
              </div>
              <div className="mt-4 pt-2 border-t border-black/5 text-xs text-[#646E5A] font-sans-num flex items-center justify-between">
                <span>현금 5% 할인가</span>
                <strong className="text-[#242A1F]">
                  {formatEuro(Math.round(parsedPrice * 0.95 * 100) / 100)}
                </strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};
