import {
  AirVent,
  ArrowDownLeft,
  Droplets,
  MapPin,
  PaintRoller,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useState } from 'react';
import {
  BORG_EL_ARAB_DISTRICTS,
  HERO_IMAGE,
  SERVICE_CATEGORIES,
  type ServiceType,
} from '../types/maintenance';

interface ClientLandingProps {
  selectedService: ServiceType;
  onSelectServiceAndScroll: (service: ServiceType) => void;
  onScrollToForm: () => void;
}

const SERVICE_ICONS: Record<ServiceType, typeof Zap> = {
  electrical: Zap,
  plumbing: Droplets,
  painting: PaintRoller,
  hvac: AirVent,
};

export function ClientLanding({
  selectedService,
  onSelectServiceAndScroll,
  onScrollToForm,
}: ClientLandingProps) {
  const [heroImgError, setHeroImgError] = useState(false);
  const [failedCards, setFailedCards] = useState<Record<string, boolean>>({});

  return (
    <div id="top">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-[#0B0B0C] text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
            {/* Editorial Copy */}
            <div className="lg:col-span-6 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-[#D6B05A] font-medium">
                  <span>AL MANSOUR SERVICES</span>
                  <span aria-hidden="true" className="text-neutral-600">
                    ·
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-neutral-300">
                    <MapPin className="w-3.5 h-3.5 text-[#C89D3C]" />
                    برج العرب – الإسكندرية فقط
                  </span>
                </div>

                <h1
                  className="font-display font-bold tracking-tight text-white leading-[1.22]"
                  style={{
                    fontSize: 'clamp(2rem, 3.8vw, 3.35rem)',
                    textWrap: 'balance',
                  }}
                >
                  صيانة منزلية بمعايير هندسية في برج العرب
                </h1>

                <p className="text-sm sm:text-base text-neutral-300 leading-relaxed max-w-xl">
                  خدمات المنصور تقدم حلولاً متكاملة لأعطال الكهرباء، السباكة،
                  النقاشة، والتكييف للمنازل والفيلات والشركات داخل مدينة برج العرب
                  بالإسكندرية. أرسل تفاصيل العطل وموقعك وصور المشكلة خلال دقيقة
                  واحدة.
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-4">
                <button
                  type="button"
                  onClick={onScrollToForm}
                  className="inline-flex items-center justify-center gap-2 min-h-[48px] px-6 py-3 rounded-xl bg-[#C89D3C] text-[#0B0B0C] font-semibold text-sm sm:text-base hover:bg-[#D6B05A] active:scale-[0.99] transition-all whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>اطلب خدمة صيانة الآن</span>
                  <ArrowDownLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-2 text-xs sm:text-sm text-neutral-400">
                  <ShieldCheck className="w-4 h-4 text-[#C89D3C] shrink-0" />
                  <span>خصوصية تامة لبيانات العميل وطلباته</span>
                </div>
              </div>
            </div>

            {/* Hero Architectural Visual */}
            <div className="lg:col-span-6">
              <div className="relative h-64 sm:h-80 lg:h-full min-h-[280px] w-full overflow-hidden rounded-2xl border border-neutral-800 bg-[#141417]">
                {!heroImgError ? (
                  <img
                    src={HERO_IMAGE}
                    alt="خدمات المنصور للصيانة المنزلية المتكاملة في برج العرب"
                    referrerPolicy="no-referrer"
                    onError={() => setHeroImgError(true)}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#16161A] via-[#0B0B0C] to-[#1E1A12] p-6 text-center">
                    <span className="font-display text-2xl font-bold text-[#C89D3C]">
                      AL MANSOUR SERVICES
                    </span>
                    <span className="mt-2 text-sm text-neutral-400">
                      برج العرب – الإسكندرية
                    </span>
                  </div>
                )}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0B0B0C]/80 via-[#0B0B0C]/20 to-transparent" />
                <div className="absolute bottom-4 right-4 left-4 flex items-center justify-between text-xs text-neutral-200">
                  <span>استقبال الطلبات مباشرة عبر الهاتف</span>
                  <span className="text-[#D6B05A] font-medium">
                    برج العرب · الإسكندرية
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Bento Showcase */}
      <section
        id="services"
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16"
      >
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-[#9A7420]">
              أقسام الصيانة المتخصصة
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0B0B0C]">
              اختر القسم لبدء طلب الخدمة
            </h2>
          </div>
          <p className="text-sm text-neutral-600 max-w-md">
            اضغط على أي قسم ليتم تحديده تلقائياً في نموذج الطلب بالأسفل.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {SERVICE_CATEGORIES.map((service) => {
            const Icon = SERVICE_ICONS[service.id];
            const isSelected = selectedService === service.id;
            const imgFailed = failedCards[service.id];

            return (
              <button
                key={service.id}
                type="button"
                onClick={() => onSelectServiceAndScroll(service.id)}
                className={`group flex flex-col text-right rounded-2xl border bg-white overflow-hidden transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C89D3C] ${
                  isSelected
                    ? 'border-[#C89D3C] ring-1 ring-[#C89D3C]/40'
                    : 'border-neutral-200 hover:border-neutral-300'
                }`}
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-neutral-100">
                  {!imgFailed ? (
                    <img
                      src={service.image}
                      alt={`خدمة ${service.title} في برج العرب`}
                      referrerPolicy="no-referrer"
                      onError={() =>
                        setFailedCards((prev) => ({
                          ...prev,
                          [service.id]: true,
                        }))
                      }
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-neutral-900 to-neutral-800 text-[#C89D3C]">
                      <Icon className="w-10 h-10" />
                    </div>
                  )}
                </div>

                <div className="flex flex-1 flex-col justify-between p-5 space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-neutral-500">
                      <span className="font-mono tabular-nums text-[#9A7420] font-medium">
                        {service.number}
                      </span>
                      <Icon className="w-4 h-4 text-[#9A7420]" />
                    </div>
                    <h3 className="font-display text-xl font-bold text-[#0B0B0C]">
                      {service.title}
                    </h3>
                    <p className="text-sm text-neutral-600 leading-relaxed">
                      {service.subtitle}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-neutral-100 flex items-center justify-between text-xs font-semibold text-[#0B0B0C] group-hover:text-[#9A7420] transition-colors">
                    <span>طلب صيانة {service.title}</span>
                    <ArrowDownLeft className="w-4 h-4" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Coverage & Privacy Assurance Band */}
      <section
        id="coverage"
        className="border-y border-neutral-200 bg-white"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-5 space-y-3">
              <p className="text-xs font-semibold text-[#9A7420]">
                نطاق العمل الحصري
              </p>
              <h2 className="font-display text-2xl font-bold text-[#0B0B0C]">
                نخدم مدينة برج العرب بالإسكندرية فقط
              </h2>
              <p className="text-sm text-neutral-600 leading-relaxed">
                لضمان سرعة الوصول ودقة التنفيذ، تقتصر خدمات المنصور حالياً على
                الأحياء السكنية والمناطق الصناعية والقرى التابعة لبرج العرب
                بالإسكندرية. جميع بيانات التواصل والعنوان والصور تُرسل مباشرة
                ومشفرة إلى إدارة الشركة فقط.
              </p>
            </div>

            <div className="lg:col-span-7">
              <div className="rounded-2xl border border-neutral-200 bg-[#FAFAFA] p-5 sm:p-6">
                <h3 className="font-display text-base font-bold text-[#0B0B0C] mb-4">
                  المناطق المشمولة بالخدمة في برج العرب
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 text-sm text-neutral-700">
                  {BORG_EL_ARAB_DISTRICTS.slice(0, 10).map((district) => (
                    <div
                      key={district}
                      className="flex items-center gap-2 py-1 border-b border-neutral-200/70 last:border-b-0 sm:last:border-b"
                    >
                      <MapPin className="w-3.5 h-3.5 text-[#9A7420] shrink-0" />
                      <span className="truncate">{district}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
