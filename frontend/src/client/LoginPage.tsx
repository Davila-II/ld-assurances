import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Authentification réelle à venir : on entre simplement dans l'espace client pour l'instant
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigate('/espace-client');
  };

  return (
    <main className="login">
      <h1>Espace client</h1>
      <p>Connectez-vous pour suivre vos demandes, contrats et documents.</p>

      <form onSubmit={handleSubmit} className="form">
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

        <button type="submit">Se connecter</button>
      </form>

      <p className="center">
        Pas encore de compte ? <Link to="/espace-client/inscription">Créer un compte</Link>
      </p>
    </main>
  );
}
