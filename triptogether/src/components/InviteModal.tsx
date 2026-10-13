import React, { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, Download, Share2, RefreshCw, AlertTriangle, ShieldCheck } from 'lucide-react';
import { TripGroup } from '../types';
import { regenerateInvitation, revokeInvitation } from '../services/db';

interface InviteModalProps {
  group: TripGroup;
  isAdmin: boolean;
  onClose: () => void;
  onUpdateGroup: (updates: Partial<TripGroup>) => void;
}

export const InviteModal: React.FC<InviteModalProps> = ({
  group,
  isAdmin,
  onClose,
  onUpdateGroup,
}) => {
  const [copied, setCopied] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  const origin = window.location.origin;
  const inviteUrl = `${origin}/#join=${group.inviteCode}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (_) {}
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join our trip: ${group.name}`,
          text: `We're planning a trip to ${group.confirmedDestination || 'an exciting destination'} together on TripTogether! Join our group here:`,
          url: inviteUrl,
        });
      } catch (_) {}
    }
  };

  const handleDownloadQr = () => {
    if (!qrRef.current) return;
    const svg = qrRef.current.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width + 40;
      canvas.height = img.height + 40;
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 20, 20);
        const pngFile = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.download = `${group.name.replace(/\s+/g, '_')}_QR.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
      }
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const handleRegenerate = async () => {
    if (!window.confirm('Regenerating will invalidate the existing invite link and QR code. Continue?')) {
      return;
    }
    setIsRegenerating(true);
    try {
      const newCode = await regenerateInvitation(group.id);
      onUpdateGroup({ inviteCode: newCode, inviteActive: true });
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleToggleActive = async () => {
    const next = !group.inviteActive;
    if (!next && !window.confirm('Revoking invitations will stop anyone with the link from joining. Continue?')) {
      return;
    }
    if (!next) {
      await revokeInvitation(group.id, group.inviteCode);
      onUpdateGroup({ inviteActive: false });
    } else {
      await regenerateInvitation(group.id);
      onUpdateGroup({ inviteActive: true });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3 shadow-xs">
            <Share2 className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Invite Friends & Family</h2>
          <p className="text-xs text-slate-500 mt-1">
            Anyone with this link or QR code can join <span className="font-semibold text-slate-700">{group.name}</span>.
          </p>
        </div>

        {/* QR Code Container */}
        <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-200 mb-5">
          <div ref={qrRef} className="p-3 bg-white rounded-xl shadow-xs border border-slate-100">
            <QRCodeSVG
              value={inviteUrl}
              size={180}
              level="H"
              includeMargin={false}
              imageSettings={{
                src: 'https://cdn-icons-png.flaticon.com/512/984/984233.png',
                x: undefined,
                y: undefined,
                height: 32,
                width: 32,
                excavate: true,
              }}
            />
          </div>
          <span className="text-[11px] font-medium text-slate-500 mt-3 flex items-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
            <span>Secure invite token • Protects private trip content</span>
          </span>
        </div>

        {/* Copy Link Input Bar */}
        <div className="mb-4">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              readOnly
              value={group.inviteActive ? inviteUrl : 'Invite link currently paused by admin'}
              className="flex-1 px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl text-slate-600 focus:outline-hidden"
            />
            <button
              onClick={handleCopy}
              disabled={!group.inviteActive}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition ${
                copied
                  ? 'bg-teal-600 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
              } disabled:opacity-50`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            onClick={handleDownloadQr}
            className="flex items-center justify-center space-x-2 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Download QR</span>
          </button>
          {'share' in navigator && (
            <button
              onClick={handleNativeShare}
              className="flex items-center justify-center space-x-2 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition"
            >
              <Share2 className="w-4 h-4 text-slate-500" />
              <span>Native Share</span>
            </button>
          )}
        </div>

        {/* Admin Invite Controls */}
        {isAdmin && (
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <button
              onClick={handleRegenerate}
              disabled={isRegenerating}
              className="flex items-center space-x-1.5 text-slate-600 hover:text-indigo-600 transition font-medium"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
              <span>Regenerate Link</span>
            </button>

            <button
              onClick={handleToggleActive}
              className={`font-semibold transition ${
                group.inviteActive ? 'text-rose-600 hover:text-rose-700' : 'text-teal-600 hover:text-teal-700'
              }`}
            >
              {group.inviteActive ? 'Revoke Invite' : 'Reactivate Invite'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
