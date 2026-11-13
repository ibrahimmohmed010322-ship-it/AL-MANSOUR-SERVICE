import heroImg from '../assets/images/hero_al_mansour_1794562085213.jpg';
import electricalImg from '../assets/images/service_electrical_1794562084775.jpg';
import plumbingImg from '../assets/images/service_plumbing_1794562085132.jpg';
import paintingImg from '../assets/images/service_painting_1794562086107.jpg';
import hvacImg from '../assets/images/service_hvac_1794562086089.jpg';

export type ServiceType = 'electrical' | 'plumbing' | 'painting' | 'hvac';

export type RequestStatus =
  | 'new'
  | 'reviewing'
  | 'assigned'
  | 'completed'
  | 'cancelled';

export type TechnicianSpecialty = ServiceType | 'general';

export interface ServiceRequest {
  id: string;
  requestCode: string;
  serviceType: ServiceType;
  description: string;
  phone: string;
  district: string;
  address: string;
  locationLat?: number;
  locationLng?: number;
  locationUrl?: string;
  photoUrls: string[];
  photoCount: number;
  status: RequestStatus;
  assignedTechnicianId?: string;
  assignedTechnicianName?: string;
  assignedTechnicianPhone?: string;
  adminNotes?: string;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface RequestPhoto {
  id: string;
  index: number;
  dataUrl: string;
  mimeType: 'image/jpeg' | 'image/webp';
  width: number;
  height: number;
  sizeBytes: number;
  createdAt: Date | null;
}

export interface Technician {
  id: string;
  name: string;
  phone: string;
  specialty: TechnicianSpecialty;
  active: boolean;
  notes?: string;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface ServiceCategoryInfo {
  id: ServiceType;
  number: string;
  title: string;
  subtitle: string;
  examples: string[];
  image: string;
}

export const HERO_IMAGE = heroImg;

export const SERVICE_CATEGORIES: ServiceCategoryInfo[] = [
  {
    id: 'electrical',
    number: '01',
    title: 'كهرباء',
    subtitle: 'تأسيس، لوحات توزيع، أعطال قواطع، وإنارة داخلية وخارجية',
    examples: ['فصل مفاجئ للتيار', 'صيانة لوحة المفاتيح', 'تركيب إنارة ومآخذ'],
    image: electricalImg,
  },
  {
    id: 'plumbing',
    number: '02',
    title: 'سباكة',
    subtitle: 'كشف تسربات، صيانة مواسير، خلاطات، وسخانات ومضخات مياه',
    examples: ['علاج تسربات المياه', 'تركيب وصيانة السخانات', 'تسليك وصيانة الصرف'],
    image: plumbingImg,
  },
  {
    id: 'painting',
    number: '03',
    title: 'نقاشة',
    subtitle: 'معالجة الرطوبة والشروخ، دهانات حديثة، وتجديد تشطيبات الحوائط',
    examples: ['معالجة آثار الرطوبة', 'دهانات داخلية فاخرة', 'ترميم الشروخ والأسقف'],
    image: paintingImg,
  },
  {
    id: 'hvac',
    number: '04',
    title: 'تكييف',
    subtitle: 'صيانة دورية، شحن فريون، تنظيف فلاتر، وأعطال التبريد والكمبريسور',
    examples: ['ضعف التبريد أو توقفه', 'تنظيف وغسيل الوحدات', 'شحن فريون وفحص تسريب'],
    image: hvacImg,
  },
];

export const BORG_EL_ARAB_DISTRICTS: string[] = [
  'الحي الأول – برج العرب الجديدة',
  'الحي الثاني – برج العرب الجديدة',
  'الحي الثالث – برج العرب الجديدة',
  'الحي الرابع – برج العرب الجديدة',
  'الحي الخامس – برج العرب الجديدة',
  'الحي السادس – برج العرب الجديدة',
  'الحي السابع – برج العرب الجديدة',
  'الحي الثامن – برج العرب الجديدة',
  'الحي المتميز والحي التاسع',
  'منطقة الجامعات والأبحاث (E-JUST / مدينة الأبحاث)',
  'المنطقة الصناعية (الأولى – الخامسة)',
  'مدينة برج العرب القديمة',
  'محور التعمير ومدخل برج العرب',
  'قرى ومناطق برج العرب المحيطة',
];

export const SERVICE_LABELS: Record<ServiceType, string> = {
  electrical: 'كهرباء',
  plumbing: 'سباكة',
  painting: 'نقاشة',
  hvac: 'تكييف',
};

export const SPECIALTY_LABELS: Record<TechnicianSpecialty, string> = {
  electrical: 'كهرباء',
  plumbing: 'سباكة',
  painting: 'نقاشة',
  hvac: 'تكييف',
  general: 'صيانة عامة',
};

export const STATUS_META: Record<
  RequestStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  new: {
    label: 'جديد',
    bg: 'bg-[#FBF7EE]',
    text: 'text-[#8C6818]',
    border: 'border-[#E5D3A3]',
  },
  reviewing: {
    label: 'قيد المراجعة',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
  },
  assigned: {
    label: 'تم تعيين فني',
    bg: 'bg-blue-50',
    text: 'text-blue-800',
    border: 'border-blue-200',
  },
  completed: {
    label: 'مكتمل',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
  },
  cancelled: {
    label: 'ملغي',
    bg: 'bg-red-50',
    text: 'text-red-800',
    border: 'border-red-200',
  },
};
