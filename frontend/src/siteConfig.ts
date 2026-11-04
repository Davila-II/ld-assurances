const MAIN_URL = 'https://www.ldassurances.cm';

export const SITE = {
  name: 'LD ASSURANCES SA',
  tagline: 'Assurément Proche de Vous',
  mainUrl: MAIN_URL,
  description:
    "Votre partenaire de confiance pour toutes vos solutions d'assurance au Cameroun. Nous nous engageons à vous offrir des services conformes au code CIMA avec un accompagnement personnalisé.",
  phones: ['(237) 640 65 67 93', '(237) 233 43 99 24', '(237) 233 42 51 82'],
  emergencyPhone: '+237 640 65 67 93',
  email: 'contact@ldassurances.cm',
  address: 'Carrefour Arno, Akwa-Douala',
  postalBox: 'B.P : 2854 – DOUALA – CAMEROUN',
  agencies: ['DOUALA', 'YAOUNDE', 'BAFOUSSAM'],
  hours: [
    { day: 'Lundi - Vendredi', time: '08:00 - 17:30' },
    { day: 'Samedi', time: '09:00 - 13:00' },
    { day: 'Dimanche', time: 'Fermé' },
  ],
  badges: [
    { name: 'CIMA', text: 'Conforme Code CIMA' },
    { name: 'MINFI', text: 'Agréé Ministère Finances' },
    { name: 'OHADA', text: 'Acte Conforme' },
  ],
  legal:
    'Société Anonyme au capital de 5 000 000 000 FCFA entièrement libéré | Agréée par arrêté N°0000815/MINFI du 15 NOV 2024',
};

// À VÉRIFIER : ces adresses sont des suppositions. Remplace-les par les vraies
// (survole chaque lien du menu sur le site principal pour voir son adresse).
export const NAV_LINKS = [
  { label: 'Accueil', href: `${MAIN_URL}/` },
  { label: 'Nos Produits', href: `${MAIN_URL}/services` },
  { label: 'À Propos', href: `${MAIN_URL}/a-propos` },
  { label: 'Blog', href: `${MAIN_URL}/blog` },
  { label: 'Contact', href: `${MAIN_URL}/contact` },
];

// Catégories dont le devis existe déjà sur le site principal : on ne le refait pas ici
export const QUOTE_ON_MAIN_SITE = ['auto'];
export const MAIN_QUOTE_URL = MAIN_URL; // À remplacer par l'adresse de leur page « Devis en ligne »

// Transforme un numéro affiché en lien d'appel
export const telHref = (phone: string): string => `tel:+${phone.replace(/\D/g, '')}`;