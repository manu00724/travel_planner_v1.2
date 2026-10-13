import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { createGroup } from '../services/db';
import { TripGroup } from '../types';
import { X, Sparkles, Image as ImageIcon, Loader2 } from 'lucide-react';
import { validateImageFile, fileToDataUrl, isValidHttpUrl } from '../utils/validation';

const COVER_PRESETS = [
  {
    name: 'Amalfi Coast',
    url: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'Kyoto Temples',
    url: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'Swiss Alps',
    url: 'https://images.unsplash.com/photo-1502784444187-359ac186c5bb?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'Paris Streets',
    url: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'Tropical Bali',
    url: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'New York Skyline',
    url: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=1200&q=80',
  },
];

interface CreateTripModalProps {
  onCreated: (group: TripGroup) => void;
  onClose: () => void;
}

export const CreateTripModal: React.FC<CreateTripModalProps> = ({ onCreated, onClose }) => {
  const { currentUser } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCover, setSelectedCover] = useState(COVER_PRESETS[0].url);
  const [customCoverUrl, setCustomCoverUrl] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const check = validateImageFile(file);
    if (!check.valid) {
      setError(check.error || 'Invalid file');
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(file);
      setSelectedCover(dataUrl);
      setCustomCoverUrl('');
      setError(null);
    } catch (_) {
      setError('Failed to read file.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !currentUser) return;
    setError(null);
    setCreating(true);

    try {
      const finalCover = customCoverUrl.trim() && isValidHttpUrl(customCoverUrl.trim())
        ? customCoverUrl.trim()
        : selectedCover;

      const group = await createGroup(
        {
          name: name.trim(),
          description: description.trim(),
          coverImageUrl: finalCover,
        },
        currentUser
      );

      onCreated(group);
    } catch (err: any) {
      setError(err?.message || 'Could not create trip');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-bold text-slate-800 mb-1">Create New Trip</h2>
        <p className="text-xs text-slate-500 mb-6">
          Start a collaborative planning space for your family or friend group.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Trip Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Summer in Spain, Ski Trip 2026"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Description / Notes
            </label>
            <textarea
              rows={3}
              placeholder="What kind of trip is this? (e.g. relaxing beach days, budget-friendly city hopping)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Choose Cover Image
            </label>
            {/* Presets Grid */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              {COVER_PRESETS.map((preset) => {
                const isSelected = selectedCover === preset.url && !customCoverUrl;
                return (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => {
                      setSelectedCover(preset.url);
                      setCustomCoverUrl('');
                    }}
                    className={`relative rounded-xl overflow-hidden aspect-video border-2 transition group ${
                      isSelected ? 'border-indigo-600 shadow-md ring-2 ring-indigo-500/20' : 'border-transparent hover:opacity-90'
                    }`}
                  >
                    <img
                      src={preset.url}
                      alt={preset.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-1.5">
                      <span className="text-[10px] font-medium text-white truncate">
                        {preset.name}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Custom URL or Upload */}
            <div className="space-y-2">
              <input
                type="url"
                placeholder="Or paste custom image URL (https://...)"
                value={customCoverUrl}
                onChange={(e) => {
                  setCustomCoverUrl(e.target.value);
                  if (e.target.value) setSelectedCover(e.target.value);
                }}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
              <div className="flex items-center space-x-2 text-xs text-slate-500">
                <span>or upload file:</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileUpload}
                  className="text-xs file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating || !name.trim()}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs shadow-md shadow-indigo-100 transition flex items-center space-x-1.5 disabled:opacity-50"
            >
              {creating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Creating Trip...</span>
                </>
              ) : (
                <span>Create Trip</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
