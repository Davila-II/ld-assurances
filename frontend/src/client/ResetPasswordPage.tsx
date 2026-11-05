import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { clientErrorMessage, clientReset } from '../clientApi';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const email = params.get('email') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!token || !email) {
    return (
      <main className="login">
        <h1>Lien invalide</h1>
        <p>Ce lien de réinitialisation est incomplet. Refaites une demande.</p>
        <p className="center">
          <Link to="/espace-client/mot-de-passe-oublie">Demander un nouveau lien</Link>
        </p>
      </main>
    );
  }

  if (done) {
    return (
      <main className="login">
        <h1>Mot de passe modifié</h1>
        <p className="notice">Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</p>
        <p className="center">
          <Link to="/espace-client/connexion">Se connecter</Link>
        </p>
      </main>
    );
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (password !== confirm) {
      setError('La confirmation du mot de passe ne correspond pas.');
      return;
    }

    setLoading(true);

    try {
      await clientReset({ token, email, password, password_confirmation: confirm });
      setDone(true);
    } catch (err) {
      setError(clientErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login">
      <h1>Nouveau mot de passe</h1>
      <p>
        Choisissez un nouveau mot de passe pour <strong>{email}</strong>.
      </p>

      <form onSubmit={handleSubmit} className="form">
        {error && <p className="alert">{error}</p>}

        <div className="field">
          <label htmlFor="password">Nouveau mot de passe</label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <small>8 caractères minimum, avec des lettres et des chiffres.</small>
        </div>

        <div className="field">
          <label htmlFor="confirm">Confirmer le mot de passe</label>
          <input
            id="confirm"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </form>
    </main>
  );
}