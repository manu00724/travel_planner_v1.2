import React, { useState, useEffect } from 'react';
import {
  TripGroup,
  GroupMember,
  UserProfile,
  DayAvailability,
  AvailabilityStatus,
  DateRecommendation,
} from '../types';
import {
  subscribeToGroupAvailability,
  setMemberAvailability,
  setMemberDateRangeAvailability,
  updateGroup,
  localStore,
} from '../services/db';
import {
  formatDateYMD,
  parseDateYMD,
  addDaysYMD,
  summarizeDayAvailability,
  calculateDateRecommendations,
  DayStatusSummary,
} from '../utils/dateRecommender';
import {
  Calendar,
  CheckCircle2,
  HelpCircle,
  XCircle,
  MinusCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Sparkles,
  AlertTriangle,
  Users,
  Check,
  Info,
  CalendarRange,
  ArrowRight,
} from 'lucide-react';

interface AvailabilityTabProps {
  group: TripGroup;
  members: GroupMember[];
  currentUser: UserProfile;
  isAdmin: boolean;
  onUpdateGroup: (updates: Partial<TripGroup>) => void;
}

export const AvailabilityTab: React.FC<AvailabilityTabProps> = ({
  group,
  members,
  currentUser,
  isAdmin,
  onUpdateGroup,
}) => {
  const [availabilityMap, setAvailabilityMap] = useState<Record<string, DayAvailability>>(() =>
    localStore.get(`group_${group.id}_availability`, {})
  );
  const [currentMonthDate, setCurrentMonthDate] = useState(() => {
    // If group has confirmed dates, focus that month, else current month
    if (group.confirmedDates?.startDate) {
      return parseDateYMD(group.confirmedDates.startDate);
    }
    return new Date();
  });

  // Selected date for member-level details drawer
  const [selectedDayDetails, setSelectedDayDetails] = useState<DayStatusSummary | null>(null);

  // Range marking state
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [rangeEnd, setRangeEnd] = useState<string | null>(null);
  const [isRangeMode, setIsRangeMode] = useState(false);

  // Recommender controls
  const [tripLength, setTripLength] = useState<number>(4);
  const [searchWindowDays, setSearchWindowDays] = useState<number>(30);

  // Confirm dates modal state
  const [showConfirmModal, setShowConfirmModal] = useState<DateRecommendation | null>(null);

  useEffect(() => {
    const unsub = subscribeToGroupAvailability(group.id, (map) => {
      setAvailabilityMap(map);
    });
    return () => unsub();
  }, [group.id]);

  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth(); // 0-indexed

  // Navigation between months
  const handlePrevMonth = () => {
    setCurrentMonthDate(new Date(year, month - 1, 1));
  };
  const handleNextMonth = () => {
    setCurrentMonthDate(new Date(year, month + 1, 1));
  };

  // Calendar dates generation
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Personal Availability actions
  const getMyStatus = (dateStr: string): AvailabilityStatus => {
    return availabilityMap[dateStr]?.entries?.[currentUser.id] || 'not_marked';
  };

  const handleApplyStatusToDate = async (
    dateStr: string,
    status: 'very_busy' | 'maybe_free' | 'free' | null
  ) => {
    await setMemberAvailability(group.id, currentUser.id, dateStr, status);
  };

  const handleApplyStatusToRange = async (status: 'very_busy' | 'maybe_free' | 'free' | null) => {
    if (!rangeStart || !rangeEnd) return;
    const start = rangeStart < rangeEnd ? rangeStart : rangeEnd;
    const end = rangeStart < rangeEnd ? rangeEnd : rangeStart;

    const dates: string[] = [];
    let curr = start;
    while (curr <= end) {
      dates.push(curr);
      curr = addDaysYMD(curr, 1);
    }

    await setMemberDateRangeAvailability(group.id, currentUser.id, dates, status);
    setRangeStart(null);
    setRangeEnd(null);
    setIsRangeMode(false);
  };

  // Run Recommendation Algorithm
  const todayStr = formatDateYMD(new Date());
  const windowStart = todayStr;
  const windowEnd = addDaysYMD(todayStr, searchWindowDays);
  const { recommendations, conflictingRanges } = calculateDateRecommendations(
    members,
    availabilityMap,
    tripLength,
    windowStart,
    windowEnd
  );

  // Admin confirm dates
  const handleConfirmDates = async (rec: DateRecommendation) => {
    await updateGroup(group.id, {
      confirmedDates: {
        startDate: rec.startDate,
        endDate: rec.endDate,
      },
      status: 'planning_itinerary',
    });
    onUpdateGroup({
      confirmedDates: {
        startDate: rec.startDate,
        endDate: rec.endDate,
      },
      status: 'planning_itinerary',
    });
    setShowConfirmModal(null);
  };

  return (
    <div className="space-y-8">
      {/* Tab Header Banner */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-slate-800">Trip Dates & Availability</h2>
            {group.confirmedDates && (
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>
                  Locked: {group.confirmedDates.startDate} to {group.confirmedDates.endDate}
                </span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Mark your free and busy dates. The recommendation engine automatically finds consecutive days that fit everyone best!
          </p>
        </div>

        {/* Legend for 3 states + unmarked */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Free</span>
          </div>
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 font-semibold">
            <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
            <span>Maybe Free</span>
          </div>
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-semibold">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>Very Busy</span>
          </div>
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 font-medium">
            <MinusCircle className="w-3.5 h-3.5 text-slate-400" />
            <span>Not Marked</span>
          </div>
        </div>
      </div>

      {/* Main Dual Grid: Personal Calendar & Shared Group Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Personal Availability Calendar (5 Cols) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-800">Your Availability</h3>
                <p className="text-[11px] text-slate-400">
                  Editing for <span className="font-semibold text-slate-700">{currentUser.displayName}</span>
                </p>
              </div>

              <button
                onClick={() => {
                  setIsRangeMode(!isRangeMode);
                  setRangeStart(null);
                  setRangeEnd(null);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition ${
                  isRangeMode
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <CalendarRange className="w-3.5 h-3.5" />
                <span>{isRangeMode ? 'Exit Range Mode' : 'Select Date Range'}</span>
              </button>
            </div>

            {/* Range Mode Action Banner */}
            {isRangeMode && (
              <div className="mb-4 p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-2xl text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-indigo-900">
                    {!rangeStart
                      ? '1. Click a start date on calendar'
                      : !rangeEnd
                      ? `Selected start: ${rangeStart}. Click end date.`
                      : `Selected range: ${rangeStart} to ${rangeEnd}`}
                  </span>
                  {(rangeStart || rangeEnd) && (
                    <button
                      onClick={() => {
                        setRangeStart(null);
                        setRangeEnd(null);
                      }}
                      className="text-indigo-600 hover:text-indigo-800 font-medium text-[11px]"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {rangeStart && rangeEnd && (
                  <div className="pt-2 border-t border-indigo-200/60 flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-indigo-800 font-medium mr-1">Mark range as:</span>
                    <button
                      onClick={() => handleApplyStatusToRange('free')}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold"
                    >
                      Free
                    </button>
                    <button
                      onClick={() => handleApplyStatusToRange('maybe_free')}
                      className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-semibold"
                    >
                      Maybe Free
                    </button>
                    <button
                      onClick={() => handleApplyStatusToRange('very_busy')}
                      className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-semibold"
                    >
                      Very Busy
                    </button>
                    <button
                      onClick={() => handleApplyStatusToRange(null)}
                      className="px-2.5 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-[11px] font-medium"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-bold text-slate-800">
                {currentMonthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
              <div className="flex items-center space-x-1">
                <button
                  onClick={handlePrevMonth}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleNextMonth}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Calendar Day Grid */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2 font-semibold text-slate-400">
              <div>Su</div>
              <div>Mo</div>
              <div>Tu</div>
              <div>We</div>
              <div>Th</div>
              <div>Fr</div>
              <div>Sa</div>
            </div>

            <div className="grid grid-cols-7 gap-1">
              {/* Empty leading padding days */}
              {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                <div key={'empty_' + i} className="h-10" />
              ))}

              {/* Month dates */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(
                  dayNum
                ).padStart(2, '0')}`;
                const status = getMyStatus(dStr);

                const isInRangeSelection =
                  rangeStart &&
                  rangeEnd &&
                  ((dStr >= rangeStart && dStr <= rangeEnd) ||
                    (dStr >= rangeEnd && dStr <= rangeStart));

                let bgClass = 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200';
                let icon = null;

                if (status === 'free') {
                  bgClass = 'bg-emerald-500 text-white font-bold border-emerald-600 shadow-xs';
                  icon = <Check className="w-2.5 h-2.5 inline" />;
                } else if (status === 'maybe_free') {
                  bgClass = 'bg-amber-400 text-slate-900 font-bold border-amber-500 shadow-xs';
                  icon = <HelpCircle className="w-2.5 h-2.5 inline" />;
                } else if (status === 'very_busy') {
                  bgClass = 'bg-rose-500 text-white font-bold border-rose-600 shadow-xs';
                  icon = <XCircle className="w-2.5 h-2.5 inline" />;
                }

                if (isInRangeSelection) {
                  bgClass += ' ring-2 ring-indigo-500 ring-offset-1';
                }

                return (
                  <div key={dStr} className="relative group/day">
                    <button
                      type="button"
                      onClick={() => {
                        if (isRangeMode) {
                          if (!rangeStart) {
                            setRangeStart(dStr);
                          } else if (!rangeEnd) {
                            setRangeEnd(dStr);
                          } else {
                            setRangeStart(dStr);
                            setRangeEnd(null);
                          }
                        } else {
                          // Quick cycle: Not marked -> Free -> Maybe Free -> Very Busy -> Not marked
                          if (status === 'not_marked') handleApplyStatusToDate(dStr, 'free');
                          else if (status === 'free') handleApplyStatusToDate(dStr, 'maybe_free');
                          else if (status === 'maybe_free') handleApplyStatusToDate(dStr, 'very_busy');
                          else handleApplyStatusToDate(dStr, null);
                        }
                      }}
                      className={`w-full h-10 rounded-xl border text-xs flex flex-col items-center justify-center transition-all ${bgClass}`}
                    >
                      <span>{dayNum}</span>
                      {icon && <span className="text-[9px] -mt-0.5">{icon}</span>}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Tip: Click any date to cycle your status.</span>
            <span className="font-medium text-slate-600">Saved automatically</span>
          </div>
        </div>

        {/* Right Column: Shared Group Calendar / Timeline (7 Cols) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-800">Shared Group Availability</h3>
                <p className="text-[11px] text-slate-400">
                  Aggregated responses across all {members.length} members
                </p>
              </div>

              <div className="text-xs text-slate-500 font-medium">
                Click a date to see member details
              </div>
            </div>

            {/* Shared Month Grid */}
            <div className="grid grid-cols-7 gap-1.5 text-center text-xs mb-2 font-semibold text-slate-400">
              <div>Su</div>
              <div>Mo</div>
              <div>Tu</div>
              <div>We</div>
              <div>Th</div>
              <div>Fr</div>
              <div>Sa</div>
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                <div key={'s_empty_' + i} className="h-14" />
              ))}

              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(
                  dayNum
                ).padStart(2, '0')}`;

                const summary = summarizeDayAvailability(dStr, members, availabilityMap);
                const isSelected = selectedDayDetails?.date === dStr;
                const isConfirmedDate =
                  group.confirmedDates &&
                  dStr >= group.confirmedDates.startDate &&
                  dStr <= group.confirmedDates.endDate;

                // Color category
                let cardClass = 'bg-slate-50 border-slate-200 hover:border-indigo-400';
                let tag = null;

                if (summary.category === 'everyone_free') {
                  cardClass = 'bg-emerald-50/90 border-emerald-300 text-emerald-900';
                  tag = 'All Free';
                } else if (summary.category === 'workable') {
                  cardClass = 'bg-amber-50/90 border-amber-300 text-amber-900';
                  tag = 'Workable';
                } else if (summary.category === 'conflicting') {
                  cardClass = 'bg-rose-50/90 border-rose-200 text-rose-900';
                  tag = `${summary.veryBusyCount} Busy`;
                }

                if (isConfirmedDate) {
                  cardClass += ' ring-2 ring-emerald-600 ring-offset-1';
                }

                return (
                  <button
                    key={dStr}
                    type="button"
                    onClick={() => setSelectedDayDetails(summary)}
                    className={`h-14 rounded-2xl border p-1 text-left transition-all flex flex-col justify-between ${cardClass} ${
                      isSelected ? 'ring-2 ring-indigo-600' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span>{dayNum}</span>
                      {tag && <span className="text-[9px] font-extrabold">{tag}</span>}
                    </div>

                    {/* Member counts mini-chips */}
                    <div className="flex items-center space-x-1 text-[9px] font-bold">
                      {summary.freeCount > 0 && (
                        <span className="text-emerald-700 bg-emerald-100/80 px-1 rounded-sm">
                          {summary.freeCount}F
                        </span>
                      )}
                      {summary.maybeFreeCount > 0 && (
                        <span className="text-amber-700 bg-amber-100/80 px-1 rounded-sm">
                          {summary.maybeFreeCount}M
                        </span>
                      )}
                      {summary.veryBusyCount > 0 && (
                        <span className="text-rose-700 bg-rose-100/80 px-1 rounded-sm">
                          {summary.veryBusyCount}B
                        </span>
                      )}
                      {summary.unmarkedCount > 0 && (
                        <span className="text-slate-400">
                          {summary.unmarkedCount}?
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Member Details Drawer on Selected Day */}
          {selectedDayDetails && (
            <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs animate-in fade-in">
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-slate-800 text-sm">
                  Breakdown for {selectedDayDetails.date}
                </span>
                <button
                  onClick={() => setSelectedDayDetails(null)}
                  className="text-slate-400 hover:text-slate-600 text-[11px] font-medium"
                >
                  Close
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {/* Free */}
                <div className="p-2.5 bg-emerald-100/70 rounded-xl">
                  <div className="font-bold text-emerald-900 mb-1 flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                    <span>Free ({selectedDayDetails.freeMembers.length})</span>
                  </div>
                  <div className="text-[11px] text-emerald-800 space-y-0.5">
                    {selectedDayDetails.freeMembers.length === 0 ? (
                      <span className="text-emerald-600/70 italic">None</span>
                    ) : (
                      selectedDayDetails.freeMembers.map((uid) => (
                        <div key={uid} className="truncate">
                          {members.find((m) => m.userId === uid)?.displayName || uid}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Maybe Free */}
                <div className="p-2.5 bg-amber-100/70 rounded-xl">
                  <div className="font-bold text-amber-900 mb-1 flex items-center space-x-1">
                    <HelpCircle className="w-3 h-3 text-amber-700" />
                    <span>Maybe ({selectedDayDetails.maybeFreeMembers.length})</span>
                  </div>
                  <div className="text-[11px] text-amber-800 space-y-0.5">
                    {selectedDayDetails.maybeFreeMembers.length === 0 ? (
                      <span className="text-amber-600/70 italic">None</span>
                    ) : (
                      selectedDayDetails.maybeFreeMembers.map((uid) => (
                        <div key={uid} className="truncate">
                          {members.find((m) => m.userId === uid)?.displayName || uid}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Very Busy */}
                <div className="p-2.5 bg-rose-100/70 rounded-xl">
                  <div className="font-bold text-rose-900 mb-1 flex items-center space-x-1">
                    <XCircle className="w-3 h-3 text-rose-700" />
                    <span>Busy ({selectedDayDetails.veryBusyMembers.length})</span>
                  </div>
                  <div className="text-[11px] text-rose-800 space-y-0.5">
                    {selectedDayDetails.veryBusyMembers.length === 0 ? (
                      <span className="text-rose-600/70 italic">None</span>
                    ) : (
                      selectedDayDetails.veryBusyMembers.map((uid) => (
                        <div key={uid} className="truncate font-semibold">
                          {members.find((m) => m.userId === uid)?.displayName || uid}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Unmarked */}
                <div className="p-2.5 bg-slate-200/60 rounded-xl">
                  <div className="font-bold text-slate-700 mb-1 flex items-center space-x-1">
                    <MinusCircle className="w-3 h-3 text-slate-500" />
                    <span>Not Marked ({selectedDayDetails.unmarkedMembers.length})</span>
                  </div>
                  <div className="text-[11px] text-slate-600 space-y-0.5">
                    {selectedDayDetails.unmarkedMembers.length === 0 ? (
                      <span className="text-slate-400 italic">None</span>
                    ) : (
                      selectedDayDetails.unmarkedMembers.map((uid) => (
                        <div key={uid} className="truncate">
                          {members.find((m) => m.userId === uid)?.displayName || uid}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================
          RECOMMENDED CONSECUTIVE DATE RANGES ENGINE (SECTION 5)
      ======================================================== */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <h3 className="text-lg font-bold text-slate-800">
                Recommended Consecutive Date Ranges
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Finds optimal trip windows using our 3-tier algorithm. Conflicting dates are strictly segregated.
            </p>
          </div>

          {/* Recommender Controls */}
          <div className="flex items-center space-x-4 bg-slate-50 p-2 rounded-2xl border border-slate-200 text-xs">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-slate-700">Trip Length:</span>
              <select
                value={tripLength}
                onChange={(e) => setTripLength(Number(e.target.value))}
                className="bg-white border border-slate-200 rounded-lg px-2 py-1 font-bold text-indigo-600"
              >
                <option value={3}>3 Days</option>
                <option value={4}>4 Days</option>
                <option value={5}>5 Days</option>
                <option value={6}>6 Days</option>
                <option value={7}>7 Days</option>
                <option value={10}>10 Days</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <span className="font-semibold text-slate-700">Search Window:</span>
              <select
                value={searchWindowDays}
                onChange={(e) => setSearchWindowDays(Number(e.target.value))}
                className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-700"
              >
                <option value={30}>Next 30 Days</option>
                <option value={60}>Next 60 Days</option>
                <option value={90}>Next 90 Days</option>
              </select>
            </div>
          </div>
        </div>

        {/* Recommendations List */}
        {recommendations.length === 0 ? (
          <div className="p-8 bg-slate-50 rounded-2xl text-center text-xs text-slate-500">
            <Info className="w-6 h-6 text-slate-400 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">No conflict-free date ranges found</p>
            <p className="mt-1">
              All consecutive {tripLength}-day ranges in this search window have one or more members marked Very Busy. Check the conflicting ranges below or ask members to update availability.
            </p>
          </div>
        ) : (
          <div className="space-y-3 mb-8">
            {recommendations.map((rec, idx) => {
              const isSelectedConfirmed =
                group.confirmedDates?.startDate === rec.startDate &&
                group.confirmedDates?.endDate === rec.endDate;

              let tierBadge = null;
              let cardBorder = 'border-slate-200 hover:border-slate-300';

              if (rec.tier === 1) {
                tierBadge = (
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center space-x-1">
                    <Sparkles className="w-3 h-3 text-emerald-600" />
                    <span>Tier 1: 100% Free Match</span>
                  </span>
                );
                cardBorder = 'border-emerald-200 bg-emerald-50/20';
              } else if (rec.tier === 2) {
                tierBadge = (
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                    Tier 2: Workable ({rec.maybeFreeCountTotal} Maybe Free)
                  </span>
                );
              } else {
                tierBadge = (
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                    Tier 3: Awaiting {rec.unmarkedCountTotal} Responses
                  </span>
                );
              }

              return (
                <div
                  key={rec.startDate + rec.endDate}
                  className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${cardBorder}`}
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-extrabold text-base text-slate-900">
                        {rec.startDate} → {rec.endDate}
                      </span>
                      <span className="text-xs text-slate-400 font-semibold">
                        ({rec.lengthDays} days)
                      </span>
                      {tierBadge}
                      {isSelectedConfirmed && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-600 text-white">
                          Current Trip Dates
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">{rec.explanation}</p>
                  </div>

                  {isAdmin && (
                    <button
                      onClick={() => setShowConfirmModal(rec)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center space-x-1.5 self-start md:self-auto shrink-0"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Confirm These Dates</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Separate Conflicting Ranges Section (Requirement 5) */}
        {conflictingRanges.length > 0 && (
          <div className="pt-6 border-t border-slate-200">
            <h4 className="text-xs font-bold uppercase tracking-wider text-rose-700 mb-3 flex items-center space-x-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>Conflicting Ranges (Segregated from Common Recommendations)</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {conflictingRanges.slice(0, 4).map((conf) => (
                <div
                  key={conf.startDate}
                  className="p-3.5 bg-rose-50/50 border border-rose-200/80 rounded-2xl text-xs flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-rose-950">
                      {conf.startDate} → {conf.endDate}
                    </span>
                    <p className="text-[11px] text-rose-700 mt-0.5">
                      {conf.veryBusyCountTotal} conflict day(s) marked Very Busy.
                    </p>
                  </div>
                  <span className="text-[10px] font-semibold text-rose-600 px-2 py-1 rounded-md bg-rose-100">
                    Not Recommended
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Admin Confirm Dates Warning Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-2">
              Confirm Group Trip Dates
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Locking trip dates will generate the official day-by-day itinerary schedule.
            </p>

            <div className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-100 text-xs mb-4">
              <div className="font-bold text-indigo-950 text-sm">
                {showConfirmModal.startDate} to {showConfirmModal.endDate}
              </div>
              <div className="text-indigo-800 mt-1">{showConfirmModal.explanation}</div>
            </div>

            {/* Warnings if Tier 2 (maybe free) or Tier 3 (incomplete) */}
            {showConfirmModal.tier > 1 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs mb-4 space-y-1">
                <div className="font-bold flex items-center space-x-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Important Notice</span>
                </div>
                {showConfirmModal.tier === 2 && (
                  <p>
                    Some members marked <strong>Maybe Free</strong> on these dates. Make sure everyone is comfortable before confirming.
                  </p>
                )}
                {showConfirmModal.tier === 3 && (
                  <p>
                    Not all members have responded yet ({showConfirmModal.unmarkedCountTotal} unmarked response(s)).
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleConfirmDates(showConfirmModal)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-100 transition"
              >
                Confirm Dates & Build Itinerary
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
