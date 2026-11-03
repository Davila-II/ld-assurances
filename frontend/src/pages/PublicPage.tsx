import { useEffect, useState } from 'react';
import { getCategories } from '../api';
import type { Category } from '../types';
import DynamicForm from '../components/DynamicForm';

export default function PublicPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selected, setSelected] = useState<Category | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Erreur inattendue.'));
  }, []);

  return (
    <main className="container">
      <h1>Déclaration de sinistre</h1>
      <p>Choisissez le type d'assurance concerné.</p>

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

      {selected && <DynamicForm category={selected} formType="claim" />}
    </main>
  );
}