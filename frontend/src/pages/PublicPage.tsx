import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import { getCategories } from '../api';
import DynamicForm from '../components/DynamicForm';
import { PRODUCTS } from '../products';
import type { Product } from '../products';
import { CONTACT_URL, SITE, telHref } from '../siteConfig';
import type { Category, FormType } from '../types';

interface HubItem {
  product: Product;
  category?: Category;
  href?: string;
}

interface Selection {
  category: Category;
  label: string;
}

// Carte par défaut pour une catégorie absente de products.tsx
function genericProduct(category: Category): Product {
  return {
    key: category.slug,
    label: category.name,
    description: "Découvrez cette solution d'assurance",
    icon: <FileText size={32} />,
    tone: 'gray',
    slug: category.slug,
  };
}

// Vue 1 : les cartes des types d'assurance
function Hub({
  formType,
  onSelect,
}: {
  formType: FormType;
  onSelect: (selection: Selection) => void;
}) {
  const isClaim = formType === 'claim';
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getCategories(formType)
      .then(setCategories)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Erreur inattendue.'))
      .finally(() => setLoading(false));
  }, [formType]);

  const bySlug = new Map(categories.map((c) => [c.slug, c]));
  const knownSlugs = new Set(PRODUCTS.map((p) => p.slug).filter(Boolean));

  const items: HubItem[] = [];

  PRODUCTS.forEach((product) => {
    const category = product.slug ? bySlug.get(product.slug) : undefined;

    if (!isClaim && product.mainQuoteUrl) {
      // Le devis existe déjà sur le site principal : on y renvoie
      items.push({ product, href: product.mainQuoteUrl });
    } else if (category) {
      items.push({ product, category });
    }
  });

  categories
    .filter((c) => !knownSlugs.has(c.slug))
    .forEach((c) => items.push({ product: genericProduct(c), category: c }));

  return (
    <main className="page hub">
      <h1 className="hub-title">
        {isClaim ? 'Déclarez votre sinistre en ligne' : 'Demandez votre devis en ligne'}
      </h1>
      <p className="hub-subtitle">
        {isClaim
          ? "Sélectionnez le type d'assurance concerné par votre sinistre"
          : "Sélectionnez le type d'assurance qui vous intéresse"}
      </p>

      {isClaim && (
        <p className="urgent-note">
          En cas d'urgence, appelez notre ligne 24h/24 :{' '}
          <a href={telHref(SITE.emergencyPhone)}>{SITE.emergencyPhone}</a>
        </p>
      )}

      {error && <p className="alert">{error}</p>}
      {loading && <p className="center">Chargement…</p>}

      {!loading && items.length === 0 && !error && (
        <p className="center">Aucun formulaire disponible pour le moment.</p>
      )}

      {!loading && items.length > 0 && (
        <div className="hub-grid">
          {items.map(({ product, category, href }) => {
            const inner = (
              <>
                <span className="hub-icon">{product.icon}</span>
                <span className="hub-name">{product.label}</span>
                <span className="hub-desc">{product.description}</span>
              </>
            );

            return href ? (
              <a key={product.key} className={`hub-card tone-${product.tone}`} href={href}>
                {inner}
              </a>
            ) : (
              <button
                key={product.key}
                type="button"
                className={`hub-card tone-${product.tone}`}
                onClick={() => category && onSelect({ category, label: product.label })}
              >
                {inner}
              </button>
            );
          })}
        </div>
      )}

      {!isClaim && (
        <section className="hub-contact">
          <h2>Vous ne trouvez pas ce que vous cherchez ?</h2>
          <p>Notre équipe est à votre disposition pour répondre à toutes vos demandes spécifiques.</p>
          <a className="hub-contact-btn" href={CONTACT_URL}>
            Nous contacter
          </a>
        </section>
      )}
    </main>
  );
}

// Les deux vues d'un même service (sinistre ou devis)
function ServiceFlow({ formType }: { formType: FormType }) {
  const [selected, setSelected] = useState<Selection | null>(null);
  const isClaim = formType === 'claim';

  // Vue 2 : le formulaire
  if (selected) {
    return (
      <main className="page">
        <button type="button" className="back-btn" onClick={() => setSelected(null)}>
          <ArrowLeft size={16} /> Retour au choix du type d'assurance
        </button>

        <h1 className="page-title accent">
          {isClaim ? 'Déclaration de sinistre' : 'Demande de devis'} - {selected.label}
        </h1>
        <p className="page-subtitle">
          {isClaim
            ? 'Remplissez le formulaire ci-dessous pour déclarer votre sinistre.'
            : 'Remplissez le formulaire ci-dessous pour obtenir votre devis personnalisé.'}
        </p>

        <div className="form-wrap">
          <DynamicForm
            key={`${selected.category.slug}-${formType}`}
            category={selected.category}
            formType={formType}
          />
        </div>
      </main>
    );
  }

  return <Hub formType={formType} onSelect={setSelected} />;
}

export default function PublicPage() {
  const [params] = useSearchParams();
  const formType: FormType = params.get('service') === 'devis' ? 'quote' : 'claim';

  // La key recrée tout le parcours quand on change de service depuis l'en-tête
  return <ServiceFlow key={formType} formType={formType} />;
}