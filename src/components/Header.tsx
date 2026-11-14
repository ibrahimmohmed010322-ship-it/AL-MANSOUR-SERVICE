import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { PWAInstallButton } from './PWAControls';

interface HeaderProps {
  view: 'client' | 'admin';
  onNavigateView: (target: 'client' | 'admin', sectionId?: string) => void;
}

export function Header({ view, onNavigateView }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLinkClick = (target: 'client' | 'admin', sectionId?: string) => {
    setMobileMenuOpen(false);
    onNavigateView(target, sectionId);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200/90 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-15 max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <button
          type="button"
          onClick={() => handleLinkClick('client', 'top')}
          className="font-display text-base sm:text-lg font-bold tracking-tight text-[#0B0B0C] whitespace-nowrap shrink-0 hover:text-[#9A7420] transition-colors cursor-pointer"
        >
          خدمات المنصور
        </button>

        {/* Zone 2: 4 Single-line Navigation Links */}
        <nav
          aria-label="التنقل الرئيسي"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-neutral-600"
        >
          <button
            type="button"
            onClick={() => handleLinkClick('client', 'services')}
            className="hover:text-[#0B0B0C] transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1"
          >
            الأقسام
          </button>
          <button
            type="button"
            onClick={() => handleLinkClick('client', 'coverage')}
            className="hover:text-[#0B0B0C] transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1"
          >
            برج العرب
          </button>
          <button
            type="button"
            onClick={() => handleLinkClick('client', 'request-form')}
            className="hover:text-[#0B0B0C] transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1"
          >
            طلب صيانة
          </button>
          <button
            type="button"
            onClick={() => handleLinkClick('admin')}
            className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1 ${
              view === 'admin'
                ? 'text-[#9A7420] font-semibold'
                : 'hover:text-[#0B0B0C]'
            }`}
          >
            لوحة الإدارة
          </button>
        </nav>

        {/* Zone 3: Single Primary Action + PWA Install + Mobile Menu Trigger */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden sm:flex">
            <PWAInstallButton />
          </div>
          {view === 'client' ? (
            <button
              type="button"
              onClick={() => handleLinkClick('client', 'request-form')}
              className="hidden sm:inline-flex items-center justify-center min-h-[40px] px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-[#0B0B0C] rounded-lg hover:bg-[#1E1E22] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              اطلب صيانة الآن
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleLinkClick('client', 'top')}
              className="hidden sm:inline-flex items-center justify-center min-h-[40px] px-4 py-2 text-xs sm:text-sm font-semibold text-[#0B0B0C] bg-neutral-100 border border-neutral-200 rounded-lg hover:bg-neutral-200/70 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              واجهة العميل
            </button>
          )}

          <button
            type="button"
            aria-label={mobileMenuOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="md:hidden inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg text-neutral-800 hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Sheet */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-neutral-200 bg-white px-4 py-3 space-y-1">
          <button
            type="button"
            onClick={() => handleLinkClick('client', 'services')}
            className="flex w-full items-center min-h-[44px] px-3 rounded-lg text-sm font-medium text-neutral-800 hover:bg-neutral-100 text-right cursor-pointer"
          >
            الأقسام والخدمات
          </button>
          <button
            type="button"
            onClick={() => handleLinkClick('client', 'coverage')}
            className="flex w-full items-center min-h-[44px] px-3 rounded-lg text-sm font-medium text-neutral-800 hover:bg-neutral-100 text-right cursor-pointer"
          >
            نطاق التغطية – برج العرب
          </button>
          <button
            type="button"
            onClick={() => handleLinkClick('client', 'request-form')}
            className="flex w-full items-center min-h-[44px] px-3 rounded-lg text-sm font-medium text-neutral-800 hover:bg-neutral-100 text-right cursor-pointer"
          >
            إرسال طلب صيانة
          </button>
          <button
            type="button"
            onClick={() => handleLinkClick('admin')}
            className="flex w-full items-center min-h-[44px] px-3 rounded-lg text-sm font-semibold text-[#9A7420] hover:bg-[#FBF7EE] text-right cursor-pointer"
          >
            لوحة تحكم الإدارة
          </button>
          <PWAInstallButton compact />
        </div>
      )}
    </header>
  );
}
