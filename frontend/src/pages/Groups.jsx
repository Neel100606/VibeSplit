import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  Plus, 
  ChevronRight, 
  ArrowRight,
  Info,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext.jsx';
import { API_URL as API_BASE_URL } from '../config.js';

export default function Groups() {
  const { token, user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    members: [],
  });

  const fetchFriends = async () => {
    const response = await fetch(`${API_BASE_URL}/users/friends`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Unable to fetch friends.');
    setFriends(data.friends || []);
  };

  const fetchGroups = async () => {
    const response = await fetch(`${API_BASE_URL}/groups`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Unable to fetch groups.');
    setGroups(data.groups || []);
  };

  useEffect(() => {
    if (!token) {
      setGroups([]);
      setFriends([]);
      setLoading(false);
      return;
    }
    const loadPageData = async () => {
      try {
        setLoading(true);
        await Promise.all([fetchGroups(), fetchFriends()]);
        setError('');
      } catch (requestError) {
        setError(requestError.message || 'Unable to load groups.');
      } finally {
        setLoading(false);
      }
    };
    loadPageData();
  }, [token]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleMemberToggle = (friendId) => {
    setFormData((current) => {
      const exists = current.members.includes(friendId);
      return {
        ...current,
        members: exists
          ? current.members.filter((memberId) => memberId !== friendId)
          : [...current.members, friendId],
      };
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!formData.name.trim()) {
      setError('Group name is required.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const response = await fetch(`${API_BASE_URL}/groups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim(),
          members: formData.members,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to create group.');

      setFormData({ name: '', description: '', members: [] });
      setIsCreateOpen(false);
      await fetchGroups();
    } catch (requestError) {
      setError(requestError.message || 'Unable to create group.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-10 pb-20">
      {/* Header Bar */}
      <section className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between px-2">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tighter text-white font-outfit">My Groups</h1>
          <p className="mt-2 text-slate-500 font-medium">Manage your shared spaces and expenses.</p>
        </div>
        <button 
          onClick={() => setIsCreateOpen(!isCreateOpen)}
          className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-8 py-4 text-sm font-black text-black transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-emerald-500/20"
        >
          {isCreateOpen ? <ChevronRight className="rotate-90 transition-transform" /> : <Plus size={20} />}
          <span>{isCreateOpen ? 'Cancel' : 'Create New Group'}</span>
        </button>
      </section>

      {/* Create Group Form - Expandable */}
      <AnimatePresence>
        {isCreateOpen && (
          <motion.section 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden rounded-[2.5rem] bg-[#0A0A0A] ring-1 ring-white/10"
          >
            <div className="p-8 lg:p-12">
              <h2 className="text-2xl font-bold font-outfit mb-8">Group Details</h2>
              <form className="space-y-10" onSubmit={handleSubmit}>
                <div className="grid gap-8 lg:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-600 ml-1">Group Name</label>
                    <input
                      name="name"
                      type="text"
                      required
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="e.g. Europe Trip 2024"
                      className="w-full rounded-2xl bg-[#111111] py-4 px-6 text-white outline-none ring-1 ring-white/10 focus:ring-emerald-500/50 transition-all font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-600 ml-1">Description</label>
                    <input
                      name="description"
                      type="text"
                      value={formData.description}
                      onChange={handleInputChange}
                      placeholder="What's this group for?"
                      className="w-full rounded-2xl bg-[#111111] py-4 px-6 text-white outline-none ring-1 ring-white/10 focus:ring-emerald-500/50 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-600">Select Friends</label>
                    <span className="text-[10px] font-bold text-emerald-500/60 uppercase">You're already in!</span>
                  </div>

                  {friends.length === 0 ? (
                    <div className="rounded-3xl border-2 border-dashed border-white/5 bg-white/[0.02] p-10 text-center">
                      <Info className="mx-auto text-slate-700" size={32} />
                      <p className="mt-4 text-sm text-slate-500 font-bold italic">No friends found. Add some friends to invite them!</p>
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {friends.map((friend) => {
                        const isChecked = formData.members.includes(friend._id);
                        return (
                          <button
                            key={friend._id}
                            type="button"
                            onClick={() => handleMemberToggle(friend._id)}
                            className={`flex items-center justify-between rounded-2xl p-4 transition-all ${isChecked ? 'bg-emerald-500/10 ring-1 ring-emerald-500/50 shadow-lg shadow-emerald-500/5' : 'bg-white/5 ring-1 ring-white/10 hover:bg-white/10'}`}
                          >
                            <div className="flex items-center gap-3">
                              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.name}`} className="h-8 w-8 rounded-lg bg-slate-800" alt="" />
                              <div className="text-left overflow-hidden">
                                <p className={`text-sm font-bold truncate ${isChecked ? 'text-white' : 'text-slate-400'}`}>{friend.name}</p>
                                <p className="text-[10px] text-slate-600 truncate">{friend.email}</p>
                              </div>
                            </div>
                            {isChecked && <div className="h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center"><Check size={12} className="text-black" /></div>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-white/5">
                  {error && <p className="text-sm font-bold text-rose-500 italic">{error}</p>}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="ml-auto flex items-center gap-2 rounded-2xl bg-white px-10 py-4 text-sm font-black text-black transition-all hover:scale-105 active:scale-95 shadow-xl"
                  >
                    {submitting ? 'Creating...' : 'Launch Group'}
                    <ArrowRight size={20} />
                  </button>
                </div>
              </form>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Groups Grid */}
      <section>
        <div className="mb-6 flex items-center justify-between px-2">
          <h2 className="text-2xl font-extrabold tracking-tight font-outfit uppercase text-slate-700">All Spaces</h2>
        </div>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1,2,3].map(i => (
              <div key={i} className="h-64 animate-pulse rounded-[2.5rem] bg-white/5" />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="rounded-[3rem] border-2 border-dashed border-white/5 bg-white/[0.02] p-24 text-center">
            <Users className="mx-auto text-slate-800" size={60} />
            <h3 className="mt-8 text-2xl font-bold font-outfit">No groups yet</h3>
            <p className="mt-2 text-slate-500 italic">Create a group to start vibing with your friends.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {groups.map((group, idx) => (
              <motion.div 
                key={group._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Link
                  to={`/groups/${group._id}`}
                  className="group block relative overflow-hidden rounded-[2.5rem] bg-[#0A0A0A] p-8 ring-1 ring-white/10 transition-all hover:ring-emerald-500/50 hover:bg-white/[0.04] shadow-2xl"
                >
                  <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-500/10 blur-3xl group-hover:bg-emerald-500/20 transition-all" />
                  
                  <div className="flex items-center justify-between mb-8">
                    <div className="h-14 w-14 flex items-center justify-center rounded-2xl bg-white/5 text-emerald-500 font-black text-2xl ring-1 ring-white/10">
                      {group.name?.charAt(0)}
                    </div>
                    <span className="rounded-full bg-emerald-500/10 px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-500 ring-1 ring-emerald-500/20">
                      {group.members?.length || 0} Members
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xl font-bold text-white font-outfit group-hover:text-emerald-500 transition-colors uppercase tracking-tight">{group.name}</h3>
                      <p className="mt-1 text-sm text-slate-500 line-clamp-2 italic">{group.description || 'No description provided.'}</p>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-white/[0.03]">
                      <div className="flex -space-x-2">
                        {group.members?.slice(0, 3).map((m, i) => (
                          <img key={i} src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${m.name}`} className="h-6 w-6 rounded-full border border-[#050505]" />
                        ))}
                      </div>
                      <ChevronRight size={20} className="text-slate-700 group-hover:text-emerald-500 transition-all group-hover:translate-x-1" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
