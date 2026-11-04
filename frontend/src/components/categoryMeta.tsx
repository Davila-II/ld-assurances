import type { ReactNode } from 'react';
import { Briefcase, Car, FileText, HeartPulse, House, ShieldCheck, Sprout, Truck } from 'lucide-react';

export interface CategoryMeta {
  icon: ReactNode;
  description: string;
  tone: string;
}

const META: Record<string, CategoryMeta> = {
  auto: {
    icon: <Car size={26} />,
    description: 'Assurance auto complète, au tiers ou intermédiaire',
    tone: 'blue',
  },
  habitation: {
    icon: <House size={26} />,
    description: 'Protection de votre logement et de vos biens',
    tone: 'green',
  },
  personne: {
    icon: <HeartPulse size={26} />,
    description: 'Santé, accidents et prévoyance',
    tone: 'pink',
  },
  entreprise: {
    icon: <Briefcase size={26} />,
    description: 'Protection de votre activité professionnelle',
    tone: 'purple',
  },
  transport: {
    icon: <Truck size={26} />,
    description: 'Protection de vos marchandises transportées',
    tone: 'cyan',
  },
  agricole: {
    icon: <Sprout size={26} />,
    description: 'Protection de vos cultures et de votre élevage',
    tone: 'green',
  },
  'responsabilite-civile': {
    icon: <ShieldCheck size={26} />,
    description: 'Protection contre les dommages causés à autrui',
    tone: 'yellow',
  },
};

const DEFAULT_META: CategoryMeta = {
  icon: <FileText size={26} />,
  description: 'Découvrez cette solution d’assurance',
  tone: 'gray',
};

export function getCategoryMeta(slug: string): CategoryMeta {
  return META[slug] ?? DEFAULT_META;
}