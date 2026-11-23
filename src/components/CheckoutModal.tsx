import React, { useEffect, useState } from 'react';
import {
  Banknote,
  CheckCircle2,
  CreditCard,
  Minus,
  Plus,
  Receipt,
  Trash2,
  X,
} from 'lucide-react';
import type {
  CheckoutReceipt,
  PaymentMethod,
  Product,
  TeamSummary,
} from '../types/shop';
import {
  calculateCashDiscount,
  calculateCashPrice,
  formatEuro,
  isValidTeamCode,
  roundEuro,
  sanitizeTeamCode,
} from '../utils/format';
import { ProductImage } from './ProductImage';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  cart: Record<string, number>;
  teamCode: string;
  recentTeams: TeamSummary[];
  onTeamCodeChange: (code: string) => void;
  onUpdateCartQuantity: (productId: string, nextQty: number) => void;
  onConfirmCheckout: (params: {
    teamCode: string;
    paymentMethod: PaymentMethod;
  }) => Promise<CheckoutReceipt>;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  products,
  cart,
  teamCode,
  recentTeams,
  onTeamCodeChange,
  onUpdateCartQuantity,
  onConfirmCheckout,
}) => {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [localTeamCode, setLocalTeamCode] = useState(teamCode);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<CheckoutReceipt | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLocalTeamCode(teamCode);
      setErrorMsg(null);
      setReceipt(null);
    }
  }, [isOpen, teamCode]);

  if (!isOpen) return null;

  const cartProducts = products
    .filter((p) => (cart[p.id] ?? 0) > 0)
    .map((product) => {
      const quantity = cart[product.id] ?? 0;
      return {
        product,
        quantity,
        lineTotal: roundEuro(product.price * quantity),
      };
    });

  const totalQuantity = cartProducts.reduce((sum, item) => sum + item.quantity, 0);
  const cardTotal = roundEuro(cartProducts.reduce((sum, item) => sum + item.lineTotal, 0));
  const cashTotal = calculateCashPrice(cardTotal);
  const cashSavings = calculateCashDiscount(cardTotal);
  const selectedTotal = paymentMethod === 'cash' ? cashTotal : cardTotal;

  const handleConfirm = async () => {
    const normalized = sanitizeTeamCode(localTeamCode);
    if (!isValidTeamCode(normalized)) {
      setErrorMsg('결제 기록을 위해 영문 또는 숫자로 된 팀 코드를 입력해 주세요.');
      return;
    }
    if (cartProducts.length === 0) {
      setErrorMsg('장바구니에 담긴 상품이 없습니다.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      onTeamCodeChange(normalized);
      const completed = await onConfirmCheckout({
        teamCode: normalized,
        paymentMethod,
      });
      setReceipt(completed);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : '결제 처리 중 오류가 발생했습니다. 다시 시도해 주세요.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#1B2016]/50 backdrop-blur-[2px] p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="체크아웃 결제 확인"
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg max-h-[92vh] bg-[#FAF9F5] rounded-t-3xl sm:rounded-2xl border border-[#DCE2D2] shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Modal Header */}
        <div className="px-5 py-4 bg-[#465436] text-[#FDFCF9] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Receipt className="w-5 h-5 text-[#E5CFA2]" />
            <h2 className="text-base font-semibold tracking-tight">
              {receipt ? '결제 완료 영수증' : 'Check Out · 주문 확인'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="min-w-[40px] min-h-[40px] -mr-1.5 rounded-xl flex items-center justify-center text-[#DCE2D4] hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        {receipt ? (
          <div className="p-6 overflow-y-auto flex-1">
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-full bg-[#EDF3E4] text-[#465436] flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <p className="text-xs font-semibold text-[#5E6E4A] tracking-wide">
                팀 {receipt.teamCode} · 결제 #{receipt.orderNumber}
              </p>
              <h3 className="text-2xl font-bold text-[#242A1F] mt-1 font-sans-num">
                {formatEuro(receipt.finalTotal)}
              </h3>
              <p className="text-xs text-[#646E5A] mt-1">
                {receipt.paymentMethod === 'cash'
                  ? `현금 결제 (5% 할인 -${formatEuro(receipt.discountAmount)} 적용) · 재고 자동 차감 완료`
                  : '카드 정가 결제 완료 · 재고 자동 차감 완료'}
              </p>
            </div>

            <div className="bg-white border border-[#E2E6D9] rounded-xl divide-y divide-[#EFEFE7] mb-6">
              {receipt.items.map((item) => (
                <div
                  key={item.productId}
                  className="px-4 py-3 flex items-center justify-between text-sm"
                >
                  <div>
                    <span className="font-medium text-[#242A1F]">{item.name}</span>
                    <span className="text-xs text-[#6F7865] ml-2 font-sans-num">
                      {formatEuro(item.unitPrice)} × {item.quantity}
                    </span>
                  </div>
                  <span className="font-semibold font-sans-num text-[#242A1F]">
                    {formatEuro(item.lineTotal)}
                  </span>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full min-h-[48px] px-4 rounded-xl bg-[#465436] hover:bg-[#364129] active:scale-[0.99] text-white text-sm font-semibold transition-all cursor-pointer"
            >
              확인
            </button>
          </div>
        ) : (
          <>
            <div className="p-5 overflow-y-auto flex-1 space-y-5">
              {/* Team Code Confirmation */}
              <div>
                <label
                  htmlFor="checkout-team-code"
                  className="block text-xs font-semibold text-[#4D5744] mb-1.5"
                >
                  패키지투어 팀 코드 <span className="text-[#9E3C2F]">*</span>
                </label>
                <input
                  id="checkout-team-code"
                  type="text"
                  value={localTeamCode}
                  onChange={(e) => {
                    setLocalTeamCode(e.target.value.toUpperCase());
                    setErrorMsg(null);
                  }}
                  onBlur={() => setLocalTeamCode(sanitizeTeamCode(localTeamCode))}
                  placeholder="코드 입력"
                  maxLength={40}
                  className="w-full h-[46px] px-4 rounded-xl bg-white border border-[#D4DCC8] text-sm font-semibold uppercase tracking-wide text-[#242A1F] focus:outline-none focus:ring-2 focus:ring-[#465436]"
                />
                {recentTeams.length > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-[#727B69] mr-1">최근 팀:</span>
                    {recentTeams.slice(0, 5).map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setLocalTeamCode(t.teamCode);
                          setErrorMsg(null);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium font-sans-num transition-colors cursor-pointer ${
                          sanitizeTeamCode(localTeamCode) === t.teamCode
                            ? 'bg-[#465436] text-white'
                            : 'bg-[#ECEFE3] text-[#424E36] hover:bg-[#E0E6D3]'
                        }`}
                      >
                        {t.teamCode}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Cart Item List */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-[#4D5744]">
                    선택 상품 ({totalQuantity}개)
                  </span>
                </div>
                {cartProducts.length === 0 ? (
                  <div className="bg-white border border-[#E4E7DC] rounded-xl p-8 text-center text-sm text-[#6B7462]">
                    아직 장바구니에 담긴 상품이 없습니다.
                  </div>
                ) : (
                  <div className="bg-white border border-[#E2E6D9] rounded-xl divide-y divide-[#EFEFE7]">
                    {cartProducts.map(({ product, quantity, lineTotal }) => (
                      <div key={product.id} className="p-3 flex items-center gap-3">
                        <div className="w-11 h-14 rounded-lg overflow-hidden border border-[#E4E7DC] shrink-0">
                          <ProductImage
                            src={product.imageUrl}
                            alt={product.name}
                            category={product.category}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[#242A1F] truncate">
                            {product.name}
                          </p>
                          <p className="text-xs text-[#6B7462] font-sans-num">
                            단가 {formatEuro(product.price)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onUpdateCartQuantity(product.id, quantity - 1)}
                            aria-label="감소"
                            className="w-8 h-8 rounded-lg bg-[#F1F3EA] hover:bg-[#E4E8DA] text-[#35402A] flex items-center justify-center cursor-pointer"
                          >
                            {quantity === 1 ? (
                              <Trash2 className="w-3.5 h-3.5 text-[#9E3C2F]" />
                            ) : (
                              <Minus className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <span className="w-7 text-center text-sm font-bold font-sans-num">
                            {quantity}
                          </span>
                          <button
                            type="button"
                            disabled={quantity >= product.stock}
                            onClick={() => onUpdateCartQuantity(product.id, quantity + 1)}
                            aria-label="증가"
                            className="w-8 h-8 rounded-lg bg-[#F1F3EA] hover:bg-[#E4E8DA] disabled:opacity-35 text-[#35402A] flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="w-16 text-right text-sm font-bold font-sans-num text-[#242A1F]">
                          {formatEuro(lineTotal)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Payment Method Selector */}
              <div>
                <span className="block text-xs font-semibold text-[#4D5744] mb-2">
                  결제 수단 선택
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      paymentMethod === 'card'
                        ? 'bg-[#465436] text-white border-[#465436] shadow-sm'
                        : 'bg-white text-[#242A1F] border-[#D8DFCE] hover:bg-[#F4F6EE]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold opacity-90">카드 결제 (정가)</span>
                      <CreditCard className="w-4 h-4 opacity-85" />
                    </div>
                    <p className="text-lg font-bold font-sans-num">{formatEuro(cardTotal)}</p>
                    <p
                      className={`text-[11px] mt-0.5 ${
                        paymentMethod === 'card' ? 'text-[#DCE3D2]' : 'text-[#6F7865]'
                      }`}
                    >
                      정가 그대로 결제
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      paymentMethod === 'cash'
                        ? 'bg-[#2E3A24] text-[#FDFCF9] border-[#2E3A24] shadow-sm'
                        : 'bg-white text-[#242A1F] border-[#D8DFCE] hover:bg-[#F4F6EE]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className={`text-xs font-semibold ${
                          paymentMethod === 'cash' ? 'text-[#E8D2A3]' : 'text-[#8C6828]'
                        }`}
                      >
                        현금 결제 (5% 할인)
                      </span>
                      <Banknote
                        className={`w-4 h-4 ${
                          paymentMethod === 'cash' ? 'text-[#E8D2A3]' : 'text-[#8C6828]'
                        }`}
                      />
                    </div>
                    <p className="text-lg font-bold font-sans-num">{formatEuro(cashTotal)}</p>
                    <p
                      className={`text-[11px] mt-0.5 font-sans-num ${
                        paymentMethod === 'cash' ? 'text-[#D6DEC9]' : 'text-[#6F7865]'
                      }`}
                    >
                      -{formatEuro(cashSavings)} 할인 혜택
                    </p>
                  </button>
                </div>
              </div>

              {errorMsg && (
                <div className="px-4 py-3 rounded-xl bg-[#FDF2F2] border border-[#F1D0D0] text-xs text-[#9E3030] font-medium">
                  {errorMsg}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 bg-white border-t border-[#E4E7DC] flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] text-[#6A7361]">최종 결제 금액</p>
                <p className="text-xl font-bold font-sans-num text-[#242A1F]">
                  {formatEuro(selectedTotal)}
                </p>
              </div>
              <button
                type="button"
                disabled={submitting || cartProducts.length === 0}
                onClick={handleConfirm}
                className="flex-1 max-w-[260px] min-h-[50px] px-5 rounded-xl bg-[#465436] hover:bg-[#364129] active:scale-[0.99] disabled:opacity-45 text-white text-sm font-semibold transition-all cursor-pointer disabled:cursor-not-allowed"
              >
                {submitting ? '결제 및 재고 반영 중...' : '결제 완료 및 기록'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
