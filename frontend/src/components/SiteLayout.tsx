import { useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { Mail, MapPin, Menu, Phone, PhoneCall, X } from 'lucide-react';
import {
  DECLARATION_SINISTRE_URL,
  FOOTER_LEGAL_LINKS,
  FOOTER_LINKS,
  FOOTER_PRODUCT_LINKS,
  NAV_LINKS,
  SITE,
  telHref,
} from '../siteConfig';

function Brand({ footer = false }: { footer?: boolean }) {
  return (
    <a
      className={footer ? 'brand brand-footer' : 'brand'}
      href={SITE.mainUrl}
      aria-label={`${SITE.name} - site principal`}
    >
      <span className={footer ? 'logo-box' : 'logo-plain'}>
        <img src="/logo-icon.png" alt="" height={40} />
      </span>
      <span className="brand-text">
        <span className="brand-ld">LD</span> ASSURANCES SA
      </span>
    </a>
  );
}

// Icônes sociales (copiées telles quelles du site original)
function FacebookIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function TwitterIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
    </svg>
  );
}

function LinkedinIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect width="4" height="12" x="2" y="9" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

const SOCIALS = [
  { label: 'Facebook', icon: <FacebookIcon />, cls: 'facebook' },
  { label: 'Twitter', icon: <TwitterIcon />, cls: 'twitter' },
  { label: 'LinkedIn', icon: <LinkedinIcon />, cls: 'linkedin' },
  { label: 'Instagram', icon: <InstagramIcon />, cls: 'instagram' },
];

export default function SiteLayout() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <div className="site">
      <div className="topbar">
        <div className="topbar-inner">
          <div className="topbar-contact">
            <a href={telHref(SITE.phones[0])}>
              <Phone size={14} /> {SITE.phones[0]}
            </a>
            <a className="topbar-email" href={`mailto:${SITE.email}`}>
              <Mail size={14} /> {SITE.email}
            </a>
            <span className="topbar-address">
              <MapPin size={14} /> {SITE.address}
            </span>
          </div>
          <div className="topbar-agencies">Nos Agences : {SITE.agencies.join(' | ')}</div>
        </div>
      </div>

      <header className="site-header">
        <div className="site-header-inner">
          <Brand />

          <button
            type="button"
            className="menu-toggle"
            aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={open}
            aria-controls="site-nav"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>

          <nav id="site-nav" className={open ? 'site-nav open' : 'site-nav'}>
            {NAV_LINKS.map((link) => (
              <a key={link.label} href={link.href}>
                {link.label}
              </a>
            ))}
            <Link className="btn btn-gradient btn-sm" to="/?service=devis" onClick={close}>
              Devis en Ligne
            </Link>
            <a
              className="btn btn-danger btn-sm"
              href={DECLARATION_SINISTRE_URL}
              onClick={close}
            >
              Déclaration Sinistre
            </a>
          </nav>
        </div>
      </header>

      <Outlet />

      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-about">
            <div className="footer-brand-row">
              <span className="logo-box">
                <img src="/logo-icon.png" alt="" />
              </span>
              <div>
                <h4 className="footer-title-gradient">{SITE.name}</h4>
                <p className="footer-tagline">{SITE.tagline}</p>
              </div>
            </div>
            <p className="footer-desc">{SITE.description}</p>
            <ul className="footer-list">
              <li>
                <MapPin size={18} />
                <span>
                  {SITE.address}
                  <br />
                  <small>{SITE.postalBox}</small>
                </span>
              </li>
              <li>
                <Phone size={18} />
                <span>
                  {SITE.phones.map((phone) => (
                    <a key={phone} href={telHref(phone)}>
                      {phone}
                      <br />
                    </a>
                  ))}
                </span>
              </li>
              <li>
                <Mail size={18} />
                <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="footer-heading">Nos Produits</h4>
            <ul className="footer-links">
              {FOOTER_PRODUCT_LINKS.map((link) => (
                <li key={link.label}>
                  <a href={link.href}>{link.label}</a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="footer-heading">Liens Utiles</h4>
            <ul className="footer-links">
              {FOOTER_LINKS.map((link) => (
                <li key={link.label}>
                  <a href={link.href}>{link.label}</a>
                </li>
              ))}
            </ul>
          </div>

          <div className="footer-hours-col">
            <h4 className="footer-heading">Horaires d'Ouverture</h4>
            <div className="hours">
              {SITE.hours.map((row) => (
                <div key={row.day}>
                  <span>{row.day}</span>
                  <span>{row.time}</span>
                </div>
              ))}
            </div>

            <div className="emergency">
              <h3>
                <PhoneCall size={18} /> Urgence Sinistre 24/7
              </h3>
              <p>
                En cas de sinistre urgent, contactez notre ligne d'urgence disponible 24h/24 et
                7j/7.
              </p>
              <a className="phone" href={telHref(SITE.emergencyPhone)}>
                {SITE.emergencyPhone}
              </a>
            </div>

            <div className="socials-wrap">
              <h4 className="footer-heading">Suivez-nous</h4>
              <div className="socials">
                {SOCIALS.map((social) => (
                  <a
                    key={social.label}
                    href="#"
                    aria-label={social.label}
                    className={`social ${social.cls}`}
                  >
                    {social.icon}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="trust">
          {SITE.badges.map((badge) => (
            <div key={badge.name}>
              <strong>{badge.name}</strong>
              <span>{badge.text}</span>
            </div>
          ))}
        </div>

        <div className="footer-legal">
          <p>
            © {new Date().getFullYear()} {SITE.name}. Tous droits réservés.
          </p>
          <p>{SITE.legal}</p>
          <div className="footer-legal-links">
            {FOOTER_LEGAL_LINKS.map((link) => (
              <a key={link.label} href={link.href}>
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
