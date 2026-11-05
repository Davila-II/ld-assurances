import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { clientErrorMessage, clientForgot } from '../clientApi';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);

    try {
      const result = await clientForgot(email.trim());
      setNotice(result.message);
    } catch (err) {
      setError(clientErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login">
      <h1>Mot de passe oublié</h1>
      <p>Saisissez l'adresse email de votre compte. Nous vous enverrons un lien pour choisir un nouveau mot de passe.</p>

      <form onSubmit={handleSubmit} className="form">
        {error && <p className="alert">{error}</p>}
        {notice && <p className="notice">{notice}</p>}

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

        <button type="submit" disabled={loading}>
          {loading ? 'Envoi…' : 'Envoyer le lien'}
        </button>
      </form>

      <p className="center">
        <Link to="/espace-client/connexion">← Retour à la connexion</Link>
      </p>
    </main>
  );
}