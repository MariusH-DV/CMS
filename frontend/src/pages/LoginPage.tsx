import { FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiErrorMessage } from '../api/client';
import logo from '../assets/logo.png';

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm card p-8 animate-pop-in">
        <div className="flex items-center gap-2 justify-center mb-6">
          <img src={logo} alt="Logo" className="h-10 w-10 rounded-lg object-cover" />
          <span className="text-xl font-semibold text-slate-800">Zentrale CMS</span>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="label">E-Mail</label>
            <input
              type="email"
              required
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label className="label">Passwort</label>
            <input
              type="password"
              required
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && (
            <div className="text-sm text-red-600 bg-red-50/80 backdrop-blur-sm border border-red-200 rounded-xl px-3 py-2 animate-fade-in-up">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className={`btn-primary justify-center mt-2 ${loading ? 'animate-pulse-glow' : ''}`}
          >
            {loading ? <i className="fa-solid fa-circle-notch fa-spin" /> : <i className="fa-solid fa-right-to-bracket" />}
            Anmelden
          </button>
        </form>
      </div>
      <div className="flex gap-4 mt-4 text-xs text-slate-400">
        <Link to="/impressum" className="hover:text-slate-600">
          Impressum
        </Link>
        <Link to="/datenschutz" className="hover:text-slate-600">
          Datenschutzerklärung
        </Link>
      </div>
    </div>
  );
}
