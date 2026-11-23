import * as XLSX from 'xlsx';
import type { Order } from '../types/shop';
import { roundEuro } from './format';

export interface ExportSalesExcelParams {
  orders: Order[];
  monthKey: string; // 'YYYY-MM'
  teamCode?: string; // if provided, exports single team scope
  guideRate?: number; // percentage, default 10
  leaderRate?: number; // percentage, default 10
}

function formatExcelDateTime(date: Date | null | undefined): string {
  if (!date) return '';
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

export function exportSalesToExcel({
  orders,
  monthKey,
  teamCode,
  guideRate = 10,
  leaderRate = 10,
}: ExportSalesExcelParams): string {
  const sortedOrders = [...orders].sort((a, b) => {
    const codeCmp = a.teamCode.localeCompare(b.teamCode, 'en');
    if (codeCmp !== 0) return codeCmp;
    if (a.orderNumber !== b.orderNumber) return a.orderNumber - b.orderNumber;
    return (a.createdAt?.toMillis() ?? 0) - (b.createdAt?.toMillis() ?? 0);
  });

  // Sheet 1: 팀별 요약 (가이드·인솔자 커미션 포함)
  const teamMap = new Map<
    string,
    {
      teamCode: string;
      orderCount: number;
      totalUnits: number;
      cardTotal: number;
      cashTotal: number;
      grandTotal: number;
      lastOrderMs: number;
      lastOrderDate: Date | null;
    }
  >();

  for (const order of sortedOrders) {
    const existing = teamMap.get(order.teamCode) ?? {
      teamCode: order.teamCode,
      orderCount: 0,
      totalUnits: 0,
      cardTotal: 0,
      cashTotal: 0,
      grandTotal: 0,
      lastOrderMs: 0,
      lastOrderDate: null,
    };

    existing.orderCount += 1;
    existing.totalUnits += order.totalQuantity;
    if (order.paymentMethod === 'card') {
      existing.cardTotal = roundEuro(existing.cardTotal + order.finalTotal);
    } else {
      existing.cashTotal = roundEuro(existing.cashTotal + order.finalTotal);
    }
    existing.grandTotal = roundEuro(existing.grandTotal + order.finalTotal);

    const ms = order.createdAt?.toMillis() ?? 0;
    if (ms >= existing.lastOrderMs) {
      existing.lastOrderMs = ms;
      existing.lastOrderDate = order.createdAt?.toDate() ?? null;
    }
    teamMap.set(order.teamCode, existing);
  }

  const teamRows = Array.from(teamMap.values()).sort((a, b) =>
    a.teamCode.localeCompare(b.teamCode, 'en')
  );

  const guideColLabel = `가이드 커미션 ${guideRate}% (€)`;
  const leaderColLabel = `인솔자 커미션 ${leaderRate}% (€)`;
  const afterCommissionColLabel = '커미션 공제 후 매출 (€)';

  let sumOrders = 0;
  let sumUnits = 0;
  let sumCard = 0;
  let sumCash = 0;
  let sumGrand = 0;
  let sumGuideComm = 0;
  let sumLeaderComm = 0;
  let sumAfterCommission = 0;

  const summarySheetData = teamRows.map((row) => {
    const guideComm = roundEuro(row.grandTotal * (guideRate / 100));
    const leaderComm = roundEuro(row.grandTotal * (leaderRate / 100));
    const afterCommission = roundEuro(row.grandTotal - guideComm - leaderComm);

    sumOrders += row.orderCount;
    sumUnits += row.totalUnits;
    sumCard = roundEuro(sumCard + row.cardTotal);
    sumCash = roundEuro(sumCash + row.cashTotal);
    sumGrand = roundEuro(sumGrand + row.grandTotal);
    sumGuideComm = roundEuro(sumGuideComm + guideComm);
    sumLeaderComm = roundEuro(sumLeaderComm + leaderComm);
    sumAfterCommission = roundEuro(sumAfterCommission + afterCommission);

    return {
      '정산 월': monthKey,
      '팀 코드': row.teamCode,
      '결제 건수': row.orderCount,
      '총 판매 수량': row.totalUnits,
      '카드 합계 (€)': row.cardTotal,
      '현금 합계 (€)': row.cashTotal,
      '총 매출 (€)': row.grandTotal,
      [guideColLabel]: guideComm,
      [leaderColLabel]: leaderComm,
      [afterCommissionColLabel]: afterCommission,
      '최근 결제 일시': formatExcelDateTime(row.lastOrderDate),
    };
  });

  if (summarySheetData.length > 0) {
    summarySheetData.push({
      '정산 월': '합계',
      '팀 코드': `총 ${teamRows.length}팀`,
      '결제 건수': sumOrders,
      '총 판매 수량': sumUnits,
      '카드 합계 (€)': sumCard,
      '현금 합계 (€)': sumCash,
      '총 매출 (€)': sumGrand,
      [guideColLabel]: sumGuideComm,
      [leaderColLabel]: sumLeaderComm,
      [afterCommissionColLabel]: sumAfterCommission,
      '최근 결제 일시': '',
    });
  }

  // Sheet 2: 건별 상세 내역 (결제 1건당 1행으로 깔끔하게 정리)
  const detailSheetData = sortedOrders.map((order) => {
    const dt = formatExcelDateTime(order.createdAt?.toDate());
    const methodLabel = order.paymentMethod === 'cash' ? '현금 (5% 할인)' : '카드 (정가)';
    const itemsSummary = order.items.map((item) => `${item.name} ×${item.quantity}`).join(', ');

    return {
      '결제 일시': dt,
      '팀 코드': order.teamCode,
      '결제 번호': `#${order.orderNumber}`,
      '결제 수단': methodLabel,
      '구매 품목': itemsSummary,
      '총 수량': order.totalQuantity,
      '정가 합계 (€)': order.originalTotal,
      '현금 할인 (€)': order.discountAmount,
      '최종 결제액 (€)': order.finalTotal,
    };
  });

  const workbook = XLSX.utils.book_new();

  const summarySheet = XLSX.utils.json_to_sheet(summarySheetData);
  summarySheet['!cols'] = [
    { wch: 11 },
    { wch: 15 },
    { wch: 11 },
    { wch: 13 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 20 },
    { wch: 20 },
    { wch: 22 },
    { wch: 19 },
  ];
  XLSX.utils.book_append_sheet(workbook, summarySheet, '팀별 요약');

  const detailSheet = XLSX.utils.json_to_sheet(detailSheetData);
  detailSheet['!cols'] = [
    { wch: 18 },
    { wch: 14 },
    { wch: 10 },
    { wch: 15 },
    { wch: 42 },
    { wch: 9 },
    { wch: 14 },
    { wch: 14 },
    { wch: 15 },
  ];
  XLSX.utils.book_append_sheet(workbook, detailSheet, '건별 상세 내역');

  const filename = teamCode
    ? `BottegaAurea_팀구매내역_${teamCode}_${monthKey}.xlsx`
    : `BottegaAurea_월별구매내역_${monthKey}.xlsx`;

  XLSX.writeFile(workbook, filename);
  return filename;
}
