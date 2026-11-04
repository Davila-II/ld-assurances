import { useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { Clock, Mail, MapPin, Menu, Phone, PhoneCall, X } from 'lucide-react';
import { NAV_LINKS, SITE, telHref } from '../siteConfig';

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
            <Link className="btn btn-danger btn-sm" to="/?service=sinistre" onClick={close}>
              Déclaration Sinistre
            </Link>
          </nav>
        </div>
      </header>

      <Outlet />

      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <Brand footer />
            <p className="footer-tagline">{SITE.tagline}</p>
            <p>{SITE.description}</p>
          </div>

          <div>
            <h3>Contact</h3>
            <ul className="footer-list">
              <li>
                <MapPin size={16} />
                <span>
                  {SITE.address}
                  <br />
                  <small>{SITE.postalBox}</small>
                </span>
              </li>
              <li>
                <Phone size={16} />
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
                <Mail size={16} />
                <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
              </li>
            </ul>
          </div>

          <div>
            <h3>
              <Clock size={16} /> Horaires d'ouverture
            </h3>
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
          <p>
            <a href={SITE.mainUrl}>Retour au site principal</a>
          </p>
        </div>
      </footer>
    </div>
  );
}