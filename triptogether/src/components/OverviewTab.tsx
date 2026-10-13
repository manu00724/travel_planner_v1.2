import React, { useState, useEffect } from 'react';
import {
  TripGroup,
  GroupMember,
  UserProfile,
  PlanningStatus,
  DestinationPoll,
  DayAvailability,
  ActivitySuggestion,
} from '../types';
import {
  subscribeToPolls,
  subscribeToGroupAvailability,
  subscribeToSuggestions,
  updateGroup,
} from '../services/db';
import {
  Compass,
  Calendar,
  Sparkles,
  MapPin,
  Clock,
  ArrowRight,
  Vote,
  CalendarCheck,
  CheckCircle2,
  Share2,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { formatDateYMD, calculateDateRecommendations } from '../utils/dateRecommender';

interface OverviewTabProps {
  group: TripGroup;
  members: GroupMember[];
  currentUser: UserProfile;
  isAdmin: boolean;
  onNavigateTab: (tab: 'polls' | 'availability' | 'itinerary' | 'members') => void;
  onOpenInvite: () => void;
  onUpdateGroup: (updates: Partial<TripGroup>) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  group,
  members,
  currentUser,
  isAdmin,
  onNavigateTab,
  onOpenInvite,
  onUpdateGroup,
}) => {
  const [polls, setPolls] = useState<DestinationPoll[]>([]);
  const [availability, setAvailability] = useState<Record<string, DayAvailability>>({});
  const [suggestions, setSuggestions] = useState<ActivitySuggestion[]>([]);

  useEffect(() => {
    const u1 = subscribeToPolls(group.id, setPolls);
    const u2 = subscribeToGroupAvailability(group.id, setAvailability);
    const u3 = subscribeToSuggestions(group.id, setSuggestions);
    return () => {
      u1();
      u2();
      u3();
    };
  }, [group.id]);

  const handleStatusChange = async (newStatus: PlanningStatus) => {
    if (!isAdmin) return;
    await updateGroup(group.id, { status: newStatus });
    onUpdateGroup({ status: newStatus });
  };

  // Recommendations preview
  const todayStr = formatDateYMD(new Date());
  const { recommendations } = calculateDateRecommendations(
    members,
    availability,
    4,
    todayStr,
    group.confirmedDates?.endDate || todayStr
  );
  const topDateRange = recommendations[0];

  const confirmedActivitiesCount = suggestions.filter((s) => s.isConfirmed).length;

  return (
    <div className="space-y-8">
      {/* Group Planning Status Bar */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            {group.status === 'choosing_destination' ? (
              <Compass className="w-6 h-6" />
            ) : group.status === 'finding_dates' ? (
              <Calendar className="w-6 h-6" />
            ) : (
              <Sparkles className="w-6 h-6" />
            )}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs uppercase font-extrabold tracking-wider text-indigo-600">
                Current Planning Stage
              </span>
              {isAdmin && (
                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-semibold">
                  Admin Editable
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-slate-800 capitalize mt-0.5">
              {group.status === 'choosing_destination' && 'Phase 1: Choosing Where to Go'}
              {group.status === 'finding_dates' && 'Phase 2: Finding Common Dates'}
              {group.status === 'planning_itinerary' && 'Phase 3: Planning Day-by-Day Itinerary'}
            </h2>
          </div>
        </div>

        {/* Admin Stage Controls */}
        {isAdmin && (
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-500 font-medium">Stage:</span>
            <select
              value={group.status}
              onChange={(e) => handleStatusChange(e.target.value as PlanningStatus)}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              <option value="choosing_destination">1. Choosing Destination</option>
              <option value="finding_dates">2. Finding Dates</option>
              <option value="planning_itinerary">3. Planning Itinerary</option>
            </select>
          </div>
        )}
      </div>

      {/* Quick Action Shortcuts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => onNavigateTab('availability')}
          className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-indigo-400 hover:shadow-md transition text-left group"
        >
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <CalendarCheck className="w-4 h-4" />
          </div>
          <div className="text-xs font-bold text-slate-800">Mark Availability</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Free / Busy dates</div>
        </button>

        <button
          onClick={() => onNavigateTab('polls')}
          className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-indigo-400 hover:shadow-md transition text-left group"
        >
          <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <Vote className="w-4 h-4" />
          </div>
          <div className="text-xs font-bold text-slate-800">Destination Polls</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Vote on places</div>
        </button>

        <button
          onClick={() => onNavigateTab('itinerary')}
          className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-indigo-400 hover:shadow-md transition text-left group"
        >
          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="text-xs font-bold text-slate-800">Daily Itinerary</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Suggest activities</div>
        </button>

        <button
          onClick={onOpenInvite}
          className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-indigo-400 hover:shadow-md transition text-left group"
        >
          <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <Share2 className="w-4 h-4" />
          </div>
          <div className="text-xs font-bold text-slate-800">Invite Members</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Link & QR Code</div>
        </button>
      </div>

      {/* 3 Core Questions Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Where Should We Go? */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] uppercase font-extrabold tracking-wider text-slate-400">
                Question 1
              </span>
              <Compass className="w-4 h-4 text-sky-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Where Should We Go?</h3>

            <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
              {group.confirmedDestination ? (
                <div>
                  <div className="flex items-center space-x-1.5 text-teal-700 font-bold text-xs mb-1">
                    <CheckCircle2 className="w-4 h-4 text-teal-600" />
                    <span>Destination Confirmed</span>
                  </div>
                  <p className="text-sm font-extrabold text-slate-900">
                    {group.confirmedDestination}
                  </p>
                </div>
              ) : polls.length > 0 ? (
                <div>
                  <div className="text-[11px] text-slate-400 font-medium">Active Poll</div>
                  <p className="text-xs font-bold text-slate-800 mt-0.5 line-clamp-1">
                    {polls[0].title}
                  </p>
                  <p className="text-[11px] text-indigo-600 font-medium mt-1">
                    {polls[0].options.length} destination options to vote on
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No destination polls created yet.</p>
              )}
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('polls')}
            className="mt-5 w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl transition flex items-center justify-center space-x-1"
          >
            <span>View Destination Polls</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Card 2: When is Everyone Available? */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] uppercase font-extrabold tracking-wider text-slate-400">
                Question 2
              </span>
              <Calendar className="w-4 h-4 text-amber-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">When is Everyone Free?</h3>

            <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
              {group.confirmedDates ? (
                <div>
                  <div className="flex items-center space-x-1.5 text-emerald-700 font-bold text-xs mb-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Dates Locked</span>
                  </div>
                  <p className="text-sm font-extrabold text-slate-900">
                    {group.confirmedDates.startDate} to {group.confirmedDates.endDate}
                  </p>
                </div>
              ) : topDateRange ? (
                <div>
                  <div className="text-[11px] text-slate-400 font-medium">Top Match</div>
                  <p className="text-xs font-bold text-slate-800 mt-0.5">
                    {topDateRange.startDate} → {topDateRange.endDate}
                  </p>
                  <p className="text-[11px] text-emerald-600 font-medium mt-1">
                    {topDateRange.explanation}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">Log your free dates on the calendar.</p>
              )}
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('availability')}
            className="mt-5 w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl transition flex items-center justify-center space-x-1"
          >
            <span>Open Availability Calendar</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Card 3: What Should We Do Each Day? */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] uppercase font-extrabold tracking-wider text-slate-400">
                Question 3
              </span>
              <Sparkles className="w-4 h-4 text-indigo-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">What Should We Do?</h3>

            <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
              {confirmedActivitiesCount > 0 ? (
                <div>
                  <div className="flex items-center space-x-1.5 text-indigo-700 font-bold text-xs mb-1">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    <span>Itinerary In Progress</span>
                  </div>
                  <p className="text-sm font-extrabold text-slate-900">
                    {confirmedActivitiesCount} confirmed, {suggestions.length - confirmedActivitiesCount} suggestions
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">
                  {group.confirmedDates
                    ? 'Start suggesting tours, restaurants, and sights!'
                    : 'Confirm trip dates to unlock the day-by-day planner.'}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('itinerary')}
            className="mt-5 w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl transition flex items-center justify-center space-x-1"
          >
            <span>Open Itinerary Planner</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
