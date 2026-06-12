import { useEffect, useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import AuthLayout from '../components/Layout/AuthLayout.jsx';
import { API_URL as API_BASE_URL } from '../config.js';

export default function Signup() {
  const navigate = useNavigate();
  const { login, signup, isAuthenticated } = useAuth();
  const { addToast } = useToast();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const result = await signup(formData);
      if (result.success) {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Unable to sign up.');
      addToast(err.message || 'Unable to sign up.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setError('');
      const response = await fetch(`${API_BASE_URL}/users/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ credential: credentialResponse.credential }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Google sign-up failed.');

      login(data.token, data.user);
      navigate('/dashboard');
    } catch (requestError) {
      setError(requestError.message);
      addToast(requestError.message, 'error');
    }
  };

  return (
    <AuthLayout 
      title="Join the Vibe" 
      subtitle="Create your account to start splitting with style."
    >
      <div className="space-y-8">
        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            width="100%"
            theme="filled_black"
            shape="pill"
            onError={() => addToast('Google sign-up failed.', 'error')}
          />
        </div>

        <div className="relative flex items-center">
          <hr className="flex-grow border-white/5" />
          <span className="mx-4 text-xs font-bold uppercase tracking-widest text-slate-700">or use email</span>
          <hr className="flex-grow border-white/5" />
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="group relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 transition-colors group-focus-within:text-emerald-500" size={20} />
              <input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full rounded-2xl bg-[#111111] py-4 pl-12 pr-4 text-sm font-medium text-white outline-none ring-1 ring-white/10 transition-all focus:ring-emerald-500/50 focus:bg-[#151515]"
                placeholder="Full Name"
              />
            </div>

            <div className="group relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 transition-colors group-focus-within:text-emerald-500" size={20} />
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full rounded-2xl bg-[#111111] py-4 pl-12 pr-4 text-sm font-medium text-white outline-none ring-1 ring-white/10 transition-all focus:ring-emerald-500/50 focus:bg-[#151515]"
                placeholder="vibes@elite.com"
              />
            </div>

            <div className="group relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 transition-colors group-focus-within:text-emerald-500" size={20} />
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="w-full rounded-2xl bg-[#111111] py-4 pl-12 pr-4 text-sm font-medium text-white outline-none ring-1 ring-white/10 transition-all focus:ring-emerald-500/50 focus:bg-[#151515]"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-2xl bg-rose-500/10 p-4 ring-1 ring-rose-500/50">
              <p className="text-center text-xs font-bold text-rose-500">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="group relative w-full overflow-hidden rounded-2xl bg-emerald-500 py-4 text-sm font-black uppercase tracking-widest text-black transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            <div className="relative z-10 flex items-center justify-center gap-1">
              {isSubmitting ? 'Creating Profile...' : 'Begin Journey'}
              <ChevronRight size={18} className="transition-transform group-hover:translate-x-1" />
            </div>
          </button>
        </form>

        <p className="text-center text-sm font-medium text-slate-500">
          Already have an account?{' '}
          <Link className="font-bold text-white hover:text-emerald-500 transition-colors" to="/login">
            Sign In
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
