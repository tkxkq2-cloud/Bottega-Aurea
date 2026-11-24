import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Banknote,
  Check,
  CreditCard,
  Minus,
  Percent,
  Plus,
  RotateCcw,
} from 'lucide-react';
import {
  DEFAULT_COMMISSION_RATES,
  type CommissionRates,
  type Order,
} from '../types/shop';
import {
  calculateSplitCommission,
  formatEuro,
  getOrderPaymentBreakdown,
  roundEuro,
} from '../utils/format';

interface CommissionViewProps {
  commissionRates: CommissionRates;
  orders: Order[];
  onSaveRates: (rates: CommissionRates) => Promise<void>;
  onOpenTeamLookup: (teamCode: string) => void;
  onBackToCatalog: () => void;
}

const PRESET_RATES = [5, 8, 9, 10, 12, 15];

function clampRate(val: number): number {
  if (Number.isNaN(val)) return 0;
  return Math.min(100, Math.max(0, roundEuro(val)));
}

interface RateControlRowProps {
  idPrefix: string;
  label: string;
  defaultNote: string;
  icon: React.ReactNode;
  draft: string;
  parsed: number;
  accent: 'olive' | 'slate';
  onChangeDraft: (val: string) => void;
}

const RateControlRow: React.FC<RateControlRowProps> = ({
  idPrefix,
  label,
  defaultNote,
  icon,
  draft,
  parsed,
  accent,
  onChangeDraft,
}) => {
  const isOlive = accent === 'olive';
  const adjust = (delta: number) => {
    onChangeDraft(String(clampRate(parsed + delta)));
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className={isOlive ? 'text-[#465436]' : 'text-[#3B5874]'}>{icon}</span>
          <span className="text-sm font-bold text-[#242A1F]">{label}</span>
          <span className="text-xs text-[#737D69]">{defaultNote}</span>
        </div>
        <span
          className={`text-lg font-bold font-sans-num ${
            isOlive ? 'text-[#465436]' : 'text-[#3B5874]'
          }`}
        >
          {parsed}%
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => adjust(-0.5)}
          aria-label={`${label} 0.5% 감소`}
          className={`min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
            isOlive
              ? 'bg-[#F2F4EC] hover:bg-[#E4E9D9] text-[#2E3823]'
              : 'bg-[#EEF3F8] hover:bg-[#E1EAF3] text-[#253B50]'
          }`}
        >
          <Minus className="w-4 h-4" />
        </button>

        <div className="relative flex-1">
          <input
            type="number"
            inputMode="decimal"
            step="0.5"
            min={0}
            max={100}
            aria-label={`${label} 비율 입력`}
            value={draft}
            onChange={(e) => onChangeDraft(e.target.value)}
            className={`w-full h-[44px] pl-4 pr-9 rounded-xl bg-[#FAF9F5] border text-center text-base font-bold font-sans-num text-[#242A1F] focus:outline-none focus:ring-2 ${
              isOlive
                ? 'border-[#D4DCC8] focus:ring-[#465436]'
                : 'border-[#CFDCE8] focus:ring-[#3B5874]'
            }`}
          />
          <Percent
            className={`w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${
              isOlive ? 'text-[#77826B]' : 'text-[#6B8197]'
            }`}
          />
        </div>

        <button
          type="button"
          onClick={() => adjust(0.5)}
          aria-label={`${label} 0.5% 증가`}
          className={`min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
            isOlive
              ? 'bg-[#F2F4EC] hover:bg-[#E4E9D9] text-[#2E3823]'
              : 'bg-[#EEF3F8] hover:bg-[#E1EAF3] text-[#253B50]'
          }`}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {PRESET_RATES.map((rate) => (
          <button
            key={`${idPrefix}_${rate}`}
            type="button"
            onClick={() => onChangeDraft(String(rate))}
            className={`min-h-[34px] px-3 rounded-lg text-xs font-semibold font-sans-num transition-colors cursor-pointer ${
              parsed === rate
                ? isOlive
                  ? 'bg-[#465436] text-white'
                  : 'bg-[#3B5874] text-white'
                : isOlive
                  ? 'bg-[#F3F5ED] text-[#4A5A39] hover:bg-[#E5EAD9]'
                  : 'bg-[#F0F5FA] text-[#3B5874] hover:bg-[#E1ECF6]'
            }`}
          >
            {rate}%
          </button>
        ))}
      </div>
    </div>
  );
};

export const CommissionView: React.FC<CommissionViewProps> = ({
  commissionRates,
  orders,
  onSaveRates,
  onOpenTeamLookup,
  onBackToCatalog,
}) => {
  const [draftGuideCash, setDraftGuideCash] = useState<string>(
    String(commissionRates.guideCashRate)
  );
  const [draftGuideCard, setDraftGuideCard] = useState<string>(
    String(commissionRates.guideCardRate)
  );
  const [draftLeaderCash, setDraftLeaderCash] = useState<string>(
    String(commissionRates.leaderCashRate)
  );
  const [draftLeaderCard, setDraftLeaderCard] = useState<string>(
    String(commissionRates.leaderCardRate)
  );
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setDraftGuideCash(String(commissionRates.guideCashRate));
    setDraftGuideCard(String(commissionRates.guideCardRate));
    setDraftLeaderCash(String(commissionRates.leaderCashRate));
    setDraftLeaderCard(String(commissionRates.leaderCardRate));
  }, [
    commissionRates.guideCashRate,
    commissionRates.guideCardRate,
    commissionRates.leaderCashRate,
    commissionRates.leaderCardRate,
  ]);

  const parsedGuideCash = clampRate(parseFloat(draftGuideCash));
  const parsedGuideCard = clampRate(parseFloat(draftGuideCard));
  const parsedLeaderCash = clampRate(parseFloat(draftLeaderCash));
  const parsedLeaderCard = clampRate(parseFloat(draftLeaderCard));

  const hasChanges =
    parsedGuideCash !== commissionRates.guideCashRate ||
    parsedGuideCard !== commissionRates.guideCardRate ||
    parsedLeaderCash !== commissionRates.leaderCashRate ||
    parsedLeaderCard !== commissionRates.leaderCardRate;

  const teamBreakdown = useMemo(() => {
    const map = new Map<
      string,
      {
        teamCode: string;
        orderCount: number;
        cardTotal: number;
        cashTotal: number;
        totalRevenue: number;
      }
    >();

    for (const order of orders) {
      const prev = map.get(order.teamCode) ?? {
        teamCode: order.teamCode,
        orderCount: 0,
        cardTotal: 0,
        cashTotal: 0,
        totalRevenue: 0,
      };
      const breakdown = getOrderPaymentBreakdown(order);
      prev.orderCount += 1;
      prev.cardTotal = roundEuro(prev.cardTotal + breakdown.cardAmount);
      prev.cashTotal = roundEuro(prev.cashTotal + breakdown.cashAmount);
      prev.totalRevenue = roundEuro(prev.totalRevenue + order.finalTotal);
      map.set(order.teamCode, prev);
    }

    const rows = Array.from(map.values())
      .map((row) => {
        const guideAmount = calculateSplitCommission(
          row.cardTotal,
          row.cashTotal,
          parsedGuideCard,
          parsedGuideCash
        );
        const leaderAmount = calculateSplitCommission(
          row.cardTotal,
          row.cashTotal,
          parsedLeaderCard,
          parsedLeaderCash
        );
        return {
          ...row,
          guideAmount,
          leaderAmount,
          combinedCommission: roundEuro(guideAmount + leaderAmount),
        };
      })
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    const totals = rows.reduce(
      (acc, r) => ({
        card: roundEuro(acc.card + r.cardTotal),
        cash: roundEuro(acc.cash + r.cashTotal),
        revenue: roundEuro(acc.revenue + r.totalRevenue),
        guide: roundEuro(acc.guide + r.guideAmount),
        leader: roundEuro(acc.leader + r.leaderAmount),
      }),
      { card: 0, cash: 0, revenue: 0, guide: 0, leader: 0 }
    );

    return { rows, totals };
  }, [orders, parsedGuideCard, parsedGuideCash, parsedLeaderCard, parsedLeaderCash]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    try {
      await onSaveRates({
        guideCashRate: parsedGuideCash,
        guideCardRate: parsedGuideCard,
        leaderCashRate: parsedLeaderCash,
        leaderCardRate: parsedLeaderCard,
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '커미션 비율 저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setDraftGuideCash(String(DEFAULT_COMMISSION_RATES.guideCashRate));
    setDraftGuideCard(String(DEFAULT_COMMISSION_RATES.guideCardRate));
    setDraftLeaderCash(String(DEFAULT_COMMISSION_RATES.leaderCashRate));
    setDraftLeaderCard(String(DEFAULT_COMMISSION_RATES.leaderCardRate));
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
        <h1 className="text-2xl font-bold text-[#242A1F] tracking-tight">커미션 관리</h1>
        <p className="text-sm text-[#616B57] mt-0.5">
          현금 결제액과 카드 결제액의 커미션 비율을 각각 설정하면 혼합 결제를 포함한 팀별 조회 및
          엑셀 정산에 실시간 반영됩니다.
        </p>
      </div>

      {/* Commission Rate Editor Form */}
      <form onSubmit={handleSave} className="space-y-5 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Guide Commission Rate Card */}
          <div className="bg-white border border-[#DCE2D2] rounded-2xl p-5 space-y-4">
            <div className="flex items-start justify-between gap-2 pb-3 border-b border-[#EFEFE7]">
              <div>
                <h2 className="text-base font-bold text-[#242A1F]">가이드 커미션 비율</h2>
                <p className="text-xs text-[#6B7462] mt-0.5">
                  혼합 결제 시 현금·카드 금액별 각각 적용
                </p>
              </div>
              <div className="text-right font-sans-num text-xs font-semibold text-[#465436] shrink-0 leading-relaxed">
                <div>현금 {parsedGuideCash}%</div>
                <div>카드 {parsedGuideCard}%</div>
              </div>
            </div>

            <RateControlRow
              idPrefix="guide_cash"
              label="현금 결제액"
              defaultNote="(기본 10%)"
              icon={<Banknote className="w-4 h-4" />}
              draft={draftGuideCash}
              parsed={parsedGuideCash}
              accent="olive"
              onChangeDraft={setDraftGuideCash}
            />

            <div className="border-t border-[#EFEFE7] pt-4">
              <RateControlRow
                idPrefix="guide_card"
                label="카드 결제액"
                defaultNote="(기본 9%)"
                icon={<CreditCard className="w-4 h-4" />}
                draft={draftGuideCard}
                parsed={parsedGuideCard}
                accent="olive"
                onChangeDraft={setDraftGuideCard}
              />
            </div>
          </div>

          {/* Tour Leader Commission Rate Card */}
          <div className="bg-white border border-[#DCE2D2] rounded-2xl p-5 space-y-4">
            <div className="flex items-start justify-between gap-2 pb-3 border-b border-[#EFEFE7]">
              <div>
                <h2 className="text-base font-bold text-[#242A1F]">인솔자 커미션 비율</h2>
                <p className="text-xs text-[#6B7462] mt-0.5">
                  혼합 결제 시 현금·카드 금액별 각각 적용
                </p>
              </div>
              <div className="text-right font-sans-num text-xs font-semibold text-[#3B5874] shrink-0 leading-relaxed">
                <div>현금 {parsedLeaderCash}%</div>
                <div>카드 {parsedLeaderCard}%</div>
              </div>
            </div>

            <RateControlRow
              idPrefix="leader_cash"
              label="현금 결제액"
              defaultNote="(기본 10%)"
              icon={<Banknote className="w-4 h-4" />}
              draft={draftLeaderCash}
              parsed={parsedLeaderCash}
              accent="slate"
              onChangeDraft={setDraftLeaderCash}
            />

            <div className="border-t border-[#EFEFE7] pt-4">
              <RateControlRow
                idPrefix="leader_card"
                label="카드 결제액"
                defaultNote="(기본 9%)"
                icon={<CreditCard className="w-4 h-4" />}
                draft={draftLeaderCard}
                parsed={parsedLeaderCard}
                accent="slate"
                onChangeDraft={setDraftLeaderCard}
              />
            </div>
          </div>
        </div>

        {/* Save Action Bar & Live € 1,000 Example */}
        <div className="bg-[#465436] text-white rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="text-xs sm:text-sm space-y-1.5 font-sans-num">
            <p className="text-[#D5DEC8]">결제 수단별 € 1,000 기준 예상 커미션</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-[#DCE4D0] font-semibold">현금 € 1,000</span>
              <span>
                가이드{' '}
                <strong className="text-[#F0DBA8]">
                  {formatEuro(roundEuro(1000 * (parsedGuideCash / 100)))}
                </strong>
              </span>
              <span className="text-white/30">·</span>
              <span>
                인솔자{' '}
                <strong className="text-[#F0DBA8]">
                  {formatEuro(roundEuro(1000 * (parsedLeaderCash / 100)))}
                </strong>
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-[#DCE4D0] font-semibold">카드 € 1,000</span>
              <span>
                가이드{' '}
                <strong className="text-[#F0DBA8]">
                  {formatEuro(roundEuro(1000 * (parsedGuideCard / 100)))}
                </strong>
              </span>
              <span className="text-white/30">·</span>
              <span>
                인솔자{' '}
                <strong className="text-[#F0DBA8]">
                  {formatEuro(roundEuro(1000 * (parsedLeaderCard / 100)))}
                </strong>
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="min-h-[44px] px-3.5 rounded-xl bg-white/12 hover:bg-white/20 text-[#F3F4EC] text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              기본값 (현금 10% · 카드 9%)
            </button>

            <button
              type="submit"
              disabled={saving || !hasChanges}
              className="min-h-[44px] px-5 rounded-xl bg-[#C9A66B] hover:bg-[#D5B57D] disabled:opacity-50 text-[#1E2418] text-sm font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              <Check className="w-4 h-4" />
              {saving ? '저장 중...' : hasChanges ? '비율 저장' : '저장됨'}
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="px-4 py-3 rounded-xl bg-[#FDF2F2] border border-[#F1D0D0] text-xs text-[#9E3030] font-medium">
            {errorMsg}
          </div>
        )}
      </form>

      {/* Real-Time Team Commission Breakdown Table */}
      <div className="bg-white border border-[#DCE2D2] rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#EFEFE7] flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-[#242A1F]">기록된 팀별 커미션 현황</h3>
            <p className="text-xs text-[#6B7462] mt-0.5 font-sans-num">
              가이드 (현금 {parsedGuideCash}% · 카드 {parsedGuideCard}%) / 인솔자 (현금{' '}
              {parsedLeaderCash}% · 카드 {parsedLeaderCard}%) 기준 자동 계산
            </p>
          </div>
          {teamBreakdown.rows.length > 0 && (
            <div className="text-xs font-sans-num text-[#465436] font-semibold">
              총 커미션 지급 예정{' '}
              <span className="text-sm font-bold">
                {formatEuro(roundEuro(teamBreakdown.totals.guide + teamBreakdown.totals.leader))}
              </span>
            </div>
          )}
        </div>

        {teamBreakdown.rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-[#6B7462]">
            아직 기록된 팀 매출 내역이 없습니다. 판매 화면에서 결제가 완료되면 팀별 커미션이 자동
            집계됩니다.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F7F8F3] border-b border-[#E5E9DC] text-xs font-semibold text-[#5C6652]">
                  <th className="py-3 px-4">팀 코드</th>
                  <th className="py-3 px-4 text-right">결제 건수</th>
                  <th className="py-3 px-4 text-right">팀 누적 매출</th>
                  <th className="py-3 px-4 text-right">가이드 커미션</th>
                  <th className="py-3 px-4 text-right">인솔자 커미션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFEFE7] text-sm font-sans-num">
                {teamBreakdown.rows.map((row) => (
                  <tr
                    key={row.teamCode}
                    onClick={() => onOpenTeamLookup(row.teamCode)}
                    className="hover:bg-[#FAFBF7] transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 px-4 font-bold text-[#242A1F]">{row.teamCode}</td>
                    <td className="py-3.5 px-4 text-right text-[#646E5A]">{row.orderCount}건</td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="font-semibold text-[#242A1F]">
                        {formatEuro(row.totalRevenue)}
                      </div>
                      <div className="text-[11px] text-[#7A8470] mt-0.5">
                        현금 {formatEuro(row.cashTotal)} · 카드 {formatEuro(row.cardTotal)}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-[#465436]">
                      {formatEuro(row.guideAmount)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-[#3B5874]">
                      {formatEuro(row.leaderAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[#F3F5ED] border-t border-[#DCE2D2] text-sm font-bold font-sans-num text-[#242A1F]">
                  <td className="py-3.5 px-4">합계 ({teamBreakdown.rows.length}팀)</td>
                  <td className="py-3.5 px-4 text-right">{orders.length}건</td>
                  <td className="py-3.5 px-4 text-right">
                    <div>{formatEuro(teamBreakdown.totals.revenue)}</div>
                    <div className="text-[11px] font-medium text-[#5E6954] mt-0.5">
                      현금 {formatEuro(teamBreakdown.totals.cash)} · 카드{' '}
                      {formatEuro(teamBreakdown.totals.card)}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right text-[#465436]">
                    {formatEuro(teamBreakdown.totals.guide)}
                  </td>
                  <td className="py-3.5 px-4 text-right text-[#3B5874]">
                    {formatEuro(teamBreakdown.totals.leader)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </section>
  );
};
