import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { LogIn, ShieldCheck, TabletSmartphone } from 'lucide-react';
import { auth, googleProvider } from '../firebase';

export const AuthGate: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('popup-closed-by-user')) {
        setErrorMsg('로그인이 취소되었습니다. 다시 시도해 주세요.');
      } else {
        setErrorMsg('Google 로그인 중 오류가 발생했습니다. 팝업 허용 여부를 확인해 주세요.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F5] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-white border border-[#DCE2D2] rounded-2xl p-8 sm:p-10 shadow-sm">
        <div className="text-center mb-8">
          <p className="text-xs font-medium tracking-[0.2em] uppercase text-[#6D795D] mb-2">
            Boutique Tablet Catalog
          </p>
          <h1 className="font-display text-4xl font-semibold text-[#242A1F] tracking-tight mb-3">
            Bottega Aurea
          </h1>
          <p className="text-sm text-[#586250] leading-relaxed">
            매장 내 여러 태블릿의 상품 재고와 패키지투어 팀별 판매 내역을 실시간으로 동기화합니다.
          </p>
        </div>

        <div className="space-y-3 mb-8 border-y border-[#ECEEE6] py-5">
          <div className="flex items-start gap-3 text-sm text-[#3F4838]">
            <TabletSmartphone className="w-4 h-4 text-[#465436] mt-0.5 shrink-0" />
            <span>동일한 매장 계정으로 로그인한 모든 태블릿이 실시간으로 연동됩니다.</span>
          </div>
          <div className="flex items-start gap-3 text-sm text-[#3F4838]">
            <ShieldCheck className="w-4 h-4 text-[#465436] mt-0.5 shrink-0" />
            <span>결제 시 재고 차감과 팀별 순번 기록이 안전하게 자동 저장됩니다.</span>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-5 px-4 py-3 rounded-xl bg-[#FDF2F2] border border-[#F2D1D1] text-xs text-[#9B2C2C] leading-relaxed">
            {errorMsg}
          </div>
        )}

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full min-h-[50px] px-6 py-3.5 rounded-xl bg-[#465436] hover:bg-[#364129] active:scale-[0.99] disabled:opacity-60 text-[#FDFCF9] font-medium text-sm transition-all flex items-center justify-center gap-2.5 shadow-sm cursor-pointer"
        >
          <LogIn className="w-4 h-4" />
          {loading ? '매장 계정 연결 중...' : 'Google 계정으로 매장 시작하기'}
        </button>
      </div>
    </div>
  );
};
