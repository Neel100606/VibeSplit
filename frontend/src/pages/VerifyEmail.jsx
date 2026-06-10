import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, ChevronRight, CreditCard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export default function VerifyEmail() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const verifyToken = async () => {
      try {
        setStatus('loading');
        const response = await fetch(`${API_BASE_URL}/users/verify/${token}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Verification failed. The token may be invalid or expired.');
        }

        setStatus('success');
      } catch (error) {
        console.error('Email verification failed:', error);
        setStatus('error');
        setErrorMsg(error.message || 'Unable to verify email address.');
      }
    };

    if (token) {
      verifyToken();
    } else {
      setStatus('error');
      setErrorMsg('No verification token provided.');
    }
  }, [token]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#050505] text-white px-4">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.05)_0%,transparent_60%)] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-md overflow-hidden rounded-[2.5rem] bg-[#0A0A0A] p-8 ring-1 ring-white/10 shadow-2xl relative"
      >
        {/* Header Logo */}
        <div className="mb-8 flex flex-col items-center justify-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/20">
            <CreditCard className="text-white" size={24} />
          </div>
          <span className="text-2xl font-black tracking-tight text-white font-outfit">VibeSplit</span>
        </div>

        <AnimatePresence mode="wait">
          {status === 'loading' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center justify-center py-10 text-center space-y-4"
            >
              <div className="relative">
                <Loader2 className="h-16 w-16 text-emerald-500 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center text-emerald-500 font-bold text-xs">VS</div>
              </div>
              <h2 className="text-xl font-bold font-outfit text-white mt-4">Verifying Credentials</h2>
              <p className="text-sm font-medium text-slate-500">Checking verification token with secure ledger...</p>
            </motion.div>
          )}

          {status === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center justify-center py-6 text-center space-y-6"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 ring-4 ring-emerald-500/20"
              >
                <CheckCircle2 size={44} />
              </motion.div>
              <div>
                <h2 className="text-2xl font-black font-outfit text-white">Email Verified!</h2>
                <p className="text-sm font-medium text-slate-400 mt-2">Your email address has been successfully verified on the VibeSplit ledger.</p>
              </div>

              <button
                onClick={() => navigate('/dashboard')}
                className="group relative w-full overflow-hidden rounded-2xl bg-emerald-500 py-4 text-sm font-black uppercase tracking-widest text-black transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-emerald-500/10"
              >
                <div className="relative z-10 flex items-center justify-center gap-1">
                  Enter Dashboard
                  <ChevronRight size={18} className="transition-transform group-hover:translate-x-1" />
                </div>
              </button>
            </motion.div>
          )}

          {status === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center justify-center py-6 text-center space-y-6"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="flex h-20 w-20 items-center justify-center rounded-full bg-rose-500/10 text-rose-500 ring-4 ring-rose-500/20"
              >
                <XCircle size={44} />
              </motion.div>
              <div>
                <h2 className="text-2xl font-black font-outfit text-white">Verification Failed</h2>
                <p className="text-sm font-medium text-rose-400 mt-2">{errorMsg}</p>
                <p className="text-xs font-medium text-slate-500 mt-4 leading-relaxed">
                  The verification token may be invalid, expired, or already used. Please try signing up again or contact support.
                </p>
              </div>

              <div className="w-full space-y-3">
                <button
                  onClick={() => navigate('/signup')}
                  className="group relative w-full overflow-hidden rounded-2xl bg-white/5 py-4 text-sm font-black uppercase tracking-widest text-white transition-all ring-1 ring-white/10 hover:bg-white/10 active:scale-[0.98]"
                >
                  Create New Account
                </button>
                <Link
                  to="/login"
                  className="block text-xs font-bold text-slate-500 hover:text-white transition-colors"
                >
                  Already verified? Log In
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
