import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { generateUpiQrString } from '../utils/paymentUtils.js';
import { useToast } from '../context/ToastContext.jsx';

/**
 * SettleUpModal Component
 * Facilitates peer-to-peer UPI payment settlements via a visual QR code scanner pattern.
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
  const { addToast } = useToast();

  const upiQrString = generateUpiQrString({
    payeeVpa: receiverUpiId,
    payeeName: receiverName,
    amount: debtAmount,
  });

  const handleCopyUpi = () => {
    if (!receiverUpiId) return;
    navigator.clipboard.writeText(receiverUpiId);
    setCopied(true);
    addToast('UPI ID copied! Paste it directly into your preferred payment app.', 'success');
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
            <div className="mb-6 text-center">
              <h2 className="text-2xl font-extrabold tracking-tighter text-white">Scan to Pay</h2>
              <p className="text-xs font-medium text-slate-500 mt-1">
                Scan using Google Pay, PhonePe, BHIM, or any UPI app
              </p>
            </div>

            {/* Interactive UPI Area */}
            <div className="flex flex-col items-center mb-6">
              {!receiverUpiId ? (
                <div className="text-center text-xs font-bold text-rose-500 bg-rose-500/10 p-4 rounded-2xl w-full border border-rose-500/20">
                  This user has not set up a UPI ID yet. Ask them to add it under their Profile.
                </div>
              ) : (
                <>
                  {/* The Visual QR Code */}
                  <div className="bg-white p-5 rounded-3xl shadow-2xl flex items-center justify-center mb-6 border border-white/20">
                    <QRCodeSVG value={upiQrString} size={200} />
                  </div>

                  {/* Payment Context Metadata & Fallback Actions */}
                  <div className="w-full bg-[#0D0F12] border border-slate-800 rounded-2xl p-5 space-y-4">
                    {/* Payee Name & Amount */}
                    <div className="flex justify-between items-center border-b border-white/5 pb-3">
                      <div className="min-w-0">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-0.5">Payee</span>
                        <span className="text-white font-bold text-sm truncate block">{receiverName}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-0.5">Amount</span>
                        <span className="text-emerald-400 font-extrabold text-xl">₹{Number(debtAmount || 0).toFixed(2)}</span>
                      </div>
                    </div>

                    {/* UPI ID & Copy button next to it */}
                    <div className="flex items-center justify-between gap-4 pt-1">
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-0.5">UPI ID (VPA)</span>
                        <span className="text-slate-300 font-bold text-xs block truncate">{receiverUpiId}</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyUpi}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all font-bold text-xs shrink-0 active:scale-95"
                        title="Copy UPI ID"
                      >
                        {copied ? (
                          <>
                            <Check size={14} className="text-emerald-500" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy size={14} />
                            <span>Copy UPI ID</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </>
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
