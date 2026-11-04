import type { ReactNode } from 'react';
import { Briefcase, Car, FileText, HeartPulse, House, Plane, Shield } from 'lucide-react';
import { DEVIS_URLS } from './siteConfig';

export interface Product {
  key: string;
  label: string;
  description: string;
  icon: ReactNode;
  tone: string;
  // Slug de la catégorie côté backend pour les devis gérés ici.
  // null quand le devis est déjà géré sur le site principal (lien sortant).
  slug: string | null;
  mainQuoteUrl?: string;
}

export const PRODUCTS: Product[] = [
  {
    key: 'auto',
    label: 'Auto',
    description: 'Assurance auto complète, au tiers ou intermédiaire',
    icon: <Car size={32} />,
    tone: 'blue',
    slug: 'auto',
    mainQuoteUrl: DEVIS_URLS.auto,
  },
  {
    key: 'voyage',
    label: 'Voyage',
    description: 'Assurance voyage et assistance partout dans le monde',
    icon: <Plane size={32} />,
    tone: 'cyan',
    slug: null,
    mainQuoteUrl: DEVIS_URLS.voyage,
  },
  {
    key: 'habitation',
    label: 'Habitation',
    description: 'Protection de votre logement et de vos biens',
    icon: <House size={32} />,
    tone: 'green',
    slug: 'habitation',
  },
  {
    key: 'sante',
    label: 'Santé',
    description: 'Complémentaire santé et prévoyance',
    icon: <HeartPulse size={32} />,
    tone: 'red',
    slug: 'personne',
  },
  {
    key: 'professionnelle',
    label: 'Professionnelle',
    description: 'Protection de votre activité professionnelle',
    icon: <Briefcase size={32} />,
    tone: 'purple',
    slug: null,
    mainQuoteUrl: DEVIS_URLS.professionnelle,
  },
  {
    key: 'responsabilite-civile',
    label: 'Responsabilité Civile',
    description: 'Protection contre les dommages causés à autrui',
    icon: <Shield size={32} />,
    tone: 'yellow',
    slug: 'responsabilite-civile',
  },
  {
    key: 'autres',
    label: 'Autres assurances',
    description: "Découvrez nos autres solutions d'assurance",
    icon: <FileText size={32} />,
    tone: 'gray',
    slug: 'autres',
  },
];
