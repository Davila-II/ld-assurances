import type { ReactNode } from 'react';
import { Briefcase, Car, FileText, HeartPulse, House, Plane, Shield } from 'lucide-react';
import type { TranslationKey } from './i18n/translations';

export interface Product {
  key: string;
  label: string;
  description: string;
  labelKey?: TranslationKey;
  descKey?: TranslationKey;
  icon: ReactNode;
  tone: string;
  // Slug de la catégorie côté backend pour les devis gérés ici
  slug: string;
  mainQuoteUrl?: string;
}

export const PRODUCTS: Product[] = [
  {
    key: 'auto',
    label: 'Auto',
    description: 'Assurance auto complète, au tiers ou intermédiaire',
    labelKey: 'product.auto.label',
    descKey: 'product.auto.desc',
    icon: <Car size={32} />,
    tone: 'blue',
    slug: 'auto',
  },
  {
    key: 'voyage',
    label: 'Voyage',
    description: 'Assurance voyage et assistance partout dans le monde',
    labelKey: 'product.voyage.label',
    descKey: 'product.voyage.desc',
    icon: <Plane size={32} />,
    tone: 'cyan',
    slug: 'voyage',
  },
  {
    key: 'habitation',
    label: 'Habitation',
    description: 'Protection de votre logement et de vos biens',
    labelKey: 'product.habitation.label',
    descKey: 'product.habitation.desc',
    icon: <House size={32} />,
    tone: 'green',
    slug: 'habitation',
  },
  {
    key: 'sante',
    label: 'Santé',
    description: 'Complémentaire santé et prévoyance',
    labelKey: 'product.sante.label',
    descKey: 'product.sante.desc',
    icon: <HeartPulse size={32} />,
    tone: 'red',
    slug: 'personne',
  },
  {
    key: 'professionnelle',
    label: 'Professionnelle',
    description: 'Protection de votre activité professionnelle',
    labelKey: 'product.pro.label',
    descKey: 'product.pro.desc',
    icon: <Briefcase size={32} />,
    tone: 'purple',
    slug: 'professionnelle',
  },
  {
    key: 'responsabilite-civile',
    label: 'Responsabilité Civile',
    description: 'Protection contre les dommages causés à autrui',
    labelKey: 'product.rc.label',
    descKey: 'product.rc.desc',
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
