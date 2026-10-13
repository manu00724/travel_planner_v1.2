import { DateRecommendation, DayAvailability, GroupMember } from '../types';

export function formatDateYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDateYMD(str: string): Date {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDaysYMD(dateStr: string, days: number): string {
  const d = parseDateYMD(dateStr);
  d.setDate(d.getDate() + days);
  return formatDateYMD(d);
}

export function getConsecutiveDates(startDate: string, lengthDays: number): string[] {
  const dates: string[] = [];
  for (let i = 0; i < lengthDays; i++) {
    dates.push(addDaysYMD(startDate, i));
  }
  return dates;
}

export interface DayStatusSummary {
  date: string;
  freeCount: number;
  maybeFreeCount: number;
  veryBusyCount: number;
  unmarkedCount: number;
  freeMembers: string[];
  maybeFreeMembers: string[];
  veryBusyMembers: string[];
  unmarkedMembers: string[];
  category: 'everyone_free' | 'workable' | 'incomplete' | 'conflicting';
}

/**
 * Summarizes the availability of all group members on a given date.
 */
export function summarizeDayAvailability(
  date: string,
  members: GroupMember[],
  availabilityMap: Record<string, DayAvailability> // date -> DayAvailability
): DayStatusSummary {
  const dayData = availabilityMap[date]?.entries || {};
  const totalMembers = members.length;

  const freeMembers: string[] = [];
  const maybeFreeMembers: string[] = [];
  const veryBusyMembers: string[] = [];
  const unmarkedMembers: string[] = [];

  for (const m of members) {
    const status = dayData[m.userId];
    if (status === 'free') {
      freeMembers.push(m.userId);
    } else if (status === 'maybe_free') {
      maybeFreeMembers.push(m.userId);
    } else if (status === 'very_busy') {
      veryBusyMembers.push(m.userId);
    } else {
      unmarkedMembers.push(m.userId);
    }
  }

  let category: 'everyone_free' | 'workable' | 'incomplete' | 'conflicting' = 'incomplete';
  if (veryBusyMembers.length > 0) {
    category = 'conflicting';
  } else if (unmarkedMembers.length > 0) {
    category = 'incomplete';
  } else if (maybeFreeMembers.length > 0) {
    category = 'workable';
  } else if (totalMembers > 0 && freeMembers.length === totalMembers) {
    category = 'everyone_free';
  }

  return {
    date,
    freeCount: freeMembers.length,
    maybeFreeCount: maybeFreeMembers.length,
    veryBusyCount: veryBusyMembers.length,
    unmarkedCount: unmarkedMembers.length,
    freeMembers,
    maybeFreeMembers,
    veryBusyMembers,
    unmarkedMembers,
    category,
  };
}

/**
 * Evaluates consecutive date ranges of length `lengthDays` within a given search window.
 * Returns sorted recommendations (Tier 1 -> Tier 2 -> Tier 3) and separate conflicting ranges.
 */
export function calculateDateRecommendations(
  members: GroupMember[],
  availabilityMap: Record<string, DayAvailability>,
  lengthDays: number,
  searchStartDate: string,
  searchEndDate: string
): {
  recommendations: DateRecommendation[];
  conflictingRanges: DateRecommendation[];
} {
  if (members.length === 0 || lengthDays <= 0) {
    return { recommendations: [], conflictingRanges: [] };
  }

  const allDates: string[] = [];
  let curr = searchStartDate;
  while (curr <= searchEndDate) {
    allDates.push(curr);
    curr = addDaysYMD(curr, 1);
  }

  const recommendations: DateRecommendation[] = [];
  const conflictingRanges: DateRecommendation[] = [];

  // Iterate over all possible start dates
  for (let i = 0; i <= allDates.length - lengthDays; i++) {
    const windowDates = allDates.slice(i, i + lengthDays);
    const startDate = windowDates[0];
    const endDate = windowDates[windowDates.length - 1];

    let totalFree = 0;
    let totalMaybe = 0;
    let totalBusy = 0;
    let totalUnmarked = 0;

    const memberBreakdown: Record<string, {
      freeDays: number;
      maybeDays: number;
      busyDays: number;
      unmarkedDays: number;
    }> = {};

    for (const m of members) {
      memberBreakdown[m.userId] = { freeDays: 0, maybeDays: 0, busyDays: 0, unmarkedDays: 0 };
    }

    for (const d of windowDates) {
      const summary = summarizeDayAvailability(d, members, availabilityMap);
      totalFree += summary.freeCount;
      totalMaybe += summary.maybeFreeCount;
      totalBusy += summary.veryBusyCount;
      totalUnmarked += summary.unmarkedCount;

      for (const uid of summary.freeMembers) {
        if (memberBreakdown[uid]) memberBreakdown[uid].freeDays++;
      }
      for (const uid of summary.maybeFreeMembers) {
        if (memberBreakdown[uid]) memberBreakdown[uid].maybeDays++;
      }
      for (const uid of summary.veryBusyMembers) {
        if (memberBreakdown[uid]) memberBreakdown[uid].busyDays++;
      }
      for (const uid of summary.unmarkedMembers) {
        if (memberBreakdown[uid]) memberBreakdown[uid].unmarkedDays++;
      }
    }

    const isConflicting = totalBusy > 0;
    const isFullyAnswered = totalUnmarked === 0;
    const isAllFree = totalBusy === 0 && totalMaybe === 0 && totalUnmarked === 0;

    let tier: 1 | 2 | 3 = 3;
    let explanation = '';

    if (isConflicting) {
      explanation = `${totalBusy} conflict(s) marked as Very Busy.`;
      conflictingRanges.push({
        startDate,
        endDate,
        lengthDays,
        tier: 3,
        isConflicting: true,
        freeCountTotal: totalFree,
        maybeFreeCountTotal: totalMaybe,
        veryBusyCountTotal: totalBusy,
        unmarkedCountTotal: totalUnmarked,
        memberBreakdown,
        explanation,
      });
      continue;
    }

    if (isAllFree) {
      tier = 1;
      explanation = 'All members are 100% Free on every day of this trip!';
    } else if (isFullyAnswered) {
      tier = 2;
      explanation = `Everyone responded with 0 conflicts (${totalMaybe} Maybe Free responses).`;
    } else {
      tier = 3;
      explanation = `No known conflicts, but waiting for ${totalUnmarked} member response(s).`;
    }

    recommendations.push({
      startDate,
      endDate,
      lengthDays,
      tier,
      isConflicting: false,
      freeCountTotal: totalFree,
      maybeFreeCountTotal: totalMaybe,
      veryBusyCountTotal: totalBusy,
      unmarkedCountTotal: totalUnmarked,
      memberBreakdown,
      explanation,
    });
  }

  // Sort recommendations:
  // Tier 1 first (all free)
  // Tier 2 next (sorted ascending by maybeFreeCountTotal)
  // Tier 3 next (sorted ascending by unmarkedCountTotal)
  recommendations.sort((a, b) => {
    if (a.tier !== b.tier) {
      return a.tier - b.tier;
    }
    if (a.tier === 2) {
      return a.maybeFreeCountTotal - b.maybeFreeCountTotal;
    }
    if (a.tier === 3) {
      return a.unmarkedCountTotal - b.unmarkedCountTotal;
    }
    return 0;
  });

  // Sort conflicting ranges by fewest busy days first
  conflictingRanges.sort((a, b) => a.veryBusyCountTotal - b.veryBusyCountTotal);

  return {
    recommendations,
    conflictingRanges,
  };
}
