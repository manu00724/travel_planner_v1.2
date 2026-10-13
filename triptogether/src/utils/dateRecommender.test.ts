import { describe, it, expect } from 'vitest';
import {
  calculateDateRecommendations,
  summarizeDayAvailability,
  getConsecutiveDates,
  addDaysYMD,
} from './dateRecommender';
import { GroupMember, DayAvailability } from '../types';

describe('Date Recommender Engine', () => {
  const mockMembers: GroupMember[] = [
    { userId: 'u1', role: 'admin', joinedAt: Date.now(), displayName: 'Elena' },
    { userId: 'u2', role: 'member', joinedAt: Date.now(), displayName: 'Marcus' },
    { userId: 'u3', role: 'member', joinedAt: Date.now(), displayName: 'Sophia' },
  ];

  it('correctly generates consecutive dates', () => {
    const dates = getConsecutiveDates('2026-06-01', 3);
    expect(dates).toEqual(['2026-06-01', '2026-06-02', '2026-06-03']);
  });

  it('ranks 100% Free range as Tier 1', () => {
    const availabilityMap: Record<string, DayAvailability> = {
      '2026-06-01': { date: '2026-06-01', entries: { u1: 'free', u2: 'free', u3: 'free' } },
      '2026-06-02': { date: '2026-06-02', entries: { u1: 'free', u2: 'free', u3: 'free' } },
      '2026-06-03': { date: '2026-06-03', entries: { u1: 'free', u2: 'free', u3: 'free' } },
    };

    const { recommendations, conflictingRanges } = calculateDateRecommendations(
      mockMembers,
      availabilityMap,
      3,
      '2026-06-01',
      '2026-06-03'
    );

    expect(recommendations.length).toBe(1);
    expect(recommendations[0].tier).toBe(1);
    expect(recommendations[0].veryBusyCountTotal).toBe(0);
    expect(conflictingRanges.length).toBe(0);
  });

  it('ranks ranges with Maybe Free (and 0 Very Busy) as Tier 2', () => {
    const availabilityMap: Record<string, DayAvailability> = {
      '2026-06-01': { date: '2026-06-01', entries: { u1: 'free', u2: 'maybe_free', u3: 'free' } },
      '2026-06-02': { date: '2026-06-02', entries: { u1: 'free', u2: 'free', u3: 'free' } },
    };

    const { recommendations, conflictingRanges } = calculateDateRecommendations(
      mockMembers,
      availabilityMap,
      2,
      '2026-06-01',
      '2026-06-02'
    );

    expect(recommendations.length).toBe(1);
    expect(recommendations[0].tier).toBe(2);
    expect(recommendations[0].maybeFreeCountTotal).toBe(1);
    expect(conflictingRanges.length).toBe(0);
  });

  it('strictly segregates conflicting ranges with Very Busy responses', () => {
    const availabilityMap: Record<string, DayAvailability> = {
      '2026-06-01': { date: '2026-06-01', entries: { u1: 'free', u2: 'very_busy', u3: 'free' } },
      '2026-06-02': { date: '2026-06-02', entries: { u1: 'free', u2: 'free', u3: 'free' } },
    };

    const { recommendations, conflictingRanges } = calculateDateRecommendations(
      mockMembers,
      availabilityMap,
      2,
      '2026-06-01',
      '2026-06-02'
    );

    expect(recommendations.length).toBe(0); // Not in common recommendations!
    expect(conflictingRanges.length).toBe(1); // Segregated to conflicting ranges
    expect(conflictingRanges[0].veryBusyCountTotal).toBeGreaterThan(0);
  });

  it('summarizes day availability accurately', () => {
    const availabilityMap: Record<string, DayAvailability> = {
      '2026-07-10': { date: '2026-07-10', entries: { u1: 'free', u2: 'maybe_free', u3: 'very_busy' } },
    };

    const summary = summarizeDayAvailability('2026-07-10', mockMembers, availabilityMap);
    expect(summary.freeCount).toBe(1);
    expect(summary.maybeFreeCount).toBe(1);
    expect(summary.veryBusyCount).toBe(1);
    expect(summary.unmarkedCount).toBe(0);
    expect(summary.category).toBe('conflicting');
  });
});
