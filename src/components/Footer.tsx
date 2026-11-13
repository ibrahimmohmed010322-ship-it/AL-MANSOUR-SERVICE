interface FooterProps {
  onOpenAdmin: () => void;
}

export function Footer({ onOpenAdmin }: FooterProps) {
  return (
    <footer className="border-t border-neutral-800 bg-[#0B0B0C] text-neutral-400">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <p className="font-display text-base font-bold text-white">
            AL MANSOUR SERVICES – خدمات المنصور
          </p>
          <p className="text-xs text-neutral-400">
            صيانة كهرباء، سباكة، نقاشة، وتكييف · برج العرب – الإسكندرية فقط
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-6 text-xs">
          <span>جميع البيانات والصور محفوظة بسرية تامة</span>
          <button
            type="button"
            onClick={onOpenAdmin}
            className="text-[#D6B05A] hover:underline font-medium cursor-pointer"
          >
            دخول الإدارة
          </button>
        </div>
      </div>
    </footer>
  );
}
