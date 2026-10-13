import { describe, it, expect, beforeEach } from 'vitest';
import {
  createGroup,
  regenerateInvitation,
  revokeInvitation,
  getInvitation,
  addMemberToGroup,
  createPoll,
  castPollVote,
  setMemberAvailability,
  createSuggestion,
  updateSuggestion,
  toggleSuggestionVote,
  localStore,
} from './db';
import { UserProfile, GroupMember, DestinationPoll, ActivitySuggestion, DayAvailability } from '../types';

describe('TripTogether Data Layer & Multi-User Operations', () => {
  const alice: UserProfile = {
    id: 'user_alice',
    displayName: 'Alice Admin',
    email: 'alice@example.com',
  };

  const bob: UserProfile = {
    id: 'user_bob',
    displayName: 'Bob Traveler',
    email: 'bob@example.com',
  };

  // Polyfill localStorage in Node test environment if undefined
  if (typeof globalThis.localStorage === 'undefined') {
    const store: Record<string, string> = {};
    globalThis.localStorage = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = String(value);
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        for (const k in store) delete store[k];
      },
      key: (i: number) => Object.keys(store)[i] || null,
      length: 0,
    };
  }

  beforeEach(() => {
    localStorage.clear();
  });

  it('creates trip group with creator as admin and unique invite code', async () => {
    const group = await createGroup(
      {
        name: 'Summer in Kyoto',
        description: 'Cultural exploration trip',
        coverImageUrl: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e',
      },
      alice
    );

    expect(group.id).toBeDefined();
    expect(group.name).toBe('Summer in Kyoto');
    expect(group.createdBy).toBe(alice.id);
    expect(group.inviteCode).toBeDefined();
    expect(group.inviteActive).toBe(true);
    expect(group.status).toBe('choosing_destination');

    const members: GroupMember[] = localStore.get(`group_${group.id}_members`, []);
    expect(members.length).toBe(1);
    expect(members[0].userId).toBe(alice.id);
    expect(members[0].role).toBe('admin');
  });

  it('safely looks up invitation and adds new member without duplicates', async () => {
    const group = await createGroup({ name: 'Roadtrip', description: '' }, alice);
    const invite = await getInvitation(group.inviteCode);

    expect(invite).toBeDefined();
    expect(invite?.groupName).toBe('Roadtrip');
    expect(invite?.creatorName).toBe('Alice Admin');

    // Bob joins
    await addMemberToGroup(group.id, bob, 'member');
    let members: GroupMember[] = localStore.get(`group_${group.id}_members`, []);
    expect(members.length).toBe(2);

    // Prevent duplicate joining
    await addMemberToGroup(group.id, bob, 'member');
    members = localStore.get(`group_${group.id}_members`, []);
    expect(members.length).toBe(2);
  });

  it('admin can revoke and regenerate invitations', async () => {
    const group = await createGroup({ name: 'Beach Trip', description: '' }, alice);
    const originalCode = group.inviteCode;

    await revokeInvitation(group.id, originalCode);
    let inv = await getInvitation(originalCode);
    expect(inv?.isActive).toBe(false);

    const newCode = await regenerateInvitation(group.id);
    expect(newCode).not.toBe(originalCode);
    inv = await getInvitation(newCode);
    expect(inv?.isActive).toBe(true);
  });

  it('manages destination polls and handles voting', async () => {
    const group = await createGroup({ name: 'Vote Destination', description: '' }, alice);

    const pollId = await createPoll(group.id, {
      groupId: group.id,
      title: 'Where to in Italy?',
      description: 'Choose your top place',
      createdBy: alice.id,
      creatorName: alice.displayName,
      votingMode: 'single',
      options: [
        {
          id: 'opt_rome',
          name: 'Rome',
          description: 'Historic city',
          imageUrls: [],
          links: [],
          budget: '$$',
        },
        {
          id: 'opt_florence',
          name: 'Florence',
          description: 'Art and food',
          imageUrls: [],
          links: [],
          budget: '$$$',
        },
      ],
    });

    expect(pollId).toBeDefined();

    // Alice votes for Rome
    await castPollVote(group.id, pollId, alice.id, ['opt_rome']);
    let votes = localStore.get(`poll_${pollId}_votes`, {});
    expect(votes[alice.id].selectedOptionIds).toEqual(['opt_rome']);

    // Alice changes vote to Florence
    await castPollVote(group.id, pollId, alice.id, ['opt_florence']);
    votes = localStore.get(`poll_${pollId}_votes`, {});
    expect(votes[alice.id].selectedOptionIds).toEqual(['opt_florence']);
  });

  it('records and updates member availability across dates', async () => {
    const group = await createGroup({ name: 'Dates Trip', description: '' }, alice);

    await setMemberAvailability(group.id, alice.id, '2026-08-10', 'free');
    await setMemberAvailability(group.id, bob.id, '2026-08-10', 'maybe_free');

    const availMap: Record<string, DayAvailability> = localStore.get(`group_${group.id}_availability`, {});
    expect(availMap['2026-08-10'].entries[alice.id]).toBe('free');
    expect(availMap['2026-08-10'].entries[bob.id]).toBe('maybe_free');

    // Clear availability
    await setMemberAvailability(group.id, bob.id, '2026-08-10', null);
    const updatedMap: Record<string, DayAvailability> = localStore.get(`group_${group.id}_availability`, {});
    expect(updatedMap['2026-08-10'].entries[bob.id]).toBeUndefined();
  });

  it('supports activity suggestions, approval upvoting, and scheduling', async () => {
    const group = await createGroup({ name: 'Itinerary Trip', description: '' }, alice);

    const sugId = await createSuggestion(group.id, {
      groupId: group.id,
      targetDate: '2026-08-10',
      title: 'Hike Path of the Gods',
      description: 'Famous mountain trail',
      preferredSlot: 'morning',
      authorId: alice.id,
      authorName: alice.displayName,
      links: [],
      imageUrls: [],
    });

    let sugs: ActivitySuggestion[] = localStore.get(`group_${group.id}_suggestions`, []);
    expect(sugs.length).toBe(1);
    expect(sugs[0].id).toBe(sugId);
    expect(sugs[0].isConfirmed).toBe(false);

    // Bob upvotes
    await toggleSuggestionVote(group.id, sugId, bob.id);
    sugs = localStore.get(`group_${group.id}_suggestions`, []);
    expect(sugs[0].supportVotes).toContain(bob.id);

    // Admin confirms to schedule
    await updateSuggestion(group.id, sugId, {
      isConfirmed: true,
      scheduledTime: '08:30',
      scheduledOrder: 1,
    });

    sugs = localStore.get(`group_${group.id}_suggestions`, []);
    expect(sugs[0].isConfirmed).toBe(true);
    expect(sugs[0].scheduledTime).toBe('08:30');
    expect(sugs[0].scheduledOrder).toBe(1);
  });
});
