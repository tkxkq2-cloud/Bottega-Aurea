const INTERNAL_STORE_DOMAIN = '@store.bottegaaurea.app';

const STORE_ID_PATTERN = /^[a-z0-9._-]{2,40}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface NormalizedStoreIdentifier {
  email: string;
  displayLabel: string;
  isStoreId: boolean;
}

/**
 * Accepts either a plain Store ID (e.g. "bottega01", "venice-main")
 * or a standard email address (e.g. "shop@example.com") and normalizes it
 * into a Firebase Email/Password compatible email string.
 */
export function normalizeStoreIdentifier(rawInput: string): NormalizedStoreIdentifier | null {
  const trimmed = rawInput.trim().toLowerCase();
  if (!trimmed) return null;

  if (trimmed.includes('@')) {
    if (!EMAIL_PATTERN.test(trimmed)) return null;
    return {
      email: trimmed,
      displayLabel: trimmed,
      isStoreId: false,
    };
  }

  if (!STORE_ID_PATTERN.test(trimmed)) return null;
  return {
    email: `${trimmed}${INTERNAL_STORE_DOMAIN}`,
    displayLabel: trimmed,
    isStoreId: true,
  };
}

/**
 * Formats a Firebase user's email cleanly for the sidebar footer,
 * hiding the synthetic domain when the staff signed in with a plain Store ID.
 */
export function formatStoreAccountDisplay(email: string | null | undefined): {
  title: string;
  subtitle: string;
} {
  if (!email) {
    return { title: '매장 계정', subtitle: '연결됨' };
  }
  const lower = email.toLowerCase();
  if (lower.endsWith(INTERNAL_STORE_DOMAIN)) {
    const storeId = lower.slice(0, -INTERNAL_STORE_DOMAIN.length);
    return {
      title: `매장 ID · ${storeId}`,
      subtitle: '실시간 동기화 중',
    };
  }
  return {
    title: '매장 계정',
    subtitle: email,
  };
}
