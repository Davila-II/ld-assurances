import { useState } from 'react';
import type { FormEvent } from 'react';

export default function ProfilePage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  // Enregistrement réel à venir (l'authentification sera branchée plus tard)
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  return (
    <div className="client-content-inner">
      <h1 className="client-page-title">Mon profil</h1>
      <p className="client-page-subtitle">Modifiez vos informations personnelles.</p>

      <form onSubmit={handleSubmit} className="form">
        <div className="field">
          <label htmlFor="name">Nom et prénom</label>
          <input
            id="name"
            type="text"
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
            placeholder="Ex : 6 90 12 34 56"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="address">Adresse (quartier, ville)</label>
          <input
            id="address"
            type="text"
            placeholder="Ex : Akwa, Douala"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
          />
        </div>

        <button type="submit">Enregistrer</button>
      </form>
    </div>
  );
}
