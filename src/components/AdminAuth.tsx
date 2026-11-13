import {
  GoogleAuthProvider,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  LogOut,
  Mail,
  ShieldAlert,
} from 'lucide-react';
import { useState } from 'react';
import { auth } from '../lib/firebase';

interface AdminAuthProps {
  currentUser: User | null;
  authChecking: boolean;
  isAuthorizedAdmin: boolean;
  onRefreshAdminStatus: () => void;
}

export function AdminAuth({
  currentUser,
  authChecking,
  isAuthorizedAdmin,
  onRefreshAdminStatus,
}: AdminAuthProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationSent, setVerificationSent] = useState(false);

  const mapAuthError = (err: unknown): string => {
    const code =
      err && typeof err === 'object' && 'code' in err
        ? String((err as { code: string }).code)
        : '';
    switch (code) {
      case 'auth/invalid-credential':
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        return 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
      case 'auth/invalid-email':
        return 'صيغة البريد الإلكتروني غير صالحة.';
      case 'auth/too-many-requests':
        return 'تم تجاوز عدد المحاولات المسموح به. يرجى الانتظار قليلاً ثم المحاولة.';
      case 'auth/operation-not-allowed':
        return 'يرجى تفعيل تسجيل الدخول بالبريد الإلكتروني وكلمة المرور من لوحة تحكم Firebase (Authentication → Sign-in method).';
      case 'auth/popup-closed-by-user':
        return 'تم إغلاق نافذة تسجيل الدخول قبل الإتمام.';
      default:
        return 'تعذر تسجيل الدخول. تأكد من صحة البيانات واتصال الإنترنت.';
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('يرجى إدخال البريد الإلكتروني وكلمة المرور.');
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSendVerification = async () => {
    if (!currentUser) return;
    setError(null);
    setLoading(true);
    try {
      await sendEmailVerification(currentUser);
      setVerificationSent(true);
    } catch {
      setError('تعذر إرسال رابط التفعيل حالياً. حاول مرة أخرى بعد قليل.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  if (authChecking) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#C89D3C] mx-auto" />
        <p className="text-sm text-neutral-600">جاري التحقق من جلسة الإدارة...</p>
      </div>
    );
  }

  // User is signed in, but not recognized as Admin in Firestore rules
  if (currentUser && !isAuthorizedAdmin) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 sm:py-16">
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8 space-y-5">
          <div className="flex items-center gap-3 text-amber-700">
            <ShieldAlert className="w-7 h-7 shrink-0" />
            <h1 className="font-display text-xl font-bold text-[#0B0B0C]">
              الحساب مسجل لكنه غير مفعل كمدير
            </h1>
          </div>

          <p className="text-sm text-neutral-600 leading-relaxed">
            لأغراض الأمان والخصوصية، لا يمكن عرض طلبات العملاء إلا لحساب مدير
            معتمد في قاعدة البيانات أو بريد مدير مفعّل.
          </p>

          <div className="rounded-xl border border-neutral-200 bg-[#FAFAFA] p-4 space-y-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-neutral-500">البريد الإلكتروني:</span>
              <span dir="ltr" className="font-mono font-medium text-[#0B0B0C]">
                {currentUser.email || '—'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-neutral-500">حالة تأكيد البريد:</span>
              <span className="font-medium text-[#0B0B0C]">
                {currentUser.emailVerified ? 'مؤكد' : 'غير مؤكد'}
              </span>
            </div>
            <div className="pt-1 border-t border-neutral-200">
              <span className="block text-neutral-500 mb-1">
                معرف المستخدم (UID) لإضافته في مجموعة admins داخل قاعدة البيانات (ai-studio-d891641a-71f9-4ef6-b105-2114f288afb5):
              </span>
              <code
                dir="ltr"
                className="block w-full select-all rounded-lg bg-white border border-neutral-200 px-3 py-2 font-mono text-[11px] text-[#0B0B0C] break-all"
              >
                {currentUser.uid}
              </code>
            </div>
          </div>

          {!currentUser.emailVerified && (
            <div className="space-y-2">
              {verificationSent ? (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>
                    تم إرسال رابط التأكيد إلى بريدك الإلكتروني. بعد الضغط عليه
                    اضغط تحديث الحالة.
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleSendVerification}
                  disabled={loading}
                  className="w-full min-h-[44px] rounded-xl border border-[#C89D3C] bg-[#FBF7EE] px-4 py-2.5 text-sm font-semibold text-[#8C6818] hover:bg-[#F5EBD0] transition-colors cursor-pointer"
                >
                  إرسال رابط تأكيد البريد الإلكتروني
                </button>
              )}
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
              {error}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={onRefreshAdminStatus}
              className="flex-1 min-h-[44px] rounded-xl bg-[#0B0B0C] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1E1E22] transition-colors cursor-pointer"
            >
              تحديث حالة الصلاحية
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center justify-center gap-2 min-h-[44px] rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:py-16">
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8 space-y-6">
        <div className="space-y-1.5 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#0B0B0C] text-[#D6B05A]">
            <Lock className="w-5 h-5" />
          </div>
          <h1 className="font-display text-2xl font-bold text-[#0B0B0C] pt-2">
            تسجيل دخول الإدارة
          </h1>
          <p className="text-sm text-neutral-600">
            لوحة تحكم خاصة بمدير تطبيق خدمات المنصور فقط
          </p>
        </div>

        <form onSubmit={handleEmailLogin} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <label
              htmlFor="admin-email"
              className="block text-xs font-semibold text-neutral-700"
            >
              البريد الإلكتروني
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                id="admin-email"
                type="email"
                dir="ltr"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                className="w-full min-h-[48px] rounded-xl border border-neutral-300 bg-[#FAFAFA] pr-10 pl-4 py-2.5 text-sm text-[#0B0B0C] focus:border-[#C89D3C] focus:bg-white focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="admin-password"
              className="block text-xs font-semibold text-neutral-700"
            >
              كلمة المرور
            </label>
            <div className="relative">
              <input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                dir="ltr"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full min-h-[48px] rounded-xl border border-neutral-300 bg-[#FAFAFA] pr-4 pl-11 py-2.5 text-sm text-[#0B0B0C] focus:border-[#C89D3C] focus:bg-white focus:outline-none transition-colors"
              />
              <button
                type="button"
                aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute left-1.5 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 hover:text-neutral-800 cursor-pointer"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[#0B0B0C] px-4 py-3 text-sm font-bold text-white hover:bg-[#1E1E22] disabled:opacity-60 transition-colors cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#D6B05A]" />
                <span>جاري تسجيل الدخول...</span>
              </>
            ) : (
              <span>دخول إلى لوحة الإدارة</span>
            )}
          </button>
        </form>

        <div className="relative flex items-center py-1">
          <div className="flex-grow border-t border-neutral-200" />
          <span className="mx-3 shrink-0 text-xs text-neutral-400">أو</span>
          <div className="flex-grow border-t border-neutral-200" />
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="flex w-full min-h-[46px] items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-[#0B0B0C] hover:bg-neutral-50 disabled:opacity-60 transition-colors cursor-pointer"
        >
          <span>تسجيل الدخول بحساب Google المعتمد</span>
        </button>
      </div>
    </div>
  );
}
