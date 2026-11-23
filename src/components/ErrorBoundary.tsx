import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: '',
  };

  public static getDerivedStateFromError(error: Error): State {
    let friendly = error.message;
    try {
      const parsed = JSON.parse(error.message);
      if (parsed && typeof parsed.error === 'string') {
        if (parsed.error.includes('Quota exceeded')) {
          friendly =
            '일일 Firestore 무료 사용량을 초과했습니다. 내일 자동 초기화되거나 Firebase 콘솔에서 요금제를 확인해 주세요.';
        } else if (parsed.error.includes('Missing or insufficient permissions')) {
          friendly =
            '데이터베이스 접근 권한이 확인되지 않았습니다. 로그인 상태를 확인한 뒤 다시 시도해 주세요.';
        } else {
          friendly = parsed.error;
        }
      }
    } catch {
      // keep raw message
    }
    return { hasError: true, errorMessage: friendly };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Application ErrorBoundary caught:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FAF9F5] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white border border-[#DCE2D2] rounded-2xl p-8 text-center shadow-sm">
            <div className="w-12 h-12 rounded-full bg-[#F3F5ED] text-[#465436] flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-semibold text-[#242A1F] mb-2">
              일시적인 연결 오류가 발생했습니다
            </h2>
            <p className="text-sm text-[#586250] leading-relaxed mb-6 break-words">
              {this.state.errorMessage || '데이터를 불러오는 중 문제가 발생했습니다.'}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#465436] text-white text-sm font-medium hover:bg-[#364129] transition-colors min-h-[44px]"
            >
              <RefreshCw className="w-4 h-4" />
              화면 새로고침
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
