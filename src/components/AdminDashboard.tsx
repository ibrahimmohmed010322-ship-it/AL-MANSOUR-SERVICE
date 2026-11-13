import { signOut, type User } from 'firebase/auth';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ClipboardList,
  Clock,
  Copy,
  ExternalLink,
  Image as ImageIcon,
  Loader2,
  LogOut,
  MapPin,
  Phone,
  Plus,
  Search,
  Trash2,
  UserCheck,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { auth } from '../lib/firebase';
import {
  createTechnician,
  deleteServiceRequestAdmin,
  deleteTechnician,
  fetchRequestPhotosAdmin,
  subscribeServiceRequests,
  subscribeTechnicians,
  updateServiceRequestAdmin,
  updateTechnician,
} from '../services/maintenanceService';
import {
  SERVICE_CATEGORIES,
  SERVICE_LABELS,
  SPECIALTY_LABELS,
  STATUS_META,
  type RequestPhoto,
  type RequestStatus,
  type ServiceRequest,
  type ServiceType,
  type Technician,
  type TechnicianSpecialty,
} from '../types/maintenance';

interface AdminDashboardProps {
  user: User;
}

type AdminTab = 'requests' | 'technicians';

const STATUS_OPTIONS: RequestStatus[] = [
  'new',
  'reviewing',
  'assigned',
  'completed',
  'cancelled',
];

function formatDateTime(date: Date | null): string {
  if (!date) return 'الآن';
  return new Intl.DateTimeFormat('ar-EG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function AdminDashboard({ user }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('requests');

  // Requests state
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [requestsError, setRequestsError] = useState<string | null>(null);

  // Technicians state
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loadingTechs, setLoadingTechs] = useState(true);
  const [techsError, setTechsError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<RequestStatus | 'all'>('all');
  const [serviceFilter, setServiceFilter] = useState<ServiceType | 'all'>('all');

  // Selected request drawer
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<RequestStatus>('new');
  const [editTechId, setEditTechId] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [savingRequest, setSavingRequest] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [confirmDeleteRequest, setConfirmDeleteRequest] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [requestPhotos, setRequestPhotos] = useState<RequestPhoto[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [photosError, setPhotosError] = useState<string | null>(null);

  // Technician form state
  const [techName, setTechName] = useState('');
  const [techPhone, setTechPhone] = useState('');
  const [techSpecialty, setTechSpecialty] = useState<TechnicianSpecialty>('electrical');
  const [techNotes, setTechNotes] = useState('');
  const [techActive, setTechActive] = useState(true);
  const [editingTechId, setEditingTechId] = useState<string | null>(null);
  const [savingTech, setSavingTech] = useState(false);
  const [techFormError, setTechFormError] = useState<string | null>(null);
  const [confirmDeleteTechId, setConfirmDeleteTechId] = useState<string | null>(null);

  useEffect(() => {
    setLoadingRequests(true);
    const unsubRequests = subscribeServiceRequests(
      (data) => {
        setRequests(data);
        setLoadingRequests(false);
        setRequestsError(null);
      },
      (err) => {
        setLoadingRequests(false);
        setRequestsError(err.message);
      }
    );

    setLoadingTechs(true);
    const unsubTechs = subscribeTechnicians(
      (data) => {
        setTechnicians(data);
        setLoadingTechs(false);
        setTechsError(null);
      },
      (err) => {
        setLoadingTechs(false);
        setTechsError(err.message);
      }
    );

    return () => {
      unsubRequests();
      unsubTechs();
    };
  }, []);

  const selectedRequest = useMemo(
    () => requests.find((r) => r.id === selectedRequestId) || null,
    [requests, selectedRequestId]
  );

  useEffect(() => {
    if (selectedRequest) {
      setEditStatus(selectedRequest.status);
      setEditTechId(selectedRequest.assignedTechnicianId || '');
      setEditNotes(selectedRequest.adminNotes || '');
      setSaveFeedback(null);
      setConfirmDeleteRequest(false);
    }
  }, [selectedRequest]);

  useEffect(() => {
    if (!selectedRequestId) {
      setRequestPhotos([]);
      setLoadingPhotos(false);
      setPhotosError(null);
      return;
    }

    let cancelled = false;
    setLoadingPhotos(true);
    setPhotosError(null);
    setRequestPhotos([]);

    fetchRequestPhotosAdmin(selectedRequestId)
      .then((photos) => {
        if (!cancelled) {
          setRequestPhotos(photos);
          setLoadingPhotos(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPhotosError('تعذر تحميل الصور المرفقة لهذا الطلب.');
          setLoadingPhotos(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedRequestId]);

  const kpis = useMemo(() => {
    const total = requests.length;
    const newCount = requests.filter((r) => r.status === 'new').length;
    const activeCount = requests.filter(
      (r) => r.status === 'reviewing' || r.status === 'assigned'
    ).length;
    const completedCount = requests.filter((r) => r.status === 'completed').length;
    return { total, newCount, activeCount, completedCount };
  }, [requests]);

  const filteredRequests = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return requests.filter((req) => {
      if (statusFilter !== 'all' && req.status !== statusFilter) return false;
      if (serviceFilter !== 'all' && req.serviceType !== serviceFilter) return false;
      if (!q) return true;
      return (
        req.requestCode.toLowerCase().includes(q) ||
        req.phone.toLowerCase().includes(q) ||
        req.district.toLowerCase().includes(q) ||
        req.address.toLowerCase().includes(q) ||
        req.description.toLowerCase().includes(q) ||
        (req.assignedTechnicianName || '').toLowerCase().includes(q)
      );
    });
  }, [requests, searchQuery, statusFilter, serviceFilter]);

  const handleSaveRequest = async () => {
    if (!selectedRequest) return;
    setSavingRequest(true);
    setSaveFeedback(null);

    const chosenTech = technicians.find((t) => t.id === editTechId);
    const resolvedStatus: RequestStatus =
      chosenTech && (editStatus === 'new' || editStatus === 'reviewing')
        ? 'assigned'
        : editStatus;

    try {
      await updateServiceRequestAdmin(selectedRequest.id, {
        status: resolvedStatus,
        adminNotes: editNotes,
        assignedTechnicianId: chosenTech ? chosenTech.id : '',
        assignedTechnicianName: chosenTech ? chosenTech.name : '',
        assignedTechnicianPhone: chosenTech ? chosenTech.phone : '',
      });
      setEditStatus(resolvedStatus);
      setSaveFeedback('تم حفظ التعديلات بنجاح');
    } catch {
      setSaveFeedback('تعذر حفظ التغييرات. تحقق من صلاحيات المدير.');
    } finally {
      setSavingRequest(false);
    }
  };

  const handleDeleteRequest = async () => {
    if (!selectedRequest) return;
    setSavingRequest(true);
    try {
      await deleteServiceRequestAdmin(selectedRequest.id);
      setSelectedRequestId(null);
    } finally {
      setSavingRequest(false);
      setConfirmDeleteRequest(false);
    }
  };

  const handleCopyPhone = async (phoneValue: string) => {
    try {
      await navigator.clipboard.writeText(phoneValue);
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 1800);
    } catch {
      // Clipboard API unavailable
    }
  };

  const resetTechForm = () => {
    setTechName('');
    setTechPhone('');
    setTechSpecialty('electrical');
    setTechNotes('');
    setTechActive(true);
    setEditingTechId(null);
    setTechFormError(null);
  };

  const handleEditTechClick = (tech: Technician) => {
    setEditingTechId(tech.id);
    setTechName(tech.name);
    setTechPhone(tech.phone);
    setTechSpecialty(tech.specialty);
    setTechNotes(tech.notes || '');
    setTechActive(tech.active);
    setTechFormError(null);
  };

  const handleSubmitTechnician = async (e: React.FormEvent) => {
    e.preventDefault();
    setTechFormError(null);

    if (techName.trim().length < 2) {
      setTechFormError('يرجى إدخال اسم الفني (حرفان على الأقل).');
      return;
    }
    if (techPhone.trim().length < 8) {
      setTechFormError('يرجى إدخال رقم هاتف صحيح للفني.');
      return;
    }

    setSavingTech(true);
    try {
      const payload = {
        name: techName.trim(),
        phone: techPhone.trim(),
        specialty: techSpecialty,
        active: techActive,
        notes: techNotes.trim(),
      };
      if (editingTechId) {
        await updateTechnician(editingTechId, payload);
      } else {
        await createTechnician(payload);
      }
      resetTechForm();
    } catch {
      setTechFormError('تعذر حفظ بيانات الفني. يرجى المحاولة مرة أخرى.');
    } finally {
      setSavingTech(false);
    }
  };

  const handleDeleteTechnician = async (techId: string) => {
    await deleteTechnician(techId);
    if (editingTechId === techId) resetTechForm();
    setConfirmDeleteTechId(null);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Dashboard Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-5">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-[#9A7420]">
            لوحة تحكم الإدارة · برج العرب
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0B0B0C]">
            إدارة طلبات الصيانة والفنيين
          </h1>
          <p className="text-xs text-neutral-500">
            حساب المدير:{' '}
            <span dir="ltr" className="font-mono text-neutral-700">
              {user.email}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-1 rounded-xl border border-neutral-200 bg-neutral-100 p-1">
            <button
              type="button"
              onClick={() => setActiveTab('requests')}
              className={`inline-flex items-center gap-1.5 min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'requests'
                  ? 'bg-[#0B0B0C] text-white'
                  : 'text-neutral-700 hover:text-[#0B0B0C]'
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              <span>الطلبات</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('technicians')}
              className={`inline-flex items-center gap-1.5 min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'technicians'
                  ? 'bg-[#0B0B0C] text-white'
                  : 'text-neutral-700 hover:text-[#0B0B0C]'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>الفنيون</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => signOut(auth)}
            className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-2 rounded-xl border border-neutral-300 bg-white text-xs sm:text-sm font-semibold text-neutral-700 hover:bg-neutral-50 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>خروج</span>
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <p className="text-xs text-neutral-500">إجمالي الطلبات</p>
          <p className="mt-1 font-display text-2xl font-bold text-[#0B0B0C] tabular-nums">
            {kpis.total}
          </p>
        </div>
        <div className="rounded-xl border border-[#E5D3A3] bg-[#FBF7EE] p-4">
          <p className="text-xs text-[#8C6818]">طلبات جديدة</p>
          <p className="mt-1 font-display text-2xl font-bold text-[#8C6818] tabular-nums">
            {kpis.newCount}
          </p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <p className="text-xs text-neutral-500">قيد المراجعة / التعيين</p>
          <p className="mt-1 font-display text-2xl font-bold text-blue-700 tabular-nums">
            {kpis.activeCount}
          </p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <p className="text-xs text-neutral-500">طلبات مكتملة</p>
          <p className="mt-1 font-display text-2xl font-bold text-emerald-700 tabular-nums">
            {kpis.completedCount}
          </p>
        </div>
      </div>

      {activeTab === 'requests' ? (
        <div className="space-y-4">
          {/* Search & Filters */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-6 relative">
                <Search className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث برقم الطلب، رقم الهاتف، الحي، العنوان أو اسم الفني..."
                  className="w-full min-h-[44px] rounded-xl border border-neutral-300 bg-[#FAFAFA] pr-10 pl-4 py-2 text-sm text-[#0B0B0C] focus:border-[#C89D3C] focus:bg-white focus:outline-none"
                />
              </div>

              <div className="md:col-span-3">
                <select
                  aria-label="تصفية حسب القسم"
                  value={serviceFilter}
                  onChange={(e) =>
                    setServiceFilter(e.target.value as ServiceType | 'all')
                  }
                  className="w-full min-h-[44px] rounded-xl border border-neutral-300 bg-[#FAFAFA] px-3 py-2 text-sm text-[#0B0B0C] focus:border-[#C89D3C] focus:outline-none"
                >
                  <option value="all">جميع الأقسام</option>
                  {SERVICE_CATEGORIES.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-3">
                <select
                  aria-label="تصفية حسب الحالة"
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(e.target.value as RequestStatus | 'all')
                  }
                  className="w-full min-h-[44px] rounded-xl border border-neutral-300 bg-[#FAFAFA] px-3 py-2 text-sm text-[#0B0B0C] focus:border-[#C89D3C] focus:outline-none"
                >
                  <option value="all">جميع الحالات</option>
                  {STATUS_OPTIONS.map((st) => (
                    <option key={st} value={st}>
                      {STATUS_META[st].label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Requests Content */}
          {requestsError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">تعذر تحميل الطلبات من Firestore</p>
                <p className="text-xs mt-1 break-all">{requestsError}</p>
              </div>
            </div>
          )}

          {loadingRequests ? (
            <div className="rounded-2xl border border-neutral-200 bg-white p-8 space-y-3">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="h-12 w-full animate-pulse rounded-lg bg-neutral-100"
                />
              ))}
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="rounded-2xl border border-neutral-200 bg-white p-10 text-center space-y-2">
              <ClipboardList className="w-10 h-10 text-neutral-300 mx-auto" />
              <h2 className="font-display text-lg font-bold text-[#0B0B0C]">
                {requests.length === 0
                  ? 'لا توجد طلبات صيانة واردة حتى الآن'
                  : 'لا توجد نتائج مطابقة للبحث'}
              </h2>
              <p className="text-sm text-neutral-500 max-w-md mx-auto">
                {requests.length === 0
                  ? 'بمجرد أن يرسل أحد العملاء طلباً من واجهة العميل، سيظهر هنا فوراً بكامل التفاصيل والصور والموقع.'
                  : 'جرب تغيير كلمات البحث أو إزالة الفلاتر الحالية.'}
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
              {/* Desktop Data Table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-200 bg-[#FAFAFA] text-xs font-semibold text-neutral-600">
                      <th className="py-3.5 px-4">المرجع</th>
                      <th className="py-3.5 px-4">القسم</th>
                      <th className="py-3.5 px-4">المنطقة والعميل</th>
                      <th className="py-3.5 px-4">الهاتف</th>
                      <th className="py-3.5 px-4">الحالة</th>
                      <th className="py-3.5 px-4">الفني المعيّن</th>
                      <th className="py-3.5 px-4">التاريخ</th>
                      <th className="py-3.5 px-4">إجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 text-sm">
                    {filteredRequests.map((req) => {
                      const statusStyle = STATUS_META[req.status];
                      return (
                        <tr
                          key={req.id}
                          onClick={() => setSelectedRequestId(req.id)}
                          className="hover:bg-[#FAFAFA] transition-colors cursor-pointer"
                        >
                          <td className="py-3.5 px-4 font-mono text-xs font-semibold text-[#0B0B0C] tabular-nums whitespace-nowrap">
                            {req.requestCode}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-[#0B0B0C] whitespace-nowrap">
                            {SERVICE_LABELS[req.serviceType]}
                          </td>
                          <td className="py-3.5 px-4 max-w-[260px]">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-[#0B0B0C] truncate">
                                {req.district}
                              </p>
                              {(req.photoCount > 0 || req.photoUrls.length > 0) && (
                                <span
                                  title="يحتوي على صور مرفقة"
                                  className="inline-flex items-center gap-1 rounded bg-[#FBF7EE] border border-[#E5D3A3] px-1.5 py-0.5 text-[11px] font-mono text-[#8C6818] shrink-0"
                                >
                                  <ImageIcon className="w-3 h-3" />
                                  {req.photoCount || req.photoUrls.length}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-neutral-500 truncate">
                              {req.description}
                            </p>
                          </td>
                          <td
                            dir="ltr"
                            className="py-3.5 px-4 font-mono text-xs text-neutral-700 tabular-nums text-right whitespace-nowrap"
                          >
                            {req.phone}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
                            >
                              {statusStyle.label}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-xs text-neutral-700 whitespace-nowrap">
                            {req.assignedTechnicianName || 'غير معيّن'}
                          </td>
                          <td className="py-3.5 px-4 text-xs text-neutral-500 tabular-nums whitespace-nowrap">
                            {formatDateTime(req.createdAt)}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedRequestId(req.id);
                              }}
                              className="text-xs font-semibold text-[#9A7420] hover:text-[#0B0B0C] cursor-pointer"
                            >
                              إدارة الطلب
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List */}
              <div className="lg:hidden divide-y divide-neutral-200">
                {filteredRequests.map((req) => {
                  const statusStyle = STATUS_META[req.status];
                  return (
                    <button
                      key={req.id}
                      type="button"
                      onClick={() => setSelectedRequestId(req.id)}
                      className="w-full text-right p-4 space-y-2.5 hover:bg-neutral-50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-mono font-bold text-[#0B0B0C] tabular-nums">
                            {req.requestCode}
                          </span>
                          <span aria-hidden="true" className="text-neutral-300">
                            ·
                          </span>
                          <span className="font-semibold text-[#9A7420]">
                            {SERVICE_LABELS[req.serviceType]}
                          </span>
                        </div>
                        <span
                          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
                        >
                          {statusStyle.label}
                        </span>
                      </div>

                      <p className="text-sm font-semibold text-[#0B0B0C]">
                        {req.district}
                      </p>
                      <p className="text-xs text-neutral-600 line-clamp-2">
                        {req.description}
                      </p>

                      <div className="flex items-center justify-between text-xs text-neutral-500 pt-1">
                        <span dir="ltr" className="font-mono tabular-nums">
                          {req.phone}
                        </span>
                        <span className="tabular-nums">
                          {formatDateTime(req.createdAt)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Technicians Management Tab (Admin Only) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Add / Edit Technician Form */}
          <form
            onSubmit={handleSubmitTechnician}
            className="lg:col-span-5 rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6 space-y-4"
            noValidate
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-[#0B0B0C]">
                {editingTechId ? 'تعديل بيانات فني' : 'إضافة فني جديد'}
              </h2>
              {editingTechId && (
                <button
                  type="button"
                  onClick={resetTechForm}
                  className="text-xs font-semibold text-neutral-500 hover:text-[#0B0B0C] cursor-pointer"
                >
                  إلغاء التعديل
                </button>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-700">
                اسم الفني
              </label>
              <input
                type="text"
                maxLength={120}
                value={techName}
                onChange={(e) => setTechName(e.target.value)}
                placeholder="مثال: م. أحمد محمود"
                className="w-full min-h-[44px] rounded-xl border border-neutral-300 bg-[#FAFAFA] px-3.5 py-2 text-sm focus:border-[#C89D3C] focus:bg-white focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-700">
                رقم الهاتف
              </label>
              <input
                type="tel"
                dir="ltr"
                maxLength={25}
                value={techPhone}
                onChange={(e) => setTechPhone(e.target.value)}
                placeholder="01000000000"
                className="w-full min-h-[44px] rounded-xl border border-neutral-300 bg-[#FAFAFA] px-3.5 py-2 text-sm text-right tabular-nums focus:border-[#C89D3C] focus:bg-white focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-700">
                التخصص
              </label>
              <select
                value={techSpecialty}
                onChange={(e) =>
                  setTechSpecialty(e.target.value as TechnicianSpecialty)
                }
                className="w-full min-h-[44px] rounded-xl border border-neutral-300 bg-[#FAFAFA] px-3.5 py-2 text-sm focus:border-[#C89D3C] focus:bg-white focus:outline-none"
              >
                {SERVICE_CATEGORIES.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.title}
                  </option>
                ))}
                <option value="general">صيانة عامة</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-700">
                ملاحظات داخلية (اختياري)
              </label>
              <textarea
                rows={2}
                maxLength={500}
                value={techNotes}
                onChange={(e) => setTechNotes(e.target.value)}
                placeholder="أيام العمل أو نطاق التغطية المفضل..."
                className="w-full rounded-xl border border-neutral-300 bg-[#FAFAFA] px-3.5 py-2 text-sm focus:border-[#C89D3C] focus:bg-white focus:outline-none"
              />
            </div>

            <label className="flex items-center gap-2.5 text-sm text-[#0B0B0C] cursor-pointer">
              <input
                type="checkbox"
                checked={techActive}
                onChange={(e) => setTechActive(e.target.checked)}
                className="h-4 w-4 accent-[#0B0B0C]"
              />
              <span>متاح لتعيين الطلبات</span>
            </label>

            {techFormError && (
              <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl p-2.5">
                {techFormError}
              </p>
            )}

            <button
              type="submit"
              disabled={savingTech}
              className="flex w-full min-h-[46px] items-center justify-center gap-2 rounded-xl bg-[#0B0B0C] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#1E1E22] disabled:opacity-60 transition-colors cursor-pointer"
            >
              {savingTech ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 text-[#D6B05A]" />
              )}
              <span>{editingTechId ? 'حفظ التعديل' : 'إضافة الفني'}</span>
            </button>
          </form>

          {/* Technicians Roster List */}
          <div className="lg:col-span-7 rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-bold text-[#0B0B0C]">
                  قائمة الفنيين المسجلين
                </h2>
                <p className="text-xs text-neutral-500">
                  هذه القائمة سرية وتظهر لمدير التطبيق فقط ولا يراها العملاء.
                </p>
              </div>
              <span className="font-mono text-xs font-semibold text-neutral-600 tabular-nums">
                {technicians.length} فني
              </span>
            </div>

            {techsError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                {techsError}
              </div>
            )}

            {loadingTechs ? (
              <div className="space-y-2">
                {[1, 2].map((n) => (
                  <div
                    key={n}
                    className="h-16 animate-pulse rounded-xl bg-neutral-100"
                  />
                ))}
              </div>
            ) : technicians.length === 0 ? (
              <div className="rounded-xl border border-dashed border-neutral-300 bg-[#FAFAFA] p-8 text-center space-y-2">
                <Wrench className="w-8 h-8 text-neutral-300 mx-auto" />
                <p className="text-sm font-semibold text-[#0B0B0C]">
                  لا يوجد فنيون مسجلون بعد
                </p>
                <p className="text-xs text-neutral-500">
                  أضف فنيي الشركة من النموذج المجاور لتتمكن من تعيينهم على
                  الطلبات الواردة.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-200 border-t border-neutral-200">
                {technicians.map((tech) => (
                  <div
                    key={tech.id}
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-bold text-[#0B0B0C]">
                          {tech.name}
                        </span>
                        <span aria-hidden="true" className="text-neutral-300">
                          ·
                        </span>
                        <span className="text-xs font-semibold text-[#9A7420]">
                          {SPECIALTY_LABELS[tech.specialty]}
                        </span>
                        <span aria-hidden="true" className="text-neutral-300">
                          ·
                        </span>
                        <span
                          className={`text-xs font-medium ${
                            tech.active ? 'text-emerald-700' : 'text-neutral-400'
                          }`}
                        >
                          {tech.active ? 'متاح' : 'غير متاح'}
                        </span>
                      </div>
                      <p
                        dir="ltr"
                        className="font-mono text-xs text-neutral-600 text-right tabular-nums"
                      >
                        {tech.phone}
                      </p>
                      {tech.notes && (
                        <p className="text-xs text-neutral-500">{tech.notes}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleEditTechClick(tech)}
                        className="min-h-[36px] px-3 py-1.5 rounded-lg border border-neutral-300 text-xs font-semibold text-[#0B0B0C] hover:bg-neutral-50 cursor-pointer"
                      >
                        تعديل
                      </button>

                      {confirmDeleteTechId === tech.id ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleDeleteTechnician(tech.id)}
                            className="min-h-[36px] px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 cursor-pointer"
                          >
                            تأكيد الحذف
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteTechId(null)}
                            className="min-h-[36px] px-2.5 py-1.5 rounded-lg border border-neutral-300 text-xs text-neutral-600 cursor-pointer"
                          >
                            إلغاء
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteTechId(tech.id)}
                          className="min-h-[36px] px-2.5 py-1.5 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 text-xs font-semibold cursor-pointer"
                        >
                          حذف
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Request Detail & Management Drawer */}
      {selectedRequest && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs"
          onClick={() => setSelectedRequestId(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="h-full w-full max-w-xl overflow-y-auto bg-white p-5 sm:p-7 shadow-2xl space-y-6"
          >
            {/* Drawer Header */}
            <div className="flex items-start justify-between gap-4 border-b border-neutral-200 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-neutral-500">
                  <span
                    dir="ltr"
                    className="font-mono font-bold text-[#0B0B0C] tabular-nums"
                  >
                    {selectedRequest.requestCode}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{SERVICE_LABELS[selectedRequest.serviceType]}</span>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1 tabular-nums">
                    <Clock className="w-3.5 h-3.5" />
                    {formatDateTime(selectedRequest.createdAt)}
                  </span>
                </div>
                <h2 className="font-display text-xl font-bold text-[#0B0B0C]">
                  تفاصيل طلب الصيانة
                </h2>
              </div>

              <button
                type="button"
                aria-label="إغلاق التفاصيل"
                onClick={() => setSelectedRequestId(null)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-200 text-neutral-600 hover:bg-neutral-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Customer Contact & Location */}
            <div className="rounded-xl border border-neutral-200 bg-[#FAFAFA] p-4 space-y-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-neutral-600 font-medium">هاتف العميل:</span>
                <div className="flex items-center gap-2">
                  <a
                    href={`tel:${selectedRequest.phone}`}
                    dir="ltr"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#0B0B0C] px-3 py-1.5 font-mono text-xs font-semibold text-white hover:bg-[#1E1E22] tabular-nums"
                  >
                    <Phone className="w-3.5 h-3.5 text-[#D6B05A]" />
                    <span>{selectedRequest.phone}</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => handleCopyPhone(selectedRequest.phone)}
                    className="inline-flex items-center gap-1 rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 cursor-pointer"
                  >
                    {copiedPhone ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>تم النسخ</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>نسخ</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="border-t border-neutral-200 pt-2.5 space-y-1">
                <p className="text-xs font-semibold text-[#9A7420]">
                  {selectedRequest.district}
                </p>
                <p className="text-sm text-[#0B0B0C] leading-relaxed">
                  {selectedRequest.address}
                </p>
              </div>

              {(selectedRequest.locationUrl ||
                (selectedRequest.locationLat !== undefined &&
                  selectedRequest.locationLng !== undefined)) && (
                <div className="pt-1">
                  <a
                    href={
                      selectedRequest.locationUrl ||
                      `https://maps.google.com/?q=${selectedRequest.locationLat},${selectedRequest.locationLng}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:underline"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>فتح موقع العميل على خرائط جوجل</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>

            {/* Problem Description */}
            <div className="space-y-1.5">
              <h3 className="text-xs font-bold text-neutral-500">
                وصف العطل من العميل
              </h3>
              <p className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-[#0B0B0C] leading-relaxed whitespace-pre-wrap">
                {selectedRequest.description}
              </p>
            </div>

            {/* Problem Photos */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-neutral-500">
                  الصور المرفقة (
                  {loadingPhotos
                    ? selectedRequest.photoCount || selectedRequest.photoUrls.length
                    : requestPhotos.length + selectedRequest.photoUrls.length}
                  )
                </h3>
                {!loadingPhotos &&
                  requestPhotos.length + selectedRequest.photoUrls.length > 0 && (
                    <span className="text-[11px] text-neutral-400">
                      اضغط على أي صورة للعرض بالحجم الكامل
                    </span>
                  )}
              </div>

              {loadingPhotos ? (
                <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-[#FAFAFA] p-4 text-xs text-neutral-600">
                  <Loader2 className="w-4 h-4 animate-spin text-[#9A7420]" />
                  <span>جاري تحميل الصور المرفقة...</span>
                </div>
              ) : photosError ? (
                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{photosError}</span>
                </div>
              ) : requestPhotos.length === 0 &&
                selectedRequest.photoUrls.length === 0 ? (
                <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-[#FAFAFA] p-4 text-xs text-neutral-500">
                  <ImageIcon className="w-4 h-4" />
                  <span>لم يرفق العميل صوراً لهذا الطلب.</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {requestPhotos.map((photo, idx) => (
                    <button
                      key={photo.id}
                      type="button"
                      onClick={() => setLightboxImage(photo.dataUrl)}
                      className="group relative aspect-square overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 hover:border-[#C89D3C] transition-colors cursor-pointer"
                    >
                      <img
                        src={photo.dataUrl}
                        alt={`صورة المشكلة ${idx + 1}`}
                        className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                      />
                    </button>
                  ))}
                  {selectedRequest.photoUrls.map((url, idx) => (
                    <button
                      key={url}
                      type="button"
                      onClick={() => setLightboxImage(url)}
                      className="group relative aspect-square overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 hover:border-[#C89D3C] transition-colors cursor-pointer"
                    >
                      <img
                        src={url}
                        alt={`صورة المشكلة ${requestPhotos.length + idx + 1}`}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Admin Controls: Status, Technician Assignment, Admin Notes */}
            <div className="border-t border-neutral-200 pt-5 space-y-4">
              <h3 className="font-display text-base font-bold text-[#0B0B0C]">
                إجراءات الإدارة وتعيين الفني
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="admin-status-select"
                    className="text-xs font-semibold text-neutral-700"
                  >
                    حالة الطلب
                  </label>
                  <select
                    id="admin-status-select"
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as RequestStatus)}
                    className="w-full min-h-[44px] rounded-xl border border-neutral-300 bg-[#FAFAFA] px-3 py-2 text-sm font-medium text-[#0B0B0C] focus:border-[#C89D3C] focus:bg-white focus:outline-none"
                  >
                    {STATUS_OPTIONS.map((st) => (
                      <option key={st} value={st}>
                        {STATUS_META[st].label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="admin-tech-select"
                    className="text-xs font-semibold text-neutral-700"
                  >
                    تعيين الفني المناسب
                  </label>
                  <select
                    id="admin-tech-select"
                    value={editTechId}
                    onChange={(e) => setEditTechId(e.target.value)}
                    className="w-full min-h-[44px] rounded-xl border border-neutral-300 bg-[#FAFAFA] px-3 py-2 text-sm text-[#0B0B0C] focus:border-[#C89D3C] focus:bg-white focus:outline-none"
                  >
                    <option value="">— بدون تعيين فني —</option>
                    {technicians
                      .filter((t) => t.active || t.id === editTechId)
                      .map((tech) => (
                        <option key={tech.id} value={tech.id}>
                          {tech.name} ({SPECIALTY_LABELS[tech.specialty]})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {technicians.length === 0 && (
                <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  <span>لم تقم بإضافة فنيين بعد لتعيينهم على الطلبات.</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRequestId(null);
                      setActiveTab('technicians');
                    }}
                    className="font-bold underline shrink-0 cursor-pointer"
                  >
                    إضافة فني
                  </button>
                </div>
              )}

              {editTechId && (
                <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2.5 text-xs text-blue-900">
                  <UserCheck className="w-4 h-4 shrink-0 text-blue-700" />
                  <span>
                    الفني المختار:{' '}
                    <strong>
                      {technicians.find((t) => t.id === editTechId)?.name ||
                        selectedRequest.assignedTechnicianName}
                    </strong>{' '}
                    (سري – لا يظهر للعميل)
                  </span>
                </div>
              )}

              <div className="space-y-1.5">
                <label
                  htmlFor="admin-notes-input"
                  className="text-xs font-semibold text-neutral-700"
                >
                  ملاحظات إدارية داخلية
                </label>
                <textarea
                  id="admin-notes-input"
                  rows={3}
                  maxLength={2000}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="أضف ملاحظات عن الموعد المتفق عليه، قطع الغيار المطلوبة، أو تفاصيل المتابعة..."
                  className="w-full rounded-xl border border-neutral-300 bg-[#FAFAFA] px-3.5 py-2.5 text-sm text-[#0B0B0C] focus:border-[#C89D3C] focus:bg-white focus:outline-none"
                />
              </div>

              {saveFeedback && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{saveFeedback}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleSaveRequest}
                  disabled={savingRequest}
                  className="flex-1 min-h-[46px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#0B0B0C] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#1E1E22] disabled:opacity-60 cursor-pointer"
                >
                  {savingRequest && (
                    <Loader2 className="w-4 h-4 animate-spin text-[#D6B05A]" />
                  )}
                  <span>حفظ التغييرات</span>
                </button>

                {confirmDeleteRequest ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDeleteRequest}
                      disabled={savingRequest}
                      className="min-h-[46px] px-4 py-2.5 rounded-xl bg-red-600 text-xs font-bold text-white hover:bg-red-700 cursor-pointer"
                    >
                      تأكيد الحذف النهائي
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteRequest(false)}
                      className="min-h-[46px] px-3 py-2.5 rounded-xl border border-neutral-300 text-xs font-semibold text-neutral-700 cursor-pointer"
                    >
                      إلغاء
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteRequest(true)}
                    className="min-h-[46px] inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-200 px-4 py-2.5 text-xs font-semibold text-red-700 hover:bg-red-50 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>حذف الطلب</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Photo Lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightboxImage(null)}
        >
          <button
            type="button"
            aria-label="إغلاق الصورة"
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 left-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={lightboxImage}
            alt="معاينة صورة العطل"
            referrerPolicy="no-referrer"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] max-w-full rounded-xl object-contain"
          />
        </div>
      )}
    </div>
  );
}
