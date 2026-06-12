import React from 'react';
import { motion } from 'framer-motion';
import { CreditCard } from 'lucide-react';

export default function AuthLayout({ children, title, subtitle }) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#050505] selection:bg-emerald-500/30 p-4 relative overflow-hidden">
      {/* Decorative background accent glows */}
      <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md mx-auto relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-[#0A0A0A]/60 border border-white/10 rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative backdrop-blur-md"
        >
          {/* Logo */}
          <div className="mb-8 flex flex-col items-center justify-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/20">
              <CreditCard className="text-white" size={24} />
            </div>
            <span className="text-2xl font-black tracking-tighter text-white font-outfit">VibeSplit</span>
          </div>

          <div className="mb-8 text-center">
             <h1 className="text-3xl font-extrabold tracking-tighter text-white font-outfit">{title}</h1>
             <p className="mt-3 text-sm font-medium text-slate-500 leading-relaxed">{subtitle}</p>
          </div>

          {children}
        </motion.div>
      </div>
    </div>
  );
}
