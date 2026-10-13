import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getInvitation, addMemberToGroup } from '../services/db';
import { GroupInvitation } from '../types';
import { Plane, Users, CheckCircle, AlertCircle, Loader2, ArrowRight } from 'lucide-react';

interface JoinTripModalProps {
  inviteCode: string;
  onJoined: (groupId: string) => void;
  onCancel: () => void;
}

export const JoinTripModal: React.FC<JoinTripModalProps> = ({
  inviteCode,
  onJoined,
  onCancel,
}) => {
  const { currentUser, signInQuick } = useAuth();
  const [invitation, setInvitation] = useState<GroupInvitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tempName, setTempName] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const inv = await getInvitation(inviteCode);
        if (!inv) {
          setError('This invitation link is invalid or has expired.');
        } else if (!inv.isActive) {
          setError('This invitation link was revoked by the group admin.');
        } else {
          setInvitation(inv);
        }
      } catch (e) {
        setError('Failed to load invitation. Please check your connection.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [inviteCode]);

  const handleJoin = async () => {
    if (!invitation) return;
    setJoining(true);
    setError(null);

    try {
      let activeUser = currentUser;
      if (!activeUser) {
        const nameToUse = tempName.trim() || 'Traveler';
        await signInQuick(nameToUse);
        // User created
      }

      // Add to group members
      if (currentUser) {
        await addMemberToGroup(invitation.groupId, currentUser, 'member');
        onJoined(invitation.groupId);
      }
    } catch (err: any) {
      setError(err?.message || 'Could not join group. Please try again.');
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative">
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            <p className="text-sm font-medium text-slate-500">Checking invitation...</p>
          </div>
        ) : error ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Invitation Problem</h3>
            <p className="text-xs text-slate-500 mt-2 mb-6">{error}</p>
            <button
              onClick={onCancel}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition"
            >
              Back to Trips
            </button>
          </div>
        ) : invitation ? (
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-teal-500 text-white flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-100">
              <Plane className="w-7 h-7 -rotate-45" />
            </div>

            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 mb-1">
              You're Invited To Join
            </p>
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
              {invitation.groupName}
            </h2>
            <p className="text-xs text-slate-500 mt-2 line-clamp-2">
              {invitation.groupDescription || 'Help plan destination, dates, and daily activities!'}
            </p>

            <div className="my-6 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 text-left">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-sm">
                  {invitation.creatorName.charAt(0)}
                </div>
                <div>
                  <p className="text-[11px] text-slate-400 font-medium">Invited by</p>
                  <p className="text-xs font-semibold text-slate-800">{invitation.creatorName}</p>
                </div>
              </div>
            </div>

            {!currentUser && (
              <div className="mb-4 text-left">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Your Display Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Alex"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}

            <div className="flex flex-col space-y-2">
              <button
                onClick={handleJoin}
                disabled={joining}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm shadow-md shadow-indigo-200 transition flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {joining ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Joining Trip...</span>
                  </>
                ) : (
                  <>
                    <span>Join Trip Group</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <button
                onClick={onCancel}
                className="w-full py-2.5 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition font-medium"
              >
                Decline & Close
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
