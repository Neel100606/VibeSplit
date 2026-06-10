import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis
} from 'recharts';
import { 
  Plus, 
  ArrowLeft, 
  Users, 
  UserPlus, 
  FileText, 
  TrendingUp, 
  CheckCircle2, 
  MessageSquare, 
  Send,
  MoreVertical,
  Download,
  Utensils,
  Home,
  Zap,
  Tag,
  Calendar,
  IndianRupee,
  ChevronRight,
  ArrowRight,
  Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SettleUpModal from '../components/SettleUpModal.jsx';
import AddExpenseModal from '../components/Expenses/AddExpenseModal.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useSocket } from '../context/SocketContext.jsx';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#f43f5e', '#06b6d4'];

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Number(value || 0));

const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date);
};

const roundToTwo = (value) => Number(Number(value || 0).toFixed(2));

const CategoryIcon = ({ description }) => {
  const desc = description?.toLowerCase() || '';
  if (desc.includes('food') || desc.includes('dinner') || desc.includes('lunch') || desc.includes('restaurant')) return <Utensils size={18} />;
  if (desc.includes('rent') || desc.includes('home') || desc.includes('apartment')) return <Home size={18} />;
  if (desc.includes('bill') || desc.includes('electricity') || desc.includes('water')) return <Zap size={18} />;
  return <Tag size={18} />;
};

export default function GroupDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const { addToast } = useToast();
  const socket = useSocket();
  const chatEndRef = useRef(null);

  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [settlingKey, setSettlingKey] = useState('');
  const [settlementToConfirm, setSettlementToConfirm] = useState(null);
  const [error, setError] = useState('');
  const [commentText, setCommentText] = useState('');
  const [activeTab, setActiveTab] = useState('ledger'); // 'ledger' or 'analytics'
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [nudgingId, setNudgingId] = useState('');
  const [nudgedIds, setNudgedIds] = useState(new Set());
  const [activitiesPage, setActivitiesPage] = useState(1);
  const [hasMoreActivities, setHasMoreActivities] = useState(false);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const chatContainerRef = useRef(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const downloadReport = async () => {
    try {
      setIsDownloading(true);
      const response = await axios.get(`${API_BASE_URL}/groups/${id}/report/pdf`, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        responseType: 'blob'
      });

      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', `VibeSplit-${group?.name?.replace(/\s+/g, '-') || 'Group'}-Report.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
      addToast('PDF report downloaded successfully.', 'success');
    } catch (requestError) {
      console.error('Download PDF Error:', requestError);
      addToast('Failed to download PDF report.', 'error');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleRemind = async (receiverId) => {
    try {
      setNudgingId(receiverId);
      const response = await fetch(`${API_BASE_URL}/groups/${id}/remind`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ receiverId }),
      });

      if (!response.ok) throw new Error('Unable to send reminder.');
      
      addToast('Reminder sent successfully!', 'success');
      
      // Add to cooldown set
      setNudgedIds(prev => new Set(prev).add(receiverId));
      
      // Remove from cooldown after 30 seconds
      setTimeout(() => {
        setNudgedIds(prev => {
          const next = new Set(prev);
          next.delete(receiverId);
          return next;
        });
      }, 30000);

    } catch (requestError) {
      addToast(requestError.message, 'error');
    } finally {
      setNudgingId('');
    }
  };

  const members = group?.members || [];

  const memberMap = useMemo(() => {
    return members.reduce((accumulator, member) => {
      accumulator[member._id] = member;
      return accumulator;
    }, {});
  }, [members]);

  const chartData = useMemo(() => {
    const dataMap = {};
    expenses.forEach((expense) => {
      const name = expense.payerId?.name || 'Unknown';
      dataMap[name] = (dataMap[name] || 0) + (expense.amount || 0);
    });
    return Object.keys(dataMap).map((name) => ({
      name,
      value: roundToTwo(dataMap[name]),
    }));
  }, [expenses]);

  const settlementReceiver = settlementToConfirm ? memberMap[settlementToConfirm.to] : null;

  const scrollToBottom = (isInitial = false) => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: isInitial ? 'auto' : 'smooth'
      });
    }
  };
  useEffect(() => {
    if (activities.length > 0 && activitiesPage === 1) {
      scrollToBottom();
    }
  }, [activities, activitiesPage]);

  const fetchActivities = async (page = 1, append = false) => {
    try {
      setLoadingActivities(true);
      const response = await fetch(`${API_BASE_URL}/groups/${id}/activities?page=${page}&limit=20`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        if (append) {
          setActivities(prev => [...prev, ...(data.activities || [])]);
        } else {
          setActivities(data.activities || []);
        }
        setHasMoreActivities(data.hasMore);
        setActivitiesPage(page);
      }
    } catch (error) {
      console.error('Fetch Activities Error:', error);
    } finally {
      setLoadingActivities(false);
    }
  };

  const fetchGroupDetails = async () => {
    const [groupResponse, expensesResponse, settlementsResponse] = await Promise.all([
      fetch(`${API_BASE_URL}/groups/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch(`${API_BASE_URL}/expenses/group/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch(`${API_BASE_URL}/groups/${id}/settlements`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ]);

    const [groupData, expensesData, settlementsData] = await Promise.all([
      groupResponse.json(),
      expensesResponse.json(),
      settlementsResponse.json(),
    ]);

    if (!groupResponse.ok || !expensesResponse.ok || !settlementsResponse.ok) {
      throw new Error('Unable to fetch group details.');
    }

    setGroup(groupData.group);
    setExpenses(expensesData.expenses || []);
    setSettlements(settlementsData.transactions || []);
    
    // Fetch first page of activities separately
    fetchActivities(1, false);
  };

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    const loadData = async () => {
      try {
        setLoading(true);
        await fetchGroupDetails();
        setError('');
      } catch (requestError) {
        setError(requestError.message || 'Unable to load group.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id, token]);

  useEffect(() => {
    if (!socket || !id) return;
    socket.emit('joinGroup', id);
    return () => { socket.emit('leaveGroup', id); };
  }, [socket, id]);

  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => { fetchGroupDetails().catch(console.error); };
    socket.on('expenseUpdated', handleUpdate);
    socket.on('settlementUpdated', handleUpdate);
    socket.on('activityAdded', handleUpdate);
    return () => {
      socket.off('expenseUpdated', handleUpdate);
      socket.off('settlementUpdated', handleUpdate);
      socket.off('activityAdded', handleUpdate);
    };
  }, [socket]);

  const handleSettleUp = async (settlement) => {
    try {
      setSettlingKey(`${settlement.from}-${settlement.to}-${settlement.amount}`);
      const response = await fetch(`${API_BASE_URL}/expenses/settle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          groupId: id,
          payerId: settlement.from,
          receiverId: settlement.to,
          amount: settlement.amount,
        }),
      });
      if (!response.ok) throw new Error('Unable to settle payment.');
      await fetchGroupDetails();
      addToast('Settlement recorded successfully.', 'success');
    } catch (requestError) {
      addToast(requestError.message, 'error');
    } finally {
      setSettlingKey('');
      setSettlementToConfirm(null);
    }
  };

  const handleAddExpense = async (expenseData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/expenses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          groupId: id,
          ...expenseData
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Unable to create expense.');
      }
      await fetchGroupDetails();
      addToast('Expense added successfully.', 'success');
      return true;
    } catch (requestError) {
      addToast(requestError.message, 'error');
      return false;
    }
  };

  const handleCommentSubmit = async (event) => {
    event.preventDefault();
    if (!commentText.trim()) return;
    try {
      setSubmitting(true);
      const response = await fetch(`${API_BASE_URL}/groups/${id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: commentText.trim() }),
      });
      if (!response.ok) throw new Error('Unable to post comment.');
      setCommentText('');
      // The socket will trigger a re-fetch
    } catch (requestError) {
      addToast(requestError.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!memberEmail.trim()) return;

    try {
      setAddingMember(true);
      const response = await fetch(`${API_BASE_URL}/groups/${id}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ friendEmail: memberEmail.trim() }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to add member.');

      addToast('Member added successfully!', 'success');
      setMemberEmail('');
      await fetchGroupDetails();
    } catch (requestError) {
      addToast(requestError.message, 'error');
    } finally {
      setAddingMember(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Description', 'Total Amount', 'Paid By', ...members.map(m => `${m.name}'s Share`)];
    
    const rows = expenses.map((expense) => {
      const baseData = [
        formatDate(expense.date),
        expense.description,
        expense.amount,
        expense.payerId?.name || 'Unknown',
      ];
      
      const splitsData = members.map((member) => {
        const split = expense.splits?.find(s => 
          (s.userId === member._id) || (s.userId?._id === member._id)
        );
        return split ? split.owedAmount : 0;
      });
      
      return [...baseData, ...splitsData];
    });

    const csvContent = [headers, ...rows]
      .map((row) => row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `${group?.name || 'group'}_detailed_ledger.csv`;
    link.href = url;
    link.click();
    addToast('Detailed ledger exported.', 'success');
  };

  if (loading) return (
    <div className="flex h-[60vh] items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl pb-20">
      {/* Header Bar */}
      <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => navigate('/groups')}
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-4xl font-extrabold tracking-tighter text-white font-outfit">{group?.name}</h1>
            <div className="mt-2 flex items-center gap-3">
              <div className="flex -space-x-3">
                {members.slice(0, 5).map((m, i) => (
                  <img 
                    key={m._id} 
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${m.name}`} 
                    className="h-8 w-8 rounded-full border-2 border-[#050505] bg-slate-800" 
                    alt={m.name}
                  />
                ))}
                {members.length > 5 && (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#050505] bg-white/10 text-[10px] font-bold text-white backdrop-blur-sm">
                    +{members.length - 5}
                  </div>
                )}
              </div>
              <span className="text-sm font-medium text-slate-500">{members.length} members</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <form onSubmit={handleAddMember} className="flex items-center gap-2 rounded-2xl bg-white/5 p-1 ring-1 ring-white/10 w-full sm:w-auto">
            <input 
              type="email"
              value={memberEmail}
              onChange={(e) => setMemberEmail(e.target.value)}
              placeholder="Add friend by email"
              className="bg-transparent border-none outline-none px-4 py-2 text-xs font-medium text-white placeholder:text-slate-600 w-full sm:w-48"
            />
            <button 
              type="submit"
              disabled={addingMember || !memberEmail.trim()}
              className="px-4 py-2 bg-emerald-500 rounded-xl text-black text-[10px] font-black uppercase tracking-widest hover:bg-emerald-400 disabled:opacity-50 transition-colors"
            >
              {addingMember ? 'Adding...' : 'Add'}
            </button>
          </form>
          <button 
            onClick={downloadReport}
            disabled={isDownloading}
            className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl bg-white/5 px-6 py-3.5 text-sm font-extrabold text-slate-300 ring-1 ring-white/10 transition-all hover:bg-white/10 hover:text-white disabled:opacity-50 active:scale-95"
          >
            {isDownloading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-transparent" />
            ) : (
              <FileText size={18} className="text-emerald-400" />
            )}
            <span>📄 Download PDF Report</span>
          </button>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl bg-emerald-500/10 px-6 py-3.5 text-sm font-extrabold text-emerald-500 ring-1 ring-emerald-500/20 transition-all hover:bg-emerald-500 hover:text-black shadow-lg shadow-emerald-500/5 active:scale-95"
          >
            <Plus size={20} />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      <div className="grid gap-10 lg:grid-cols-3">
        {/* Left Column: Ledger & Analytics */}
        <div className="lg:col-span-2 space-y-10">
          
          {/* Main Content Card */}
          <section className="overflow-hidden rounded-[2.5rem] bg-[#0A0A0A] ring-1 ring-white/10">
            {/* Tabs */}
            <div className="flex border-b border-white/5">
              <button 
                onClick={() => setActiveTab('ledger')}
                className={`flex-1 py-5 text-sm font-bold transition-all ${activeTab === 'ledger' ? 'text-emerald-500 bg-white/[0.02]' : 'text-slate-500 hover:text-white'}`}
              >
                Expense Ledger
                {activeTab === 'ledger' && <motion.div layoutId="tab-line" className="mx-auto mt-1 h-0.5 w-8 rounded-full bg-emerald-500" />}
              </button>
              <button 
                onClick={() => setActiveTab('analytics')}
                className={`flex-1 py-5 text-sm font-bold transition-all ${activeTab === 'analytics' ? 'text-emerald-500 bg-white/[0.02]' : 'text-slate-500 hover:text-white'}`}
              >
                Analytics
                {activeTab === 'analytics' && <motion.div layoutId="tab-line" className="mx-auto mt-1 h-0.5 w-8 rounded-full bg-emerald-500" />}
              </button>
            </div>

            <div className="p-4 sm:p-8">
              {activeTab === 'ledger' ? (
                <div className="space-y-2">
                  <div className="mb-6 flex items-center justify-between px-2">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500">{expenses.length} Transactions</p>
                    <button onClick={exportToCSV} className="text-xs font-bold text-emerald-500 flex items-center gap-1.5 hover:underline">
                      <Download size={14} /> Export CSV
                    </button>
                  </div>

                  {expenses.length === 0 ? (
                    <div className="py-20 text-center">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 text-slate-600">
                        <FileText size={32} />
                      </div>
                      <p className="mt-4 text-slate-500">No expenses recorded yet.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-white/[0.03]">
                      {expenses.map((expense) => (
                        <motion.button 
                          key={expense._id}
                          onClick={() => navigate(`/groups/${id}/expenses/${expense._id}`)}
                          whileHover={{ x: 5 }}
                          className="flex w-full items-center gap-5 py-5 px-2 text-left transition-colors"
                        >
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-slate-400 ring-1 ring-white/5 transition-transform group-hover:scale-110">
                            <CategoryIcon description={expense.description} />
                          </div>
                          
                          <div className="flex-1 overflow-hidden">
                            <h3 className="font-bold text-white truncate">{expense.description}</h3>
                            <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                              <span className="font-medium text-emerald-500/80">{expense.payerId?.name || 'Unknown'} paid</span>
                              <span>•</span>
                              <span>{formatDate(expense.date)}</span>
                            </div>
                          </div>

                          <div className="text-right">
                            <p className="text-lg font-extrabold tracking-tight text-white font-outfit">{formatCurrency(expense.amount)}</p>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Total</p>
                          </div>
                          
                          <ChevronRight size={18} className="text-slate-700" />
                        </motion.button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-10">
                  <h3 className="text-center text-lg font-bold font-outfit mb-8">Contribution Breakdown</h3>
                  <div className="w-full overflow-x-auto">
                    <div className="h-[300px] w-full min-w-[280px]">
                      {expenses.length === 0 ? (
                        <div className="flex h-full items-center justify-center text-slate-500">No data available</div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={chartData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={100}
                              paddingAngle={5}
                              dataKey="value"
                              stroke="none"
                            >
                              {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#0A0A0A', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                              itemStyle={{ color: '#fff' }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {chartData.map((data, idx) => (
                      <div key={idx} className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/5">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                          <span className="text-xs font-bold text-slate-400 truncate">{data.name}</span>
                        </div>
                        <p className="mt-1 text-sm font-bold">{formatCurrency(data.value)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Settle Up Cards */}
          <section>
            <div className="mb-6 flex items-center justify-between px-2">
              <h2 className="text-2xl font-extrabold tracking-tight font-outfit">Optimized Debt Paths</h2>
              <TrendingUp className="text-emerald-500" size={20} />
            </div>

            <div className="space-y-12">
              {(() => {
                const youOweArr = settlements.filter(s => s.from === user?._id);
                const owedToYouArr = settlements.filter(s => s.to === user?._id);
                const otherBalancesArr = settlements.filter(s => s.from !== user?._id && s.to !== user?._id);

                const renderSettlementCard = (s, i, type) => {
                  const isUserSender = s.from === user?._id;
                  const isUserReceiver = s.to === user?._id;
                  const fromName = isUserSender ? 'You' : memberMap[s.from]?.name;
                  const toName = isUserReceiver ? 'You' : memberMap[s.to]?.name;

                  return (
                    <motion.div 
                      key={`${type}-${i}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex flex-col justify-between overflow-hidden rounded-[2rem] bg-[#0A0A0A] p-6 ring-1 ${type === 'youOwe' ? 'ring-rose-500/20 shadow-lg shadow-rose-500/5' : type === 'owedToYou' ? 'ring-emerald-500/20 shadow-lg shadow-emerald-500/5' : 'ring-white/10'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold ${isUserSender ? 'bg-rose-500/10 text-rose-500' : 'bg-white/5 text-slate-400'}`}>
                            {isUserSender ? 'U' : fromName?.charAt(0)}
                          </div>
                          <ArrowRight size={16} className="text-slate-700" />
                          <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold ${isUserReceiver ? 'bg-emerald-500/10 text-emerald-500' : 'bg-white/5 text-slate-400'}`}>
                            {isUserReceiver ? 'U' : toName?.charAt(0)}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-xl font-extrabold font-outfit ${isUserSender ? 'text-rose-500' : isUserReceiver ? 'text-emerald-500' : 'text-white'}`}>{formatCurrency(s.amount)}</p>
                        </div>
                      </div>
                      
                      <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <p className="text-xs font-medium text-slate-500">
                          <span className={`${isUserSender ? 'text-rose-400' : 'text-white'} font-bold`}>{fromName}</span> owe 
                          <span className={`${isUserReceiver ? 'text-emerald-400' : 'text-white'} font-bold ml-1`}>{toName}</span>
                        </p>
                        
                        <div className="flex items-center gap-2">
                          {type === 'owedToYou' && (
                            <button
                              disabled={nudgingId === s.from || nudgedIds.has(s.from)}
                              onClick={() => handleRemind(s.from)}
                              className="flex items-center gap-2 rounded-xl border border-emerald-500/30 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-emerald-500 transition-all hover:bg-emerald-500/10 disabled:opacity-50"
                            >
                              <Bell size={12} className={nudgingId === s.from ? 'animate-bounce' : ''} />
                              {nudgedIds.has(s.from) ? 'Sent' : 'Remind'}
                            </button>
                          )}
                          {(isUserSender || isUserReceiver) && (
                            <button 
                              onClick={() => setSettlementToConfirm(s)}
                              className={`rounded-xl px-5 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all ${isUserSender ? 'bg-rose-500 text-black shadow-lg shadow-rose-500/20' : 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'}`}
                            >
                              Settle Now
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                };

                return (
                  <>
                    {youOweArr.length > 0 && (
                      <div className="space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-rose-500 ml-2">What you owe</h3>
                        <div className="grid gap-4 sm:grid-cols-2">
                          {youOweArr.map((s, i) => renderSettlementCard(s, i, 'youOwe'))}
                        </div>
                      </div>
                    )}

                    {owedToYouArr.length > 0 && (
                      <div className="space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-emerald-500 ml-2">Owed to you</h3>
                        <div className="grid gap-4 sm:grid-cols-2">
                          {owedToYouArr.map((s, i) => renderSettlementCard(s, i, 'owedToYou'))}
                        </div>
                      </div>
                    )}

                    {otherBalancesArr.length > 0 && (
                      <div className="space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-600 ml-2">General Balances</h3>
                        <div className="grid gap-4 sm:grid-cols-2">
                          {otherBalancesArr.map((s, i) => renderSettlementCard(s, i, 'other'))}
                        </div>
                      </div>
                    )}

                    {settlements.length === 0 && (
                      <div className="flex flex-col items-center justify-center p-14 rounded-[2.5rem] bg-emerald-500/5 ring-1 ring-emerald-500/20">
                        <CheckCircle2 size={40} className="text-emerald-500" />
                        <h3 className="mt-4 text-xl font-bold font-outfit text-white">Everyone is settled!</h3>
                        <p className="mt-2 text-slate-500">Perfectly balanced, as all things should be.</p>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </section>
        </div>

        {/* Right Column: Chat/Activity Feed */}
        <div className="space-y-10">
          <section className="flex flex-col h-[700px] overflow-hidden rounded-[2.5rem] bg-[#0A0A0A] ring-1 ring-white/10 lg:sticky lg:top-32">
            <div className="flex items-center justify-between border-b border-white/5 p-6 bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
                  <MessageSquare size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-outfit">Activity Feed</h3>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">Real-time sync</p>
                </div>
              </div>
              <button className="text-slate-500 hover:text-white">
                <MoreVertical size={20} />
              </button>
            </div>

            <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col">
              {hasMoreActivities && (
                <button 
                  onClick={() => fetchActivities(activitiesPage + 1, true)}
                  disabled={loadingActivities}
                  className="mx-auto text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-emerald-500 transition-colors disabled:opacity-50"
                >
                  {loadingActivities ? 'Loading...' : 'Load older messages'}
                </button>
              )}
              {activities.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <MessageSquare size={40} className="text-slate-800" />
                  <p className="mt-4 text-sm text-slate-600 font-medium">No activity yet. Start the conversation!</p>
                </div>
              ) : (
                [...activities].reverse().map((a) => {
                  const isMe = a.userId?._id === user?._id;
                  if (a.type !== 'comment') {
                    return (
                      <div key={a._id} className="flex justify-center">
                        <span className="rounded-full bg-white/[0.03] px-4 py-1.5 text-[10px] font-bold uppercase tracking-tighter text-slate-600 ring-1 ring-white/5">
                          {a.userId?.name} {a.text}
                        </span>
                      </div>
                    );
                  }
                  return (
                    <div key={a._id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                        {!isMe && <span className="text-[10px] font-bold text-slate-600 ml-2">{a.userId?.name}</span>}
                        <div className={`rounded-[1.5rem] px-5 py-3 text-sm shadow-xl ${isMe ? 'bg-emerald-500 text-black font-medium rounded-tr-none' : 'bg-white/5 text-white rounded-tl-none ring-1 ring-white/10'}`}>
                          {a.text}
                        </div>
                        <span className="text-[8px] font-bold uppercase tracking-widest text-slate-700 mt-1 px-2">{formatDate(a.date)}</span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleCommentSubmit} className="p-6 bg-white/[0.02] border-t border-white/5">
              <div className="relative">
                <input 
                  type="text" 
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Drop a message..."
                  className="w-full rounded-[1.5rem] bg-[#050505] py-4 pl-6 pr-14 text-sm font-medium text-white outline-none ring-1 ring-white/10 focus:ring-emerald-500/50 transition-all placeholder:text-slate-700"
                />
                <button 
                  type="submit"
                  disabled={!commentText.trim() || submitting}
                  className="absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500 text-black shadow-lg shadow-emerald-500/20 transition-all hover:scale-105 active:scale-90 disabled:opacity-50 disabled:grayscale"
                >
                  <Send size={18} />
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>

      <SettleUpModal
        isOpen={Boolean(settlementToConfirm)}
        onClose={() => setSettlementToConfirm(null)}
        debtAmount={settlementToConfirm?.amount || 0}
        receiverName={settlementReceiver?.name || ''}
        receiverUpiId={settlementReceiver?.upiId || ''}
        onMarkAsSettled={() => settlementToConfirm && handleSettleUp(settlementToConfirm)}
        isSubmitting={settlingKey === `${settlementToConfirm?.from}-${settlementToConfirm?.to}-${settlementToConfirm?.amount}`}
      />

      <AddExpenseModal 
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        members={members}
        user={user}
        groupName={group?.name}
        onSubmit={handleAddExpense}
      />
    </div>
  );
}
