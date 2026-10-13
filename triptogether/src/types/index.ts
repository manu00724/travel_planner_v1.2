export type PlanningStatus = 'choosing_destination' | 'finding_dates' | 'planning_itinerary';

export type AvailabilityStatus = 'very_busy' | 'maybe_free' | 'free' | 'not_marked';

export type MemberRole = 'admin' | 'member';

export type VotingMode = 'single' | 'multiple';

export type TimeSlot = 'morning' | 'afternoon' | 'evening' | 'flexible';

export interface UserProfile {
  id: string;
  displayName: string;
  email?: string;
  avatarUrl?: string;
  isAnonymous?: boolean;
}

export interface GroupMember {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  role: MemberRole;
  joinedAt: number;
}

export interface TripGroup {
  id: string;
  name: string;
  description: string;
  coverImageUrl: string;
  createdBy: string; // admin user ID
  createdAt: number;
  status: PlanningStatus;
  confirmedDestination?: string;
  confirmedDates?: {
    startDate: string; // YYYY-MM-DD
    endDate: string;   // YYYY-MM-DD
  };
  inviteCode: string;
  inviteActive: boolean;
}

export interface GroupInvitation {
  inviteCode: string;
  groupId: string;
  groupName: string;
  groupDescription: string;
  creatorName: string;
  isActive: boolean;
  createdAt: number;
}

export interface DayAvailability {
  date: string; // YYYY-MM-DD
  entries: Record<string, 'very_busy' | 'maybe_free' | 'free'>; // userId -> status
}

export interface PollOptionLink {
  label: string;
  url: string;
}

export interface PollOption {
  id: string;
  name: string;
  description: string;
  imageUrls: string[];
  links: PollOptionLink[];
  budget?: string;
  notes?: string;
}

export interface DestinationPoll {
  id: string;
  groupId: string;
  title: string;
  description: string;
  createdBy: string;
  creatorName: string;
  votingMode: VotingMode;
  closingTime?: string; // ISO date string or null
  isClosed: boolean;
  options: PollOption[];
  createdAt: number;
}

export interface PollVote {
  userId: string;
  selectedOptionIds: string[];
  updatedAt: number;
}

export interface CommentItem {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  content: string;
  createdAt: number;
}

export interface ItineraryDay {
  date: string; // YYYY-MM-DD
  dayNumber: number;
  notes?: string;
}

export interface ActivitySuggestion {
  id: string;
  groupId: string;
  targetDate: string; // YYYY-MM-DD or 'unscheduled'
  title: string;
  description: string;
  preferredSlot: TimeSlot;
  cost?: string;
  duration?: string;
  mapUrl?: string;
  links: Array<{ label: string; url: string }>;
  imageUrls: string[];
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  supportVotes: string[]; // userIds
  isConfirmed: boolean;
  scheduledTime?: string; // e.g. "09:30" (24h)
  scheduledOrder?: number;
  createdAt: number;
}

export interface DateRecommendation {
  startDate: string;
  endDate: string;
  lengthDays: number;
  tier: 1 | 2 | 3; // 1: Perfect (all free), 2: Workable (no very_busy), 3: Incomplete (awaiting responses)
  isConflicting: boolean;
  freeCountTotal: number;
  maybeFreeCountTotal: number;
  veryBusyCountTotal: number;
  unmarkedCountTotal: number;
  memberBreakdown: Record<string, {
    freeDays: number;
    maybeDays: number;
    busyDays: number;
    unmarkedDays: number;
  }>;
  explanation: string;
}
