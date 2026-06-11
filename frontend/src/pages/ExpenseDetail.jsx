import { ArrowLeft } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ConfirmModal from '../components/ConfirmModal.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { API_URL as API_BASE_URL } from '../config.js';

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Number(value || 0));

const formatDate = (value) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));

const roundToTwo = (value) => Number(Number(value || 0).toFixed(2));

export default function ExpenseDetail() {
  const { groupId, expenseId } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const { addToast } = useToast();

  const [group, setGroup] = useState(null);
  const [expense, setExpense] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    payerId: '',
  });
  const [splitValues, setSplitValues] = useState({});

  const members = group?.members || [];

  const splitSum = useMemo(() => {
    return roundToTwo(
      Object.values(splitValues).reduce((sum, current) => sum + Number(current || 0), 0),
    );
  }, [splitValues]);

  const totalAmount = roundToTwo(formData.amount);
  const splitDifference = roundToTwo(totalAmount - splitSum);
  const splitsMatch = totalAmount > 0 && Math.abs(splitDifference) <= 0.01;

  const buildSplitMap = (sourceExpense, groupData) => {
    const nextSplits = {};

    for (const member of groupData.members || []) {
      const existingSplit = sourceExpense.splits?.find((split) => split.userId?._id === member._id || split.userId === member._id);
      nextSplits[member._id] = existingSplit ? Number(existingSplit.owedAmount).toFixed(2) : '';
    }

    return nextSplits;
  };

  const hydrateForm = (sourceExpense, groupData) => {
    setFormData({
      description: sourceExpense.description || '',
      amount: sourceExpense.amount?.toString() || '',
      payerId: sourceExpense.payerId?._id || sourceExpense.payerId || user?._id || '',
    });
    setSplitValues(buildSplitMap(sourceExpense, groupData));
  };

  const fetchExpenseData = async () => {
    const [groupResponse, expenseResponse] = await Promise.all([
      fetch(`${API_BASE_URL}/groups/${groupId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }),
      fetch(`${API_BASE_URL}/expenses/${expenseId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }),
    ]);

    const [groupData, expenseData] = await Promise.all([
      groupResponse.json(),
      expenseResponse.json(),
    ]);

    if (!groupResponse.ok) {
      throw new Error(groupData.error || 'Unable to fetch group.');
    }

    if (!expenseResponse.ok) {
      throw new Error(expenseData.error || 'Unable to fetch expense.');
    }

    setGroup(groupData.group);
    setExpense(expenseData.expense);
    hydrateForm(expenseData.expense, groupData.group);
  };

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        await fetchExpenseData();
        setError('');
      } catch (requestError) {
        setError(requestError.message || 'Unable to load expense.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [groupId, expenseId, token]);

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSplitChange = (memberId, value) => {
    if (value !== '' && Number(value) < 0) {
      return;
    }

    setSplitValues((current) => ({
      ...current,
      [memberId]: value,
    }));
  };

  const handleSplitEqually = () => {
    if (!members.length || totalAmount <= 0) {
      setError('Enter a total amount before splitting equally.');
      return;
    }

    const totalCents = Math.round(totalAmount * 100);
    const memberCount = members.length;
    const baseShareCents = Math.floor(totalCents / memberCount);
    const remainder = totalCents % memberCount;
    const nextSplitValues = {};

    members.forEach((member, index) => {
      const cents = baseShareCents + (index === memberCount - 1 ? remainder : 0);
      nextSplitValues[member._id] = (cents / 100).toFixed(2);
    });

    setSplitValues(nextSplitValues);
    setError('');
  };

  const handleUpdate = async (event) => {
    event.preventDefault();

    if (!formData.description.trim()) {
      setError('Expense description is required.');
      return;
    }

    if (!splitsMatch) {
      setError(`Splits must equal the total amount. Current sum: ${formatCurrency(splitSum)}.`);
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const splits = members.map((member) => ({
        userId: member._id,
        owedAmount: roundToTwo(splitValues[member._id] || 0),
      }));

      const response = await fetch(`${API_BASE_URL}/expenses/${expenseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          groupId,
          description: formData.description.trim(),
          amount: totalAmount,
          payerId: formData.payerId || user?._id,
          splits,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Unable to update expense.');
      }

      setExpense(data.expense);
      hydrateForm(data.expense, group);
      setIsEditing(false);
      addToast('Expense updated successfully.', 'success');
    } catch (requestError) {
      setError(requestError.message || 'Unable to update expense.');
      addToast(requestError.message || 'Unable to update expense.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      setError('');

      const response = await fetch(`${API_BASE_URL}/expenses/${expenseId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Unable to delete expense.');
      }

      addToast('Expense deleted successfully.', 'success');
      navigate(`/groups/${groupId}`);
    } catch (requestError) {
      setError(requestError.message || 'Unable to delete expense.');
      addToast(requestError.message || 'Unable to delete expense.', 'error');
    } finally {
      setDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-[#13151A] p-8 text-sm text-slate-400 shadow-sm">
        Loading expense...
      </div>
    );
  }

  if (error && !expense) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-sm text-red-700 shadow-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-0">
      <Link 
        to={`/groups/${groupId}`} 
        className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-slate-100 mb-6 transition-colors w-fit"
      >
        <ArrowLeft size={16} />
        <span>Back to Group</span>
      </Link>

      <div className="space-y-8">
        <section className="rounded-[2.5rem] border border-slate-800 bg-[#13151A] p-8 shadow-2xl shadow-black/20">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tighter text-white font-outfit">
                {isEditing ? 'Edit Expense' : expense?.description}
              </h1>
              <p className="mt-3 text-sm font-medium text-slate-500">
                {group?.name} • {expense?.date ? formatDate(expense.date) : ''}
              </p>
            </div>

          <div className="flex items-center gap-3">
            {!isEditing ? (
              <button
                type="button"
                onClick={() => {
                  hydrateForm(expense, group);
                  setIsEditing(true);
                  setError('');
                }}
                className="rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-white/10 active:scale-95"
              >
                Edit
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  hydrateForm(expense, group);
                  setIsEditing(false);
                  setError('');
                }}
                className="rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-white/10 active:scale-95"
              >
                Cancel
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(true)}
              disabled={deleting}
              className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-6 py-3 text-sm font-bold text-rose-500 transition-all hover:bg-rose-500 hover:text-black active:scale-95 disabled:opacity-50"
            >
              {deleting ? 'Deleting...' : 'Delete Expense'}
            </button>
          </div>
        </div>
      </section>

      {isEditing ? (
        <section className="rounded-[2.5rem] border border-slate-800 bg-[#13151A] p-8 shadow-2xl shadow-black/20">
          <h2 className="text-2xl font-extrabold tracking-tight text-white font-outfit">Edit and Refine</h2>

          <form className="mt-6 space-y-5" onSubmit={handleUpdate}>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500 px-1" htmlFor="description">
                Description
              </label>
              <input
                id="description"
                name="description"
                type="text"
                value={formData.description}
                onChange={handleFieldChange}
                placeholder="What was it for?"
                className="w-full rounded-2xl border border-slate-800 bg-[#0D0F12] px-5 py-4 text-white outline-none ring-offset-[#13151A] transition focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 placeholder:text-slate-700"
              />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500 px-1" htmlFor="amount">
                  Total amount
                </label>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-emerald-500 font-bold">$</span>
                  <input
                    id="amount"
                    name="amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.amount}
                    onChange={handleFieldChange}
                    className="w-full rounded-2xl border border-slate-800 bg-[#0D0F12] pl-10 pr-5 py-4 text-white outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500 px-1" htmlFor="payerId">
                  Paid by
                </label>
                <select
                  id="payerId"
                  name="payerId"
                  value={formData.payerId}
                  onChange={handleFieldChange}
                  className="w-full rounded-2xl border border-slate-800 bg-[#0D0F12] px-5 py-4 text-white outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10"
                >
                  {members.map((member) => (
                    <option key={member._id} value={member._id} className="bg-[#0D0F12]">
                      {member.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <div className="mb-4 flex items-center justify-between px-1">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Splits</h3>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={handleSplitEqually}
                    className="rounded-full bg-emerald-500/10 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-500 transition hover:bg-emerald-500 hover:text-black"
                  >
                    Split Equally
                  </button>
                  <div className="text-xs font-medium text-slate-400">
                    Sum: <span className="font-bold text-white">{formatCurrency(splitSum)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {members.map((member) => (
                  <div key={member._id} className="flex items-center gap-4 rounded-3xl border border-white/5 bg-[#0D0F12] px-6 py-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-white">{member.name}</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">{member.email}</p>
                    </div>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-600">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={splitValues[member._id] ?? ''}
                        onChange={(event) => handleSplitChange(member._id, event.target.value)}
                        className="w-32 rounded-2xl border border-slate-800 bg-[#13151A] px-4 py-3 text-right text-sm font-bold text-white outline-none focus:border-emerald-500/50"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {!splitsMatch && formData.amount !== '' ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                Splits must equal total amount. Current sum: {formatCurrency(splitSum)}. Remaining difference: {formatCurrency(splitDifference)}.
              </div>
            ) : null}

            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={submitting || !splitsMatch || !formData.description.trim() || totalAmount <= 0}
              className="group relative w-full overflow-hidden rounded-2xl bg-emerald-500 py-5 text-sm font-black uppercase tracking-widest text-black shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50 disabled:grayscale"
            >
              <div className="relative z-10 flex items-center justify-center gap-2">
                {submitting ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-black border-t-transparent" />
                ) : (
                  'Save Changes'
                )}
              </div>
            </button>
          </form>
        </section>
      ) : (
        <section className="grid gap-10 xl:grid-cols-[1.3fr_1fr]">
          <article className="rounded-[2.5rem] border border-slate-800 bg-[#13151A] p-10 shadow-2xl shadow-black/20 ring-1 ring-white/5">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500">Summary</p>
            <h2 className="mt-4 text-4xl font-extrabold tracking-tighter text-white font-outfit">
              <span className="text-slate-500">{expense?.payerId?.name || 'Unknown'}</span> paid <br />
              {formatCurrency(expense?.amount)}
            </h2>
            <div className="mt-8 rounded-3xl bg-white/[0.03] p-6 ring-1 ring-white/5">
              <p className="text-lg font-medium text-slate-300">
                {expense?.description}
              </p>
            </div>
          </article>

          <article className="rounded-[2.5rem] border border-slate-800 bg-[#13151A] p-10 shadow-2xl shadow-black/20 ring-1 ring-white/5">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500">Breakdown</p>
            <div className="mt-8 space-y-4">
              {expense?.splits?.map((split, index) => (
                <div key={`${split.userId?._id || split.userId}-${index}`} className="group flex items-center justify-between rounded-[2rem] bg-[#0D0F12] px-6 py-5 ring-1 ring-white/5 transition-all hover:bg-white/[0.02]">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 overflow-hidden rounded-xl bg-slate-800">
                       <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${split.userId?.name}`} alt="" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{split.userId?.name || 'Unknown'}</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Debtor</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-extrabold tracking-tight text-white font-outfit">{formatCurrency(split.owedAmount)}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Share</p>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>
      )}

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        title="Delete this expense?"
        message="This action cannot be undone. The expense will be permanently removed from the group ledger."
        onConfirm={handleDelete}
        onCancel={() => {
          if (!deleting) {
            setIsDeleteModalOpen(false);
          }
        }}
      />
      </div>
    </div>
  );
}
