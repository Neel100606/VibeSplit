import React from 'react';
import { motion } from 'framer-motion';
import { CreditCard } from 'lucide-react';

export default function AuthLayout({ children, title, subtitle }) {
  return (
    <div className="flex min-h-screen bg-[#050505] selection:bg-emerald-500/30">
      {/* Left Side: Creative/Illustration bit */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden bg-gradient-to-br from-emerald-500 to-emerald-700 p-12 flex-col justify-between">
         <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md shadow-xl">
            <CreditCard className="text-white" size={24} />
          </div>
          <span className="text-2xl font-black tracking-tighter text-white font-outfit">VibeSplit</span>
        </div>

        <div className="relative z-10">
          <h2 className="text-6xl font-black tracking-tighter text-white font-outfit leading-[0.9]">
            Manage money <br /> with your <br /> <span className="text-white/40 italic">Vibe.</span>
          </h2>
          <p className="mt-8 text-xl font-medium text-emerald-100/80 max-w-md">
            The elite way to track expenses, settle debts, and keep your group finances in pure harmony.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-6">
          <div className="flex -space-x-4">
             {[1,2,3,4].map(i => (
               <img key={i} src={`https://api.dicebear.com/7.x/avataaars/svg?seed=user${i}`} className="h-10 w-10 rounded-full border-2 border-emerald-500" />
             ))}
          </div>
          <span className="text-sm font-bold text-emerald-100 uppercase tracking-widest">Joined by 10k+ elite vibers</span>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/10 rounded-full translate-x-1/2 -translate-y-1/2 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-black/10 rounded-full -translate-x-1/2 translate-y-1/2 blur-2xl" />
      </div>

      {/* Right Side: Form */}
      <div className="flex-[0.8] flex items-center justify-center p-8 lg:p-20">
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-md"
        >
          <div className="mb-10 text-center lg:text-left">
             <div className="lg:hidden flex justify-center mb-8">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500 shadow-xl">
                  <CreditCard className="text-black" size={28} />
                </div>
             </div>
             <h1 className="text-4xl font-extrabold tracking-tighter text-white font-outfit">{title}</h1>
             <p className="mt-4 text-lg font-medium text-slate-500">{subtitle}</p>
          </div>

          {children}
        </motion.div>
      </div>
    </div>
  );
}
