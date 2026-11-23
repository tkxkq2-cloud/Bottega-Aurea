import React from 'react';
import { Menu, RotateCw, ShoppingCart } from 'lucide-react';
import { calculateCashPrice, formatEuro, sanitizeTeamCode } from '../utils/format';

interface TopBarProps {
  teamCode: string;
  onTeamCodeChange: (next: string) => void;
  onClearTeamCode: () => void;
  onToggleSidebar: () => void;
  totalCartItems: number;
  cardTotal: number;
  onOpenCheckout: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  teamCode,
  onTeamCodeChange,
  onClearTeamCode,
  onToggleSidebar,
  totalCartItems,
  cardTotal,
  onOpenCheckout,
}) => {
  const cashTotal = calculateCashPrice(cardTotal);

  return (
    <header className="sticky top-0 z-30 bg-[#465436] text-[#FDFCF9] border-b border-[#364129]/40 shadow-sm">
      <div className="max-w-6xl mx-auto px-3 sm:px-5 py-2.5 flex items-center justify-between gap-2.5 sm:gap-4">
        {/* Left Zone: Hamburger Menu + Team Code Input */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 max-w-md">
          <button
            type="button"
            onClick={onToggleSidebar}
            aria-label="메뉴 열기"
            className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-[#F5F4EE] hover:bg-white/10 active:bg-white/15 transition-colors shrink-0 cursor-pointer"
          >
            <Menu className="w-6 h-6" strokeWidth={2} />
          </button>

          <div className="relative flex-1 min-w-[140px]">
            <label htmlFor="team-code-input" className="sr-only">
              팀 코드
            </label>
            <div className="flex items-center bg-[#F4F5EE] text-[#242A1F] rounded-full pl-3.5 pr-1.5 h-[44px] border border-[#D8DFCE]/80 focus-within:ring-2 focus-within:ring-[#C9A66B] transition-shadow">
              <span className="text-xs font-semibold text-[#5A664C] whitespace-nowrap mr-1.5 select-none">
                팀 코드
              </span>
              <input
                id="team-code-input"
                type="text"
                value={teamCode}
                onChange={(e) => onTeamCodeChange(e.target.value.toUpperCase())}
                onBlur={() => onTeamCodeChange(sanitizeTeamCode(teamCode))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur();
                  }
                }}
                placeholder="코드 입력"
                maxLength={40}
                className="w-full min-w-0 bg-transparent text-sm font-semibold text-[#242A1F] placeholder:text-[#8E9882] placeholder:font-normal focus:outline-none uppercase tracking-wide"
              />
              <button
                type="button"
                onClick={onClearTeamCode}
                title="팀 코드 초기화"
                aria-label="팀 코드 초기화"
                className="w-8 h-8 rounded-full bg-[#465436]/10 hover:bg-[#465436]/20 active:bg-[#465436]/25 text-[#465436] flex items-center justify-center shrink-0 transition-colors cursor-pointer"
              >
                <RotateCw className="w-4 h-4" strokeWidth={2.2} />
              </button>
            </div>
          </div>
        </div>

        {/* Right Zone: Display-Only Cart Count + Card/Cash Dual Price + Check Out CTA */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Display-Only Shopping Cart Counter */}
          <div
            aria-label={`담긴 수량 ${totalCartItems}개`}
            className="relative min-w-[40px] min-h-[44px] flex items-center justify-center text-[#F5F4EE] select-none"
          >
            <ShoppingCart className="w-6 h-6" strokeWidth={1.9} />
            <span
              className={`absolute top-1 right-0 min-w-[20px] h-[20px] px-1 rounded-full text-[11px] font-bold font-sans-num flex items-center justify-center transition-transform ${
                totalCartItems > 0
                  ? 'bg-[#C9A66B] text-[#1F241A] scale-100'
                  : 'bg-[#2E3823] text-[#C8D0BE] scale-95'
              }`}
            >
              {totalCartItems}
            </span>
          </div>

          {/* Display-Only Card (Regular) & Cash (5% Off) Dual Summary */}
          <div className="hidden xs:flex sm:flex flex-col rounded-lg overflow-hidden border border-white/15 text-xs font-sans-num min-w-[126px] sm:min-w-[144px] select-none">
            <div className="flex items-center justify-between gap-2 px-2.5 py-1 bg-[#5D6E49] text-[#F9FAF6]">
              <span className="font-medium text-[11px] opacity-90">카드</span>
              <span className="font-bold tracking-tight">{formatEuro(cardTotal)}</span>
            </div>
            <div className="flex items-center justify-between gap-2 px-2.5 py-1 bg-[#2F3A24] text-[#E9D7B2]">
              <span className="font-medium text-[11px] whitespace-nowrap">현금 5%↓</span>
              <span className="font-bold tracking-tight">{formatEuro(cashTotal)}</span>
            </div>
          </div>

          {/* Primary Check Out CTA */}
          <button
            type="button"
            onClick={onOpenCheckout}
            className={`min-h-[44px] px-3.5 sm:px-5 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer flex items-center justify-center ${
              totalCartItems > 0
                ? 'bg-[#C9A66B] hover:bg-[#D4B37A] text-[#1E2418] shadow-sm active:scale-[0.98]'
                : 'bg-[#5B6E47] hover:bg-[#667B51] text-[#F7F8F3]'
            }`}
          >
            Check Out
          </button>
        </div>
      </div>

      {/* Compact mobile-only price bar below 420px so Card/Cash prices never disappear */}
      <div className="flex sm:hidden items-center justify-between px-4 py-1.5 bg-[#364129] border-t border-white/10 text-xs font-sans-num">
        <div className="flex items-center gap-2">
          <span className="text-[#CBD3C2]">카드 정가</span>
          <span className="font-bold text-white">{formatEuro(cardTotal)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[#E9D7B2]">현금 5% 할인</span>
          <span className="font-bold text-[#F5E3BD]">{formatEuro(cashTotal)}</span>
        </div>
      </div>
    </header>
  );
};
