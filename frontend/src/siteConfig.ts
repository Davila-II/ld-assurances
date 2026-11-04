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

export const NAV_LINKS = [
  { label: 'Accueil', href: `${MAIN_URL}/` },
  { label: 'Nos Produits', href: `${MAIN_URL}/produits` },
  { label: 'À Propos', href: `${MAIN_URL}/#about` },
  { label: 'Blog', href: `${MAIN_URL}/blog` },
  { label: 'Contact', href: `${MAIN_URL}/contact` },
];

// Liens vers les devis dont le formulaire existe déjà sur le site principal
// (auto, voyage, professionnelle) : on y renvoie plutôt que de les refaire ici.
export const DEVIS_URLS: Record<string, string> = {
  auto: `${MAIN_URL}/devis/auto`,
  voyage: `${MAIN_URL}/devis/voyage`,
  professionnelle: `${MAIN_URL}/devis/professionnelle`,
};

// La déclaration de sinistre est gérée sur le site principal
export const DECLARATION_SINISTRE_URL = `${MAIN_URL}/declaration-sinistre`;

// Pied de page : colonne « Nos Produits »
export const FOOTER_PRODUCT_LINKS = [
  { label: 'Assurance Automobile', href: `${MAIN_URL}/services/assurance-auto` },
  { label: 'Assurance Habitation', href: `${MAIN_URL}/services/assurance-habitation` },
  { label: 'Assurance Entreprise', href: `${MAIN_URL}/services/assurance-entreprise` },
  { label: 'Assurance Santé', href: `${MAIN_URL}/services/assurance-sante` },
  { label: 'Assurance Transport', href: `${MAIN_URL}/services/assurance-transport` },
  { label: 'Assurance Agricole', href: `${MAIN_URL}/services/assurance-agricole` },
];

// Pied de page : colonne « Liens Utiles »
export const FOOTER_LINKS = [
  { label: 'À Propos', href: `${MAIN_URL}/#apropos` },
  { label: 'Nos Services', href: `${MAIN_URL}/services` },
  { label: 'Devis Auto', href: `${MAIN_URL}/devis/auto` },
  { label: 'Devis Voyage', href: `${MAIN_URL}/devis/voyage` },
  { label: 'Devis en Ligne', href: `${MAIN_URL}/devis` },
  { label: 'Espace Client', href: `${MAIN_URL}/espace-client` },
  { label: 'Déclaration Sinistre', href: `${MAIN_URL}/declaration-sinistre` },
  { label: 'FAQ', href: `${MAIN_URL}/faq` },
  { label: 'Actualités', href: `${MAIN_URL}/actualites` },
  { label: 'Carrières', href: `${MAIN_URL}/carrieres` },
  { label: 'Avis Clients', href: `${MAIN_URL}/avis` },
  { label: 'Conformité', href: `${MAIN_URL}/conformite` },
];

// Pied de page : liens légaux
export const FOOTER_LEGAL_LINKS = [
  { label: 'Mentions Légales', href: `${MAIN_URL}/mentions-legales` },
  { label: 'Politique de Confidentialité', href: `${MAIN_URL}/politique-confidentialite` },
  { label: 'Politique de Cookies', href: `${MAIN_URL}/politique-cookies` },
  { label: 'Conditions Générales', href: `${MAIN_URL}/conditions-generales` },
];

// Bouton « Nous contacter » de la page de devis
export const CONTACT_URL = `${MAIN_URL}/contact`;

// Transforme un numéro affiché en lien d'appel
export const telHref = (phone: string): string => `tel:+${phone.replace(/\D/g, '')}`;