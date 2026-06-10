import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { ArrowLeft } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export default function Profile() {
  const { token, user, login } = useAuth();
  const { addToast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    upiId: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setFormData({
      name: user?.name || '',
      email: user?.email || '',
      upiId: user?.upiId || '',
    });
  }, [user]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setSubmitting(true);
      setError('');

      const response = await fetch(`${API_BASE_URL}/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name,
          upiId: formData.upiId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Unable to update profile.');
      }

      login(token, data.user);
      addToast('Profile updated successfully.', 'success');
    } catch (requestError) {
      const message = requestError.message || 'Unable to update profile.';
      setError(message);
      addToast(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <div className="w-full max-w-2xl">
        <Link 
          to="/dashboard" 
          className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-slate-100 mb-6 transition-colors w-fit"
        >
          <ArrowLeft size={16} />
          <span>Back to Dashboard</span>
        </Link>
        
        <section className="rounded-2xl border border-slate-800 bg-[#13151A] p-6 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-400">Profile</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-100">Your details</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Add your UPI ID so group members can settle up with a QR code or direct payment link.
        </p>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-400" htmlFor="name">
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-800 bg-[#0D0F12] px-4 py-3 text-white outline-none transition focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-400" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              disabled
              className="w-full rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3 text-slate-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-400" htmlFor="upiId">
              UPI ID
            </label>
            <input
              id="upiId"
              name="upiId"
              type="text"
              value={formData.upiId}
              onChange={handleChange}
              placeholder="yourname@bank"
              className="w-full rounded-xl border border-slate-800 bg-[#0D0F12] px-4 py-3 text-white outline-none transition focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10"
            />
          </div>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
          >
            {submitting ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
        </section>
      </div>
    </div>
  );
}
