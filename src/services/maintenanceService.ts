import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreError';
import {
  compressProblemPhoto,
  type CompressedProblemPhoto,
} from '../lib/imageCompression';
import type {
  RequestPhoto,
  RequestStatus,
  ServiceRequest,
  ServiceType,
  Technician,
  TechnicianSpecialty,
} from '../types/maintenance';

const BOOTSTRAPPED_ADMIN_EMAIL = 'ibrahimmohmed010322@gmail.com';

export interface CreateServiceRequestInput {
  serviceType: ServiceType;
  description: string;
  phone: string;
  district: string;
  address: string;
  locationLat?: number;
  locationLng?: number;
  locationUrl?: string;
  photos?: File[];
  onProgress?: (statusText: string) => void;
}

export interface CreateServiceRequestResult {
  id: string;
  requestCode: string;
  uploadedPhotoCount: number;
}

function generateRequestId(): string {
  const rand = Math.random().toString(36).substring(2, 8);
  return `req_${Date.now()}_${rand}`;
}

function generateRequestCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return `MS-${code}`;
}

function parseTimestamp(value: unknown): Date | null {
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  if (value && typeof value === 'object' && 'toDate' in value) {
    return (value as { toDate: () => Date }).toDate();
  }
  return null;
}

export async function submitServiceRequest(
  input: CreateServiceRequestInput
): Promise<CreateServiceRequestResult> {
  const requestId = generateRequestId();
  const requestCode = generateRequestCode();
  const rawPhotos = (input.photos || []).slice(0, 4);

  const compressedPhotos: CompressedProblemPhoto[] = [];
  for (let i = 0; i < rawPhotos.length; i += 1) {
    input.onProgress?.(
      `جاري ضغط وتجهيز الصورة ${i + 1} من ${rawPhotos.length}...`
    );
    const compressed = await compressProblemPhoto(rawPhotos[i], i);
    compressedPhotos.push(compressed);
  }

  input.onProgress?.(
    compressedPhotos.length > 0
      ? 'جاري حفظ الطلب ورفع الصور بشكل آمن...'
      : 'جاري حفظ الطلب...'
  );

  const trimmedDescription = input.description.trim().slice(0, 2000);
  const trimmedPhone = input.phone.trim().slice(0, 20);
  const trimmedDistrict = input.district.trim().slice(0, 100);
  const trimmedAddress = input.address.trim().slice(0, 400);
  const trimmedLocationUrl = input.locationUrl?.trim().slice(0, 300);

  const payload: Record<string, unknown> = {
    requestCode,
    serviceType: input.serviceType,
    description: trimmedDescription,
    phone: trimmedPhone,
    district: trimmedDistrict,
    address: trimmedAddress,
    photoUrls: [],
    photoCount: compressedPhotos.length,
    status: 'new',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (
    typeof input.locationLat === 'number' &&
    Number.isFinite(input.locationLat) &&
    typeof input.locationLng === 'number' &&
    Number.isFinite(input.locationLng)
  ) {
    payload.locationLat = input.locationLat;
    payload.locationLng = input.locationLng;
  }

  if (trimmedLocationUrl) {
    payload.locationUrl = trimmedLocationUrl;
  }

  const batch = writeBatch(db);
  const parentRef = doc(db, 'service_requests', requestId);
  batch.set(parentRef, payload);

  for (const photo of compressedPhotos) {
    const photoRef = doc(
      db,
      'service_requests',
      requestId,
      'photos',
      `photo_${photo.index}`
    );
    batch.set(photoRef, {
      index: photo.index,
      dataUrl: photo.dataUrl,
      mimeType: photo.mimeType,
      width: photo.width,
      height: photo.height,
      sizeBytes: photo.sizeBytes,
      createdAt: serverTimestamp(),
    });
  }

  const path = `service_requests/${requestId}`;
  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }

  return {
    id: requestId,
    requestCode,
    uploadedPhotoCount: compressedPhotos.length,
  };
}

export async function verifyAdminAccess(user: User): Promise<boolean> {
  if (
    user.email?.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL &&
    user.emailVerified
  ) {
    return true;
  }

  const path = `admins/${user.uid}`;
  try {
    const snap = await getDoc(doc(db, 'admins', user.uid));
    return snap.exists();
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export function subscribeServiceRequests(
  onData: (requests: ServiceRequest[]) => void,
  onError: (err: Error) => void
): () => void {
  const path = 'service_requests';
  const q = query(collection(db, path), orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: ServiceRequest[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          requestCode: String(data.requestCode || d.id),
          serviceType: data.serviceType as ServiceType,
          description: String(data.description || ''),
          phone: String(data.phone || ''),
          district: String(data.district || ''),
          address: String(data.address || ''),
          locationLat:
            typeof data.locationLat === 'number' ? data.locationLat : undefined,
          locationLng:
            typeof data.locationLng === 'number' ? data.locationLng : undefined,
          locationUrl:
            typeof data.locationUrl === 'string' ? data.locationUrl : undefined,
          photoUrls: Array.isArray(data.photoUrls)
            ? data.photoUrls.filter((u): u is string => typeof u === 'string')
            : [],
          photoCount:
            typeof data.photoCount === 'number' ? data.photoCount : 0,
          status: (data.status || 'new') as RequestStatus,
          assignedTechnicianId:
            typeof data.assignedTechnicianId === 'string'
              ? data.assignedTechnicianId
              : undefined,
          assignedTechnicianName:
            typeof data.assignedTechnicianName === 'string'
              ? data.assignedTechnicianName
              : undefined,
          assignedTechnicianPhone:
            typeof data.assignedTechnicianPhone === 'string'
              ? data.assignedTechnicianPhone
              : undefined,
          adminNotes:
            typeof data.adminNotes === 'string' ? data.adminNotes : undefined,
          createdAt: parseTimestamp(data.createdAt),
          updatedAt: parseTimestamp(data.updatedAt),
        };
      });
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export async function fetchRequestPhotosAdmin(
  requestId: string
): Promise<RequestPhoto[]> {
  const path = `service_requests/${requestId}/photos`;
  try {
    const q = query(collection(db, 'service_requests', requestId, 'photos'), orderBy('index', 'asc'));
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => {
        const data = d.data();
        return {
          id: d.id,
          index: typeof data.index === 'number' ? data.index : 0,
          dataUrl: String(data.dataUrl || ''),
          mimeType: (data.mimeType === 'image/webp'
            ? 'image/webp'
            : 'image/jpeg') as 'image/jpeg' | 'image/webp',
          width: typeof data.width === 'number' ? data.width : 0,
          height: typeof data.height === 'number' ? data.height : 0,
          sizeBytes: typeof data.sizeBytes === 'number' ? data.sizeBytes : 0,
          createdAt: parseTimestamp(data.createdAt),
        };
      })
      .filter((p) => p.dataUrl.startsWith('data:image/'));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export interface UpdateServiceRequestPatch {
  status: RequestStatus;
  adminNotes: string;
  assignedTechnicianId: string;
  assignedTechnicianName: string;
  assignedTechnicianPhone: string;
}

export async function updateServiceRequestAdmin(
  requestId: string,
  patch: UpdateServiceRequestPatch
): Promise<void> {
  const path = `service_requests/${requestId}`;
  try {
    await updateDoc(doc(db, 'service_requests', requestId), {
      status: patch.status,
      adminNotes: patch.adminNotes.trim().slice(0, 2000),
      assignedTechnicianId: patch.assignedTechnicianId.trim().slice(0, 128),
      assignedTechnicianName: patch.assignedTechnicianName.trim().slice(0, 120),
      assignedTechnicianPhone: patch.assignedTechnicianPhone.trim().slice(0, 30),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteServiceRequestAdmin(
  requestId: string
): Promise<void> {
  const path = `service_requests/${requestId}`;
  try {
    const photosSnap = await getDocs(
      collection(db, 'service_requests', requestId, 'photos')
    );
    const batch = writeBatch(db);
    photosSnap.docs.forEach((photoDoc) => {
      batch.delete(photoDoc.ref);
    });
    batch.delete(doc(db, 'service_requests', requestId));
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeTechnicians(
  onData: (technicians: Technician[]) => void,
  onError: (err: Error) => void
): () => void {
  const path = 'technicians';
  const q = query(collection(db, path), orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: Technician[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: String(data.name || ''),
          phone: String(data.phone || ''),
          specialty: (data.specialty || 'general') as TechnicianSpecialty,
          active: Boolean(data.active),
          notes: typeof data.notes === 'string' ? data.notes : undefined,
          createdAt: parseTimestamp(data.createdAt),
          updatedAt: parseTimestamp(data.updatedAt),
        };
      });
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export interface TechnicianInput {
  name: string;
  phone: string;
  specialty: TechnicianSpecialty;
  active: boolean;
  notes?: string;
}

export async function createTechnician(input: TechnicianInput): Promise<void> {
  const techId = `tech_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const path = `technicians/${techId}`;
  try {
    await setDoc(doc(db, 'technicians', techId), {
      name: input.name.trim().slice(0, 120),
      phone: input.phone.trim().slice(0, 25),
      specialty: input.specialty,
      active: input.active,
      notes: (input.notes || '').trim().slice(0, 500),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateTechnician(
  techId: string,
  input: TechnicianInput
): Promise<void> {
  const path = `technicians/${techId}`;
  try {
    await updateDoc(doc(db, 'technicians', techId), {
      name: input.name.trim().slice(0, 120),
      phone: input.phone.trim().slice(0, 25),
      specialty: input.specialty,
      active: input.active,
      notes: (input.notes || '').trim().slice(0, 500),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteTechnician(techId: string): Promise<void> {
  const path = `technicians/${techId}`;
  try {
    await deleteDoc(doc(db, 'technicians', techId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
