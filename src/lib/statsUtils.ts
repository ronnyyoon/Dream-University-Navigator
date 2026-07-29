import { OfficialStat } from '../types';

export const normalizeUniversityName = (name: string): string => {
  if (!name) return '';
  let trimmed = name.trim();
  if (trimmed === '국립국립목포대학교') return '국립목포대학교';
  if (trimmed === '국립국립목포해양대학교') return '국립목포해양대학교';
  return trimmed;
};

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

export const generateUniqueId = (): string => {
  return `id_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
};

/**
 * Safely upsert (merge/update/insert) new OfficialStat items into an existing list.
 * Grouping is strictly based on composite key: universityName + departmentName + admissionType + detailedType.
 * Preserves original id and location for existing items, merging stats per year.
 */
export const upsertOfficialStats = (
  existingList: OfficialStat[],
  newList: OfficialStat[]
): OfficialStat[] => {
  const resultMap = new Map<string, OfficialStat>();

  // 1. Load existing items into resultMap
  existingList.forEach((item) => {
    if (!item.universityName || !item.departmentName || !item.admissionType) return;
    const key = makeCompositeKey(
      item.universityName,
      item.departmentName,
      item.admissionType,
      item.detailedType
    );
    const existingId = item.id || generateUniqueId();
    resultMap.set(key, {
      ...item,
      id: existingId,
      universityName: normalizeUniversityName(item.universityName),
      departmentName: item.departmentName.trim(),
      admissionType: item.admissionType.trim(),
      detailedType: (item.detailedType || '').trim(),
      location: (item.location || '').trim(),
      stats: { ...(item.stats || {}) }
    });
  });

  // 2. Upsert new items
  newList.forEach((newItem) => {
    if (!newItem.universityName || !newItem.departmentName || !newItem.admissionType) return;
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

    if (resultMap.has(key)) {
      // UPDATE existing item
      const existingItem = resultMap.get(key)!;

      // Retain existing location unless it was missing or default dummy '-'
      const finalLocation = (existingItem.location && existingItem.location !== '-' && existingItem.location !== '')
        ? existingItem.location
        : (normLoc || existingItem.location || '');

      // Merge stats per year
      const mergedStats: Record<string, any> = { ...(existingItem.stats || {}) };

      if (newItem.stats) {
        Object.keys(newItem.stats).forEach((year) => {
          const newYearStats = newItem.stats[year];
          if (newYearStats) {
            const existingYearStats = mergedStats[year] || {};
            const updatedYearStats: Record<string, string> = { ...existingYearStats };

            Object.keys(newYearStats).forEach((field) => {
              const val = newYearStats[field];
              if (val !== undefined && val !== null && val !== '') {
                updatedYearStats[field] = String(val).trim();
              } else if (updatedYearStats[field] === undefined) {
                updatedYearStats[field] = '';
              }
            });

            mergedStats[year] = updatedYearStats;
          }
        });
      }

      resultMap.set(key, {
        ...existingItem,
        location: finalLocation,
        detailedType: normDet || existingItem.detailedType,
        stats: mergedStats
      });
    } else {
      // INSERT new item
      const newId = newItem.id || generateUniqueId();
      const freshItem: OfficialStat = {
        id: newId,
        universityName: normUni,
        departmentName: normDept,
        admissionType: normAdm,
        detailedType: normDet,
        location: normLoc,
        stats: { ...(newItem.stats || {}) }
      };
      resultMap.set(key, freshItem);
    }
  });

  return Array.from(resultMap.values());
};
