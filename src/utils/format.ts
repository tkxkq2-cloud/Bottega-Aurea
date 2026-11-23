import { SCHEMA_LIMITS } from '../types/shop';

export const CASH_DISCOUNT_RATE = 0.05;

export function roundEuro(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateCashPrice(cardTotal: number): number {
  return roundEuro(cardTotal * (1 - CASH_DISCOUNT_RATE));
}

export function calculateCashDiscount(cardTotal: number): number {
  return roundEuro(cardTotal - calculateCashPrice(cardTotal));
}

/**
 * Formats Euro amounts cleanly: € 50 for whole numbers, € 47.50 for decimals.
 */
export function formatEuro(value: number): string {
  const rounded = roundEuro(value);
  if (Number.isInteger(rounded)) {
    return `€ ${rounded.toLocaleString('en-US')}`;
  }
  return `€ ${rounded.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Normalizes a user-typed team code into uppercase valid Firestore ID format.
 */
export function sanitizeTeamCode(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '-')
    .replace(/[^A-Z0-9_-]/g, '')
    .slice(0, SCHEMA_LIMITS.TEAM_CODE_MAX);
}

export function isValidTeamCode(code: string): boolean {
  return (
    code.length >= 1 &&
    code.length <= SCHEMA_LIMITS.TEAM_CODE_MAX &&
    SCHEMA_LIMITS.ID_PATTERN.test(code)
  );
}

export function formatKoreanDateTime(date: Date | null | undefined): string {
  if (!date) return '방금 전';
  return new Intl.DateTimeFormat('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

/**
 * Compresses a selected image file into a lightweight JPEG data URI (<150KB)
 * so it stays well within Firestore document size limits and schema constraints.
 */
export function compressImageFileToDataUrl(file: File, maxDimension = 480): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('이미지 파일을 읽을 수 없습니다.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('올바른 이미지 형식이 아닙니다.'));
      img.onload = () => {
        const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('이미지 변환 컨텍스트를 생성하지 못했습니다.'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.78;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);
        while (dataUrl.length > 160000 && quality > 0.35) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }
        if (dataUrl.length > SCHEMA_LIMITS.PRODUCT_IMAGE_MAX) {
          reject(new Error('이미지 용량이 너무 큽니다. 더 작은 이미지를 선택해 주세요.'));
          return;
        }
        resolve(dataUrl);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
