import { collection, addDoc, writeBatch, doc, getDocs, query, limit } from 'firebase/firestore';
import { db } from './firebase';
import { SEED_ADMISSION_CASES } from '../seedData';
import { SEED_OFFICIAL_STATS } from '../seedStatsData';

export async function checkNeedSeeding(): Promise<boolean> {
  const qCases = query(collection(db, 'admissionCases'), limit(1));
  const snapCases = await getDocs(qCases);
  
  const qStats = query(collection(db, 'officialStats'), limit(1));
  const snapStats = await getDocs(qStats);
  
  return snapCases.empty || snapStats.empty;
}

export async function seedInitialData() {
  // Case seeding (existing logic)
  const casesColRef = collection(db, 'admissionCases');
  console.log(`Seeding ${SEED_ADMISSION_CASES.length} cases...`);
  
  for (let i = 0; i < SEED_ADMISSION_CASES.length; i += 500) {
    const batch = writeBatch(db);
    const chunk = SEED_ADMISSION_CASES.slice(i, i + 500);
    chunk.forEach(item => {
      const docRef = doc(casesColRef);
      batch.set(docRef, { ...item, id: docRef.id });
    });
    await batch.commit();
  }

  // Stats seeding
  const statsColRef = collection(db, 'officialStats');
  console.log(`Seeding ${SEED_OFFICIAL_STATS.length} stats...`);
  
  const statsBatch = writeBatch(db);
  SEED_OFFICIAL_STATS.forEach(item => {
    const docRef = doc(statsColRef);
    statsBatch.set(docRef, { ...item, id: docRef.id });
  });
  await statsBatch.commit();
  
  console.log("Seeding completed.");
}
