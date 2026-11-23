import React, { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import {
  Eye,
  EyeOff,
  KeyRound,
  LogIn,
  ShieldCheck,
  Store,
  TabletSmartphone,
} from 'lucide-react';
import { auth } from '../firebase';
import { normalizeStoreIdentifier } from '../utils/authId';

function getAuthErrorCode(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    return String((error as { code?: unknown }).code ?? '');
  }
  return '';
}

export const AuthGate: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const normalized = normalizeStoreIdentifier(identifier);
    if (!normalized) {
      setErrorMsg(
        '매장 아이디(영문 소문자·숫자·-·_ 2자 이상) 또는 올바른 이메일 주소를 입력해 주세요.'
      );
      return;
    }

    if (password.length < 6) {
      setErrorMsg('비밀번호는 6자 이상 입력해 주세요.');
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, normalized.email, password);
    } catch (signInError) {
      const code = getAuthErrorCode(signInError);

      // If account doesn't exist yet (Firebase returns user-not-found or invalid-credential),
      // seamlessly create the store account without requiring a separate sign-up flow.
      if (code === 'auth/user-not-found' || code === 'auth/invalid-credential') {
        try {
          await createUserWithEmailAndPassword(auth, normalized.email, password);
          return;
        } catch (createError) {
          const createCode = getAuthErrorCode(createError);
          if (createCode === 'auth/email-already-in-use') {
            setErrorMsg('이미 등록된 매장 아이디입니다. 비밀번호를 다시 확인해 주세요.');
          } else if (createCode === 'auth/operation-not-allowed') {
            setErrorMsg(
              'Firebase 콘솔에서 [이메일/비밀번호] 로그인 방식이 아직 켜져 있지 않습니다.'
            );
          } else if (createCode === 'auth/weak-password') {
            setErrorMsg('비밀번호는 6자 이상으로 입력해 주세요.');
          } else if (createCode === 'auth/network-request-failed') {
            setErrorMsg('네트워크 연결을 확인한 뒤 다시 시도해 주세요.');
          } else {
            setErrorMsg('매장 연결 중 오류가 발생했습니다. 입력 정보를 다시 확인해 주세요.');
          }
          return;
        }
      }

      if (code === 'auth/wrong-password') {
        setErrorMsg('비밀번호가 일치하지 않습니다. 다시 확인해 주세요.');
      } else if (code === 'auth/operation-not-allowed') {
        setErrorMsg(
          'Firebase 콘솔에서 [이메일/비밀번호] 로그인 방식이 아직 켜져 있지 않습니다.'
        );
      } else if (code === 'auth/too-many-requests') {
        setErrorMsg('로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.');
      } else if (code === 'auth/invalid-email') {
        setErrorMsg('영문·숫자 아이디 또는 올바른 이메일 형식을 입력해 주세요.');
      } else if (code === 'auth/network-request-failed') {
        setErrorMsg('네트워크 연결을 확인한 뒤 다시 시도해 주세요.');
      } else {
        setErrorMsg('로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F5] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-white border border-[#DCE2D2] rounded-2xl p-8 sm:p-10 shadow-sm">
        <div className="text-center mb-7">
          <p className="text-xs font-medium tracking-[0.2em] uppercase text-[#6D795D] mb-2">
            Boutique Tablet Catalog
          </p>
          <h1 className="font-display text-4xl font-semibold text-[#242A1F] tracking-tight mb-3">
            Bottega Aurea
          </h1>
          <p className="text-sm text-[#586250] leading-relaxed">
            매장 아이디(또는 이메일)와 비밀번호로 로그인하여 여러 태블릿을 실시간으로 연결하세요.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="store-identifier"
              className="block text-xs font-semibold text-[#3F4838] mb-1.5"
            >
              매장 아이디 또는 이메일
            </label>
            <div className="relative">
              <Store className="w-4 h-4 text-[#6D795D] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="store-identifier"
                type="text"
                inputMode="email"
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="예: bottega01 또는 store@shop.com"
                disabled={loading}
                className="w-full min-h-[48px] pl-10 pr-4 py-3 rounded-xl bg-[#FAF9F5] border border-[#D4DCC8] focus:border-[#465436] focus:bg-white focus:outline-none text-sm text-[#242A1F] placeholder:text-[#9AA38F] transition-colors"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="store-password"
              className="block text-xs font-semibold text-[#3F4838] mb-1.5"
            >
              비밀번호 (6자 이상)
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-[#6D795D] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="store-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호 입력"
                disabled={loading}
                className="w-full min-h-[48px] pl-10 pr-12 py-3 rounded-xl bg-[#FAF9F5] border border-[#D4DCC8] focus:border-[#465436] focus:bg-white focus:outline-none text-sm text-[#242A1F] placeholder:text-[#9AA38F] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
                className="absolute right-2 top-1/2 -translate-y-1/2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-[#6D795D] hover:bg-[#ECEEE6] transition-colors cursor-pointer"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="px-4 py-3 rounded-xl bg-[#FDF2F2] border border-[#F2D1D1] text-xs text-[#9B2C2C] leading-relaxed">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[50px] px-6 py-3.5 rounded-xl bg-[#465436] hover:bg-[#364129] active:scale-[0.99] disabled:opacity-60 text-[#FDFCF9] font-medium text-sm transition-all flex items-center justify-center gap-2.5 shadow-sm cursor-pointer mt-2"
          >
            <LogIn className="w-4 h-4" />
            {loading ? '매장 연결 중...' : '매장 시작하기'}
          </button>
        </form>

        <div className="space-y-2.5 mt-7 pt-5 border-t border-[#ECEEE6]">
          <div className="flex items-start gap-2.5 text-xs text-[#586250] leading-relaxed">
            <ShieldCheck className="w-4 h-4 text-[#465436] mt-0.5 shrink-0" />
            <span>
              별도 회원가입 없이 처음 입력한 아이디·비밀번호로 새 매장이 자동 생성됩니다.
            </span>
          </div>
          <div className="flex items-start gap-2.5 text-xs text-[#586250] leading-relaxed">
            <TabletSmartphone className="w-4 h-4 text-[#465436] mt-0.5 shrink-0" />
            <span>
              다른 태블릿에서도 동일한 아이디·비밀번호로 로그인하면 재고와 매출이 실시간 동기화됩니다.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
