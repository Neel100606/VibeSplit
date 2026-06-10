import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  TrendingUp, 
  Activity, 
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Number(value || 0));

const roundToTwo = (value) => Number(Number(value || 0).toFixed(2));

const MetricCard = ({ title, amount, icon: Icon, color }) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className="relative overflow-hidden rounded-[2.5rem] bg-[#0A0A0A] p-8 ring-1 ring-white/10"
  >
    <div className={`absolute -right-4 -top-4 h-32 w-32 rounded-full opacity-10 blur-3xl bg-${color}-500`} />
    <div className="flex items-center justify-between">
      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-${color}-500/10 text-${color}-500`}>
        <Icon size={24} />
      </div>
    </div>
    <div className="mt-8">
      <p className="text-sm font-medium text-slate-500 uppercase tracking-widest">{title}</p>
      <h3 className="mt-2 text-4xl font-extrabold tracking-tighter font-outfit">
        {formatCurrency(amount)}
      </h3>
    </div>
  </motion.div>
);


export default function Dashboard() {
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [groupSummaries, setGroupSummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token || !user?._id) {
      setLoading(false);
      return;
    }

    const loadDashboard = async () => {
      try {
        setLoading(true);

        const groupsResponse = await fetch(`${API_BASE_URL}/groups`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const groupsData = await groupsResponse.json();

        if (!groupsResponse.ok) {
          throw new Error(groupsData.error || 'Unable to fetch groups.');
        }

        const groups = groupsData.groups || [];

        const summaries = await Promise.all(
          groups.map(async (group) => {
            const settlementsResponse = await fetch(`${API_BASE_URL}/groups/${group._id}/settlements`, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });

            const settlementsData = await settlementsResponse.json();

            if (!settlementsResponse.ok) {
              throw new Error(settlementsData.error || `Unable to fetch settlements for ${group.name}.`);
            }

            const memberMap = (group.members || []).reduce((accumulator, member) => {
              accumulator[member._id] = member;
              return accumulator;
            }, {});

            const youOwe = [];
            const youAreOwed = [];

            for (const settlement of settlementsData.transactions || []) {
              const amount = roundToTwo(settlement.amount);

              if (settlement.from === user._id) {
                youOwe.push({
                  userId: settlement.to,
                  name: memberMap[settlement.to]?.name || 'Unknown',
                  amount,
                });
              }

              if (settlement.to === user._id) {
                youAreOwed.push({
                  userId: settlement.from,
                  name: memberMap[settlement.from]?.name || 'Unknown',
                  amount,
                });
              }
            }

            return {
              group,
              youOwe,
              youAreOwed,
            };
          }),
        );

        setGroupSummaries(summaries);
        setError('');
      } catch (requestError) {
       // Silently handle error for now to show mockup UI even if API fails
       console.error("Dashboard error:", requestError);
        setError(requestError.message || 'Unable to load dashboard.');
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [token, user?._id]);

  const totals = useMemo(() => {
    return groupSummaries.reduce(
      (accumulator, summary) => {
        for (const debt of summary.youOwe) {
          accumulator.totalOwe += Number(debt.amount) || 0;
        }

        for (const debt of summary.youAreOwed) {
          accumulator.totalOwed += Number(debt.amount) || 0;
        }

        return accumulator;
      },
      { totalOwe: 0, totalOwed: 0 },
    );
  }, [groupSummaries]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <p className="text-sm font-medium text-slate-500">Curating your finances...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20">
      {/* Hero Header */}
      <section className="relative overflow-hidden rounded-[3rem] bg-gradient-to-br from-emerald-500/20 via-transparent to-transparent p-10 ring-1 ring-white/10 lg:p-14">
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span className="inline-block rounded-full bg-emerald-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-emerald-500 ring-1 ring-emerald-500/20">
              Accounts Overview
            </span>
            <h1 className="mt-4 text-5xl font-extrabold tracking-tighter text-white font-outfit lg:text-6xl">
              Hello, <span className="text-emerald-500">{user?.name?.split(' ')[0] || 'User'}</span>
            </h1>
            <p className="mt-4 max-w-lg text-lg text-slate-400">
              You're currently <span className="text-emerald-500 font-bold">owed {formatCurrency(totals.totalOwed)}</span> across {groupSummaries.length} active groups.
            </p>
          </div>
          
        </div>
        {/* Background blobs for flair */}
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
      </section>

      {/* Metric Grid */}
      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <MetricCard 
          title="Owed to you" 
          amount={totals.totalOwed} 
          icon={ArrowDownLeft} 
          color="emerald" 
        />
        <MetricCard 
          title="You owe" 
          amount={totals.totalOwe} 
          icon={ArrowUpRight} 
          color="rose" 
        />
        <motion.div 
          whileHover={{ y: -5 }}
          className="rounded-[2.5rem] bg-gradient-to-br from-emerald-500 to-emerald-700 p-8 shadow-2xl shadow-emerald-500/20"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 text-white">
            <TrendingUp size={24} />
          </div>
          <div className="mt-8">
            <p className="text-sm font-medium text-emerald-100 uppercase tracking-widest">Net Balance</p>
            <h3 className="mt-2 text-4xl font-extrabold tracking-tighter text-white font-outfit">
              {formatCurrency(totals.totalOwed - totals.totalOwe)}
            </h3>
          </div>
        </motion.div>
      </section>

      <div>
        {/* Group Breakdown */}
        <section>
          <div className="mb-6 flex items-center justify-between px-2">
            <h2 className="text-2xl font-extrabold tracking-tight font-outfit">My Groups</h2>
            <Link to="/groups" className="text-sm font-bold text-emerald-500 hover:underline flex items-center gap-1">
              View All <ChevronRight size={16} />
            </Link>
          </div>
          
          <div className="grid gap-4">
            {groupSummaries.length === 0 ? (
              <div className="rounded-[2.5rem] border-2 border-dashed border-white/5 bg-white/2 p-20 text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-white/5 text-slate-500">
                  <Activity size={40} />
                </div>
                <h3 className="mt-6 text-xl font-bold font-outfit">No active groups</h3>
                <p className="mt-2 text-slate-500">Create a group to start tracking expenses.</p>
                <button 
                  onClick={() => navigate('/groups')}
                  className="mt-8 rounded-2xl bg-emerald-500 px-8 py-3 text-sm font-bold text-black transition-transform hover:scale-105"
                >
                  Create First Group
                </button>
              </div>
            ) : (
              groupSummaries.map(({ group, youOwe, youAreOwed }, idx) => {
                const totalBalance = youAreOwed.reduce((a, b) => a + b.amount, 0) - youOwe.reduce((a, b) => a + b.amount, 0);
                return (
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    key={group._id} 
                  >
                    <Link
                      to={`/groups/${group._id}`}
                      className="group flex flex-col sm:flex-row sm:items-center gap-6 rounded-[2rem] bg-[#0A0A0A] p-6 ring-1 ring-white/10 transition-all hover:bg-white/5 hover:ring-emerald-500/50"
                    >
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/5 text-slate-300 font-bold text-xl font-outfit group-hover:bg-emerald-500 group-hover:text-black transition-colors">
                        {group.name?.charAt(0)}
                      </div>
                      
                      <div className="flex-1 overflow-hidden">
                        <h3 className="text-lg font-bold group-hover:text-emerald-500 transition-colors">{group.name}</h3>
                        <p className="text-sm text-slate-500 truncate mt-0.5">{group.members?.length || 0} members • {group.description || 'No description'}</p>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className={`text-lg font-bold font-outfit ${totalBalance >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {totalBalance >= 0 ? '+' : ''}{formatCurrency(totalBalance)}
                          </p>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Balance</p>
                        </div>
                        <button className="rounded-xl bg-white/5 p-3 text-slate-400 group-hover:bg-emerald-500 group-hover:text-black transition-all">
                          <ChevronRight size={20} />
                        </button>
                      </div>
                    </Link>
                  </motion.div>
                );
              })
            )}
          </div>
        </section>


      </div>
    </div>
  );
}
