import { localStore } from '../services/db';
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
} from '../types';

export const DEMO_USERS: UserProfile[] = [
  {
    id: 'user_elena',
    displayName: 'Elena Rossi (You)',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    email: 'elena@example.com',
  },
  {
    id: 'user_marco',
    displayName: 'Marco Bellini',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    email: 'marco@example.com',
  },
  {
    id: 'user_sophia',
    displayName: 'Sophia Chen',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
    email: 'sophia@example.com',
  },
  {
    id: 'user_lucas',
    displayName: 'Lucas Vance',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
    email: 'lucas@example.com',
  },
];

export function seedDemoTripData(): TripGroup {
  const groupId = 'demo_amalfi_2026';
  const inviteCode = 'demo_amalfi';

  // Dates for current year/month
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth(); // 0-indexed

  // Format YYYY-MM-DD
  const fmt = (d: number) => {
    const dt = new Date(year, month, d);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const tripStartDate = fmt(18);
  const tripEndDate = fmt(22);

  const demoGroup: TripGroup = {
    id: groupId,
    name: 'Amalfi Coast Friends Getaway',
    description: 'Cliffside coastal towns, authentic Italian seafood, scenic boat days, and limoncello tastings along the Mediterranean.',
    coverImageUrl: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1400&q=80',
    createdBy: 'user_elena',
    createdAt: Date.now() - 86400000 * 3,
    status: 'planning_itinerary',
    confirmedDestination: 'Amalfi Coast & Positano, Italy',
    confirmedDates: {
      startDate: tripStartDate,
      endDate: tripEndDate,
    },
    inviteCode,
    inviteActive: true,
  };

  const members: GroupMember[] = [
    {
      userId: 'user_elena',
      displayName: 'Elena Rossi (You)',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      role: 'admin',
      joinedAt: Date.now() - 86400000 * 3,
    },
    {
      userId: 'user_marco',
      displayName: 'Marco Bellini',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
      role: 'member',
      joinedAt: Date.now() - 86400000 * 2,
    },
    {
      userId: 'user_sophia',
      displayName: 'Sophia Chen',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
      role: 'member',
      joinedAt: Date.now() - 86400000 * 2,
    },
    {
      userId: 'user_lucas',
      displayName: 'Lucas Vance',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
      role: 'member',
      joinedAt: Date.now() - 86400000 * 1,
    },
  ];

  const invitation: GroupInvitation = {
    inviteCode,
    groupId,
    groupName: demoGroup.name,
    groupDescription: demoGroup.description,
    creatorName: 'Elena Rossi',
    isActive: true,
    createdAt: Date.now() - 86400000 * 3,
  };

  // Availability across days 10 to 28
  const availability: Record<string, DayAvailability> = {};

  for (let d = 12; d <= 26; d++) {
    const dStr = fmt(d);
    if (d >= 18 && d <= 22) {
      // Perfect consecutive dates (Tier 1)
      availability[dStr] = {
        date: dStr,
        entries: {
          user_elena: 'free',
          user_marco: 'free',
          user_sophia: 'free',
          user_lucas: 'free',
        },
      };
    } else if (d === 15 || d === 16) {
      // Workable with Maybe Free (Tier 2)
      availability[dStr] = {
        date: dStr,
        entries: {
          user_elena: 'free',
          user_marco: 'maybe_free',
          user_sophia: 'free',
          user_lucas: 'free',
        },
      };
    } else if (d === 13 || d === 14) {
      // Conflicting dates
      availability[dStr] = {
        date: dStr,
        entries: {
          user_elena: 'free',
          user_marco: 'free',
          user_sophia: 'very_busy',
          user_lucas: 'free',
        },
      };
    } else if (d >= 24) {
      // Incomplete dates
      availability[dStr] = {
        date: dStr,
        entries: {
          user_elena: 'free',
          user_marco: 'free',
        },
      };
    }
  }

  // Poll
  const pollId = 'poll_mediterranean';
  const polls: DestinationPoll[] = [
    {
      id: pollId,
      groupId,
      title: 'Where along the Mediterranean should we escape?',
      description: 'Vote for your favorite scenery, vibe, and coastal activities so we can lock down the final destination!',
      createdBy: 'user_elena',
      creatorName: 'Elena Rossi',
      votingMode: 'single',
      isClosed: false,
      createdAt: Date.now() - 86400000 * 2,
      options: [
        {
          id: 'opt_amalfi',
          name: 'Amalfi Coast & Positano (Italy)',
          description: 'Dramatic vertical cliffs, colorful pastel villas, lemon groves, and incredible handmade pasta.',
          imageUrls: [
            'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=800&q=80',
            'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=800&q=80',
          ],
          links: [
            { label: 'Positano Travel Guide', url: 'https://en.wikipedia.org/wiki/Positano' },
            { label: 'View Amalfi Coast on Maps', url: 'https://maps.google.com/?q=Amalfi+Coast' },
          ],
          budget: '$$$ (Approx $180/day)',
          notes: 'Direct ferry from Naples; very walkable.',
        },
        {
          id: 'opt_santorini',
          name: 'Santorini & Cyclades (Greece)',
          description: 'Iconic white-washed caldera houses, blue domes, spectacular volcano views, and sunset catamaran cruises.',
          imageUrls: [
            'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=800&q=80',
          ],
          links: [
            { label: 'Santorini Island Guide', url: 'https://en.wikipedia.org/wiki/Santorini' },
          ],
          budget: '$$$$ (Approx $240/day)',
          notes: 'Peak season can be crowded.',
        },
        {
          id: 'opt_mallorca',
          name: 'Mallorca & Balearics (Spain)',
          description: 'Crystal turquoise coves (calas), vibrant tapas culture in Palma, and historic stone mountain villages.',
          imageUrls: [
            'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=800&q=80',
          ],
          links: [
            { label: 'Mallorca Travel Info', url: 'https://en.wikipedia.org/wiki/Mallorca' },
          ],
          budget: '$$ (Approx $130/day)',
          notes: 'Great car rental road trips.',
        },
      ],
    },
  ];

  const pollVotes: Record<string, PollVote> = {
    user_elena: { userId: 'user_elena', selectedOptionIds: ['opt_amalfi'], updatedAt: Date.now() - 40000000 },
    user_marco: { userId: 'user_marco', selectedOptionIds: ['opt_amalfi'], updatedAt: Date.now() - 30000000 },
    user_sophia: { userId: 'user_sophia', selectedOptionIds: ['opt_amalfi'], updatedAt: Date.now() - 20000000 },
    user_lucas: { userId: 'user_lucas', selectedOptionIds: ['opt_santorini'], updatedAt: Date.now() - 10000000 },
  };

  const pollComments: CommentItem[] = [
    {
      id: 'cmt_1',
      userId: 'user_marco',
      displayName: 'Marco Bellini',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
      content: 'Amalfi Coast has my vote! The Path of the Gods hike is something I have wanted to do for years.',
      createdAt: Date.now() - 3600000 * 5,
    },
    {
      id: 'cmt_2',
      userId: 'user_sophia',
      displayName: 'Sophia Chen',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
      content: 'Agreed! Positano looks like a dream and seafood pasta sounds unbeatable.',
      createdAt: Date.now() - 3600000 * 2,
    },
  ];

  // Suggestions & Itinerary Activities
  const suggestions: ActivitySuggestion[] = [
    {
      id: 'sug_1',
      groupId,
      targetDate: tripStartDate, // Day 1
      title: 'Private Sunset Wooden Boat Charter to Capri',
      description: 'Charter a traditional Italian gozzo boat around Capri, swim through the Green Cave, and watch the sunset by Faraglioni rocks.',
      preferredSlot: 'afternoon',
      cost: '€75 / person',
      duration: '4 hours',
      mapUrl: 'https://maps.google.com/?q=Marina+Grande+Capri',
      links: [{ label: 'Capri Boat Tour Info', url: 'https://www.capri.com/en/boat-tours' }],
      imageUrls: ['https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=600&q=80'],
      authorId: 'user_elena',
      authorName: 'Elena Rossi',
      authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      supportVotes: ['user_elena', 'user_marco', 'user_sophia', 'user_lucas'],
      isConfirmed: true,
      scheduledTime: '15:30',
      scheduledOrder: 1,
      createdAt: Date.now() - 50000000,
    },
    {
      id: 'sug_2',
      groupId,
      targetDate: tripStartDate, // Day 1
      title: 'Seaside Welcome Dinner at Da Adolfo',
      description: 'Famous casual beachside trattoria accessible only by small red-fish boat from Positano harbor.',
      preferredSlot: 'evening',
      cost: '€45 / person',
      duration: '2.5 hours',
      mapUrl: 'https://maps.google.com/?q=Da+Adolfo+Positano',
      links: [{ label: 'Restaurant Review', url: 'https://www.tripadvisor.com' }],
      imageUrls: ['https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80'],
      authorId: 'user_marco',
      authorName: 'Marco Bellini',
      authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
      supportVotes: ['user_marco', 'user_elena', 'user_sophia'],
      isConfirmed: true,
      scheduledTime: '20:00',
      scheduledOrder: 2,
      createdAt: Date.now() - 40000000,
    },
    {
      id: 'sug_3',
      groupId,
      targetDate: fmt(19), // Day 2
      title: 'Path of the Gods (Sentiero degli Dei) Cliff Hike',
      description: 'Breathtaking 7km cliff trail from Bomerano down to Nocelle with panoramic vistas over the whole coastline.',
      preferredSlot: 'morning',
      cost: 'Free',
      duration: '3.5 hours',
      mapUrl: 'https://maps.google.com/?q=Sentiero+degli+Dei',
      links: [{ label: 'Trail Guide & Safety', url: 'https://en.wikipedia.org/wiki/Sentiero_degli_Dei' }],
      imageUrls: ['https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=600&q=80'],
      authorId: 'user_marco',
      authorName: 'Marco Bellini',
      authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
      supportVotes: ['user_marco', 'user_lucas'],
      isConfirmed: false,
      createdAt: Date.now() - 30000000,
    },
    {
      id: 'sug_4',
      groupId,
      targetDate: fmt(19), // Day 2
      title: 'Artisanal Limoncello Tasting & Lemon Grove Walk',
      description: 'Tour a centuries-old cliffside lemon terrace in Amalfi and learn the traditional secret of family limoncello.',
      preferredSlot: 'afternoon',
      cost: '€25 / person',
      duration: '1.5 hours',
      mapUrl: 'https://maps.google.com/?q=Amalfi+Lemon+Tour',
      links: [{ label: 'Lemon Tour Details', url: 'https://www.amalfilemontour.it' }],
      imageUrls: ['https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=600&q=80'],
      authorId: 'user_sophia',
      authorName: 'Sophia Chen',
      authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
      supportVotes: ['user_sophia', 'user_elena', 'user_marco'],
      isConfirmed: false,
      createdAt: Date.now() - 25000000,
    },
  ];

  // Save to localStore
  const groups: TripGroup[] = localStore.get('groups', []);
  const filtered = groups.filter((g) => g.id !== groupId);
  localStore.set('groups', [demoGroup, ...filtered]);
  localStore.set(`group_${groupId}_members`, members);
  localStore.set(`invite_${inviteCode}`, invitation);
  localStore.set(`group_${groupId}_availability`, availability);
  localStore.set(`group_${groupId}_polls`, polls);
  localStore.set(`poll_${pollId}_votes`, pollVotes);
  localStore.set(`poll_${pollId}_comments`, pollComments);
  localStore.set(`group_${groupId}_suggestions`, suggestions);

  return demoGroup;
}
