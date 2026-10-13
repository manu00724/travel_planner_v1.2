import React, { useState, useEffect } from 'react';
import { TripGroup, GroupMember, UserProfile } from '../types';
import {
  subscribeToGroup,
  subscribeToGroupMembers,
  updateGroup,
  localStore,
} from '../services/db';
import { OverviewTab } from './OverviewTab';
import { PollsTab } from './PollsTab';
import { AvailabilityTab } from './AvailabilityTab';
import { ItineraryTab } from './ItineraryTab';
import { MembersTab } from './MembersTab';
import { InviteModal } from './InviteModal';
import { ImageLightbox } from './ImageLightbox';
import {
  Compass,
  Calendar,
  Sparkles,
  Users,
  Share2,
  MapPin,
  Clock,
  ArrowLeft,
  CheckCircle,
} from 'lucide-react';

interface GroupViewProps {
  groupId: string;
  currentUser: UserProfile;
  onBackToDashboard: () => void;
}

export const GroupView: React.FC<GroupViewProps> = ({
  groupId,
  currentUser,
  onBackToDashboard,
}) => {
  const [group, setGroup] = useState<TripGroup | null>(() => {
    const groups: TripGroup[] = localStore.get('groups', []);
    return groups.find((g) => g.id === groupId) || null;
  });
  const [members, setMembers] = useState<GroupMember[]>(() => {
    return localStore.get(`group_${groupId}_members`, []);
  });
  const getInitialTab = (): 'overview' | 'polls' | 'availability' | 'itinerary' | 'members' => {
    const hash = window.location.hash;
    if (hash.includes('tab=')) {
      const t = hash.split('tab=')[1]?.toLowerCase();
      if (['overview', 'polls', 'availability', 'itinerary', 'members'].includes(t)) {
        return t as any;
      }
    }
    const params = new URLSearchParams(window.location.search);
    const qTab = params.get('tab')?.toLowerCase();
    if (qTab && ['overview', 'polls', 'availability', 'itinerary', 'members'].includes(qTab)) {
      return qTab as any;
    }
    return 'overview';
  };

  const [activeTab, setActiveTab] = useState<
    'overview' | 'polls' | 'availability' | 'itinerary' | 'members'
  >(getInitialTab);
  const [showInviteModal, setShowInviteModal] = useState(() => {
    return (
      window.location.hash.includes('invite') ||
      new URLSearchParams(window.location.search).has('invite')
    );
  });
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  useEffect(() => {
    const unsubGroup = subscribeToGroup(groupId, (g) => {
      if (g) setGroup(g);
    });
    const unsubMembers = subscribeToGroupMembers(groupId, (m) => {
      setMembers(m);
    });
    return () => {
      unsubGroup();
      unsubMembers();
    };
  }, [groupId]);

  if (!group) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <p className="text-sm text-slate-500">Loading trip details...</p>
      </div>
    );
  }

  const currentMember = members.find((m) => m.userId === currentUser.id);
  const isAdmin = group.createdBy === currentUser.id || currentMember?.role === 'admin';

  const handleUpdateGroupState = (updates: Partial<TripGroup>) => {
    setGroup((prev) => (prev ? { ...prev, ...updates } : prev));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Breadcrumb Bar */}
      <button
        onClick={onBackToDashboard}
        className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to All Trips</span>
      </button>

      {/* Hero Header Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-slate-900 border border-slate-200/80 shadow-sm text-white">
        <div className="absolute inset-0 h-full w-full">
          <img
            src={group.coverImageUrl}
            alt={group.name}
            className="w-full h-full object-cover opacity-40 blur-xs scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/50 to-transparent" />
        </div>

        <div className="relative p-6 sm:p-8 md:p-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            {/* Meta Tags */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {group.confirmedDestination && (
                <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-teal-500/20 backdrop-blur-md text-teal-300 border border-teal-500/30 font-semibold">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{group.confirmedDestination}</span>
                </span>
              )}

              {group.confirmedDates && (
                <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-indigo-500/20 backdrop-blur-md text-indigo-200 border border-indigo-500/30 font-semibold">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    {group.confirmedDates.startDate} to {group.confirmedDates.endDate}
                  </span>
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white drop-shadow-sm">
              {group.name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 line-clamp-2 leading-relaxed">
              {group.description || 'Collaborative travel planning space'}
            </p>

            {/* Member Avatars Row */}
            <div className="flex items-center space-x-2 pt-2">
              <div className="flex -space-x-2 overflow-hidden">
                {members.slice(0, 5).map((m) => (
                  <img
                    key={m.userId}
                    src={
                      m.avatarUrl ||
                      `https://api.dicebear.com/7.x/bottts/svg?seed=${m.userId}`
                    }
                    alt={m.displayName}
                    className="inline-block h-8 w-8 rounded-full ring-2 ring-slate-900 object-cover"
                    title={m.displayName}
                  />
                ))}
              </div>
              <span className="text-xs font-semibold text-slate-300">
                {members.length} {members.length === 1 ? 'member' : 'members'}
              </span>
            </div>
          </div>

          {/* Quick Invite Button */}
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center space-x-2 px-4 py-2.5 bg-white text-slate-900 hover:bg-slate-100 rounded-2xl text-xs font-bold shadow-lg transition self-start md:self-auto shrink-0"
          >
            <Share2 className="w-4 h-4 text-indigo-600" />
            <span>Invite Friends (QR / Link)</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-1 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
            activeTab === 'overview'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Compass className="w-4 h-4" />
          <span>Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('polls')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
            activeTab === 'polls'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Destination Polls</span>
        </button>

        <button
          onClick={() => setActiveTab('availability')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
            activeTab === 'availability'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Dates & Availability</span>
        </button>

        <button
          onClick={() => setActiveTab('itinerary')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
            activeTab === 'itinerary'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Itinerary</span>
        </button>

        <button
          onClick={() => setActiveTab('members')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
            activeTab === 'members'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Members ({members.length})</span>
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'overview' && (
        <OverviewTab
          group={group}
          members={members}
          currentUser={currentUser}
          isAdmin={isAdmin}
          onNavigateTab={setActiveTab}
          onOpenInvite={() => setShowInviteModal(true)}
          onUpdateGroup={handleUpdateGroupState}
        />
      )}

      {activeTab === 'polls' && (
        <PollsTab
          group={group}
          members={members}
          currentUser={currentUser}
          isAdmin={isAdmin}
          onOpenLightbox={(url) => setLightboxUrl(url)}
          onUpdateGroup={handleUpdateGroupState}
        />
      )}

      {activeTab === 'availability' && (
        <AvailabilityTab
          group={group}
          members={members}
          currentUser={currentUser}
          isAdmin={isAdmin}
          onUpdateGroup={handleUpdateGroupState}
        />
      )}

      {activeTab === 'itinerary' && (
        <ItineraryTab
          group={group}
          members={members}
          currentUser={currentUser}
          isAdmin={isAdmin}
          onOpenLightbox={(url) => setLightboxUrl(url)}
          onUpdateGroup={handleUpdateGroupState}
          onGoToAvailability={() => setActiveTab('availability')}
        />
      )}

      {activeTab === 'members' && (
        <MembersTab
          group={group}
          members={members}
          currentUser={currentUser}
          isAdmin={isAdmin}
          onOpenInvite={() => setShowInviteModal(true)}
          onLeaveGroup={onBackToDashboard}
        />
      )}

      {/* Modals */}
      {showInviteModal && (
        <InviteModal
          group={group}
          isAdmin={isAdmin}
          onClose={() => setShowInviteModal(false)}
          onUpdateGroup={handleUpdateGroupState}
        />
      )}

      {lightboxUrl && (
        <ImageLightbox imageUrl={lightboxUrl} onClose={() => setLightboxUrl(null)} />
      )}
    </div>
  );
};
