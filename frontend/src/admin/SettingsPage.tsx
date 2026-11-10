import { Link } from 'react-router-dom';
import { Layers, Shield } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { hasPermission } from '../auth';

export default function SettingsPage() {
  const { t } = useLanguage();

  const allCards = [
    {
      icon: <Layers size={32} className="settings-card-icon" />,
      title: t('settings.form_builder_title'),
      desc: t('settings.form_builder_desc'),
      btn: t('settings.form_builder_btn'),
      to: '/admin/formulaires',
      accent: '#1e4d8f',
      bg: '#eaf1fc',
      permission: 'manage_form_builder',
    },
    {
      icon: <Shield size={32} className="settings-card-icon" />,
      title: t('settings.roles_title'),
      desc: t('settings.roles_desc'),
      btn: t('settings.roles_btn'),
      to: '/admin/roles',
      accent: '#0e7a6e',
      bg: '#e6f7f5',
      permission: 'manage_roles',
    },
  ];

  const cards = allCards.filter((card) => hasPermission(card.permission));

  return (
    <div className="settings-root">
      {/* En-tête */}
      <div className="settings-header">
        <div>
          <h1 className="settings-title">{t('settings.title')}</h1>
          <p className="settings-subtitle">{t('settings.subtitle')}</p>
        </div>
      </div>

      {/* Grille de cartes */}
      <div className="settings-grid">
        {cards.map((card) => (
          <div key={card.to} className="settings-card">
            <div className="settings-card-icon-wrap" style={{ background: card.bg, color: card.accent }}>
              {card.icon}
            </div>
            <div className="settings-card-body">
              <h2 className="settings-card-title" style={{ color: card.accent }}>
                {card.title}
              </h2>
              <p className="settings-card-desc">{card.desc}</p>
            </div>
            <div className="settings-card-footer">
              <Link to={card.to} className="settings-card-btn" style={{ background: card.accent }}>
                {card.btn}
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
