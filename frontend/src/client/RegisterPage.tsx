import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  // Inscription réelle à venir : on entre simplement dans l'espace client pour l'instant
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigate('/espace-client');
  };

  return (
    <main className="login">
      <h1>Créer un compte</h1>
      <p>Créez votre espace client pour suivre vos demandes en ligne.</p>

      <form onSubmit={handleSubmit} className="form">
        <div className="field">
          <label htmlFor="name">Nom et prénom</label>
          <input
            id="name"
            type="text"
            required
            autoComplete="name"
            placeholder="Ex : Jean Dupont"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>

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
          <label htmlFor="phone">Téléphone</label>
          <input
            id="phone"
            type="tel"
            autoComplete="tel"
            placeholder="Ex : 6 90 12 34 56"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="password">Mot de passe</label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
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

        <button type="submit">S'inscrire</button>
      </form>

      <p className="center">
        Déjà un compte ? <Link to="/espace-client/connexion">Se connecter</Link>
      </p>
    </main>
  );
}
