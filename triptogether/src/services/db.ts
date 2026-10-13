import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  deleteField,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import {
  TripGroup,
  GroupMember,
  GroupInvitation,
  DayAvailability,
  DestinationPoll,
  PollVote,
  CommentItem,
  ActivitySuggestion,
  UserProfile,
  MemberRole,
} from '../types';

// ==========================================
// LOCAL STORAGE REACTIVE STORE FALLBACK
// Ensures immediate operation even before or during offline mode
// ==========================================
class LocalReactiveStore {
  private data: Record<string, any> = {};
  private listeners: Record<string, Set<(val: any) => void>> = {};

  constructor() {
    try {
      const saved = localStorage.getItem('triptogether_data');
      if (saved) {
        this.data = JSON.parse(saved);
      }
    } catch (_) {}
  }

  private persist() {
    try {
      localStorage.setItem('triptogether_data', JSON.stringify(this.data));
    } catch (_) {}
  }

  get(key: string, defaultVal: any = null) {
    return this.data[key] !== undefined ? this.data[key] : defaultVal;
  }

  set(key: string, value: any) {
    this.data[key] = value;
    this.persist();
    this.notify(key);
  }

  subscribe(key: string, callback: (val: any) => void) {
    if (!this.listeners[key]) {
      this.listeners[key] = new Set();
    }
    this.listeners[key].add(callback);
    callback(this.get(key));
    return () => {
      this.listeners[key]?.delete(callback);
    };
  }

  private notify(key: string) {
    if (this.listeners[key]) {
      const val = this.get(key);
      this.listeners[key].forEach((cb) => cb(val));
    }
  }
}

export const localStore = new LocalReactiveStore();

// ==========================================
// GROUPS SERVICE
// ==========================================

export async function createGroup(
  groupData: { name: string; description: string; coverImageUrl?: string },
  creator: UserProfile
): Promise<TripGroup> {
  const groupId = 'grp_' + Math.random().toString(36).substring(2, 9);
  const inviteCode = 'trip_' + Math.random().toString(36).substring(2, 8);

  const newGroup: TripGroup = {
    id: groupId,
    name: groupData.name,
    description: groupData.description,
    coverImageUrl: groupData.coverImageUrl || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80',
    createdBy: creator.id,
    createdAt: Date.now(),
    status: 'choosing_destination',
    inviteCode,
    inviteActive: true,
  };

  const adminMember: GroupMember = {
    userId: creator.id,
    displayName: creator.displayName,
    avatarUrl: creator.avatarUrl,
    role: 'admin',
    joinedAt: Date.now(),
  };

  const invitation: GroupInvitation = {
    inviteCode,
    groupId,
    groupName: newGroup.name,
    groupDescription: newGroup.description,
    creatorName: creator.displayName,
    isActive: true,
    createdAt: Date.now(),
  };

  // Save to local fallback first
  const existingGroups: TripGroup[] = localStore.get('groups', []);
  localStore.set('groups', [...existingGroups, newGroup]);
  localStore.set(`group_${groupId}_members`, [adminMember]);
  localStore.set(`invite_${inviteCode}`, invitation);

  // Sync to Firestore
  if (isFirebaseConfigured) {
    try {
      await setDoc(doc(db, 'groups', groupId), newGroup);
      await setDoc(doc(db, 'groups', groupId, 'members', creator.id), adminMember);
      await setDoc(doc(db, 'invitations', inviteCode), invitation);
    } catch (err) {
      console.warn('Firestore write warning:', err);
    }
  }

  return newGroup;
}

export function subscribeToUserGroups(
  userId: string,
  callback: (groups: TripGroup[]) => void
): () => void {
  if (!isFirebaseConfigured) {
    return localStore.subscribe('groups', (groups: TripGroup[] = []) => {
      callback(groups);
    });
  }

  try {
    // Provide initial cached local data synchronously
    callback(localStore.get('groups', []));

    const q = collection(db, 'groups');
    return onSnapshot(
      q,
      (snapshot) => {
        const remoteGroups: TripGroup[] = [];
        snapshot.forEach((d) => remoteGroups.push(d.data() as TripGroup));
        const localGroups: TripGroup[] = localStore.get('groups', []);
        // Merge remote and local by id, remote taking precedence
        const remoteMap = new Map(remoteGroups.map((g) => [g.id, g]));
        const merged = [...remoteGroups];
        for (const lg of localGroups) {
          if (!remoteMap.has(lg.id)) {
            merged.push(lg);
          }
        }
        localStore.set('groups', merged);
        callback(merged);
      },
      (err) => {
        console.warn('Firestore groups listen error, using local fallback:', err);
        callback(localStore.get('groups', []));
      }
    );
  } catch (e) {
    return localStore.subscribe('groups', (groups: TripGroup[] = []) => {
      callback(groups);
    });
  }
}

export function subscribeToGroup(
  groupId: string,
  callback: (group: TripGroup | null) => void
): () => void {
  if (!isFirebaseConfigured) {
    return localStore.subscribe('groups', (groups: TripGroup[] = []) => {
      const g = groups.find((x) => x.id === groupId) || null;
      callback(g);
    });
  }

  try {
    const cached = (localStore.get('groups', []) as TripGroup[]).find((x) => x.id === groupId) || null;
    if (cached) callback(cached);

    const groupRef = doc(db, 'groups', groupId);
    return onSnapshot(
      groupRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const g = snapshot.data() as TripGroup;
          callback(g);
        } else {
          // Check local
          const groups: TripGroup[] = localStore.get('groups', []);
          const g = groups.find((x) => x.id === groupId) || null;
          callback(g);
        }
      },
      () => {
        const groups: TripGroup[] = localStore.get('groups', []);
        const g = groups.find((x) => x.id === groupId) || null;
        callback(g);
      }
    );
  } catch (e) {
    const groups: TripGroup[] = localStore.get('groups', []);
    const g = groups.find((x) => x.id === groupId) || null;
    callback(g);
    return () => {};
  }
}

export async function updateGroup(groupId: string, updates: Partial<TripGroup>): Promise<void> {
  const groups: TripGroup[] = localStore.get('groups', []);
  const updated = groups.map((g) => (g.id === groupId ? { ...g, ...updates } : g));
  localStore.set('groups', updated);

  if (isFirebaseConfigured) {
    try {
      await updateDoc(doc(db, 'groups', groupId), updates);
    } catch (err) {
      console.warn('updateGroup error:', err);
    }
  }
}

// ==========================================
// MEMBERS SERVICE
// ==========================================

export function subscribeToGroupMembers(
  groupId: string,
  callback: (members: GroupMember[]) => void
): () => void {
  const key = `group_${groupId}_members`;
  if (!isFirebaseConfigured) {
    return localStore.subscribe(key, (members: GroupMember[] = []) => {
      callback(members);
    });
  }

  try {
    const membersRef = collection(db, 'groups', groupId, 'members');
    return onSnapshot(
      membersRef,
      (snapshot) => {
        const members: GroupMember[] = [];
        snapshot.forEach((d) => members.push(d.data() as GroupMember));
        if (members.length > 0) {
          localStore.set(key, members);
          callback(members);
        } else {
          callback(localStore.get(key, []));
        }
      },
      () => {
        callback(localStore.get(key, []));
      }
    );
  } catch (e) {
    return localStore.subscribe(key, (members: GroupMember[] = []) => {
      callback(members);
    });
  }
}

export async function addMemberToGroup(
  groupId: string,
  user: UserProfile,
  role: MemberRole = 'member'
): Promise<void> {
  const key = `group_${groupId}_members`;
  const existing: GroupMember[] = localStore.get(key, []);

  // Avoid duplicates
  if (existing.some((m) => m.userId === user.id)) {
    return;
  }

  const newMember: GroupMember = {
    userId: user.id,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    role,
    joinedAt: Date.now(),
  };

  localStore.set(key, [...existing, newMember]);

  if (isFirebaseConfigured) {
    try {
      await setDoc(doc(db, 'groups', groupId, 'members', user.id), newMember);
    } catch (err) {
      console.warn('addMemberToGroup error:', err);
    }
  }
}

export async function removeMemberFromGroup(groupId: string, userId: string): Promise<void> {
  const key = `group_${groupId}_members`;
  const existing: GroupMember[] = localStore.get(key, []);
  localStore.set(
    key,
    existing.filter((m) => m.userId !== userId)
  );

  if (isFirebaseConfigured) {
    try {
      await deleteDoc(doc(db, 'groups', groupId, 'members', userId));
    } catch (err) {
      console.warn('removeMemberFromGroup error:', err);
    }
  }
}

// ==========================================
// INVITATIONS
// ==========================================

export async function getInvitation(inviteCode: string): Promise<GroupInvitation | null> {
  // Check local first
  const local = localStore.get(`invite_${inviteCode}`, null);
  if (local) return local;

  if (isFirebaseConfigured) {
    try {
      const snap = await getDoc(doc(db, 'invitations', inviteCode));
      if (snap.exists()) {
        return snap.data() as GroupInvitation;
      }
    } catch (err) {
      console.warn('getInvitation error:', err);
    }
  }
  return null;
}

export async function regenerateInvitation(groupId: string): Promise<string> {
  const newCode = 'trip_' + Math.random().toString(36).substring(2, 8);
  const groups: TripGroup[] = localStore.get('groups', []);
  const g = groups.find((x) => x.id === groupId);
  if (!g) return newCode;

  const invitation: GroupInvitation = {
    inviteCode: newCode,
    groupId,
    groupName: g.name,
    groupDescription: g.description,
    creatorName: 'Group Admin',
    isActive: true,
    createdAt: Date.now(),
  };

  localStore.set(`invite_${newCode}`, invitation);
  await updateGroup(groupId, { inviteCode: newCode, inviteActive: true });

  if (isFirebaseConfigured) {
    try {
      await setDoc(doc(db, 'invitations', newCode), invitation);
    } catch (e) {}
  }
  return newCode;
}

export async function revokeInvitation(groupId: string, inviteCode: string): Promise<void> {
  const inv = localStore.get(`invite_${inviteCode}`);
  if (inv) {
    localStore.set(`invite_${inviteCode}`, { ...inv, isActive: false });
  }
  await updateGroup(groupId, { inviteActive: false });

  if (isFirebaseConfigured) {
    try {
      await updateDoc(doc(db, 'invitations', inviteCode), { isActive: false });
    } catch (e) {}
  }
}

// ==========================================
// AVAILABILITY SERVICE
// ==========================================

export function subscribeToGroupAvailability(
  groupId: string,
  callback: (data: Record<string, DayAvailability>) => void
): () => void {
  const key = `group_${groupId}_availability`;
  if (!isFirebaseConfigured) {
    return localStore.subscribe(key, (data = {}) => callback(data));
  }

  try {
    const availRef = collection(db, 'groups', groupId, 'availability');
    return onSnapshot(
      availRef,
      (snapshot) => {
        const result: Record<string, DayAvailability> = {};
        snapshot.forEach((d) => {
          result[d.id] = d.data() as DayAvailability;
        });
        localStore.set(key, result);
        callback(result);
      },
      () => {
        callback(localStore.get(key, {}));
      }
    );
  } catch (e) {
    return localStore.subscribe(key, (data = {}) => callback(data));
  }
}

export async function setMemberAvailability(
  groupId: string,
  userId: string,
  date: string,
  status: 'very_busy' | 'maybe_free' | 'free' | null
): Promise<void> {
  const key = `group_${groupId}_availability`;
  const current: Record<string, DayAvailability> = { ...(localStore.get(key, {}) || {}) };

  if (!current[date]) {
    current[date] = { date, entries: {} };
  } else {
    current[date] = { ...current[date], entries: { ...current[date].entries } };
  }

  if (status === null) {
    delete current[date].entries[userId];
  } else {
    current[date].entries[userId] = status;
  }

  localStore.set(key, current);

  if (isFirebaseConfigured) {
    try {
      const docRef = doc(db, 'groups', groupId, 'availability', date);
      if (status === null) {
        await updateDoc(docRef, {
          [`entries.${userId}`]: deleteField(),
        });
      } else {
        await setDoc(
          docRef,
          {
            date,
            entries: {
              [userId]: status,
            },
          },
          { merge: true }
        );
      }
    } catch (err) {
      console.warn('setMemberAvailability error:', err);
    }
  }
}

export async function setMemberDateRangeAvailability(
  groupId: string,
  userId: string,
  dates: string[],
  status: 'very_busy' | 'maybe_free' | 'free' | null
): Promise<void> {
  for (const date of dates) {
    await setMemberAvailability(groupId, userId, date, status);
  }
}

// ==========================================
// DESTINATION POLLS SERVICE
// ==========================================

export function subscribeToPolls(
  groupId: string,
  callback: (polls: DestinationPoll[]) => void
): () => void {
  const key = `group_${groupId}_polls`;
  if (!isFirebaseConfigured) {
    return localStore.subscribe(key, (polls: DestinationPoll[] = []) => callback(polls));
  }

  try {
    const q = collection(db, 'groups', groupId, 'polls');
    return onSnapshot(
      q,
      (snapshot) => {
        const polls: DestinationPoll[] = [];
        snapshot.forEach((d) => polls.push(d.data() as DestinationPoll));
        // Sort descending by created
        polls.sort((a, b) => b.createdAt - a.createdAt);
        localStore.set(key, polls);
        callback(polls);
      },
      () => {
        callback(localStore.get(key, []));
      }
    );
  } catch (e) {
    return localStore.subscribe(key, (polls: DestinationPoll[] = []) => callback(polls));
  }
}

export async function createPoll(
  groupId: string,
  pollData: Omit<DestinationPoll, 'id' | 'createdAt' | 'isClosed'>
): Promise<string> {
  const pollId = 'poll_' + Math.random().toString(36).substring(2, 9);
  const newPoll: DestinationPoll = {
    ...pollData,
    id: pollId,
    createdAt: Date.now(),
    isClosed: false,
  };

  const key = `group_${groupId}_polls`;
  const existing: DestinationPoll[] = localStore.get(key, []);
  localStore.set(key, [newPoll, ...existing]);

  if (isFirebaseConfigured) {
    try {
      await setDoc(doc(db, 'groups', groupId, 'polls', pollId), newPoll);
    } catch (err) {
      console.warn('createPoll error:', err);
    }
  }
  return pollId;
}

export async function closePoll(groupId: string, pollId: string): Promise<void> {
  const key = `group_${groupId}_polls`;
  const existing: DestinationPoll[] = localStore.get(key, []);
  localStore.set(
    key,
    existing.map((p) => (p.id === pollId ? { ...p, isClosed: true } : p))
  );

  if (isFirebaseConfigured) {
    try {
      await updateDoc(doc(db, 'groups', groupId, 'polls', pollId), { isClosed: true });
    } catch (err) {
      console.warn('closePoll error:', err);
    }
  }
}

export function subscribeToPollVotes(
  groupId: string,
  pollId: string,
  callback: (votes: Record<string, PollVote>) => void
): () => void {
  const key = `poll_${pollId}_votes`;
  if (!isFirebaseConfigured) {
    return localStore.subscribe(key, (votes = {}) => callback(votes));
  }

  try {
    const votesRef = collection(db, 'groups', groupId, 'polls', pollId, 'votes');
    return onSnapshot(
      votesRef,
      (snapshot) => {
        const votes: Record<string, PollVote> = {};
        snapshot.forEach((d) => {
          votes[d.id] = d.data() as PollVote;
        });
        localStore.set(key, votes);
        callback(votes);
      },
      () => {
        callback(localStore.get(key, {}));
      }
    );
  } catch (e) {
    return localStore.subscribe(key, (votes = {}) => callback(votes));
  }
}

export async function castPollVote(
  groupId: string,
  pollId: string,
  userId: string,
  selectedOptionIds: string[]
): Promise<void> {
  const key = `poll_${pollId}_votes`;
  const current: Record<string, PollVote> = { ...(localStore.get(key, {}) || {}) };

  if (selectedOptionIds.length === 0) {
    delete current[userId];
  } else {
    current[userId] = {
      userId,
      selectedOptionIds,
      updatedAt: Date.now(),
    };
  }

  localStore.set(key, current);

  if (isFirebaseConfigured) {
    try {
      const voteDoc = doc(db, 'groups', groupId, 'polls', pollId, 'votes', userId);
      if (selectedOptionIds.length === 0) {
        await deleteDoc(voteDoc);
      } else {
        await setDoc(voteDoc, {
          userId,
          selectedOptionIds,
          updatedAt: Date.now(),
        });
      }
    } catch (err) {
      console.warn('castPollVote error:', err);
    }
  }
}

export function subscribeToPollComments(
  groupId: string,
  pollId: string,
  callback: (comments: CommentItem[]) => void
): () => void {
  const key = `poll_${pollId}_comments`;
  if (!isFirebaseConfigured) {
    return localStore.subscribe(key, (comments: CommentItem[] = []) => callback(comments));
  }

  try {
    const q = collection(db, 'groups', groupId, 'polls', pollId, 'comments');
    return onSnapshot(
      q,
      (snapshot) => {
        const comments: CommentItem[] = [];
        snapshot.forEach((d) => comments.push(d.data() as CommentItem));
        comments.sort((a, b) => a.createdAt - b.createdAt);
        localStore.set(key, comments);
        callback(comments);
      },
      () => {
        callback(localStore.get(key, []));
      }
    );
  } catch (e) {
    return localStore.subscribe(key, (comments: CommentItem[] = []) => callback(comments));
  }
}

export async function addPollComment(
  groupId: string,
  pollId: string,
  user: UserProfile,
  content: string
): Promise<void> {
  const commentId = 'cmt_' + Math.random().toString(36).substring(2, 9);
  const newComment: CommentItem = {
    id: commentId,
    userId: user.id,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    content,
    createdAt: Date.now(),
  };

  const key = `poll_${pollId}_comments`;
  const existing: CommentItem[] = localStore.get(key, []);
  localStore.set(key, [...existing, newComment]);

  if (isFirebaseConfigured) {
    try {
      await setDoc(
        doc(db, 'groups', groupId, 'polls', pollId, 'comments', commentId),
        newComment
      );
    } catch (err) {
      console.warn('addPollComment error:', err);
    }
  }
}

// ==========================================
// SUGGESTIONS & ITINERARY SERVICE
// ==========================================

export function subscribeToSuggestions(
  groupId: string,
  callback: (suggestions: ActivitySuggestion[]) => void
): () => void {
  const key = `group_${groupId}_suggestions`;
  if (!isFirebaseConfigured) {
    return localStore.subscribe(key, (suggs: ActivitySuggestion[] = []) => callback(suggs));
  }

  try {
    const q = collection(db, 'groups', groupId, 'suggestions');
    return onSnapshot(
      q,
      (snapshot) => {
        const suggs: ActivitySuggestion[] = [];
        snapshot.forEach((d) => suggs.push(d.data() as ActivitySuggestion));
        localStore.set(key, suggs);
        callback(suggs);
      },
      () => {
        callback(localStore.get(key, []));
      }
    );
  } catch (e) {
    return localStore.subscribe(key, (suggs: ActivitySuggestion[] = []) => callback(suggs));
  }
}

export async function createSuggestion(
  groupId: string,
  data: Omit<ActivitySuggestion, 'id' | 'createdAt' | 'supportVotes' | 'isConfirmed'>
): Promise<string> {
  const suggestionId = 'sug_' + Math.random().toString(36).substring(2, 9);
  const newSuggestion: ActivitySuggestion = {
    ...data,
    id: suggestionId,
    supportVotes: [data.authorId], // Author auto-upvotes
    isConfirmed: false,
    createdAt: Date.now(),
  };

  const key = `group_${groupId}_suggestions`;
  const existing: ActivitySuggestion[] = localStore.get(key, []);
  localStore.set(key, [...existing, newSuggestion]);

  if (isFirebaseConfigured) {
    try {
      await setDoc(doc(db, 'groups', groupId, 'suggestions', suggestionId), newSuggestion);
    } catch (err) {
      console.warn('createSuggestion error:', err);
    }
  }
  return suggestionId;
}

export async function toggleSuggestionVote(
  groupId: string,
  suggestionId: string,
  userId: string
): Promise<void> {
  const key = `group_${groupId}_suggestions`;
  const existing: ActivitySuggestion[] = localStore.get(key, []);
  const updated = existing.map((s) => {
    if (s.id !== suggestionId) return s;
    const hasVoted = s.supportVotes.includes(userId);
    const newVotes = hasVoted
      ? s.supportVotes.filter((id) => id !== userId)
      : [...s.supportVotes, userId];
    return { ...s, supportVotes: newVotes };
  });

  localStore.set(key, updated);

  if (isFirebaseConfigured) {
    try {
      const s = updated.find((x) => x.id === suggestionId);
      if (s) {
        await updateDoc(doc(db, 'groups', groupId, 'suggestions', suggestionId), {
          supportVotes: s.supportVotes,
        });
      }
    } catch (err) {
      console.warn('toggleSuggestionVote error:', err);
    }
  }
}

export async function updateSuggestion(
  groupId: string,
  suggestionId: string,
  updates: Partial<ActivitySuggestion>
): Promise<void> {
  const key = `group_${groupId}_suggestions`;
  const existing: ActivitySuggestion[] = localStore.get(key, []);
  const updated = existing.map((s) => (s.id === suggestionId ? { ...s, ...updates } : s));
  localStore.set(key, updated);

  if (isFirebaseConfigured) {
    try {
      await updateDoc(doc(db, 'groups', groupId, 'suggestions', suggestionId), updates);
    } catch (err) {
      console.warn('updateSuggestion error:', err);
    }
  }
}

export async function deleteSuggestion(groupId: string, suggestionId: string): Promise<void> {
  const key = `group_${groupId}_suggestions`;
  const existing: ActivitySuggestion[] = localStore.get(key, []);
  localStore.set(
    key,
    existing.filter((s) => s.id !== suggestionId)
  );

  if (isFirebaseConfigured) {
    try {
      await deleteDoc(doc(db, 'groups', groupId, 'suggestions', suggestionId));
    } catch (err) {
      console.warn('deleteSuggestion error:', err);
    }
  }
}
