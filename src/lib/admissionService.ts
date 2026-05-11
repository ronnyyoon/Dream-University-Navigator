import { 
  collection, 
  query, 
  getDocs, 
  where, 
  limit, 
  orderBy,
  setDoc,
  doc,
  deleteDoc,
  updateDoc,
  writeBatch,
  DocumentData,
  QueryConstraint
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { AdmissionCase, OfficialStat } from '../types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

const ADMISSION_COLLECTION = 'admissionCases';
const STATS_COLLECTION = 'officialStats';

export async function fetchAdmissionCases(filters: {
  year?: string;
  location?: string;
  universityName?: string;
  departmentName?: string;
  admissionType?: string;
  detailedType?: string;
  finalResult?: string;
  isEnrolled?: string;
  minGrade?: number;
  maxGrade?: number;
} = {}): Promise<AdmissionCase[]> {
  try {
    const qConstraints: QueryConstraint[] = [];

    if (filters.year && filters.year !== '전체') {
      qConstraints.push(where('year', '==', parseInt(filters.year)));
    }
    if (filters.location && filters.location !== '전체') {
      qConstraints.push(where('location', '==', filters.location));
    }
    if (filters.universityName && filters.universityName !== '전체') {
      qConstraints.push(where('universityName', '==', filters.universityName));
    }
    if (filters.departmentName && filters.departmentName !== '전체') {
      qConstraints.push(where('departmentName', '==', filters.departmentName));
    }
    if (filters.admissionType && filters.admissionType !== '전체') {
      qConstraints.push(where('admissionType', '==', filters.admissionType));
    }
    if (filters.detailedType && filters.detailedType !== '전체') {
      qConstraints.push(where('detailedType', '==', filters.detailedType));
    }
    if (filters.finalResult && filters.finalResult !== '전체') {
      if (filters.finalResult === '최종합격(합격+충원합격)') {
        qConstraints.push(where('finalResult', 'in', ['합격', '충원합격']));
      } else {
        qConstraints.push(where('finalResult', '==', filters.finalResult));
      }
    }
    if (filters.isEnrolled && filters.isEnrolled !== '전체') {
      qConstraints.push(where('isEnrolled', '==', filters.isEnrolled));
    }
    if (filters.minGrade !== undefined) {
      qConstraints.push(where('grade', '>=', filters.minGrade));
    }
    if (filters.maxGrade !== undefined) {
      qConstraints.push(where('grade', '<=', filters.maxGrade));
    }

    // Default order
    qConstraints.push(orderBy('year', 'desc'));
    qConstraints.push(orderBy('grade', 'asc'));

    const q = query(collection(db, ADMISSION_COLLECTION), ...qConstraints);
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    } as AdmissionCase));
  } catch (error: any) {
    console.error("Error fetching admission cases:", error);
    // Standardized error throwing as per instructions
    throw new Error(JSON.stringify({
      error: error.message,
      operationType: 'list',
      path: ADMISSION_COLLECTION,
      authInfo: {
        userId: 'anonymous', // Update if auth is implemented
        email: '',
        emailVerified: false,
        isAnonymous: true,
        providerInfo: []
      }
    }));
  }
}

// Since indexing everything correctly might take time, 
// a simpler version that fetches and filters client-side for "small" datasets (like this one)
export async function fetchAllAdmissionCases(): Promise<AdmissionCase[]> {
  try {
    const querySnapshot = await getDocs(collection(db, ADMISSION_COLLECTION));
    return querySnapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    } as AdmissionCase));
  } catch (error: any) {
    throw new Error(JSON.stringify({
      error: error.message,
      operationType: 'list',
      path: ADMISSION_COLLECTION,
      authInfo: { userId: '', email: '', emailVerified: false, isAnonymous: true, providerInfo: [] }
    }));
  }
}

export async function fetchOfficialStats(filters: {
  location?: string;
  universityName?: string;
  departmentName?: string;
  admissionType?: string;
  detailedType?: string;
} = {}): Promise<OfficialStat[]> {
  try {
    const qConstraints: QueryConstraint[] = [];

    if (filters.location && filters.location !== '전체') {
      qConstraints.push(where('location', '==', filters.location));
    }
    if (filters.universityName && filters.universityName !== '전체') {
      qConstraints.push(where('universityName', '==', filters.universityName));
    }
    if (filters.admissionType && filters.admissionType !== '전체') {
      qConstraints.push(where('admissionType', '==', filters.admissionType));
    }
    if (filters.detailedType && filters.detailedType !== '전체') {
      qConstraints.push(where('detailedType', '==', filters.detailedType));
    }

    // Since contains/includes is not supported in Firestore where, 
    // we fetch and filter departmentName client-side if needed, 
    // or just fetch by other keys first.
    // For now, let's keep it simple and combine constraints.
    
    let q = query(collection(db, STATS_COLLECTION), ...qConstraints);
    const querySnapshot = await getDocs(q);
    
    let results = querySnapshot.docs.map(d => ({ ...d.data(), id: d.id } as OfficialStat));
    
    // Server-side filtering is better for exact matches (already done in qConstraints),
    // but we can add secondary filtering for completeness if Firestore didn't handle it.
    
    // Client-side sub-filtering for department name (partial match)
    if (filters.departmentName) {
      const search = filters.departmentName.toLowerCase().trim();
      if (search) {
        results = results.filter(r => r.departmentName && r.departmentName.toLowerCase().includes(search));
      }
    }
    
    // Final safety check for UI display
    return results.filter(r => r.universityName && r.universityName.trim() !== '');
  } catch (error: any) {
    throw new Error(JSON.stringify({
      error: error.message,
      operationType: 'list',
      path: STATS_COLLECTION,
      authInfo: { userId: '', email: '', emailVerified: false, isAnonymous: true, providerInfo: [] }
    }));
  }
}

export async function uploadOfficialStats(stats: OfficialStat[]): Promise<void> {
  try {
    for (let i = 0; i < stats.length; i += 500) {
      const chunk = stats.slice(i, i + 500);
      const batch = writeBatch(db);
      
      for (const stat of chunk) {
        const docRef = doc(collection(db, STATS_COLLECTION));
        batch.set(docRef, { ...stat, id: docRef.id });
      }
      
      await batch.commit();
    }
  } catch (error: any) {
    throw new Error(JSON.stringify({
      error: error.message,
      operationType: OperationType.WRITE,
      path: STATS_COLLECTION,
      authInfo: {
        userId: auth.currentUser?.uid || '',
        email: auth.currentUser?.email || '',
        emailVerified: auth.currentUser?.emailVerified || false,
        isAnonymous: auth.currentUser?.isAnonymous || true,
        providerInfo: []
      }
    }));
  }
}

export async function deleteOfficialStatsByUniversity(universityName: string): Promise<number> {
  try {
    let totalDeleted = 0;
    let hasMore = true;

    while (hasMore) {
      const q = query(
        collection(db, STATS_COLLECTION), 
        where('universityName', '==', universityName),
        limit(500)
      );
      const querySnapshot = await getDocs(q);
      const docs = querySnapshot.docs;

      if (docs.length === 0) {
        hasMore = false;
        break;
      }

      const batch = writeBatch(db);
      for (const d of docs) {
        batch.delete(d.ref);
      }
      await batch.commit();
      totalDeleted += docs.length;
      
      if (totalDeleted > 10000) break;
    }
    
    return totalDeleted;
  } catch (error: any) {
    throw new Error(JSON.stringify({
      error: error.message,
      operationType: OperationType.DELETE,
      path: STATS_COLLECTION,
      authInfo: {
        userId: auth.currentUser?.uid || '',
        email: auth.currentUser?.email || '',
        emailVerified: auth.currentUser?.emailVerified || false,
        isAnonymous: auth.currentUser?.isAnonymous || true,
        providerInfo: []
      }
    }));
  }
}

export async function deleteOfficialStat(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, STATS_COLLECTION, id));
  } catch (error: any) {
    throw new Error(JSON.stringify({
      error: error.message,
      operationType: OperationType.DELETE,
      path: `${STATS_COLLECTION}/${id}`,
      authInfo: {
        userId: auth.currentUser?.uid || '',
        email: auth.currentUser?.email || '',
        emailVerified: auth.currentUser?.emailVerified || false,
        isAnonymous: auth.currentUser?.isAnonymous || true,
        providerInfo: []
      }
    }));
  }
}

export async function updateOfficialStat(id: string, data: Partial<OfficialStat>): Promise<void> {
  try {
    const { id: _, ...updateData } = data as any;
    await updateDoc(doc(db, STATS_COLLECTION, id), updateData);
  } catch (error: any) {
    throw new Error(JSON.stringify({
      error: error.message,
      operationType: OperationType.UPDATE,
      path: `${STATS_COLLECTION}/${id}`,
      authInfo: {
        userId: auth.currentUser?.uid || '',
        email: auth.currentUser?.email || '',
        emailVerified: auth.currentUser?.emailVerified || false,
        isAnonymous: auth.currentUser?.isAnonymous || true,
        providerInfo: []
      }
    }));
  }
}

export async function deleteAllOfficialStats(): Promise<number> {
  try {
    let totalDeleted = 0;
    let hasMore = true;

    while (hasMore) {
      const q = query(collection(db, STATS_COLLECTION), limit(500));
      const querySnapshot = await getDocs(q);
      const docs = querySnapshot.docs;

      if (docs.length === 0) {
        hasMore = false;
        break;
      }

      const batch = writeBatch(db);
      for (const d of docs) {
        batch.delete(d.ref);
      }
      await batch.commit();
      totalDeleted += docs.length;
      
      // Safety break to prevent infinite loops if something goes wrong
      if (totalDeleted > 10000) break;
    }
    
    return totalDeleted;
  } catch (error: any) {
    throw new Error(JSON.stringify({
      error: error.message,
      operationType: OperationType.DELETE,
      path: STATS_COLLECTION,
      authInfo: {
        userId: auth.currentUser?.uid || '',
        email: auth.currentUser?.email || '',
        emailVerified: auth.currentUser?.emailVerified || false,
        isAnonymous: auth.currentUser?.isAnonymous || true,
        providerInfo: []
      }
    }));
  }
}
