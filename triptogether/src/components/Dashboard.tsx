import React, { useState } from 'react';
import { TripGroup, PlanningStatus } from '../types';
import {
  Plus,
  Compass,
  Calendar,
  Sparkles,
  ArrowRight,
  MapPin,
  Clock,
  KeyRound,
  Users,
} from 'lucide-react';

interface DashboardProps {
  groups: TripGroup[];
  onSelectGroup: (groupId: string) => void;
  onCreateClick: () => void;
  onSeedDemo: () => void;
  onOpenJoinCode: (code: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  groups,
  onSelectGroup,
  onCreateClick,
  onSeedDemo,
  onOpenJoinCode,
}) => {
  const [inviteCodeInput, setInviteCodeInput] = useState('');

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inviteCodeInput.trim()) {
      onOpenJoinCode(inviteCodeInput.trim());
      setInviteCodeInput('');
    }
  };

  const getStatusBadge = (status: PlanningStatus) => {
    switch (status) {
      case 'choosing_destination':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
            <Compass className="w-3 h-3 text-sky-600" />
            <span>Choosing Destination</span>
          </span>
        );
      case 'finding_dates':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Calendar className="w-3 h-3 text-amber-600" />
            <span>Finding Dates</span>
          </span>
        );
      case 'planning_itinerary':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Sparkles className="w-3 h-3 text-emerald-600" />
            <span>Planning Itinerary</span>
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome & Action Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Your Trips & Adventures
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Collaboratively pick destinations, align dates, and craft daily plans together.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onSeedDemo}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200/80 hover:bg-amber-100/80 transition shadow-xs"
          >
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>Seed Amalfi Demo Trip</span>
          </button>

          <button
            onClick={onCreateClick}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200 transition"
          >
            <Plus className="w-4 h-4" />
            <span>New Trip Group</span>
          </button>
        </div>
      </div>

      {/* Quick Join via Code Bar */}
      <div className="mb-8 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center space-x-3 text-xs text-slate-600">
          <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
            <KeyRound className="w-4 h-4" />
          </div>
          <div>
            <span className="font-semibold text-slate-800">Have a trip invite code?</span>
            <p className="text-[11px] text-slate-400">Paste code to join a friend or family trip</p>
          </div>
        </div>

        <form onSubmit={handleJoinSubmit} className="flex items-center space-x-2 w-full sm:w-auto">
          <input
            type="text"
            placeholder="e.g. trip_abc123"
            value={inviteCodeInput}
            onChange={(e) => setInviteCodeInput(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 w-full sm:w-48 font-mono"
          />
          <button
            type="submit"
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl transition shrink-0"
          >
            Join
          </button>
        </form>
      </div>

      {/* Trip Cards Grid */}
      {groups.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center max-w-xl mx-auto shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
            <Compass className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">No Trips Created Yet</h2>
          <p className="text-xs text-slate-500 mt-2 mb-6 max-w-sm mx-auto">
            Create your first trip to start collecting destination ideas and group availability, or seed the interactive Amalfi Coast demo trip!
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={onSeedDemo}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition"
            >
              Seed Demo Trip
            </button>
            <button
              onClick={onCreateClick}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition"
            >
              Create New Trip
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group) => (
            <div
              key={group.id}
              onClick={() => onSelectGroup(group.id)}
              className="group bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-xl hover:border-indigo-200 transition-all cursor-pointer flex flex-col"
            >
              {/* Cover Photo */}
              <div className="relative h-44 overflow-hidden bg-slate-100">
                <img
                  src={group.coverImageUrl}
                  alt={group.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                {/* Status Badge */}
                <div className="absolute top-3 left-3">{getStatusBadge(group.status)}</div>

                {/* Destination if confirmed */}
                {group.confirmedDestination && (
                  <div className="absolute bottom-3 left-3 right-3 flex items-center space-x-1.5 text-white text-xs font-medium drop-shadow-sm">
                    <MapPin className="w-3.5 h-3.5 text-teal-300 shrink-0" />
                    <span className="truncate">{group.confirmedDestination}</span>
                  </div>
                )}
              </div>

              {/* Card Body */}
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 group-hover:text-indigo-600 transition tracking-tight">
                    {group.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {group.description || 'No description provided.'}
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  {group.confirmedDates ? (
                    <div className="flex items-center space-x-1.5 text-indigo-700 font-medium">
                      <Clock className="w-3.5 h-3.5 text-indigo-500" />
                      <span>
                        {group.confirmedDates.startDate} to {group.confirmedDates.endDate}
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-400 italic">Dates undecided</span>
                  )}

                  <div className="flex items-center space-x-1 text-indigo-600 font-semibold group-hover:translate-x-1 transition-transform">
                    <span>Open Hub</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
