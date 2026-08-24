import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Trash2, ChevronDown, ChevronUp } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    showDetails: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, showDetails: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleClearStorageAndReset = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  };

  private toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  public render() {
    if (this.state.hasError) {
      const title = this.props.fallbackTitle || "Terjadi Kendala pada Tampilan Ini";
      const errorMessage = this.state.error?.message || "Kesalahan runtime tidak terduga.";

      return (
        <div className="min-h-[360px] w-full flex items-center justify-center p-6 bg-slate-50/50">
          <div className="max-w-lg w-full bg-white rounded-2xl border border-rose-200 shadow-xl p-6 sm:p-8 text-center">
            <div className="w-14 h-14 bg-rose-100 text-rose-700 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-200">
              <AlertTriangle size={28} />
            </div>

            <h3 className="text-lg font-bold text-slate-900 mb-1.5">{title}</h3>
            <p className="text-xs text-slate-600 mb-5 leading-relaxed">
              Sistem mencegah layar menjadi kosong (*blank*). Data atau format terbaru mungkin sedang disesuaikan.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 mb-4">
              <button
                type="button"
                onClick={this.handleReset}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-900 hover:bg-indigo-950 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
              >
                <RefreshCw size={14} /> Muat Ulang Halaman
              </button>
              <button
                type="button"
                onClick={this.handleClearStorageAndReset}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition cursor-pointer"
              >
                <Trash2 size={14} /> Reset Cache & Login Ulang
              </button>
            </div>

            <div className="text-left mt-4 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={this.toggleDetails}
                className="text-[11px] font-semibold text-slate-500 hover:text-slate-700 flex items-center gap-1 mx-auto cursor-pointer"
              >
                {this.state.showDetails ? "Sembunyikan Rincian Teknis" : "Lihat Rincian Teknis"}
                {this.state.showDetails ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>

              {this.state.showDetails && (
                <div className="mt-3 p-3 bg-slate-900 text-slate-200 rounded-xl text-[11px] font-mono overflow-x-auto max-h-48 border border-slate-800 leading-normal">
                  <div className="text-rose-400 font-bold mb-1">{errorMessage}</div>
                  <pre className="text-[10px] text-slate-400 whitespace-pre-wrap">
                    {this.state.error?.stack || "Tidak ada stack trace."}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
