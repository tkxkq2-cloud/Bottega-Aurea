import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileSpreadsheet,
  RotateCcw,
  Search,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import type { Order, TeamSummary } from '../types/shop';
import { exportSalesToExcel } from '../utils/excelExport';
import {
  formatEuro,
  formatKoreanDateTime,
  getOrderPaymentBreakdown,
  roundEuro,
  sanitizeTeamCode,
} from '../utils/format';

interface TeamLookupViewProps {
  teams: TeamSummary[];
  orders: Order[];
  guideRate: number;
  leaderRate: number;
  selectedTeamCode: string;
  onSelectTeamCode: (code: string) => void;
  onDeleteSalesRecords: (targetOrders: Order[], label: string) => Promise<void>;
  onVoidOrder: (order: Order) => Promise<void>;
  onNotify: (message: string) => void;
  onBackToCatalog: () => void;
}

type DeleteTarget =
  | { scope: 'month'; monthKey: string; label: string; orders: Order[]; teamCount: number }
  | { scope: 'team'; monthKey: string; teamCode: string; label: string; orders: Order[] };

function toMonthKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function getOrderMonthKey(order: Order): string {
  const d = order.createdAt?.toDate() ?? new Date();
  return toMonthKey(d);
}

function formatMonthLabel(monthKey: string): string {
  const [y, m] = monthKey.split('-');
  return `${y}년 ${Number(m)}월`;
}

function shiftMonth(monthKey: string, delta: number): string {
  const [yStr, mStr] = monthKey.split('-');
  const d = new Date(Number(yStr), Number(mStr) - 1 + delta, 1);
  return toMonthKey(d);
}

export const TeamLookupView: React.FC<TeamLookupViewProps> = ({
  orders,
  guideRate,
  leaderRate,
  selectedTeamCode,
  onSelectTeamCode,
  onDeleteSalesRecords,
  onVoidOrder,
  onNotify,
  onBackToCatalog,
}) => {
  const currentMonthKey = useMemo(() => toMonthKey(new Date()), []);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey);
  const [searchInput, setSearchInput] = useState(selectedTeamCode);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [exportedInModal, setExportedInModal] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [voidTarget, setVoidTarget] = useState<Order | null>(null);
  const [voiding, setVoiding] = useState(false);
  const [voidError, setVoidError] = useState<string | null>(null);

  useEffect(() => {
    setSearchInput(selectedTeamCode);
  }, [selectedTeamCode]);

  const activeCode = sanitizeTeamCode(selectedTeamCode);

  // Available months for quick dropdown navigation
  const availableMonths = useMemo(() => {
    const set = new Set<string>([currentMonthKey, selectedMonth]);
    for (const order of orders) {
      set.add(getOrderMonthKey(order));
    }
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [orders, currentMonthKey, selectedMonth]);

  // Orders filtered to the selected month
  const monthOrders = useMemo(
    () => orders.filter((o) => getOrderMonthKey(o) === selectedMonth),
    [orders, selectedMonth]
  );

  // Monthly team summaries derived from monthOrders
  const monthlyTeams = useMemo(() => {
    const map = new Map<
      string,
      {
        teamCode: string;
        orderCount: number;
        totalUnits: number;
        totalRevenue: number;
        lastOrderMs: number;
      }
    >();

    for (const order of monthOrders) {
      const prev = map.get(order.teamCode) ?? {
        teamCode: order.teamCode,
        orderCount: 0,
        totalUnits: 0,
        totalRevenue: 0,
        lastOrderMs: 0,
      };
      prev.orderCount += 1;
      prev.totalUnits += order.totalQuantity;
      prev.totalRevenue = roundEuro(prev.totalRevenue + order.finalTotal);
      prev.lastOrderMs = Math.max(prev.lastOrderMs, order.createdAt?.toMillis() ?? 0);
      map.set(order.teamCode, prev);
    }

    return Array.from(map.values()).sort((a, b) => b.lastOrderMs - a.lastOrderMs);
  }, [monthOrders]);

  const monthGrandTotal = useMemo(
    () => roundEuro(monthOrders.reduce((sum, o) => sum + o.finalTotal, 0)),
    [monthOrders]
  );

  const teamOrders = useMemo(() => {
    if (!activeCode) return [];
    return monthOrders
      .filter((o) => o.teamCode === activeCode)
      .sort((a, b) => a.orderNumber - b.orderNumber);
  }, [monthOrders, activeCode]);

  const teamMetrics = useMemo(() => {
    let cardTotal = 0;
    let cashTotal = 0;
    let totalUnits = 0;
    const itemMap = new Map<string, { name: string; quantity: number; subtotal: number }>();

    for (const order of teamOrders) {
      const breakdown = getOrderPaymentBreakdown(order);
      cardTotal = roundEuro(cardTotal + breakdown.cardAmount);
      cashTotal = roundEuro(cashTotal + breakdown.cashAmount);
      totalUnits += order.totalQuantity;

      for (const item of order.items) {
        const prev = itemMap.get(item.productId) ?? {
          name: item.name,
          quantity: 0,
          subtotal: 0,
        };
        prev.quantity += item.quantity;
        prev.subtotal = roundEuro(prev.subtotal + item.lineTotal);
        itemMap.set(item.productId, prev);
      }
    }

    const aggregatedItems = Array.from(itemMap.values()).sort((a, b) => b.quantity - a.quantity);
    const grandTotal = roundEuro(cardTotal + cashTotal);
    const guideCommission = roundEuro(grandTotal * (guideRate / 100));
    const leaderCommission = roundEuro(grandTotal * (leaderRate / 100));

    return {
      orderCount: teamOrders.length,
      totalUnits,
      cardTotal,
      cashTotal,
      grandTotal,
      guideCommission,
      leaderCommission,
      aggregatedItems,
    };
  }, [teamOrders, guideRate, leaderRate]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = sanitizeTeamCode(searchInput);
    setSearchInput(cleaned);
    onSelectTeamCode(cleaned);
  };

  const handleExportMonthExcel = () => {
    if (monthOrders.length === 0) {
      onNotify(`${formatMonthLabel(selectedMonth)}에 내보낼 구매 기록이 없습니다.`);
      return;
    }
    const filename = exportSalesToExcel({
      orders: monthOrders,
      monthKey: selectedMonth,
      guideRate,
      leaderRate,
    });
    onNotify(`엑셀 저장 완료: ${filename}`);
  };

  const handleExportTeamExcel = () => {
    if (!activeCode || teamOrders.length === 0) {
      onNotify('선택한 팀의 내보낼 구매 기록이 없습니다.');
      return;
    }
    const filename = exportSalesToExcel({
      orders: teamOrders,
      monthKey: selectedMonth,
      teamCode: activeCode,
      guideRate,
      leaderRate,
    });
    onNotify(`엑셀 저장 완료: ${filename}`);
  };

  const openMonthDeleteModal = () => {
    if (monthOrders.length === 0) return;
    setExportedInModal(false);
    setDeleteError(null);
    setDeleteTarget({
      scope: 'month',
      monthKey: selectedMonth,
      label: `${formatMonthLabel(selectedMonth)} 전체`,
      orders: monthOrders,
      teamCount: monthlyTeams.length,
    });
  };

  const openTeamDeleteModal = () => {
    if (!activeCode || teamOrders.length === 0) return;
    setExportedInModal(false);
    setDeleteError(null);
    setDeleteTarget({
      scope: 'team',
      monthKey: selectedMonth,
      teamCode: activeCode,
      label: `${formatMonthLabel(selectedMonth)} · 팀 ${activeCode}`,
      orders: teamOrders,
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await onDeleteSalesRecords(deleteTarget.orders, deleteTarget.label);
      if (deleteTarget.scope === 'team') {
        onSelectTeamCode('');
      }
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : '기록 삭제 중 오류가 발생했습니다. 다시 시도해 주세요.'
      );
    } finally {
      setDeleting(false);
    }
  };

  const openVoidOrderModal = (order: Order) => {
    setVoidError(null);
    setVoidTarget(order);
  };

  const handleConfirmVoidOrder = async () => {
    if (!voidTarget) return;
    setVoiding(true);
    setVoidError(null);
    try {
      await onVoidOrder(voidTarget);
      setVoidTarget(null);
    } catch (err) {
      setVoidError(
        err instanceof Error
          ? err.message
          : '결제 무효화 중 오류가 발생했습니다. 다시 시도해 주세요.'
      );
    } finally {
      setVoiding(false);
    }
  };

  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 pb-14">
      {/* Header Row */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
        <div>
          <button
            type="button"
            onClick={onBackToCatalog}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#5A674C] hover:text-[#242A1F] mb-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            판매 화면으로 돌아가기
          </button>
          <h1 className="text-2xl font-bold text-[#242A1F] tracking-tight">팀별 구매 조회</h1>
          <p className="text-sm text-[#616B57] mt-0.5">
            월별 및 팀 코드별 구매 내역을 확인하고 엑셀(.xlsx)로 내보내거나 정리할 수 있습니다.
          </p>
        </div>

        {/* Team Code Search */}
        <form onSubmit={handleSearch} className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-56">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value.toUpperCase())}
              placeholder="코드 입력"
              maxLength={40}
              className="w-full h-[44px] pl-4 pr-10 rounded-xl bg-white border border-[#D4DCC8] text-sm font-semibold uppercase tracking-wide text-[#242A1F] focus:outline-none focus:ring-2 focus:ring-[#465436]"
            />
            <Search className="w-4 h-4 text-[#77826B] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <button
            type="submit"
            className="min-h-[44px] px-4 rounded-xl bg-[#465436] hover:bg-[#364129] text-white text-sm font-semibold whitespace-nowrap transition-colors cursor-pointer"
          >
            조회
          </button>
        </form>
      </div>

      {/* Monthly Control & Export / Purge Bar */}
      <div className="bg-white border border-[#DCE2D2] rounded-2xl p-4 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Month Stepper + Select */}
          <div className="inline-flex items-center rounded-xl bg-[#F4F5EE] border border-[#DCE2D2] p-1">
            <button
              type="button"
              onClick={() => setSelectedMonth((m) => shiftMonth(m, -1))}
              aria-label="이전 달"
              className="w-9 h-9 rounded-lg hover:bg-white text-[#3F4B32] flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="relative flex items-center px-2">
              <Calendar className="w-4 h-4 text-[#465436] mr-1.5 shrink-0 pointer-events-none" />
              <select
                aria-label="정산 월 선택"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-sm font-bold font-sans-num text-[#242A1F] focus:outline-none cursor-pointer pr-1"
              >
                {availableMonths.map((mKey) => (
                  <option key={mKey} value={mKey}>
                    {formatMonthLabel(mKey)}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => setSelectedMonth((m) => shiftMonth(m, 1))}
              aria-label="다음 달"
              className="w-9 h-9 rounded-lg hover:bg-white text-[#3F4B32] flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="text-xs sm:text-sm text-[#58624E] font-sans-num">
            <span>{monthlyTeams.length}개 팀</span>
            <span className="mx-1.5 text-[#B4BDAA]">·</span>
            <span>결제 {monthOrders.length}건</span>
            <span className="mx-1.5 text-[#B4BDAA]">·</span>
            <strong className="text-[#242A1F] font-bold">{formatEuro(monthGrandTotal)}</strong>
          </div>
        </div>

        {/* Monthly Export & Delete Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={monthOrders.length === 0}
            onClick={handleExportMonthExcel}
            className="min-h-[42px] px-4 rounded-xl bg-[#EEF2E6] hover:bg-[#E2E9D6] disabled:opacity-45 text-[#2F3E20] border border-[#D4DEC4] text-xs sm:text-sm font-semibold inline-flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#465436]" />
            월별 엑셀 내보내기
          </button>

          <button
            type="button"
            disabled={monthOrders.length === 0}
            onClick={openMonthDeleteModal}
            className="min-h-[42px] px-4 rounded-xl bg-[#FDF2F1] hover:bg-[#F9E3E0] disabled:opacity-45 text-[#9E3C2F] border border-[#F0D0CC] text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4" />
            월별 기록 삭제
          </button>
        </div>
      </div>

      {/* Recorded Tour Teams Quick Selector (Monthly) */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-xs font-semibold text-[#5B664E]">
            {formatMonthLabel(selectedMonth)} 기록된 투어 팀 ({monthlyTeams.length})
          </h2>
        </div>
        {monthlyTeams.length === 0 ? (
          <div className="bg-white border border-[#E2E6D9] rounded-2xl p-6 text-sm text-[#6A7360]">
            {formatMonthLabel(selectedMonth)}에 기록된 투어 팀 결제 내역이 없습니다.
          </div>
        ) : (
          <div className="flex gap-2.5 overflow-x-auto pb-1.5">
            {monthlyTeams.map((team) => {
              const selected = activeCode === team.teamCode;
              return (
                <button
                  key={team.teamCode}
                  type="button"
                  onClick={() => {
                    setSearchInput(team.teamCode);
                    onSelectTeamCode(team.teamCode);
                  }}
                  className={`shrink-0 min-w-[128px] px-4 py-3 rounded-xl border text-left transition-all cursor-pointer ${
                    selected
                      ? 'bg-[#465436] text-white border-[#465436] shadow-sm'
                      : 'bg-white text-[#242A1F] border-[#DCE2D2] hover:bg-[#F3F5ED]'
                  }`}
                >
                  <p className="text-sm font-bold font-sans-num tracking-wide leading-snug">
                    {team.teamCode}
                  </p>
                  <p
                    className={`text-xs font-sans-num mt-0.5 ${
                      selected ? 'text-[#DCE3D2]' : 'text-[#6A7360]'
                    }`}
                  >
                    결제 {team.orderCount}건
                  </p>
                  <p
                    className={`text-xs font-semibold font-sans-num mt-1 ${
                      selected ? 'text-[#E9D7B2]' : 'text-[#465436]'
                    }`}
                  >
                    {formatEuro(team.totalRevenue)}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected Team Detail Dashboard */}
      {!activeCode ? (
        <div className="bg-white border border-[#E2E6D9] rounded-2xl p-12 text-center">
          <Users className="w-8 h-8 text-[#8A947E] mx-auto mb-3" strokeWidth={1.6} />
          <p className="text-base font-semibold text-[#242A1F]">
            조회할 팀 코드를 선택하거나 입력해 주세요
          </p>
          <p className="text-sm text-[#6B7462] mt-1">
            위 검색창에 팀 코드를 입력하거나 기록된 팀을 선택하면 구매 내역을 확인할 수 있습니다.
          </p>
        </div>
      ) : teamOrders.length === 0 ? (
        <div className="bg-white border border-[#E2E6D9] rounded-2xl p-12 text-center">
          <p className="text-base font-semibold text-[#242A1F]">
            {formatMonthLabel(selectedMonth)}에 팀 코드 &lsquo;{activeCode}&rsquo;의 결제 기록이
            없습니다
          </p>
          <p className="text-sm text-[#6B7462] mt-1.5">
            다른 월을 선택하거나 판매 화면에서 이 팀 코드로 Check Out을 진행해 주세요.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Selected Team Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[#242A1F] font-sans-num">{activeCode}</span>
              <span className="text-xs text-[#6B7462]">
                {formatMonthLabel(selectedMonth)} 상세 정산
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleExportTeamExcel}
                className="min-h-[40px] px-3.5 rounded-xl bg-white hover:bg-[#F3F5ED] text-[#354426] border border-[#D4DCC8] text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-[#465436]" />
                선택 팀 엑셀 내보내기
              </button>
              <button
                type="button"
                onClick={openTeamDeleteModal}
                className="min-h-[40px] px-3.5 rounded-xl bg-white hover:bg-[#FDF2F1] text-[#9E3C2F] border border-[#EBCBC7] text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                선택 팀 기록 삭제
              </button>
            </div>
          </div>

          {/* 4-Column Summary Strip — Team Code, Total Revenue, Guide Commission, Leader Commission */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="bg-white border border-[#DCE2D2] rounded-2xl p-4 flex flex-col justify-between">
              <div>
                <p className="text-xs text-[#646E5A]">팀 코드 / 결제 건수</p>
                <p className="text-lg sm:text-xl font-bold font-sans-num text-[#242A1F] mt-1 leading-tight break-all">
                  {activeCode}
                </p>
              </div>
              <div className="mt-2">
                <p className="text-sm font-semibold font-sans-num text-[#465436]">
                  결제 {teamMetrics.orderCount}건
                </p>
                <p className="text-xs text-[#727B69] mt-0.5 font-sans-num">
                  총 {teamMetrics.totalUnits}개 품목
                </p>
              </div>
            </div>

            <div className="bg-[#465436] text-white rounded-2xl p-4 flex flex-col justify-between min-w-0">
              <div>
                <p className="text-xs text-[#D5DEC8]">팀 전체 누적 매출</p>
                <p className="text-xl sm:text-2xl font-bold font-sans-num mt-1.5 tracking-tight truncate">
                  {formatEuro(teamMetrics.grandTotal)}
                </p>
              </div>
              <p className="text-xs text-[#C8D4B7] mt-2 font-sans-num">
                결제 {teamMetrics.orderCount}건 합계
              </p>
            </div>

            <div className="bg-[#FAF7F0] border border-[#E5DAC2] rounded-2xl p-4 flex flex-col justify-between min-w-0">
              <div>
                <p className="text-xs font-medium text-[#755E34]">가이드 커미션</p>
                <p className="text-xl sm:text-2xl font-bold font-sans-num text-[#876222] mt-1.5 tracking-tight truncate">
                  {formatEuro(teamMetrics.guideCommission)}
                </p>
              </div>
              <p className="text-xs text-[#917B51] mt-2">정산 지급액</p>
            </div>

            <div className="bg-[#FAF7F0] border border-[#E5DAC2] rounded-2xl p-4 flex flex-col justify-between min-w-0">
              <div>
                <p className="text-xs font-medium text-[#755E34]">인솔자 커미션</p>
                <p className="text-xl sm:text-2xl font-bold font-sans-num text-[#876222] mt-1.5 tracking-tight truncate">
                  {formatEuro(teamMetrics.leaderCommission)}
                </p>
              </div>
              <p className="text-xs text-[#917B51] mt-2">정산 지급액</p>
            </div>
          </div>

          {/* Aggregated Product Breakdown for the Team */}
          <div className="bg-white border border-[#DCE2D2] rounded-2xl p-5">
            <h3 className="text-sm font-bold text-[#242A1F] mb-3.5">
              {activeCode} 팀 상품별 누적 판매 수량
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {teamMetrics.aggregatedItems.map((agg) => (
                <div
                  key={agg.name}
                  className="px-3.5 py-2.5 rounded-xl bg-[#F7F8F3] border border-[#E5E9DC] flex items-center justify-between text-sm"
                >
                  <span className="font-medium text-[#242A1F] truncate mr-2">{agg.name}</span>
                  <div className="flex items-center gap-2 shrink-0 font-sans-num">
                    <span className="font-bold text-[#465436]">{agg.quantity}개</span>
                    <span className="text-xs text-[#727B69]">{formatEuro(agg.subtotal)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Individual Numbered Guest Orders (#1, #2, #3...) */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-[#242A1F]">
              결제 건별 상세 내역 ({teamOrders.length}건)
            </h3>
            {teamOrders.map((order) => (
              <div
                key={order.id}
                className="bg-white border border-[#DCE2D2] rounded-2xl p-4 sm:p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-[#EFEFE7]">
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm font-bold font-sans-num text-[#242A1F]">
                      결제 #{order.orderNumber}
                    </span>
                    <span className="text-xs text-[#8D9682]">·</span>
                    <span className="text-xs text-[#646E5A] font-sans-num">
                      {formatKoreanDateTime(order.createdAt?.toDate())}
                    </span>
                    <span className="text-xs text-[#8D9682]">·</span>
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-semibold font-sans-num ${
                        order.paymentMethod === 'cash'
                          ? 'text-[#8C6422]'
                          : order.paymentMethod === 'mixed'
                            ? 'text-[#3B5874]'
                            : 'text-[#465436]'
                      }`}
                    >
                      {order.paymentMethod === 'cash' ? (
                        <>
                          <Banknote className="w-3.5 h-3.5" />
                          현금 (5% 할인)
                        </>
                      ) : order.paymentMethod === 'mixed' ? (
                        <>
                          <CreditCard className="w-3.5 h-3.5" />
                          혼합 (카드 {formatEuro(order.cardAmount ?? 0)} · 현금{' '}
                          {formatEuro(order.cashAmount ?? 0)})
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-3.5 h-3.5" />
                          카드 (정가)
                        </>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 ml-auto font-sans-num">
                    <div className="text-right">
                      <span className="text-base font-bold text-[#242A1F]">
                        {formatEuro(order.finalTotal)}
                      </span>
                      {order.discountAmount > 0 && (
                        <span className="text-xs text-[#7A846F] ml-1.5">
                          (정가 {formatEuro(order.originalTotal)})
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => openVoidOrderModal(order)}
                      aria-label={`결제 #${order.orderNumber} 삭제`}
                      className="min-h-[34px] px-2.5 py-1 rounded-lg bg-[#FDF2F1] hover:bg-[#F9E1DE] active:scale-[0.98] text-[#9E3C2F] border border-[#F0D0CC] text-xs font-semibold inline-flex items-center gap-1 whitespace-nowrap transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      삭제
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  {order.items.map((item, idx) => (
                    <div
                      key={`${order.id}_${item.productId}_${idx}`}
                      className="flex items-center justify-between text-sm text-[#3A4333]"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{item.name}</span>
                        <span className="text-xs text-[#737D69] font-sans-num">
                          {formatEuro(item.unitPrice)} × {item.quantity}개
                        </span>
                      </div>
                      <span className="font-semibold font-sans-num text-[#242A1F]">
                        {formatEuro(item.lineTotal)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Safe Deletion Confirmation Modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1B2016]/50 backdrop-blur-[2px] p-4"
          onClick={() => !deleting && setDeleteTarget(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="판매 기록 삭제 확인"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-[#FAF9F5] border border-[#DCE2D2] rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="px-5 py-4 bg-white border-b border-[#E5E9DC] flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#9E3C2F]">
                <AlertTriangle className="w-5 h-5" />
                <h2 className="text-base font-bold text-[#242A1F]">판매 기록 삭제 확인</h2>
              </div>
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                aria-label="닫기"
                className="w-9 h-9 rounded-lg flex items-center justify-center text-[#6B7462] hover:bg-[#F1F3EA] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <p className="text-sm font-bold text-[#242A1F]">
                  {deleteTarget.label} 기록을 삭제할까요?
                </p>
                <p className="text-xs text-[#5E6755] mt-1 font-sans-num">
                  삭제 대상:{' '}
                  {deleteTarget.scope === 'month'
                    ? `${deleteTarget.teamCount}개 팀 · 결제 ${deleteTarget.orders.length}건`
                    : `결제 ${deleteTarget.orders.length}건`}
                </p>
              </div>

              {/* Explicit Inventory Preservation Notice */}
              <div className="rounded-xl bg-[#F3F5ED] border border-[#D8DFCE] p-3.5 text-xs text-[#374429] leading-relaxed space-y-1">
                <p className="font-semibold">상품 재고는 변경되거나 초기화되지 않습니다.</p>
                <p className="text-[#566349]">
                  삭제된 투어 팀 결제 기록은 복구할 수 없으므로, 먼저 엑셀(.xlsx)로 내보내셨는지
                  확인해 주세요.
                </p>
              </div>

              {/* Quick Excel Export Inside Modal */}
              <button
                type="button"
                disabled={deleting}
                onClick={() => {
                  exportSalesToExcel({
                    orders: deleteTarget.orders,
                    monthKey: deleteTarget.monthKey,
                    teamCode: deleteTarget.scope === 'team' ? deleteTarget.teamCode : undefined,
                    guideRate,
                    leaderRate,
                  });
                  setExportedInModal(true);
                  onNotify('삭제 전 엑셀 백업 파일을 저장했습니다.');
                }}
                className="w-full min-h-[44px] px-4 rounded-xl bg-white hover:bg-[#F3F5ED] border border-[#CFD8C3] text-[#354426] text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                {exportedInModal ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-[#465436]" />
                    엑셀 백업 저장 완료 (다시 저장)
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="w-4 h-4 text-[#465436]" />
                    삭제 전 먼저 엑셀(.xlsx)로 내보내기
                  </>
                )}
              </button>

              {deleteError && (
                <div className="px-3.5 py-2.5 rounded-xl bg-[#FDF2F2] border border-[#F1D0D0] text-xs text-[#9E3030]">
                  {deleteError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => setDeleteTarget(null)}
                  className="min-h-[46px] rounded-xl bg-white border border-[#D4DCC8] hover:bg-[#F2F4EC] text-[#35402A] text-sm font-semibold transition-colors cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleConfirmDelete}
                  className="min-h-[46px] rounded-xl bg-[#9E3C2F] hover:bg-[#842F24] disabled:opacity-50 text-white text-sm font-semibold transition-colors cursor-pointer"
                >
                  {deleting ? '삭제 중...' : '기록 삭제'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Individual Order Void & Stock Restoration Confirmation Modal */}
      {voidTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1B2016]/50 backdrop-blur-[2px] p-4"
          onClick={() => !voiding && setVoidTarget(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="결제 무효화 및 삭제 확인"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-[#FAF9F5] border border-[#DCE2D2] rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="px-5 py-4 bg-white border-b border-[#E5E9DC] flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#9E3C2F]">
                <RotateCcw className="w-5 h-5" />
                <h2 className="text-base font-bold text-[#242A1F]">결제 무효화 (삭제) 확인</h2>
              </div>
              <button
                type="button"
                disabled={voiding}
                onClick={() => setVoidTarget(null)}
                aria-label="닫기"
                className="w-9 h-9 rounded-lg flex items-center justify-center text-[#6B7462] hover:bg-[#F1F3EA] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <p className="text-sm font-bold text-[#242A1F] font-sans-num">
                  팀 {voidTarget.teamCode} · 결제 #{voidTarget.orderNumber}을(를) 무효화할까요?
                </p>
                <p className="text-xs text-[#5E6755] mt-1 font-sans-num">
                  {formatKoreanDateTime(voidTarget.createdAt?.toDate())} ·{' '}
                  {voidTarget.paymentMethod === 'cash'
                    ? '현금 (5% 할인)'
                    : voidTarget.paymentMethod === 'mixed'
                      ? `혼합 (카드 ${formatEuro(voidTarget.cardAmount ?? 0)} · 현금 ${formatEuro(voidTarget.cashAmount ?? 0)})`
                      : '카드 (정가)'}{' '}
                  · <strong className="text-[#242A1F]">{formatEuro(voidTarget.finalTotal)}</strong>
                </p>
              </div>

              {/* Explicit Revenue Void + Stock Restoration Breakdown */}
              <div className="rounded-xl bg-[#FFF8EC] border border-[#EBD8B7] p-3.5 text-xs text-[#6B4A16] leading-relaxed space-y-2">
                <p className="font-bold text-[#5A3D10]">
                  매출·커미션에서 즉시 제외되며 아래 재고가 원래대로 복구됩니다.
                </p>
                <div className="space-y-1 pt-1 border-t border-[#EBD8B7]/70">
                  {voidTarget.items.map((item, idx) => (
                    <div
                      key={`${voidTarget.id}_void_${item.productId}_${idx}`}
                      className="flex items-center justify-between gap-2 font-sans-num"
                    >
                      <span className="text-[#3E3524] font-medium truncate">{item.name}</span>
                      <span className="font-bold text-[#465436] shrink-0">
                        +{item.quantity}개 재고 복구
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {voidError && (
                <div className="px-3.5 py-2.5 rounded-xl bg-[#FDF2F2] border border-[#F1D0D0] text-xs text-[#9E3030] break-words">
                  {voidError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  disabled={voiding}
                  onClick={() => setVoidTarget(null)}
                  className="min-h-[46px] rounded-xl bg-white border border-[#D4DCC8] hover:bg-[#F2F4EC] text-[#35402A] text-sm font-semibold transition-colors cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="button"
                  disabled={voiding}
                  onClick={handleConfirmVoidOrder}
                  className="min-h-[46px] rounded-xl bg-[#9E3C2F] hover:bg-[#842F24] disabled:opacity-50 text-white text-sm font-semibold transition-colors cursor-pointer"
                >
                  {voiding ? '무효화 처리 중...' : '결제 삭제 및 재고 복구'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
