import React, { useState, useEffect } from 'react';
import {
  TripGroup,
  GroupMember,
  UserProfile,
  ActivitySuggestion,
  TimeSlot,
  ItineraryDay,
} from '../types';
import {
  subscribeToSuggestions,
  createSuggestion,
  toggleSuggestionVote,
  updateSuggestion,
  deleteSuggestion,
  updateGroup,
  localStore,
} from '../services/db';
import { getConsecutiveDates, addDaysYMD } from '../utils/dateRecommender';
import { isValidHttpUrl } from '../utils/validation';
import {
  Calendar,
  Clock,
  MapPin,
  ExternalLink,
  ThumbsUp,
  Plus,
  CheckCircle2,
  AlertTriangle,
  MoveUp,
  MoveDown,
  Trash2,
  CalendarCheck,
  Layers,
  Sparkles,
  Sun,
  Sunset,
  Moon,
  Compass,
  X,
  Loader2,
  DollarSign,
  ArrowRightLeft,
} from 'lucide-react';

interface ItineraryTabProps {
  group: TripGroup;
  members: GroupMember[];
  currentUser: UserProfile;
  isAdmin: boolean;
  onOpenLightbox: (url: string) => void;
  onUpdateGroup: (updates: Partial<TripGroup>) => void;
  onGoToAvailability: () => void;
}

export const ItineraryTab: React.FC<ItineraryTabProps> = ({
  group,
  members,
  currentUser,
  isAdmin,
  onOpenLightbox,
  onUpdateGroup,
  onGoToAvailability,
}) => {
  const [suggestions, setSuggestions] = useState<ActivitySuggestion[]>(() =>
    localStore.get(`group_${group.id}_suggestions`, [])
  );
  const [activeDateIndex, setActiveDateIndex] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRemapModal, setShowRemapModal] = useState(false);
  const [confirmActivityModal, setConfirmActivityModal] = useState<ActivitySuggestion | null>(null);

  useEffect(() => {
    const unsub = subscribeToSuggestions(group.id, (loaded) => {
      setSuggestions(loaded);
    });
    return () => unsub();
  }, [group.id]);

  // Compute trip days
  const hasConfirmedDates = Boolean(group.confirmedDates?.startDate && group.confirmedDates?.endDate);

  const tripDates: string[] = React.useMemo(() => {
    if (!hasConfirmedDates || !group.confirmedDates) return [];
    const dates: string[] = [];
    let curr = group.confirmedDates.startDate;
    while (curr <= group.confirmedDates.endDate) {
      dates.push(curr);
      curr = addDaysYMD(curr, 1);
    }
    return dates;
  }, [group.confirmedDates, hasConfirmedDates]);

  const activeDate = tripDates[activeDateIndex] || tripDates[0] || 'unscheduled';

  // Activities for currently selected day
  const daySuggestions = suggestions.filter((s) => s.targetDate === activeDate && !s.isConfirmed);
  const dayConfirmed = suggestions
    .filter((s) => s.targetDate === activeDate && s.isConfirmed)
    .sort((a, b) => {
      if (a.scheduledTime && b.scheduledTime) {
        return a.scheduledTime.localeCompare(b.scheduledTime);
      }
      return (a.scheduledOrder || 0) - (b.scheduledOrder || 0);
    });

  // Check for time overlaps among confirmed activities on this day
  const overlapWarnings: string[] = [];
  for (let i = 0; i < dayConfirmed.length; i++) {
    for (let j = i + 1; j < dayConfirmed.length; j++) {
      const a = dayConfirmed[i];
      const b = dayConfirmed[j];
      if (a.scheduledTime && b.scheduledTime && a.scheduledTime === b.scheduledTime) {
        overlapWarnings.push(
          `"${a.title}" and "${b.title}" are both scheduled at ${a.scheduledTime}.`
        );
      }
    }
  }

  // Voting action
  const handleToggleVote = async (sugId: string) => {
    await toggleSuggestionVote(group.id, sugId, currentUser.id);
  };

  // Admin add to confirmed itinerary
  const handleConfirmToItinerary = async (time: string) => {
    if (!confirmActivityModal) return;
    await updateSuggestion(group.id, confirmActivityModal.id, {
      isConfirmed: true,
      scheduledTime: time || undefined,
      scheduledOrder: dayConfirmed.length + 1,
    });
    setConfirmActivityModal(null);
  };

  // Admin remove from confirmed itinerary (reverts to suggestion)
  const handleRemoveFromConfirmed = async (sugId: string) => {
    await updateSuggestion(group.id, sugId, {
      isConfirmed: false,
      scheduledTime: undefined,
    });
  };

  // Reorder up/down
  const handleMoveOrder = async (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= dayConfirmed.length) return;

    const currentItem = dayConfirmed[idx];
    const targetItem = dayConfirmed[targetIdx];

    await updateSuggestion(group.id, currentItem.id, { scheduledOrder: targetIdx + 1 });
    await updateSuggestion(group.id, targetItem.id, { scheduledOrder: idx + 1 });
  };

  const getSlotIcon = (slot: TimeSlot) => {
    switch (slot) {
      case 'morning':
        return <Sun className="w-3.5 h-3.5 text-amber-500" />;
      case 'afternoon':
        return <Sunset className="w-3.5 h-3.5 text-orange-500" />;
      case 'evening':
        return <Moon className="w-3.5 h-3.5 text-indigo-500" />;
      case 'flexible':
        return <Compass className="w-3.5 h-3.5 text-teal-500" />;
    }
  };

  // If no confirmed dates yet, prompt user
  if (!hasConfirmedDates) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-xl mx-auto shadow-xs">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
          <Calendar className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-800">Trip Dates Not Confirmed Yet</h3>
        <p className="text-xs text-slate-500 mt-2 mb-6 max-w-sm mx-auto">
          The day-by-day itinerary unlocks once the group admin confirms the official trip dates in the Availability tab.
        </p>
        <button
          onClick={onGoToAvailability}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-100 transition"
        >
          Go to Availability & Pick Dates
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Itinerary Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-slate-800">Day-by-Day Itinerary</h2>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              {tripDates.length} Days Planned
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Suggest activities, upvote your favorites, and schedule confirmed items into the daily timeline.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          {isAdmin && (
            <button
              onClick={() => setShowRemapModal(true)}
              className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition flex items-center space-x-1.5"
              title="Remap activities if trip dates change"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-slate-500" />
              <span>Remap Dates</span>
            </button>
          )}

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-100 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Suggest Activity</span>
          </button>
        </div>
      </div>

      {/* Day Selector Tabs (Day 1..N + Unscheduled Backlog) */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
        {tripDates.map((dateStr, idx) => {
          const isSelected = activeDateIndex === idx;
          const confCount = suggestions.filter(
            (s) => s.targetDate === dateStr && s.isConfirmed
          ).length;
          const suggCount = suggestions.filter(
            (s) => s.targetDate === dateStr && !s.isConfirmed
          ).length;

          return (
            <button
              key={dateStr}
              onClick={() => setActiveDateIndex(idx)}
              className={`px-4 py-2.5 rounded-2xl border text-xs font-semibold transition-all shrink-0 text-left ${
                isSelected
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
              }`}
            >
              <div className="text-[11px] uppercase tracking-wider opacity-80">Day {idx + 1}</div>
              <div className="font-bold">{dateStr}</div>
              <div className="text-[10px] mt-0.5 opacity-90 flex items-center space-x-1">
                <span>{confCount} confirmed</span>
                <span>•</span>
                <span>{suggCount} ideas</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Time Overlap Warnings Banner */}
      {overlapWarnings.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-1 animate-in fade-in">
          <div className="font-bold flex items-center space-x-1.5 text-amber-800">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Schedule Overlap Detected for Day {activeDateIndex + 1}</span>
          </div>
          {overlapWarnings.map((msg, i) => (
            <p key={i} className="text-amber-800">
              • {msg}
            </p>
          ))}
        </div>
      )}

      {/* Main Grid: Confirmed Itinerary (Left) vs Member Suggestions (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Confirmed Daily Schedule (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-800 flex items-center space-x-2">
              <CalendarCheck className="w-4 h-4 text-teal-600" />
              <span>
                Confirmed Schedule — Day {activeDateIndex + 1} ({activeDate})
              </span>
            </h3>
            <span className="text-xs font-semibold text-slate-500">
              {dayConfirmed.length} activities
            </span>
          </div>

          {dayConfirmed.length === 0 ? (
            <div className="p-10 bg-white rounded-3xl border border-dashed border-slate-300 text-center text-xs text-slate-500">
              <Layers className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="font-semibold text-slate-700">No Confirmed Activities for this Day</p>
              <p className="mt-1">
                Browse member suggestions on the right and click "Add to Schedule" to build your day.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {dayConfirmed.map((act, idx) => (
                <div
                  key={act.id}
                  className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start space-x-3.5">
                    {/* Time Pill */}
                    <div className="px-3 py-1.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold shrink-0 flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5 text-teal-600" />
                      <span>{act.scheduledTime || 'TBD'}</span>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-slate-800">{act.title}</h4>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                        {act.description}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                        {act.cost && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                            {act.cost}
                          </span>
                        )}
                        {act.duration && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                            {act.duration}
                          </span>
                        )}
                        {act.mapUrl && isValidHttpUrl(act.mapUrl) && (
                          <a
                            href={act.mapUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-1 text-indigo-600 hover:underline"
                          >
                            <MapPin className="w-3 h-3" />
                            <span>Location</span>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Admin Reorder & Remove Actions */}
                  {isAdmin && (
                    <div className="flex items-center space-x-1 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100">
                      <button
                        onClick={() => handleMoveOrder(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 disabled:opacity-30"
                        title="Move Up"
                      >
                        <MoveUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleMoveOrder(idx, 'down')}
                        disabled={idx === dayConfirmed.length - 1}
                        className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 disabled:opacity-30"
                        title="Move Down"
                      >
                        <MoveDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleRemoveFromConfirmed(act.id)}
                        className="px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50 rounded-lg font-medium transition"
                        title="Remove from schedule (keeps suggestion)"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Member Suggestions & Voting (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-800 flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>Suggested Ideas ({daySuggestions.length})</span>
            </h3>

            <button
              onClick={() => setShowAddModal(true)}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Suggest</span>
            </button>
          </div>

          {daySuggestions.length === 0 ? (
            <div className="p-8 bg-white rounded-3xl border border-slate-200 text-center text-xs text-slate-500">
              <p>No new suggestions for this day yet.</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-3 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-xl font-semibold hover:bg-indigo-100 transition"
              >
                + Suggest First Activity
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {daySuggestions.map((sug) => {
                const hasVoted = sug.supportVotes.includes(currentUser.id);
                return (
                  <div
                    key={sug.id}
                    className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center space-x-1.5 text-[11px] text-slate-500 mb-1">
                          {getSlotIcon(sug.preferredSlot)}
                          <span className="capitalize font-medium">{sug.preferredSlot} slot</span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-800 leading-snug">
                          {sug.title}
                        </h4>
                      </div>

                      {/* Approval Voting Button */}
                      <button
                        onClick={() => handleToggleVote(sug.id)}
                        className={`flex items-center space-x-1 px-2.5 py-1 rounded-xl text-xs font-semibold transition ${
                          hasVoted
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                        title="Vote support for this activity"
                      >
                        <ThumbsUp className="w-3 h-3" />
                        <span>{sug.supportVotes.length}</span>
                      </button>
                    </div>

                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {sug.description}
                    </p>

                    {/* Metadata & Author */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                      <div className="flex items-center space-x-1.5">
                        <img
                          src={
                            sug.authorAvatar ||
                            `https://api.dicebear.com/7.x/bottts/svg?seed=${sug.authorId}`
                          }
                          alt={sug.authorName}
                          className="w-5 h-5 rounded-full object-cover"
                        />
                        <span className="text-[11px] text-slate-600 font-medium">
                          {sug.authorName}
                        </span>
                      </div>

                      {isAdmin && (
                        <button
                          onClick={() => setConfirmActivityModal(sug)}
                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-lg text-[11px] transition"
                        >
                          Add to Schedule →
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Suggest Activity Modal */}
      {showAddModal && (
        <AddSuggestionModal
          groupId={group.id}
          targetDate={activeDate}
          tripDates={tripDates}
          currentUser={currentUser}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {/* Admin Confirm Activity to Schedule Modal */}
      {confirmActivityModal && (
        <ScheduleActivityModal
          suggestion={confirmActivityModal}
          onConfirm={handleConfirmToItinerary}
          onClose={() => setConfirmActivityModal(null)}
        />
      )}

      {/* Date Remapping Modal (Section 7) */}
      {showRemapModal && (
        <RemapDatesModal
          group={group}
          suggestions={suggestions}
          tripDates={tripDates}
          onClose={() => setShowRemapModal(false)}
        />
      )}
    </div>
  );
};

// ==========================================
// ADD ACTIVITY SUGGESTION MODAL
// ==========================================
interface AddSuggestionModalProps {
  groupId: string;
  targetDate: string;
  tripDates: string[];
  currentUser: UserProfile;
  onClose: () => void;
}

const AddSuggestionModal: React.FC<AddSuggestionModalProps> = ({
  groupId,
  targetDate,
  tripDates,
  currentUser,
  onClose,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedDate, setSelectedDate] = useState(targetDate);
  const [preferredSlot, setPreferredSlot] = useState<TimeSlot>('morning');
  const [cost, setCost] = useState('');
  const [duration, setDuration] = useState('');
  const [mapUrl, setMapUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);

    try {
      await createSuggestion(groupId, {
        groupId,
        targetDate: selectedDate,
        title: title.trim(),
        description: description.trim(),
        preferredSlot,
        cost: cost.trim() || undefined,
        duration: duration.trim() || undefined,
        mapUrl: mapUrl.trim() && isValidHttpUrl(mapUrl.trim()) ? mapUrl.trim() : undefined,
        links: [],
        imageUrls: [],
        authorId: currentUser.id,
        authorName: currentUser.displayName,
        authorAvatar: currentUser.avatarUrl,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-bold text-slate-800">Suggest an Activity</h3>
        <p className="text-xs text-slate-500 mb-6">
          Recommend a sight, tour, meal, or experience for the group.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Activity Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Sunset Kayak Tour, Wine Tasting"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Day
              </label>
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                {tripDates.map((d, i) => (
                  <option key={d} value={d}>
                    Day {i + 1} ({d})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Time Slot
              </label>
              <select
                value={preferredSlot}
                onChange={(e) => setPreferredSlot(e.target.value as TimeSlot)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="morning">Morning</option>
                <option value="afternoon">Afternoon</option>
                <option value="evening">Evening</option>
                <option value="flexible">Flexible</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description & Highlights
            </label>
            <textarea
              rows={3}
              placeholder="What makes this special? Who would enjoy it?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Cost per Person
              </label>
              <input
                type="text"
                placeholder="e.g. Free, $30, €45"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Duration
              </label>
              <input
                type="text"
                placeholder="e.g. 2 hours, Half day"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Google Maps or Location URL
            </label>
            <input
              type="url"
              placeholder="https://maps.google.com/..."
              value={mapUrl}
              onChange={(e) => setMapUrl(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-100 transition disabled:opacity-50"
            >
              Post Suggestion
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==========================================
// SCHEDULE CONFIRMATION MODAL
// ==========================================
interface ScheduleActivityModalProps {
  suggestion: ActivitySuggestion;
  onConfirm: (time: string) => void;
  onClose: () => void;
}

const ScheduleActivityModal: React.FC<ScheduleActivityModalProps> = ({
  suggestion,
  onConfirm,
  onClose,
}) => {
  const [time, setTime] = useState('10:00');

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100">
        <h3 className="text-base font-bold text-slate-800 mb-1">
          Add to Confirmed Schedule
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Assign an official time for <strong>{suggestion.title}</strong>.
        </p>

        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Start Time
          </label>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(time)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition"
          >
            Confirm Activity
          </button>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// DATE REMAPPING MODAL (SECTION 7 REQUIREMENT)
// ==========================================
interface RemapDatesModalProps {
  group: TripGroup;
  suggestions: ActivitySuggestion[];
  tripDates: string[];
  onClose: () => void;
}

const RemapDatesModal: React.FC<RemapDatesModalProps> = ({
  group,
  suggestions,
  tripDates,
  onClose,
}) => {
  const [remappings, setRemappings] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const handleRemapChange = (sugId: string, newDate: string) => {
    setRemappings({ ...remappings, [sugId]: newDate });
  };

  const handleSaveRemap = async () => {
    setSaving(true);
    try {
      for (const [sugId, newDate] of Object.entries(remappings)) {
        await updateSuggestion(group.id, sugId, { targetDate: newDate });
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold text-slate-800">Remap Activities</h3>
        <p className="text-xs text-slate-500 mb-6">
          If your trip dates were changed, reassign activities to the new days or move them to unscheduled backlog.
        </p>

        <div className="space-y-3 mb-6">
          {suggestions.map((sug) => (
            <div
              key={sug.id}
              className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between text-xs"
            >
              <div className="truncate mr-3">
                <span className="font-bold text-slate-800 block truncate">{sug.title}</span>
                <span className="text-[11px] text-slate-400">Current: {sug.targetDate}</span>
              </div>

              <select
                value={remappings[sug.id] !== undefined ? remappings[sug.id] : sug.targetDate}
                onChange={(e) => handleRemapChange(sug.id, e.target.value)}
                className="px-2 py-1 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 shrink-0"
              >
                {tripDates.map((d, i) => (
                  <option key={d} value={d}>
                    Day {i + 1} ({d})
                  </option>
                ))}
                <option value="unscheduled">Unscheduled</option>
              </select>
            </div>
          ))}
        </div>

        <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveRemap}
            disabled={saving}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition"
          >
            Save Remappings
          </button>
        </div>
      </div>
    </div>
  );
};
