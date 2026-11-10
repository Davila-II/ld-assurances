import { useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { adminLogin } from '../api';
import { getAdminUser, getToken, setAdminUser, setToken } from '../auth';
import { errorMessage } from './labels';
import PasswordInput from '../components/PasswordInput';
import logoImg from '../images/logo.png';

function getNotice(state: unknown): string {
  if (
    typeof state === 'object' &&
    state !== null &&
    'notice' in state &&
    typeof state.notice === 'string'
  ) {
    return state.notice;
  }

  return '';
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const notice = getNotice(location.state);

  if (getToken()) {
    return <Navigate to="/admin" replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSending(true);

    try {
      const result = await adminLogin(email, password);
      setToken(result.token);
      setAdminUser(result.user);
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="login">
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <img
          src={logoImg}
          alt="LD Assurances"
          style={{ height: '64px', width: 'auto', objectFit: 'contain', background: '#fff', padding: '6px 12px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}
        />
      </div>
      <h1>Administration</h1>
      <p>Connexion réservée aux agents de LD Assurances.</p>

      <form onSubmit={handleSubmit} className="form">
        {notice && <p className="notice" role="status">{notice}</p>}
        {error && <p className="alert" role="alert">{error}</p>}

        <div className="field">
          <label htmlFor="email">Adresse email</label>
          <input
            id="email"
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="password">Mot de passe</label>
          <PasswordInput
            id="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        <button type="submit" disabled={sending}>
          {sending ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
    </main>
  );
}
