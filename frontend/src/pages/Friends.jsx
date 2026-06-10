import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export default function Friends() {
  const { token } = useAuth();
  const [friends, setFriends] = useState([]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchFriends = async () => {
    if (!token) {
      setFriends([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/users/friends`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Unable to fetch friends.');
      }

      setFriends(data.friends || []);
      setError('');
    } catch (requestError) {
      setError(requestError.message || 'Unable to fetch friends.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFriends();
  }, [token]);

  const handleAddFriend = async (event) => {
    event.preventDefault();

    if (!email.trim()) {
      setError('Please enter an email address.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const response = await fetch(`${API_BASE_URL}/users/friends`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Unable to add friend.');
      }

      setEmail('');
      await fetchFriends();
    } catch (requestError) {
      setError(requestError.message || 'Unable to add friend.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Link 
        to="/dashboard" 
        className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-slate-100 mb-6 transition-colors w-fit"
      >
        <ArrowLeft size={16} />
        <span>Back to Dashboard</span>
      </Link>

      <div className="space-y-8">
        <section className="rounded-2xl border border-slate-800 bg-[#13151A] p-6 shadow-sm">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-400">Friends</p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-100">Manage your friends</h1>
          <p className="max-w-2xl text-sm leading-6 text-slate-400">
            Add people by email so you can include them in expenses and new groups.
          </p>
        </div>

        <form className="mt-6 flex flex-col gap-3 sm:flex-row" onSubmit={handleAddFriend}>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="friend@example.com"
            className="flex-1 rounded-xl border border-slate-800 bg-[#0D0F12] px-4 py-3 text-white outline-none transition focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10"
          />
          <button
            type="submit"
            disabled={submitting || !token}
            className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
          >
            {submitting ? 'Adding...' : 'Add Friend'}
          </button>
        </form>

        {error ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-100">Your friends</h2>
          <span className="text-sm text-slate-500">{friends.length} total</span>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-800 bg-[#13151A] p-6 text-sm text-slate-500 shadow-sm">
            Loading friends...
          </div>
        ) : friends.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 bg-[#13151A] p-8 text-sm text-slate-500 shadow-sm">
            You do not have any friends added yet.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {friends.map((friend) => (
              <article key={friend._id} className="rounded-2xl border border-slate-800 bg-[#13151A] p-5 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-100">{friend.name}</h3>
                <p className="mt-2 text-sm text-slate-400">{friend.email}</p>
              </article>
            ))}
          </div>
        )}
        </section>
      </div>
    </div>
  );
}
