import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, Minus, Percent, Plus, RotateCcw } from 'lucide-react';
import { DEFAULT_COMMISSION_RATES, type Order } from '../types/shop';
import { formatEuro, roundEuro } from '../utils/format';

interface CommissionViewProps {
  guideRate: number;
  leaderRate: number;
  orders: Order[];
  onSaveRates: (rates: { guideRate: number; leaderRate: number }) => Promise<void>;
  onOpenTeamLookup: (teamCode: string) => void;
  onBackToCatalog: () => void;
}

const PRESET_RATES = [5, 8, 10, 12, 15];

function clampRate(val: number): number {
  if (Number.isNaN(val)) return 0;
  return Math.min(100, Math.max(0, roundEuro(val)));
}

export const CommissionView: React.FC<CommissionViewProps> = ({
  guideRate,
  leaderRate,
  orders,
  onSaveRates,
  onOpenTeamLookup,
  onBackToCatalog,
}) => {
  const [draftGuide, setDraftGuide] = useState<string>(String(guideRate));
  const [draftLeader, setDraftLeader] = useState<string>(String(leaderRate));
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setDraftGuide(String(guideRate));
    setDraftLeader(String(leaderRate));
  }, [guideRate, leaderRate]);

  const parsedGuide = clampRate(parseFloat(draftGuide));
  const parsedLeader = clampRate(parseFloat(draftLeader));
  const hasChanges = parsedGuide !== guideRate || parsedLeader !== leaderRate;

  const teamBreakdown = useMemo(() => {
    const map = new Map<string, { teamCode: string; orderCount: number; totalRevenue: number }>();
    for (const order of orders) {
      const prev = map.get(order.teamCode) ?? {
        teamCode: order.teamCode,
        orderCount: 0,
        totalRevenue: 0,
      };
      prev.orderCount += 1;
      prev.totalRevenue = roundEuro(prev.totalRevenue + order.finalTotal);
      map.set(order.teamCode, prev);
    }

    const rows = Array.from(map.values())
      .map((row) => {
        const guideAmount = roundEuro(row.totalRevenue * (parsedGuide / 100));
        const leaderAmount = roundEuro(row.totalRevenue * (parsedLeader / 100));
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
        revenue: roundEuro(acc.revenue + r.totalRevenue),
        guide: roundEuro(acc.guide + r.guideAmount),
        leader: roundEuro(acc.leader + r.leaderAmount),
      }),
      { revenue: 0, guide: 0, leader: 0 }
    );

    return { rows, totals };
  }, [orders, parsedGuide, parsedLeader]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    try {
      await onSaveRates({
        guideRate: parsedGuide,
        leaderRate: parsedLeader,
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '커미션 비율 저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setDraftGuide(String(DEFAULT_COMMISSION_RATES.guideRate));
    setDraftLeader(String(DEFAULT_COMMISSION_RATES.leaderRate));
  };

  const adjustDraft = (
    setter: React.Dispatch<React.SetStateAction<string>>,
    current: number,
    delta: number
  ) => {
    setter(String(clampRate(current + delta)));
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
          가이드와 인솔자의 커미션 비율을 설정하면 팀별 구매 조회 및 엑셀 정산에 실시간 반영됩니다.
        </p>
      </div>

      {/* Commission Rate Editor Form */}
      <form onSubmit={handleSave} className="space-y-5 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Guide Commission Rate Card */}
          <div className="bg-white border border-[#DCE2D2] rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[#242A1F]">가이드 커미션 비율</h2>
                <p className="text-xs text-[#6B7462] mt-0.5">팀 전체 누적 매출 기준 (기본 10%)</p>
              </div>
              <span className="text-2xl font-bold font-sans-num text-[#465436]">
                {parsedGuide}%
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => adjustDraft(setDraftGuide, parsedGuide, -0.5)}
                aria-label="가이드 커미션 0.5% 감소"
                className="min-w-[44px] min-h-[44px] rounded-xl bg-[#F2F4EC] hover:bg-[#E4E9D9] text-[#2E3823] flex items-center justify-center transition-colors cursor-pointer"
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
                  aria-label="가이드 커미션 비율 입력"
                  value={draftGuide}
                  onChange={(e) => setDraftGuide(e.target.value)}
                  className="w-full h-[44px] pl-4 pr-9 rounded-xl bg-[#FAF9F5] border border-[#D4DCC8] text-center text-base font-bold font-sans-num text-[#242A1F] focus:outline-none focus:ring-2 focus:ring-[#465436]"
                />
                <Percent className="w-4 h-4 text-[#77826B] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <button
                type="button"
                onClick={() => adjustDraft(setDraftGuide, parsedGuide, 0.5)}
                aria-label="가이드 커미션 0.5% 증가"
                className="min-w-[44px] min-h-[44px] rounded-xl bg-[#F2F4EC] hover:bg-[#E4E9D9] text-[#2E3823] flex items-center justify-center transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {PRESET_RATES.map((rate) => (
                <button
                  key={`guide_${rate}`}
                  type="button"
                  onClick={() => setDraftGuide(String(rate))}
                  className={`min-h-[34px] px-3 rounded-lg text-xs font-semibold font-sans-num transition-colors cursor-pointer ${
                    parsedGuide === rate
                      ? 'bg-[#465436] text-white'
                      : 'bg-[#F3F5ED] text-[#4A5A39] hover:bg-[#E5EAD9]'
                  }`}
                >
                  {rate}%
                </button>
              ))}
            </div>
          </div>

          {/* Tour Leader Commission Rate Card */}
          <div className="bg-white border border-[#DCE2D2] rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[#242A1F]">인솔자 커미션 비율</h2>
                <p className="text-xs text-[#6B7462] mt-0.5">팀 전체 누적 매출 기준 (기본 10%)</p>
              </div>
              <span className="text-2xl font-bold font-sans-num text-[#3B5874]">
                {parsedLeader}%
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => adjustDraft(setDraftLeader, parsedLeader, -0.5)}
                aria-label="인솔자 커미션 0.5% 감소"
                className="min-w-[44px] min-h-[44px] rounded-xl bg-[#EEF3F8] hover:bg-[#E1EAF3] text-[#253B50] flex items-center justify-center transition-colors cursor-pointer"
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
                  aria-label="인솔자 커미션 비율 입력"
                  value={draftLeader}
                  onChange={(e) => setDraftLeader(e.target.value)}
                  className="w-full h-[44px] pl-4 pr-9 rounded-xl bg-[#FAF9F5] border border-[#CFDCE8] text-center text-base font-bold font-sans-num text-[#242A1F] focus:outline-none focus:ring-2 focus:ring-[#3B5874]"
                />
                <Percent className="w-4 h-4 text-[#6B8197] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <button
                type="button"
                onClick={() => adjustDraft(setDraftLeader, parsedLeader, 0.5)}
                aria-label="인솔자 커미션 0.5% 증가"
                className="min-w-[44px] min-h-[44px] rounded-xl bg-[#EEF3F8] hover:bg-[#E1EAF3] text-[#253B50] flex items-center justify-center transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {PRESET_RATES.map((rate) => (
                <button
                  key={`leader_${rate}`}
                  type="button"
                  onClick={() => setDraftLeader(String(rate))}
                  className={`min-h-[34px] px-3 rounded-lg text-xs font-semibold font-sans-num transition-colors cursor-pointer ${
                    parsedLeader === rate
                      ? 'bg-[#3B5874] text-white'
                      : 'bg-[#F0F5FA] text-[#3B5874] hover:bg-[#E1ECF6]'
                  }`}
                >
                  {rate}%
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Save Action Bar & Live € 1,000 Example */}
        <div className="bg-[#465436] text-white rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-xs sm:text-sm space-y-1 font-sans-num">
            <p className="text-[#D5DEC8]">매출 € 1,000 기준 예상 커미션</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span>
                가이드{' '}
                <strong className="text-[#F0DBA8]">
                  {formatEuro(roundEuro(1000 * (parsedGuide / 100)))}
                </strong>
              </span>
              <span className="text-white/30">·</span>
              <span>
                인솔자{' '}
                <strong className="text-[#F0DBA8]">
                  {formatEuro(roundEuro(1000 * (parsedLeader / 100)))}
                </strong>
              </span>
              <span className="text-white/30">·</span>
              <span>
                합계{' '}
                <strong className="text-white">
                  {formatEuro(roundEuro(1000 * ((parsedGuide + parsedLeader) / 100)))}
                </strong>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="min-h-[44px] px-3.5 rounded-xl bg-white/12 hover:bg-white/20 text-[#F3F4EC] text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              기본값 10%
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
            <p className="text-xs text-[#6B7462] mt-0.5">
              현재 설정된 비율(가이드 {parsedGuide}% · 인솔자 {parsedLeader}%) 기준 자동 계산
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
                    <td className="py-3.5 px-4 text-right font-semibold text-[#242A1F]">
                      {formatEuro(row.totalRevenue)}
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
                    {formatEuro(teamBreakdown.totals.revenue)}
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
