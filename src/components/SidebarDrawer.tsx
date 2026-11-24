import React from 'react';
import {
  Boxes,
  ClipboardList,
  LogOut,
  PencilLine,
  Percent,
  PlusSquare,
  RefreshCw,
  Store,
  X,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import type { AppView } from '../types/shop';
import { formatStoreAccountDisplay } from '../utils/authId';

interface SidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeView: AppView;
  onSelectView: (view: AppView) => void;
  lowStockCount: number;
  teamCount: number;
  user: User;
  onSignOut: () => void;
}

const MENU_ITEMS: {
  id: AppView;
  label: string;
  sublabel: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: 'catalog',
    label: '판매 화면',
    sublabel: '손님용 상품 목록',
    icon: Store,
  },
  {
    id: 'teamLookup',
    label: '팀별 구매 조회',
    sublabel: '팀 코드별 건별 내역',
    icon: ClipboardList,
  },
  {
    id: 'commission',
    label: '커미션 관리',
    sublabel: '가이드·인솔자 비율 설정',
    icon: Percent,
  },
  {
    id: 'inventory',
    label: '재고 관리',
    sublabel: '실시간 입출고 수량',
    icon: Boxes,
  },
  {
    id: 'editProduct',
    label: '상품 수정',
    sublabel: '가격·설명·이미지 변경',
    icon: PencilLine,
  },
  {
    id: 'registerProduct',
    label: '상품 등록',
    sublabel: '신규 기념품 추가',
    icon: PlusSquare,
  },
];

export const SidebarDrawer: React.FC<SidebarDrawerProps> = ({
  isOpen,
  onClose,
  activeView,
  onSelectView,
  lowStockCount,
  teamCount,
  user,
  onSignOut,
}) => {
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden={!isOpen}
        className={`fixed inset-0 z-40 bg-[#1B2016]/45 backdrop-blur-[2px] transition-opacity duration-200 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Slide-Over Olive Sidebar */}
      <aside
        aria-label="관리자 사이드바 메뉴"
        className={`fixed top-0 left-0 bottom-0 z-50 w-[276px] max-w-[82vw] bg-[#465436] text-[#FDFCF9] shadow-2xl flex flex-col transition-transform duration-200 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header */}
        <div className="px-5 pt-5 pb-4 border-b border-white/12 flex items-center justify-between">
          <div>
            <p className="font-display text-2xl font-semibold tracking-tight text-[#FDFCF9] leading-none">
              Bottega Aurea
            </p>
            <p className="text-[11px] text-[#C8D1BE] mt-1.5">매장 운영 및 재고 관리</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="사이드바 닫기"
            className="min-w-[44px] min-h-[44px] -mr-2 rounded-xl flex items-center justify-center text-[#DCE2D4] hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Buttons */}
        <nav className="flex-1 overflow-y-auto px-4 py-5 space-y-2.5">
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            const metaText =
              item.id === 'inventory' && lowStockCount > 0
                ? `부족 ${lowStockCount}`
                : item.id === 'teamLookup' && teamCount > 0
                  ? `${teamCount}팀`
                  : null;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectView(item.id);
                  onClose();
                }}
                className={`w-full min-h-[54px] px-4 py-3 rounded-xl text-left transition-all flex items-center justify-between gap-3 cursor-pointer ${
                  isActive
                    ? 'bg-[#F3F4EC] text-[#242A1F] shadow-sm font-semibold'
                    : 'bg-[#566644]/55 text-[#F4F5EE] hover:bg-[#5F714C]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`w-5 h-5 shrink-0 ${
                      isActive ? 'text-[#465436]' : 'text-[#D6DEC9]'
                    }`}
                  />
                  <div className="min-w-0">
                    <div className="text-sm leading-tight truncate">{item.label}</div>
                    <div
                      className={`text-[11px] mt-0.5 truncate ${
                        isActive ? 'text-[#5E6953] font-normal' : 'text-[#CBD4BF]'
                      }`}
                    >
                      {item.sublabel}
                    </div>
                  </div>
                </div>
                {metaText && (
                  <span
                    className={`text-[11px] font-sans-num font-semibold shrink-0 ${
                      item.id === 'inventory'
                        ? isActive
                          ? 'text-[#A65336]'
                          : 'text-[#F5D0A9]'
                        : isActive
                          ? 'text-[#465436]'
                          : 'text-[#DCE2D2]'
                    }`}
                  >
                    {metaText}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Cache-Busting Live Update Refresh Button */}
        <div className="px-4 pb-3">
          <button
            type="button"
            onClick={() => {
              const base = `${window.location.origin}${window.location.pathname}`;
              window.location.replace(`${base}?_v=${Date.now()}`);
            }}
            className="w-full min-h-[40px] px-3.5 rounded-xl bg-white/8 hover:bg-white/15 text-[#DCE3D2] text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>최신 화면 새로고침</span>
          </button>
        </div>

        {/* Staff Account Footer */}
        <div className="p-4 border-t border-white/12 bg-[#3A462C]">
          {(() => {
            const accountDisplay = formatStoreAccountDisplay(user.email);
            return (
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-[#F5F6F0] truncate">
                    {user.displayName || accountDisplay.title}
                  </p>
                  <p className="text-[11px] text-[#BFC9B4] truncate">
                    {accountDisplay.subtitle}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onSignOut}
                  title="로그아웃"
                  className="min-w-[40px] min-h-[40px] px-2.5 rounded-lg bg-white/10 hover:bg-white/18 text-[#F3F4EC] text-xs font-medium flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>로그아웃</span>
                </button>
              </div>
            );
          })()}
        </div>
      </aside>
    </>
  );
};
