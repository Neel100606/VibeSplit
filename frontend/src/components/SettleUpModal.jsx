import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, CopyCheck, Landmark } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { generateUpiLink, isMobileDevice } from '../utils/paymentUtils.js';

/**
 * SettleUpModal Component
 * Facilitates peer-to-peer UPI payment settlements.
 * Shows QR Code on Desktop and a deep-link anchor on Mobile.
 */
export default function SettleUpModal({
  isOpen,
  onClose,
  debtAmount,
  receiverName,
  receiverUpiId,
  onMarkAsSettled,
  isSubmitting = false,
}) {
  const [copied, setCopied] = useState(false);
  const isMobile = isMobileDevice();

  const upiLink = generateUpiLink({
    payeeVpa: receiverUpiId,
    payeeName: receiverName,
    amount: debtAmount,
  });

  const handleCopyUpi = () => {
    if (!receiverUpiId) return;
    navigator.clipboard.writeText(receiverUpiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
          {/* Backdrop overlay */}
          <div className="absolute inset-0 -z-10" onClick={onClose} />

          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-3xl shadow-2xl overflow-hidden relative p-8 font-outfit"
          >
            {/* Close Trigger */}
            <button
              onClick={onClose}
              className="absolute right-6 top-6 flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-slate-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            {/* Header */}
            <div className="mb-6">
              <h2 className="text-2xl font-extrabold tracking-tighter text-white">Settle Up</h2>
              <p className="text-sm font-medium text-slate-500 mt-1">
                Paying <span className="text-emerald-500 font-bold">{receiverName}</span>
              </p>
            </div>

            {/* Amount Summary */}
            <div className="flex flex-col items-center justify-center bg-[#0D0F12]/80 border border-slate-800 rounded-2xl py-6 mb-6">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Amount Owed</span>
              <div className="flex items-baseline text-4xl font-extrabold text-white">
                <span className="text-emerald-500 mr-1 text-2xl font-bold">$</span>
                <span>{Number(debtAmount || 0).toFixed(2)}</span>
              </div>
            </div>

            {/* Interactive UPI Area */}
            <div className="flex flex-col items-center gap-6 mb-6">
              {!receiverUpiId ? (
                <div className="text-center text-xs font-bold text-rose-500 bg-rose-500/10 p-4 rounded-2xl w-full border border-rose-500/20">
                  This user has not set up a UPI ID yet. Ask them to add it under their Profile.
                </div>
              ) : isMobile ? (
                /* Mobile Deeplink Intent */
                <a
                  href={upiLink}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 py-4 text-sm font-black uppercase tracking-widest text-black transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-emerald-500/20 cursor-pointer text-center"
                >
                  Pay via GPay / PhonePe
                </a>
              ) : (
                /* Desktop QR Code */
                <div className="flex flex-col items-center gap-4">
                  <div className="bg-white p-4 rounded-2xl shadow-xl flex items-center justify-center">
                    <QRCodeSVG value={upiLink} size={180} />
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Scan using Google Pay, PhonePe, or BHIM
                  </p>
                </div>
              )}

              {/* UPI VPA Fallback Copy Option */}
              {receiverUpiId && (
                <div className="w-full flex items-center justify-between rounded-xl bg-[#0D0F12] border border-slate-800 px-4 py-3 text-xs">
                  <div className="min-w-0 flex-1 mr-2">
                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-600 mb-0.5">UPI ID (VPA)</p>
                    <p className="text-slate-300 font-bold truncate">{receiverUpiId}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyUpi}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors shrink-0"
                    title="Copy UPI ID"
                  >
                    {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  </button>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="space-y-3 pt-4 border-t border-white/5">
              <button
                type="button"
                onClick={onMarkAsSettled}
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#13151A] hover:bg-[#1C1F26] border border-slate-800 text-slate-200 hover:text-white py-4 text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  'Mark as Settled'
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full text-center text-xs font-bold text-slate-500 hover:text-slate-400 py-1 transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
