import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { clientErrorMessage, clientMe, clientResend, clientVerify } from '../clientApi';
import { clearClientToken, getClientToken } from '../clientAuth';

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const hasToken = Boolean(getClientToken());

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Si l'adresse est déjà vérifiée, on entre directement dans l'espace client
  useEffect(() => {
    if (!hasToken) return;
    let cancelled = false;

    clientMe()
      .then((user) => {
        if (cancelled) return;
        if (user.email_verified) {
          navigate('/espace-client', { replace: true });
        } else {
          setEmail(user.email);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(clientErrorMessage(err));
      });

    return () => {
      cancelled = true;
    };
  }, [hasToken, navigate]);

  // Compte à rebours du bouton « Renvoyer le code »
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  if (!hasToken) {
    return <Navigate to="/espace-client/connexion" replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);

    try {
      await clientVerify(code.trim());
      navigate('/espace-client', { replace: true });
    } catch (err) {
      setError(clientErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setNotice('');

    try {
      const result = await clientResend();
      setNotice(result.message);
      setCooldown(60);
    } catch (err) {
      setError(clientErrorMessage(err));
    }
  };

  const useAnotherAccount = () => {
    clearClientToken();
    navigate('/espace-client/connexion', { replace: true });
  };

  return (
    <main className="login">
      <h1>Vérifiez votre email</h1>
      <p>
        Nous avons envoyé un code à 6 chiffres à <strong>{email || 'votre adresse email'}</strong>.
        Saisissez-le pour activer votre espace client.
      </p>

      <form onSubmit={handleSubmit} className="form">
        {error && <p className="alert">{error}</p>}
        {notice && <p className="notice">{notice}</p>}

        <div className="field">
          <label htmlFor="code">Code de vérification</label>
          <input
            id="code"
            type="text"
            required
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            autoComplete="one-time-code"
            placeholder="123456"
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
          />
        </div>

        <button type="submit" disabled={loading || code.length !== 6}>
          {loading ? 'Vérification…' : 'Vérifier'}
        </button>
      </form>

      <p className="center">
        <button type="button" className="btn btn-secondary" disabled={cooldown > 0} onClick={handleResend}>
          {cooldown > 0 ? `Renvoyer le code (${cooldown} s)` : 'Renvoyer le code'}
        </button>
      </p>

      <p className="center">
        <button type="button" className="btn btn-secondary" onClick={useAnotherAccount}>
          Utiliser un autre compte
        </button>
      </p>
    </main>
  );
}