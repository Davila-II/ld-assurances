import { useEffect, useState } from 'react';
import { getCategories } from '../api';
import type { Category, FormType } from '../types';
import DynamicForm from '../components/DynamicForm';
import './PublicPage.css';

export default function PublicPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selected, setSelected] = useState<Category | null>(null);
  const [formType, setFormType] = useState<FormType>('claim');
  const [error, setError] = useState('');

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Erreur inattendue.'));
  }, []);

  return (
    <main className="container">
      <h1>LD Assurances en ligne</h1>
      <p>Que souhaitez-vous faire ?</p>

      <div className="service-tabs">
        <button
          type="button"
          className={formType === 'claim' ? 'active' : ''}
          aria-pressed={formType === 'claim'}
          onClick={() => setFormType('claim')}
        >
          Déclarer un sinistre
        </button>
        <button
          type="button"
          className={formType === 'quote' ? 'active' : ''}
          aria-pressed={formType === 'quote'}
          onClick={() => setFormType('quote')}
        >
          Demander un devis
        </button>
      </div>

      <p className="step-title">Choisissez le type d'assurance concerné.</p>

      {error && <p className="error">{error}</p>}

      <div className="categories">
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            className={selected?.id === category.id ? 'active' : ''}
            onClick={() => setSelected(category)}
          >
            {category.name}
          </button>
        ))}
      </div>

      {selected && <DynamicForm category={selected} formType={formType} />}
    </main>
  );
}