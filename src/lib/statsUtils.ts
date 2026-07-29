import { OfficialStat } from '../types';

export const normalizeUniversityName = (name: string): string => {
  if (!name) return '';
  let trimmed = name.trim();
  if (trimmed === '국립국립목포대학교') return '국립목포대학교';
  if (trimmed === '국립국립목포해양대학교') return '국립목포해양대학교';
  return trimmed;
};

/**
 * Creates a composite key using: universityName + departmentName + admissionType + detailedType.
 * Applies .trim() to each component to prevent duplicate/overwrite bugs caused by trailing whitespace.
 */
export const makeCompositeKey = (
  universityName: string,
  departmentName: string,
  admissionType: string,
  detailedType?: string
): string => {
  const u = normalizeUniversityName(universityName || '').toLowerCase().trim();
  const d = (departmentName || '').toLowerCase().trim();
  const a = (admissionType || '').toLowerCase().trim();
  const dt = (detailedType || '').toLowerCase().trim();
  return `${u}|${d}|${a}|${dt}`;
};

/**
 * Generates a unique ID combining timestamp and random string.
 */
export const generateUniqueId = (): string => {
  return `id_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
};

/**
 * Synchronous O(1) Map upsert for smaller datasets.
 * Preserves existing ID & location, shallow updates stats without deep cloning.
 */
export const upsertOfficialStats = (
  existingList: OfficialStat[],
  newList: OfficialStat[]
): OfficialStat[] => {
  const resultMap = new Map<string, OfficialStat>();

  // 1. Index existing items into Map (O(1) lookups)
  for (let i = 0; i < existingList.length; i++) {
    const item = existingList[i];
    if (!item || !item.universityName || !item.departmentName || !item.admissionType) continue;

    const key = makeCompositeKey(
      item.universityName,
      item.departmentName,
      item.admissionType,
      item.detailedType
    );

    resultMap.set(key, item);
  }

  // 2. Merge new items using O(1) lookups
  for (let i = 0; i < newList.length; i++) {
    const newItem = newList[i];
    if (!newItem || !newItem.universityName || !newItem.departmentName || !newItem.admissionType) continue;

    const key = makeCompositeKey(
      newItem.universityName,
      newItem.departmentName,
      newItem.admissionType,
      newItem.detailedType
    );

    const normUni = normalizeUniversityName(newItem.universityName);
    const normDept = newItem.departmentName.trim();
    const normAdm = newItem.admissionType.trim();
    const normDet = (newItem.detailedType || '').trim();
    const normLoc = (newItem.location || '').trim();

    const existingItem = resultMap.get(key);

    if (existingItem) {
      // UPDATE: Retain existing id and location; merge year stats
      if (normLoc && normLoc !== '-' && normLoc !== '' && (!existingItem.location || existingItem.location === '' || existingItem.location === '-')) {
        existingItem.location = normLoc;
      }
      if (normDet && (!existingItem.detailedType || existingItem.detailedType === '')) {
        existingItem.detailedType = normDet;
      }

      if (newItem.stats) {
        if (!existingItem.stats) existingItem.stats = {};
        const newStats = newItem.stats;
        const years = Object.keys(newStats);

        for (let y = 0; y < years.length; y++) {
          const year = years[y];
          const newYearObj = newStats[year];
          if (!newYearObj) continue;

          if (!existingItem.stats[year]) {
            existingItem.stats[year] = { ...newYearObj };
          } else {
            const exYearObj = existingItem.stats[year];
            const fields = Object.keys(newYearObj);
            for (let f = 0; f < fields.length; f++) {
              const field = fields[f];
              const val = newYearObj[field];
              if (val !== undefined && val !== null && val !== '') {
                exYearObj[field] = String(val).trim();
              }
            }
          }
        }
      }
    } else {
      // INSERT: Create fresh object with unique ID
      const newId = newItem.id || generateUniqueId();
      const freshItem: OfficialStat = {
        id: newId,
        universityName: normUni,
        departmentName: normDept,
        admissionType: normAdm,
        detailedType: normDet,
        location: normLoc,
        stats: newItem.stats ? { ...newItem.stats } : {}
      };
      resultMap.set(key, freshItem);
    }
  }

  return Array.from(resultMap.values());
};

/**
 * Asynchronous chunked Map upsert to avoid blocking the main UI thread when handling massive datasets (100+ / 10,000+ items).
 * Yields back to the event loop every `chunkSize` items and reports progress via `onProgress`.
 */
export const upsertOfficialStatsAsync = async (
  existingList: OfficialStat[],
  newList: OfficialStat[],
  onProgress?: (progressText: string, percent: number) => void,
  chunkSize = 2500
): Promise<OfficialStat[]> => {
  const resultMap = new Map<string, OfficialStat>();

  // Helper yield to event loop
  const yieldThread = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

  // 1. Index existing items in chunks
  const totalExisting = existingList.length;
  for (let i = 0; i < totalExisting; i++) {
    const item = existingList[i];
    if (item && item.universityName && item.departmentName && item.admissionType) {
      const key = makeCompositeKey(
        item.universityName,
        item.departmentName,
        item.admissionType,
        item.detailedType
      );
      resultMap.set(key, item);
    }

    if (i > 0 && i % chunkSize === 0) {
      const pct = Math.round((i / (totalExisting + newList.length || 1)) * 50);
      onProgress?.(`기존 데이터 색인 중... (${i.toLocaleString()}/${totalExisting.toLocaleString()})`, pct);
      await yieldThread();
    }
  }

  // 2. Merge new items in chunks
  const totalNew = newList.length;
  for (let i = 0; i < totalNew; i++) {
    const newItem = newList[i];
    if (newItem && newItem.universityName && newItem.departmentName && newItem.admissionType) {
      const key = makeCompositeKey(
        newItem.universityName,
        newItem.departmentName,
        newItem.admissionType,
        newItem.detailedType
      );

      const normUni = normalizeUniversityName(newItem.universityName);
      const normDept = newItem.departmentName.trim();
      const normAdm = newItem.admissionType.trim();
      const normDet = (newItem.detailedType || '').trim();
      const normLoc = (newItem.location || '').trim();

      const existingItem = resultMap.get(key);

      if (existingItem) {
        if (normLoc && normLoc !== '-' && normLoc !== '' && (!existingItem.location || existingItem.location === '' || existingItem.location === '-')) {
          existingItem.location = normLoc;
        }
        if (normDet && (!existingItem.detailedType || existingItem.detailedType === '')) {
          existingItem.detailedType = normDet;
        }

        if (newItem.stats) {
          if (!existingItem.stats) existingItem.stats = {};
          const newStats = newItem.stats;
          const years = Object.keys(newStats);

          for (let y = 0; y < years.length; y++) {
            const year = years[y];
            const newYearObj = newStats[year];
            if (!newYearObj) continue;

            if (!existingItem.stats[year]) {
              existingItem.stats[year] = { ...newYearObj };
            } else {
              const exYearObj = existingItem.stats[year];
              const fields = Object.keys(newYearObj);
              for (let f = 0; f < fields.length; f++) {
                const field = fields[f];
                const val = newYearObj[field];
                if (val !== undefined && val !== null && val !== '') {
                  exYearObj[field] = String(val).trim();
                }
              }
            }
          }
        }
      } else {
        const newId = newItem.id || generateUniqueId();
        const freshItem: OfficialStat = {
          id: newId,
          universityName: normUni,
          departmentName: normDept,
          admissionType: normAdm,
          detailedType: normDet,
          location: normLoc,
          stats: newItem.stats ? { ...newItem.stats } : {}
        };
        resultMap.set(key, freshItem);
      }
    }

    if (i > 0 && i % chunkSize === 0) {
      const pct = 50 + Math.round((i / (totalNew || 1)) * 50);
      onProgress?.(`신규 데이터 병합 중... (${i.toLocaleString()}/${totalNew.toLocaleString()})`, pct);
      await yieldThread();
    }
  }

  onProgress?.('데이터 병합 완료!', 100);
  await yieldThread();

  return Array.from(resultMap.values());
};

