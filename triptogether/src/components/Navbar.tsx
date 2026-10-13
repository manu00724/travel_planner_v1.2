import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { DEMO_USERS } from '../utils/mockData';
import { Plane, Users, UserCheck, Sparkles, ChevronDown, Check, LogOut, Edit2 } from 'lucide-react';
import { UserProfile } from '../types';

interface NavbarProps {
  activeGroupName?: string;
  onBackToDashboard?: () => void;
  onSeedDemo?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeGroupName,
  onBackToDashboard,
  onSeedDemo,
}) => {
  const { currentUser, switchPersona, updateProfile } = useAuth();
  const [showPersonaMenu, setShowPersonaMenu] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [editName, setEditName] = useState(currentUser?.displayName || '');
  const [editAvatar, setEditAvatar] = useState(currentUser?.avatarUrl || '');

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (editName.trim()) {
      updateProfile(editName.trim(), editAvatar.trim());
      setShowProfileEdit(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Breadcrumbs */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onBackToDashboard}
            className="flex items-center space-x-2 text-indigo-600 hover:text-indigo-700 transition font-bold text-xl group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-indigo-100 group-hover:scale-105 transition-transform">
              <Plane className="w-5 h-5 -rotate-45" />
            </div>
            <span className="bg-gradient-to-r from-indigo-700 via-indigo-800 to-teal-600 bg-clip-text text-transparent">
              TripTogether
            </span>
          </button>

          {activeGroupName && (
            <div className="hidden sm:flex items-center space-x-2 text-sm text-slate-500">
              <span>/</span>
              <span className="font-semibold text-slate-800 truncate max-w-xs">
                {activeGroupName}
              </span>
            </div>
          )}
        </div>

        {/* Right Actions & Persona Switcher */}
        <div className="flex items-center space-x-3">
          {onSeedDemo && (
            <button
              onClick={onSeedDemo}
              className="hidden md:inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition shadow-xs"
              title="Preload a complete Amalfi Coast demo trip with members, polls, and itinerary"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Seed Demo Trip</span>
            </button>
          )}

          {/* Persona Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowPersonaMenu(!showPersonaMenu)}
              className="flex items-center space-x-2 p-1.5 sm:px-3 sm:py-1.5 rounded-full sm:rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 transition"
              aria-label="Switch User Persona"
            >
              <img
                src={currentUser?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}
                alt={currentUser?.displayName}
                className="w-7 h-7 rounded-full object-cover ring-2 ring-indigo-500/20"
              />
              <span className="hidden sm:inline-block text-xs font-semibold text-slate-700 max-w-[120px] truncate">
                {currentUser?.displayName}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
            </button>

            {showPersonaMenu && (
              <div
                className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2"
                onClick={() => setShowPersonaMenu(false)}
              >
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Switch Testing Persona
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Test collaborative voting and availability as different members!
                  </p>
                </div>

                <div className="py-1">
                  {DEMO_USERS.map((user) => {
                    const isSelected = currentUser?.id === user.id;
                    return (
                      <button
                        key={user.id}
                        onClick={() => switchPersona(user)}
                        className={`w-full flex items-center justify-between px-4 py-2 text-left text-sm hover:bg-slate-50 transition ${
                          isSelected ? 'bg-indigo-50/70 text-indigo-700 font-medium' : 'text-slate-700'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <img
                            src={user.avatarUrl}
                            alt={user.displayName}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                          <div>
                            <div className="text-xs font-semibold">{user.displayName}</div>
                            <div className="text-[10px] text-slate-400">{user.email}</div>
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-indigo-600" />}
                      </button>
                    );
                  })}
                </div>

                <div className="border-t border-slate-100 pt-1">
                  <button
                    onClick={() => {
                      setEditName(currentUser?.displayName || '');
                      setEditAvatar(currentUser?.avatarUrl || '');
                      setShowProfileEdit(true);
                    }}
                    className="w-full flex items-center space-x-2 px-4 py-2 text-xs text-slate-600 hover:bg-slate-50 transition"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Profile Details</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Profile Edit Modal */}
      {showProfileEdit && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Edit Profile</h3>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Avatar Image URL
                </label>
                <input
                  type="url"
                  value={editAvatar}
                  onChange={(e) => setEditAvatar(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowProfileEdit(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};
