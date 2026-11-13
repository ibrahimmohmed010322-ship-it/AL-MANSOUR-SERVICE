import {
  AirVent,
  AlertCircle,
  Camera,
  CheckCircle2,
  Droplets,
  Loader2,
  LocateFixed,
  MapPin,
  PaintRoller,
  Phone,
  Send,
  Trash2,
  Zap,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { submitServiceRequest } from '../services/maintenanceService';
import {
  BORG_EL_ARAB_DISTRICTS,
  SERVICE_CATEGORIES,
  SERVICE_LABELS,
  type ServiceType,
} from '../types/maintenance';

interface ServiceRequestFormProps {
  selectedService: ServiceType;
  onChangeService: (service: ServiceType) => void;
}

interface AttachedPhoto {
  id: string;
  file: File;
  previewUrl: string;
}

const SERVICE_ICONS: Record<ServiceType, typeof Zap> = {
  electrical: Zap,
  plumbing: Droplets,
  painting: PaintRoller,
  hvac: AirVent,
};

export function ServiceRequestForm({
  selectedService,
  onChangeService,
}: ServiceRequestFormProps) {
  const [description, setDescription] = useState('');
  const [district, setDistrict] = useState(BORG_EL_ARAB_DISTRICTS[0]);
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [locationLat, setLocationLat] = useState<number | undefined>();
  const [locationLng, setLocationLng] = useState<number | undefined>();
  const [locationUrl, setLocationUrl] = useState('');
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const [photos, setPhotos] = useState<AttachedPhoto[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [submittedReceipt, setSubmittedReceipt] = useState<{
    requestCode: string;
    serviceType: ServiceType;
    district: string;
    uploadedPhotoCount: number;
  } | null>(null);

  useEffect(() => {
    return () => {
      photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
  }, [photos]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList) return;

    setFormError(null);
    const remainingSlots = 4 - photos.length;
    if (remainingSlots <= 0) {
      setFormError('الحد الأقصى للصور المرفقة هو 4 صور لكل طلب.');
      return;
    }

    const validFiles: AttachedPhoto[] = [];
    for (let i = 0; i < Math.min(fileList.length, remainingSlots); i += 1) {
      const file = fileList[i];
      if (!file.type.startsWith('image/')) {
        setFormError('يرجى اختيار ملفات صور صالحة فقط.');
        continue;
      }
      validFiles.push({
        id: `${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }

    setPhotos((prev) => [...prev, ...validFiles]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = (id: string) => {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  };

  const handleCaptureLocation = () => {
    setLocationError(null);
    if (!('geolocation' in navigator)) {
      setLocationError('المتصفح الحالي لا يدعم تحديد الموقع التلقائي.');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(6));
        const lng = Number(position.coords.longitude.toFixed(6));
        setLocationLat(lat);
        setLocationLng(lng);
        setLocationUrl(`https://maps.google.com/?q=${lat},${lng}`);
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationError(
            'تم رفض إذن الموقع. يمكنك تفعيل GPS أو لصق رابط الموقع من خرائط جوجل أدناه.'
          );
        } else {
          setLocationError(
            'تعذر تحديد الموقع تلقائياً. يرجى كتابة العنوان بالتفصيل أو إدخال رابط الخريطة.'
          );
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  };

  const normalizeDigits = (val: string) =>
    val
      .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
      .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedDesc = description.trim();
    const trimmedAddress = address.trim();
    const normalizedPhone = normalizeDigits(phone).replace(/\s+/g, '').trim();

    if (trimmedDesc.length < 10) {
      setFormError('يرجى كتابة وصف تفصيلي للعطل (10 أحرف على الأقل).');
      return;
    }

    if (trimmedAddress.length < 5) {
      setFormError('يرجى إدخال العنوان بالتفصيل داخل برج العرب.');
      return;
    }

    if (!/^(\+?20|0)?1[0125][0-9]{8}$/.test(normalizedPhone) && normalizedPhone.length < 8) {
      setFormError('يرجى إدخال رقم هاتف مصري صحيح للتواصل.');
      return;
    }

    setSubmitting(true);
    setUploadStatus(
      photos.length > 0
        ? 'جاري تجهيز وضغط الصور...'
        : 'جاري إرسال الطلب...'
    );

    try {
      const result = await submitServiceRequest({
        serviceType: selectedService,
        description: trimmedDesc,
        phone: normalizedPhone,
        district,
        address: trimmedAddress,
        locationLat,
        locationLng,
        locationUrl: locationUrl.trim() || undefined,
        photos: photos.map((p) => p.file),
        onProgress: (status) => setUploadStatus(status),
      });

      photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      setPhotos([]);
      setDescription('');
      setAddress('');
      setPhone('');
      setLocationLat(undefined);
      setLocationLng(undefined);
      setLocationUrl('');
      setSubmittedReceipt({
        requestCode: result.requestCode,
        serviceType: selectedService,
        district,
        uploadedPhotoCount: result.uploadedPhotoCount,
      });
    } catch (error) {
      console.error('Submit service request error:', error);
      const rawMessage = error instanceof Error ? error.message : '';
      const isCompressionMsg =
        rawMessage.includes('الصورة') ||
        rawMessage.includes('صور') ||
        rawMessage.includes('أبعاد') ||
        rawMessage.includes('المتصفح');
      setFormError(
        isCompressionMsg
          ? rawMessage
          : 'تعذر حفظ الطلب أو رفع الصور في قاعدة البيانات. لم يتم إرسال الطلب — يرجى المحاولة مرة أخرى.'
      );
    } finally {
      setSubmitting(false);
      setUploadStatus(null);
    }
  };

  const handleNewRequest = () => {
    setSubmittedReceipt(null);
    setFormError(null);
  };

  return (
    <section
      id="request-form"
      className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16"
    >
      {submittedReceipt ? (
        <div className="rounded-2xl border border-[#E5D3A3] bg-white p-6 sm:p-10 text-center space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#FBF7EE] text-[#9A7420]">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-[#9A7420]">
              تأكيد استلام الطلب
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0B0B0C]">
              تم استلام طلب الصيانة بنجاح
            </h2>
            <p className="text-sm sm:text-base text-neutral-600 max-w-lg mx-auto leading-relaxed">
              شكراً لتواصلك مع خدمات المنصور في برج العرب. تم تسجيل طلبك بسرية
              تامة وسيتواصل معك فريق الإدارة هاتفياً لتأكيد الموعد المناسب.
            </p>
          </div>

          <div className="mx-auto max-w-md rounded-xl border border-neutral-200 bg-[#FAFAFA] p-4 sm:p-5 space-y-3 text-sm">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-2.5">
              <span className="text-neutral-500">رقم مرجع الطلب</span>
              <span
                dir="ltr"
                className="font-mono font-semibold text-[#0B0B0C] tabular-nums"
              >
                {submittedReceipt.requestCode}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-neutral-200 pb-2.5">
              <span className="text-neutral-500">نوع الخدمة</span>
              <span className="font-semibold text-[#0B0B0C]">
                {SERVICE_LABELS[submittedReceipt.serviceType]}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-neutral-200 pb-2.5">
              <span className="text-neutral-500">المنطقة</span>
              <span className="font-medium text-[#0B0B0C]">
                {submittedReceipt.district}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-500">الصور المرفوعة</span>
              <span className="font-medium text-[#0B0B0C] tabular-nums">
                {submittedReceipt.uploadedPhotoCount > 0
                  ? `${submittedReceipt.uploadedPhotoCount} صور محفوظة للمدير`
                  : 'بدون صور'}
              </span>
            </div>
          </div>

          <div>
            <button
              type="button"
              onClick={handleNewRequest}
              className="inline-flex items-center justify-center min-h-[48px] px-6 py-3 rounded-xl bg-[#0B0B0C] text-white font-semibold text-sm hover:bg-[#1E1E22] transition-colors cursor-pointer"
            >
              تقديم طلب صيانة جديد
            </button>
          </div>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-8 lg:p-10 space-y-8"
          noValidate
        >
          <div className="border-b border-neutral-200 pb-5 space-y-1.5">
            <p className="text-xs font-semibold text-[#9A7420]">
              نموذج طلب خدمة – برج العرب بالإسكندرية فقط
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0B0B0C]">
              أرسل تفاصيل العطل الآن
            </h2>
            <p className="text-sm text-neutral-600">
              تُحفظ بياناتك وصور العطل بسرية تامة ولا يطّلع عليها سوى إدارة
              الشركة.
            </p>
          </div>

          {/* 1. Service Type Selection */}
          <fieldset className="space-y-3">
            <legend className="text-sm font-bold text-[#0B0B0C]">
              1. اختر نوع الخدمة المطلوبة
            </legend>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {SERVICE_CATEGORIES.map((service) => {
                const Icon = SERVICE_ICONS[service.id];
                const active = selectedService === service.id;

                return (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => onChangeService(service.id)}
                    aria-pressed={active}
                    className={`flex flex-col items-center justify-center gap-2 min-h-[84px] rounded-xl border px-3 py-4 text-center transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C89D3C] ${
                      active
                        ? 'border-[#C89D3C] bg-[#0B0B0C] text-white'
                        : 'border-neutral-200 bg-[#FAFAFA] text-[#0B0B0C] hover:border-neutral-300 hover:bg-white'
                    }`}
                  >
                    <Icon
                      className={`w-6 h-6 ${
                        active ? 'text-[#D6B05A]' : 'text-[#9A7420]'
                      }`}
                    />
                    <span className="font-display text-base font-bold">
                      {service.title}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* 2. Detailed Problem Description */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="problem-description"
                className="text-sm font-bold text-[#0B0B0C]"
              >
                2. وصف تفصيلي للعطل أو المشكلة
              </label>
              <span className="text-xs text-neutral-500 tabular-nums">
                {description.length} / 2000
              </span>
            </div>
            <textarea
              id="problem-description"
              rows={4}
              maxLength={2000}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="مثال: التكييف لا يبرد وتصدر منه أصوات غير معتادة، أو يوجد تسريب مياه أسفل حوض المطبخ..."
              className="w-full rounded-xl border border-neutral-300 bg-[#FAFAFA] px-4 py-3 text-sm sm:text-base text-[#0B0B0C] placeholder:text-neutral-400 focus:border-[#C89D3C] focus:bg-white focus:outline-none transition-colors"
            />
          </div>

          {/* 3. Photo Attachment */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-[#0B0B0C]">
                3. إرفاق صور للمشكلة (اختياري – بحد أقصى 4 صور)
              </span>
              <span className="text-xs text-neutral-500 tabular-nums">
                {photos.length} / 4
              </span>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoSelect}
              className="hidden"
              id="problem-photos-input"
            />

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className="relative aspect-square overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100"
                >
                  <img
                    src={photo.previewUrl}
                    alt="صورة العطل المرفقة"
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    aria-label="حذف الصورة"
                    onClick={() => handleRemovePhoto(photo.id)}
                    className="absolute top-1.5 left-1.5 flex h-9 w-9 items-center justify-center rounded-lg bg-black/75 text-white hover:bg-red-600 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {photos.length < 4 && (
                <label
                  htmlFor="problem-photos-input"
                  className="flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-300 bg-[#FAFAFA] p-3 text-center text-neutral-600 hover:border-[#C89D3C] hover:bg-[#FBF7EE]/60 hover:text-[#0B0B0C] transition-colors cursor-pointer"
                >
                  <Camera className="w-6 h-6 text-[#9A7420]" />
                  <span className="text-xs font-semibold">
                    تصوير أو اختيار صورة
                  </span>
                </label>
              )}
            </div>

            {photos.length > 0 && (
              <div
                role="status"
                className="flex items-start gap-2.5 rounded-xl border border-neutral-200 bg-[#FAFAFA] p-3 text-xs text-neutral-600"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-[#9A7420]" />
                <span>
                  سيتم ضغط الصور تلقائياً وحفظها بسرية مع الطلب لتظهر لمدير
                  الشركة فقط عند إرسال الطلب.
                </span>
              </div>
            )}
          </div>

          {/* 4. Address & GPS Location (Borg El Arab Only) */}
          <div className="space-y-4">
            <span className="block text-sm font-bold text-[#0B0B0C]">
              4. العنوان وتحديد الموقع (برج العرب بالإسكندرية فقط)
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="district-select"
                  className="text-xs font-medium text-neutral-600"
                >
                  المنطقة / الحي في برج العرب
                </label>
                <select
                  id="district-select"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full min-h-[48px] rounded-xl border border-neutral-300 bg-[#FAFAFA] px-3.5 py-2.5 text-sm text-[#0B0B0C] focus:border-[#C89D3C] focus:bg-white focus:outline-none transition-colors"
                >
                  {BORG_EL_ARAB_DISTRICTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-600">
                  تحديد الموقع الجغرافي (GPS)
                </label>
                <button
                  type="button"
                  onClick={handleCaptureLocation}
                  disabled={locating}
                  className="flex w-full min-h-[48px] items-center justify-center gap-2 rounded-xl border border-[#C89D3C] bg-[#FBF7EE] px-4 py-2.5 text-sm font-semibold text-[#8C6818] hover:bg-[#F5EBD0] disabled:opacity-60 transition-colors cursor-pointer"
                >
                  {locating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري تحديد موقعك...</span>
                    </>
                  ) : (
                    <>
                      <LocateFixed className="w-4 h-4" />
                      <span>تحديد موقعي الحالي تلقائياً</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {locationLat !== undefined && locationLng !== undefined && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs text-emerald-900">
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <MapPin className="w-4 h-4 text-emerald-700" />
                  تم التقاط إحداثيات الموقع بنجاح
                </span>
                <span dir="ltr" className="font-mono tabular-nums">
                  {locationLat}, {locationLng}
                </span>
              </div>
            )}

            {locationError && (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2.5">
                {locationError}
              </p>
            )}

            <div className="space-y-1.5">
              <label
                htmlFor="detailed-address"
                className="text-xs font-medium text-neutral-600"
              >
                العنوان التفصيلي (المجاورة، الشارع، رقم العمارة أو الفيلا، الدور)
              </label>
              <input
                id="detailed-address"
                type="text"
                required
                maxLength={400}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="مثال: الحي الثاني، المجاورة الثالثة، عمارة 14، الدور الثاني، شقة 5"
                className="w-full min-h-[48px] rounded-xl border border-neutral-300 bg-[#FAFAFA] px-4 py-2.5 text-sm sm:text-base text-[#0B0B0C] placeholder:text-neutral-400 focus:border-[#C89D3C] focus:bg-white focus:outline-none transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="location-url"
                className="text-xs font-medium text-neutral-600"
              >
                رابط الموقع على خرائط جوجل (يُملأ تلقائياً عند التحديد أو يمكن لصقه يدوياً)
              </label>
              <input
                id="location-url"
                type="url"
                dir="ltr"
                maxLength={300}
                value={locationUrl}
                onChange={(e) => setLocationUrl(e.target.value)}
                placeholder="https://maps.google.com/?q=..."
                className="w-full min-h-[44px] rounded-xl border border-neutral-300 bg-[#FAFAFA] px-4 py-2 text-xs sm:text-sm text-[#0B0B0C] placeholder:text-neutral-400 focus:border-[#C89D3C] focus:bg-white focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* 5. Customer Phone */}
          <div className="space-y-2">
            <label
              htmlFor="customer-phone"
              className="block text-sm font-bold text-[#0B0B0C]"
            >
              5. رقم الهاتف للتواصل (يفضل رقم عليه واتساب)
            </label>
            <div className="relative">
              <Phone className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                id="customer-phone"
                type="tel"
                inputMode="tel"
                dir="ltr"
                required
                maxLength={20}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01000000000"
                className="w-full min-h-[48px] rounded-xl border border-neutral-300 bg-[#FAFAFA] pr-10 pl-4 py-2.5 text-base font-medium text-right text-[#0B0B0C] tabular-nums placeholder:text-neutral-400 focus:border-[#C89D3C] focus:bg-white focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Error Banner */}
          {formError && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-800"
            >
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
              <span>{formError}</span>
            </div>
          )}

          {/* Submit CTA */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex w-full min-h-[52px] items-center justify-center gap-2 rounded-xl bg-[#0B0B0C] px-6 py-3.5 text-base font-bold text-white hover:bg-[#1E1E22] disabled:opacity-60 active:scale-[0.99] transition-all cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-[#D6B05A]" />
                  <span>{uploadStatus || 'جاري الإرسال...'}</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 text-[#D6B05A]" />
                  <span>إرسال طلب الخدمة</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
