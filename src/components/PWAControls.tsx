import { Download, WifiOff, X } from 'lucide-react';
import { useState } from 'react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';

export function PWAInstallButton({ compact = false }: { compact?: boolean }) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        className={
          compact
            ? 'flex w-full items-center justify-between min-h-[44px] px-3 rounded-lg text-sm font-semibold text-[#9A7420] bg-[#FBF7EE] hover:bg-[#F5ECD7] transition-colors cursor-pointer'
            : 'inline-flex items-center gap-1.5 min-h-[40px] px-3 py-2 text-xs sm:text-sm font-semibold text-[#9A7420] bg-[#FBF7EE] border border-[#C89D3C]/40 rounded-lg hover:bg-[#F5ECD7] transition-colors whitespace-nowrap shrink-0 cursor-pointer'
        }
      >
        <span className="inline-flex items-center gap-1.5">
          <Download className="w-4 h-4 shrink-0" />
          <span>تثبيت التطبيق</span>
        </span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={
            compact
              ? 'flex w-full items-center justify-between min-h-[44px] px-3 rounded-lg text-sm font-semibold text-[#9A7420] bg-[#FBF7EE] hover:bg-[#F5ECD7] transition-colors cursor-pointer'
              : 'inline-flex items-center gap-1.5 min-h-[40px] px-3 py-2 text-xs sm:text-sm font-semibold text-[#9A7420] bg-[#FBF7EE] border border-[#C89D3C]/40 rounded-lg hover:bg-[#F5ECD7] transition-colors whitespace-nowrap shrink-0 cursor-pointer'
          }
        >
          <span className="inline-flex items-center gap-1.5">
            <Download className="w-4 h-4 shrink-0" />
            <span>تثبيت على iPhone</span>
          </span>
        </button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ios-install-title"
          >
            <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl border border-neutral-200 text-right">
              <div className="flex items-center justify-between gap-3">
                <h3
                  id="ios-install-title"
                  className="font-display text-base font-bold text-[#0B0B0C]"
                >
                  تثبيت تطبيق خدمات المنصور
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="إغلاق"
                  className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-neutral-500 hover:bg-neutral-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <ol className="mt-3 space-y-2 text-sm text-neutral-700 list-decimal list-inside leading-relaxed">
                <li>اضغط على زر المشاركة (Share) في شريط Safari.</li>
                <li>اختر «إضافة إلى الشاشة الرئيسية» (Add to Home Screen).</li>
                <li>اضغط «إضافة» لتثبيت التطبيق على جهازك.</li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full min-h-[42px] rounded-lg bg-[#0B0B0C] text-sm font-semibold text-white hover:bg-[#1E1E22] transition-colors cursor-pointer"
              >
                حسنًا
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
}

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg border border-[#C89D3C]/40 bg-[#0B0B0C] px-3.5 py-2 text-xs font-medium text-white shadow-lg"
    >
      <WifiOff className="w-4 h-4 text-[#C89D3C] shrink-0" />
      <span>أنت غير متصل بالإنترنت — يرجى الاتصال لإرسال طلبات الصيانة</span>
    </div>
  );
}
