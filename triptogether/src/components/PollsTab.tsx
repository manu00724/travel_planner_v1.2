import React, { useState, useEffect } from 'react';
import {
  DestinationPoll,
  PollOption,
  PollVote,
  CommentItem,
  GroupMember,
  UserProfile,
  VotingMode,
  TripGroup,
} from '../types';
import {
  subscribeToPolls,
  subscribeToPollVotes,
  subscribeToPollComments,
  createPoll,
  closePoll,
  castPollVote,
  addPollComment,
  updateGroup,
  localStore,
} from '../services/db';
import {
  Plus,
  Vote,
  MessageSquare,
  CheckCircle,
  ExternalLink,
  Lock,
  Clock,
  Sparkles,
  AlertCircle,
  Send,
  Image as ImageIcon,
  Check,
  Award,
  Trash2,
  X,
  Loader2,
} from 'lucide-react';
import { isValidHttpUrl, validateImageFile, fileToDataUrl } from '../utils/validation';

interface PollsTabProps {
  group: TripGroup;
  members: GroupMember[];
  currentUser: UserProfile;
  isAdmin: boolean;
  onOpenLightbox: (url: string) => void;
  onUpdateGroup: (updates: Partial<TripGroup>) => void;
}

export const PollsTab: React.FC<PollsTabProps> = ({
  group,
  members,
  currentUser,
  isAdmin,
  onOpenLightbox,
  onUpdateGroup,
}) => {
  const [polls, setPolls] = useState<DestinationPoll[]>(() =>
    localStore.get(`group_${group.id}_polls`, [])
  );
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    const unsub = subscribeToPolls(group.id, (loadedPolls) => {
      setPolls(loadedPolls);
    });
    return () => unsub();
  }, [group.id]);

  const handleConfirmDestination = async (destinationName: string) => {
    if (!isAdmin) return;
    if (
      window.confirm(
        `Confirm "${destinationName}" as the group's official destination? This will advance the trip to date/itinerary planning.`
      )
    ) {
      await updateGroup(group.id, {
        confirmedDestination: destinationName,
        status: group.confirmedDates ? 'planning_itinerary' : 'finding_dates',
      });
      onUpdateGroup({
        confirmedDestination: destinationName,
        status: group.confirmedDates ? 'planning_itinerary' : 'finding_dates',
      });
    }
  };

  return (
    <div className="space-y-8">
      {/* Tab Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-slate-800">Destination Polls</h2>
            {group.confirmedDestination && (
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                <CheckCircle className="w-3.5 h-3.5 text-teal-600" />
                <span>Confirmed: {group.confirmedDestination}</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Compare options with photos, budgets, and travel links. Vote and discuss as a group!
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-100 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create Destination Poll</span>
        </button>
      </div>

      {/* Polls Listing */}
      {polls.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
            <Vote className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">No Destination Polls Yet</h3>
          <p className="text-xs text-slate-500 mt-1 mb-6 max-w-md mx-auto">
            Create a poll with 2 or more destination ideas so everyone in the group can vote on their favorite place to visit.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 transition"
          >
            Create First Poll
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {polls.map((poll) => (
            <SinglePollCard
              key={poll.id}
              poll={poll}
              group={group}
              members={members}
              currentUser={currentUser}
              isAdmin={isAdmin}
              onConfirmDestination={handleConfirmDestination}
              onOpenLightbox={onOpenLightbox}
            />
          ))}
        </div>
      )}

      {/* Create Poll Modal */}
      {showCreateModal && (
        <CreatePollModal
          groupId={group.id}
          currentUser={currentUser}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
};

// ==========================================
// SINGLE POLL COMPONENT WITH REALTIME VOTES
// ==========================================
interface SinglePollCardProps {
  poll: DestinationPoll;
  group: TripGroup;
  members: GroupMember[];
  currentUser: UserProfile;
  isAdmin: boolean;
  onConfirmDestination: (dest: string) => void;
  onOpenLightbox: (url: string) => void;
}

const SinglePollCard: React.FC<SinglePollCardProps> = ({
  poll,
  group,
  members,
  currentUser,
  isAdmin,
  onConfirmDestination,
  onOpenLightbox,
}) => {
  const [votes, setVotes] = useState<Record<string, PollVote>>({});
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    const unsubVotes = subscribeToPollVotes(group.id, poll.id, (loaded) => {
      setVotes(loaded);
    });
    const unsubComments = subscribeToPollComments(group.id, poll.id, (loaded) => {
      setComments(loaded);
    });
    return () => {
      unsubVotes();
      unsubComments();
    };
  }, [group.id, poll.id]);

  const totalMembers = members.length;
  const votersCount = Object.keys(votes).length;
  const participationPct = totalMembers > 0 ? Math.round((votersCount / totalMembers) * 100) : 0;

  // Calculate vote counts per option
  const optionVotes: Record<string, string[]> = {};
  poll.options.forEach((opt) => {
    optionVotes[opt.id] = [];
  });

  Object.values(votes).forEach((v) => {
    v.selectedOptionIds.forEach((optId) => {
      if (optionVotes[optId]) {
        optionVotes[optId].push(v.userId);
      }
    });
  });

  // Find max votes & ties
  let maxVotes = 0;
  poll.options.forEach((opt) => {
    const count = optionVotes[opt.id]?.length || 0;
    if (count > maxVotes) maxVotes = count;
  });

  const leadingOptions = poll.options.filter(
    (opt) => (optionVotes[opt.id]?.length || 0) === maxVotes && maxVotes > 0
  );
  const isTie = leadingOptions.length > 1;

  // Current user's votes
  const userVote = votes[currentUser.id];
  const userSelected = userVote?.selectedOptionIds || [];

  const handleVoteClick = async (optionId: string) => {
    if (poll.isClosed) return;

    let newSelected: string[] = [];
    if (poll.votingMode === 'single') {
      newSelected = userSelected.includes(optionId) ? [] : [optionId];
    } else {
      newSelected = userSelected.includes(optionId)
        ? userSelected.filter((id) => id !== optionId)
        : [...userSelected, optionId];
    }

    await castPollVote(group.id, poll.id, currentUser.id, newSelected);
  };

  const handleClosePoll = async () => {
    if (window.confirm('Close this poll to end voting?')) {
      await closePoll(group.id, poll.id);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setSubmittingComment(true);
    try {
      await addPollComment(group.id, poll.id, currentUser, newComment.trim());
      setNewComment('');
    } finally {
      setSubmittingComment(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
      {/* Poll Header */}
      <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-bold text-slate-800 tracking-tight">{poll.title}</h3>
            {poll.isClosed ? (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200 flex items-center space-x-1">
                <Lock className="w-3 h-3" />
                <span>Poll Closed</span>
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Open for Voting</span>
              </span>
            )}
            <span className="text-xs text-slate-400 font-medium">
              ({poll.votingMode === 'single' ? 'Single Choice' : 'Multiple Choices'})
            </span>
          </div>

          <p className="text-xs text-slate-500 mt-1">{poll.description}</p>
        </div>

        {/* Voting Progress / Actions */}
        <div className="flex items-center space-x-3 shrink-0">
          <div className="text-right">
            <div className="text-xs font-bold text-slate-800">
              {votersCount} / {totalMembers} voted ({participationPct}%)
            </div>
            <div className="w-28 h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
              <div
                className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                style={{ width: `${participationPct}%` }}
              />
            </div>
          </div>

          {(isAdmin || poll.createdBy === currentUser.id) && !poll.isClosed && (
            <button
              onClick={handleClosePoll}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 rounded-xl transition"
            >
              Close Poll
            </button>
          )}
        </div>
      </div>

      {/* Tie or Winner Notice */}
      {votersCount > 0 && (
        <div className="px-6 py-2.5 bg-slate-50/80 border-b border-slate-100 flex flex-wrap items-center justify-between text-xs">
          {isTie ? (
            <div className="flex items-center space-x-2 text-amber-700">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong className="font-semibold">Current Tie:</strong>{' '}
                {leadingOptions.map((o) => o.name).join(' & ')} each have {maxVotes} vote(s).
              </span>
            </div>
          ) : leadingOptions.length === 1 ? (
            <div className="flex items-center space-x-2 text-indigo-700">
              <Award className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>
                <strong className="font-semibold">Leading Destination:</strong> {leadingOptions[0].name} with{' '}
                {maxVotes} vote(s).
              </span>
            </div>
          ) : null}

          {votersCount > 0 && (
            <span className="text-[11px] text-slate-400">
              Options locked to preserve voting integrity
            </span>
          )}
        </div>
      )}

      {/* Options Cards Grid */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {poll.options.map((option) => {
          const optVoters = optionVotes[option.id] || [];
          const count = optVoters.length;
          const isSelectedByMe = userSelected.includes(option.id);
          const isLeader = leadingOptions.some((o) => o.id === option.id) && count > 0;
          const isConfirmedHere = group.confirmedDestination === option.name;

          return (
            <div
              key={option.id}
              className={`rounded-2xl border transition-all flex flex-col justify-between overflow-hidden relative ${
                isSelectedByMe
                  ? 'border-indigo-500 bg-indigo-50/20 shadow-md ring-2 ring-indigo-500/20'
                  : 'border-slate-200 bg-white hover:border-slate-300 shadow-xs'
              }`}
            >
              {/* Option Image Gallery */}
              {option.imageUrls && option.imageUrls.length > 0 ? (
                <div className="relative h-44 overflow-hidden bg-slate-100">
                  <img
                    src={option.imageUrls[0]}
                    alt={option.name}
                    className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
                    onClick={() => onOpenLightbox(option.imageUrls[0])}
                  />
                  {option.imageUrls.length > 1 && (
                    <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md backdrop-blur-xs flex items-center space-x-1">
                      <ImageIcon className="w-3 h-3" />
                      <span>+{option.imageUrls.length - 1} photos</span>
                    </div>
                  )}
                  {isLeader && (
                    <div className="absolute top-2 left-2 bg-indigo-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-xs flex items-center space-x-1">
                      <Award className="w-3 h-3" />
                      <span>Leading</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-20 bg-slate-100 flex items-center justify-center text-slate-400">
                  <ImageIcon className="w-6 h-6" />
                </div>
              )}

              {/* Card Details */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-base font-bold text-slate-800 leading-snug">{option.name}</h4>
                    {option.budget && (
                      <span className="shrink-0 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-600">
                        {option.budget}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 mt-2 line-clamp-3 leading-relaxed">
                    {option.description}
                  </p>

                  {/* Hyperlinks */}
                  {option.links && option.links.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {option.links.map((link, idx) => {
                        if (!isValidHttpUrl(link.url)) return null;
                        return (
                          <a
                            key={idx}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-50 text-indigo-600 hover:bg-indigo-50 border border-slate-200 transition"
                          >
                            <span>{link.label || 'Visit Link'}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        );
                      })}
                    </div>
                  )}

                  {option.notes && (
                    <p className="text-[11px] text-slate-400 mt-2 italic">Note: {option.notes}</p>
                  )}
                </div>

                {/* Vote Action & Voter Chips */}
                <div className="mt-4 pt-3 border-t border-slate-100 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">
                      {count} {count === 1 ? 'vote' : 'votes'}
                    </span>
                    <button
                      onClick={() => handleVoteClick(option.id)}
                      disabled={poll.isClosed}
                      className={`px-3 py-1.5 rounded-xl font-semibold text-xs flex items-center space-x-1.5 transition ${
                        isSelectedByMe
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      } disabled:opacity-50`}
                    >
                      {isSelectedByMe ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Voted</span>
                        </>
                      ) : (
                        <span>Vote</span>
                      )}
                    </button>
                  </div>

                  {/* Voter Avatars */}
                  {optVoters.length > 0 && (
                    <div className="flex items-center space-x-1.5 overflow-x-auto py-1">
                      {optVoters.map((uid) => {
                        const m = members.find((x) => x.userId === uid);
                        return (
                          <div
                            key={uid}
                            className="relative group/avatar"
                            title={m?.displayName || 'Member'}
                          >
                            <img
                              src={
                                m?.avatarUrl ||
                                `https://api.dicebear.com/7.x/bottts/svg?seed=${uid}`
                              }
                              alt={m?.displayName}
                              className="w-6 h-6 rounded-full object-cover ring-2 ring-white"
                            />
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover/avatar:block bg-slate-800 text-white text-[10px] px-2 py-0.5 rounded-md whitespace-nowrap z-20 pointer-events-none">
                              {m?.displayName}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Admin Confirmation Action */}
                  {isAdmin && (
                    <div className="pt-2">
                      {isConfirmedHere ? (
                        <div className="w-full py-1.5 bg-teal-50 text-teal-700 border border-teal-200 text-center rounded-xl text-xs font-semibold flex items-center justify-center space-x-1">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Confirmed Destination</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => onConfirmDestination(option.name)}
                          className="w-full py-1.5 bg-slate-50 hover:bg-teal-50 text-slate-600 hover:text-teal-700 border border-slate-200 hover:border-teal-200 rounded-xl text-xs font-medium transition"
                        >
                          Confirm as Final Destination
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Discussion & Comments Thread */}
      <div className="bg-slate-50/50 p-6 border-t border-slate-100">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center space-x-1.5">
          <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
          <span>Discussion & Member Comments ({comments.length})</span>
        </h4>

        {comments.length > 0 && (
          <div className="space-y-3 mb-4 max-h-56 overflow-y-auto pr-2">
            {comments.map((cmt) => (
              <div
                key={cmt.id}
                className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs flex items-start space-x-3 text-xs"
              >
                <img
                  src={
                    cmt.avatarUrl ||
                    `https://api.dicebear.com/7.x/bottts/svg?seed=${cmt.userId}`
                  }
                  alt={cmt.displayName}
                  className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">{cmt.displayName}</span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(cmt.createdAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-slate-600 mt-0.5 leading-relaxed">{cmt.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Comment Input */}
        <form onSubmit={handleCommentSubmit} className="flex items-center space-x-2">
          <input
            type="text"
            placeholder="Add your thoughts or reasons for your vote..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="flex-1 px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={submittingComment || !newComment.trim()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 disabled:opacity-50"
          >
            {submittingComment ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <>
                <span>Post</span>
                <Send className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

// ==========================================
// CREATE POLL MODAL WITH RICH DESTINATIONS
// ==========================================
interface CreatePollModalProps {
  groupId: string;
  currentUser: UserProfile;
  onClose: () => void;
}

const CreatePollModal: React.FC<CreatePollModalProps> = ({
  groupId,
  currentUser,
  onClose,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [votingMode, setVotingMode] = useState<VotingMode>('single');
  const [options, setOptions] = useState<
    Array<{
      name: string;
      description: string;
      imageUrl: string;
      linkUrl: string;
      linkLabel: string;
      budget: string;
      notes: string;
    }>
  >([
    {
      name: '',
      description: '',
      imageUrl: '',
      linkUrl: '',
      linkLabel: 'Travel Guide',
      budget: '$$',
      notes: '',
    },
    {
      name: '',
      description: '',
      imageUrl: '',
      linkUrl: '',
      linkLabel: 'Maps & Info',
      budget: '$$',
      notes: '',
    },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addOptionField = () => {
    setOptions([
      ...options,
      {
        name: '',
        description: '',
        imageUrl: '',
        linkUrl: '',
        linkLabel: 'Explore More',
        budget: '$$',
        notes: '',
      },
    ]);
  };

  const removeOptionField = (idx: number) => {
    if (options.length <= 2) {
      setError('A poll must have at least 2 destination options.');
      return;
    }
    setOptions(options.filter((_, i) => i !== idx));
  };

  const handleOptionChange = (idx: number, field: string, value: string) => {
    setOptions(
      options.map((opt, i) => (i === idx ? { ...opt, [field]: value } : opt))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    for (let i = 0; i < options.length; i++) {
      if (!options[i].name.trim()) {
        setError(`Please provide a destination name for Option ${i + 1}.`);
        return;
      }
    }

    setSubmitting(true);
    setError(null);

    try {
      const formattedOptions: PollOption[] = options.map((opt, idx) => ({
        id: 'opt_' + Math.random().toString(36).substring(2, 9),
        name: opt.name.trim(),
        description: opt.description.trim(),
        imageUrls: opt.imageUrl.trim() ? [opt.imageUrl.trim()] : [],
        links:
          opt.linkUrl.trim() && isValidHttpUrl(opt.linkUrl.trim())
            ? [{ label: opt.linkLabel.trim() || 'Guide', url: opt.linkUrl.trim() }]
            : [],
        budget: opt.budget.trim(),
        notes: opt.notes.trim(),
      }));

      await createPoll(groupId, {
        groupId,
        title: title.trim(),
        description: description.trim(),
        createdBy: currentUser.id,
        creatorName: currentUser.displayName,
        votingMode,
        options: formattedOptions,
      });

      onClose();
    } catch (err: any) {
      setError(err?.message || 'Could not create poll');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-bold text-slate-800">Create Destination Poll</h3>
        <p className="text-xs text-slate-500 mb-6">
          Gather destination ideas, attach photos and guides, and find out where everyone wants to go.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Poll Title / Question <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Where should we spend our summer week?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Description / Context
              </label>
              <input
                type="text"
                placeholder="e.g. Looking for coastal towns with great food"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Voting Rules
              </label>
              <select
                value={votingMode}
                onChange={(e) => setVotingMode(e.target.value as VotingMode)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="single">Single Choice (1 vote per person)</option>
                <option value="multiple">Multiple Choice (Vote for any options)</option>
              </select>
            </div>
          </div>

          {/* Options Section */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Destination Options (At least 2 required)
              </label>
              <button
                type="button"
                onClick={addOptionField}
                className="flex items-center space-x-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Destination</span>
              </button>
            </div>

            {options.map((opt, idx) => (
              <div
                key={idx}
                className="p-4 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-3 relative"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">
                    Option {idx + 1}
                  </span>
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOptionField(idx)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <input
                      type="text"
                      placeholder="Destination Name (e.g. Barcelona, Spain) *"
                      value={opt.name}
                      onChange={(e) => handleOptionChange(idx, 'name', e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Estimated Budget (e.g. $$, ~$150/day)"
                      value={opt.budget}
                      onChange={(e) => handleOptionChange(idx, 'budget', e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <textarea
                    rows={2}
                    placeholder="Description & reasons to visit..."
                    value={opt.description}
                    onChange={(e) => handleOptionChange(idx, 'description', e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="url"
                    placeholder="Photo URL (https://...)"
                    value={opt.imageUrl}
                    onChange={(e) => handleOptionChange(idx, 'imageUrl', e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    type="url"
                    placeholder="Hyperlink URL (https://...)"
                    value={opt.linkUrl}
                    onChange={(e) => handleOptionChange(idx, 'linkUrl', e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    type="text"
                    placeholder="Link Label (e.g. View on Maps)"
                    value={opt.linkLabel}
                    onChange={(e) => handleOptionChange(idx, 'linkLabel', e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            ))}
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
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-100 flex items-center space-x-1.5 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Creating Poll...</span>
                </>
              ) : (
                <span>Publish Poll</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
