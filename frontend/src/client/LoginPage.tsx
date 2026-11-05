import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { clientErrorMessage, clientLogin } from '../clientApi';
import { getClientToken, setClientToken } from '../clientAuth';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (getClientToken()) {
    return <Navigate to="/espace-client" replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await clientLogin(email.trim(), password);
      setClientToken(result.token);
      navigate(result.user.email_verified ? '/espace-client' : '/espace-client/verification', {
        replace: true,
      });
    } catch (err) {
      setError(clientErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login">
      <h1>Espace client</h1>
      <p>Connectez-vous pour suivre vos demandes, contrats et documents.</p>

      <form onSubmit={handleSubmit} className="form">
        {error && <p className="alert">{error}</p>}

        <div className="field">
          <label htmlFor="email">Adresse email</label>
          <input
            id="email"
            type="email"
            required
            autoComplete="username"
            placeholder="Ex : nom@exemple.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="password">Mot de passe</label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>

      <p className="center">
        <Link to="/espace-client/mot-de-passe-oublie">Mot de passe oublié ?</Link>
      </p>
      <p className="center">
        Pas encore de compte ? <Link to="/espace-client/inscription">Créer un compte</Link>
      </p>
    </main>
  );
}
