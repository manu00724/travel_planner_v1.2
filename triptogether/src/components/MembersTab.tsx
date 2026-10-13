import React from 'react';
import { TripGroup, GroupMember, UserProfile } from '../types';
import { removeMemberFromGroup, updateGroup } from '../services/db';
import { Users, Shield, UserMinus, UserCheck, Share2, Crown, LogOut } from 'lucide-react';

interface MembersTabProps {
  group: TripGroup;
  members: GroupMember[];
  currentUser: UserProfile;
  isAdmin: boolean;
  onOpenInvite: () => void;
  onLeaveGroup: () => void;
}

export const MembersTab: React.FC<MembersTabProps> = ({
  group,
  members,
  currentUser,
  isAdmin,
  onOpenInvite,
  onLeaveGroup,
}) => {
  const handleRemoveMember = async (userId: string, name: string) => {
    if (!isAdmin) return;
    if (window.confirm(`Are you sure you want to remove ${name} from this trip group?`)) {
      await removeMemberFromGroup(group.id, userId);
    }
  };

  const handleSelfLeave = async () => {
    if (window.confirm('Are you sure you want to leave this trip?')) {
      await removeMemberFromGroup(group.id, currentUser.id);
      onLeaveGroup();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-slate-800">Trip Members & Roles</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700">
              {members.length} Total
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Group members can vote on destinations, log availability, and suggest activities.
          </p>
        </div>

        <button
          onClick={onOpenInvite}
          className="flex items-center space-x-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-100 transition self-start sm:self-auto"
        >
          <Share2 className="w-4 h-4" />
          <span>Invite More Friends</span>
        </button>
      </div>

      {/* Members Roster */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-slate-500">
          Member Roster
        </div>

        <div className="divide-y divide-slate-100">
          {members.map((member) => {
            const isCreator = group.createdBy === member.userId;
            const isMe = currentUser.id === member.userId;

            return (
              <div
                key={member.userId}
                className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition"
              >
                <div className="flex items-center space-x-3.5">
                  <div className="relative">
                    <img
                      src={
                        member.avatarUrl ||
                        `https://api.dicebear.com/7.x/bottts/svg?seed=${member.userId}`
                      }
                      alt={member.displayName}
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-100"
                    />
                    {isCreator && (
                      <div className="absolute -top-1 -right-1 bg-amber-500 text-white p-0.5 rounded-full shadow-xs">
                        <Crown className="w-3 h-3" />
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-slate-800">
                        {member.displayName}
                      </span>
                      {isMe && (
                        <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                          You
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Joined{' '}
                      {new Date(member.joinedAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {member.role === 'admin' ? (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      <Shield className="w-3 h-3 text-indigo-600" />
                      <span>Admin</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                      <span>Member</span>
                    </span>
                  )}

                  {/* Admin Remove Button */}
                  {isAdmin && !isCreator && !isMe && (
                    <button
                      onClick={() => handleRemoveMember(member.userId, member.displayName)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                      title="Remove member from group"
                    >
                      <UserMinus className="w-4 h-4" />
                    </button>
                  )}

                  {/* Self Leave Button for regular members */}
                  {isMe && !isCreator && (
                    <button
                      onClick={handleSelfLeave}
                      className="px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-xl font-medium transition flex items-center space-x-1"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Leave</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
