import { useState, useRef, useEffect, useCallback, type FormEvent } from 'react';
import { X, Send } from 'lucide-react';
import assitImg from '../images/assit.png';
import whatsappImg from '../images/whatsapp.png';
import { SITE } from '../siteConfig';
import { useLanguage } from '../i18n/LanguageContext';
import type { Lang, TranslationKey } from '../i18n/translations';

// ── Types ─────────────────────────────────────────────────────────────────

type ReplyButton = {
  label: string;
  href: string;
  external?: boolean;
};

type ReplyContent = {
  text: string;
  infoLines?: string[];
  suggestions?: string[];
  buttons?: ReplyButton[];
};

type Message = {
  from: 'bot' | 'user';
  text: string;
  content?: ReplyContent;
};

// ── Base de réponses bilingue (FR / EN) ────────────────────────────────────

function getBotReply(
  question: string,
  lang: Lang,
  t: (key: TranslationKey, params?: Record<string, string | number>) => string
): { text: string; content: ReplyContent } {
  const q = question.toLowerCase().trim();
  const isEn = lang === 'en';

  /* ── 1. Obtenir un devis / Get a quote ── */
  if (
    (q.includes('devis') && !q.includes('auto') && !q.includes('réduire')) ||
    (q.includes('quote') && !q.includes('auto') && !q.includes('car') && !q.includes('reduce'))
  ) {
    return {
      text: isEn ? 'Here is how to get a quote.' : 'Voici comment obtenir un devis.',
      content: {
        text: isEn
          ? 'The online quote is free and without obligation. It gives you an estimate of premiums based on chosen guarantees. The contract only takes effect after your acceptance, payment of the first premium, and policy issuance. You can obtain a quote for motor, travel, and business insurance directly online.'
          : "Le devis en ligne est gratuit et sans engagement. Il vous donne une estimation des primes selon les garanties choisies. Le contrat ne prend effet qu'après votre acceptation, le paiement de la première prime et la délivrance de la police. Vous pouvez obtenir un devis pour l'auto, le voyage et l'assurance professionnelle directement en ligne.",
        suggestions: isEn
          ? ['Is the online quote binding?', 'Motor insurance quote']
          : ['Le devis en ligne est-il engageant ?', 'Devis assurance auto'],
        buttons: [{ label: t('assistant.btn_quote'), href: '/?service=devis' }],
      },
    };
  }

  /* ── 2. Déclarer un sinistre / Report a claim ── */
  if (q.includes('sinistre') || q.includes('claim') || q.includes('déclarer') || q.includes('report')) {
    return {
      text: isEn ? 'Here is how to report a claim.' : 'Voici comment déclarer un sinistre.',
      content: {
        text: isEn
          ? `You can report a claim via the online form (under "File a Claim"), by email at ${SITE.email}, or directly at one of our branches. The declaration must be made within the contractual deadline (generally 5 working days). A file reference number will be assigned to you in the format LD-DS-XXXX-DDMMYYYY.`
          : `Vous pouvez déclarer un sinistre via le formulaire en ligne (rubrique « Déclaration Sinistre »), par e-mail à ${SITE.email}, ou directement en agence. La déclaration doit intervenir dans les délais prévus au contrat (généralement 5 jours ouvrés). Un numéro de dossier vous sera attribué au format LD-DS-XXXX-JJMMAAAA.`,
        buttons: [{ label: t('assistant.btn_claim'), href: '/?service=sinistre' }],
      },
    };
  }

  /* ── 3. Documents / devis auto / Car quote ── */
  if (
    (q.includes('auto') || q.includes('car') || q.includes('véhicule') || q.includes('vehicle')) &&
    (q.includes('document') || q.includes('devis') || q.includes('quote') || q.includes('prime') || q.includes('premium'))
  ) {
    return {
      text: isEn ? 'Here is what you need for a car insurance quote.' : "Voici ce qu'il faut savoir pour un devis auto.",
      content: {
        text: isEn
          ? 'Our car insurance premium calculator complies with CIMA ministerial tariffs. It takes into account vehicle category, circulation zone, fiscal horsepower, fuel type, and selected covers. The calculation is done in real time with the full breakdown: third-party liability, covers, VAT, DTA, accessories.'
          : 'Notre calculateur de prime auto est conforme aux tarifs ministériels CIMA. Il prend en compte la catégorie du véhicule, la zone de circulation, la puissance fiscale, le carburant, et les garanties choisies. Le calcul se fait en temps réel avec le détail complet : prime RC, garanties, TVA, DTA, accessoires.',
        suggestions: isEn
          ? ['Motor Vehicle Insurance', 'What documents to provide for a car quote?']
          : ['Assurance Auto', 'Quels documents fournir pour un devis auto ?'],
        buttons: [{ label: t('assistant.btn_calc_auto'), href: '/?service=devis' }],
      },
    };
  }

  /* ── 4. Contacter LD ASSURANCES / Contact ── */
  if (
    q.includes('contacter') ||
    q.includes('contact') ||
    q.includes('adresse') ||
    q.includes('address') ||
    q.includes('téléphone') ||
    q.includes('phone') ||
    q.includes('email') ||
    q.includes('agence') ||
    q.includes('branch')
  ) {
    return {
      text: isEn ? 'Here are our contact details.' : 'Voici nos coordonnées.',
      content: {
        text: '',
        infoLines: isEn
          ? [
              `Address: ${SITE.address}, Cameroon`,
              `Phones: ${SITE.phones.join(' / ')}`,
              `Email: ${SITE.email}`,
              'Working hours: Mon-Fri 08:00-17:30, Sat 09:00-13:00, Sun closed',
            ]
          : [
              `Adresse : ${SITE.address}, Cameroun`,
              `Téléphones : ${SITE.phones.join(' / ')}`,
              `Email : ${SITE.email}`,
              'Horaires : Lun-Ven 08h00-17h30, Sam 09h00-13h00, Dim fermé',
            ],
        buttons: [{ label: t('assistant.btn_contact_page'), href: 'https://www.ldassurances.cm/contact/', external: true }],
      },
    };
  }

  /* ── 5. CIMA ── */
  if (q.includes('cima')) {
    return {
      text: isEn ? 'What is CIMA.' : "Voici ce qu'est le CIMA.",
      content: {
        text: isEn
          ? 'CIMA (Inter-African Conference on Insurance Markets) is a regional organization bringing together 14 member States (including Cameroon) sharing a unified code governing insurance activities in the CFA zone.'
          : "Le CIMA (Conférence Interafricaine des Marchés d'Assurance) est une organisation régionale regroupant 14 États membres (dont le Cameroun) qui partage un code unique régissant l'activité d'assurance dans la zone CFA.",
        buttons: [
          { label: t('assistant.btn_cima_lexique'), href: 'https://www.ldassurances.cm/lexique/', external: true },
        ],
      },
    };
  }

  /* ── 6. Réduire ma prime / Reduce my premium ── */
  if (
    q.includes('réduire') ||
    q.includes('reduce') ||
    q.includes('lower') ||
    q.includes('prime') ||
    q.includes('premium') ||
    q.includes('cotisation')
  ) {
    return {
      text: isEn ? 'Here is how to optimize your premium.' : 'Voici comment optimiser votre prime.',
      content: {
        text: isEn
          ? 'The online quote is free and without obligation. It gives you an estimate of premiums based on chosen guarantees. The contract only takes effect after your acceptance, payment of the first premium, and policy issuance. You can obtain a quote for motor, travel, and business insurance directly online.'
          : "Le devis en ligne est gratuit et sans engagement. Il vous donne une estimation des primes selon les garanties choisies. Le contrat ne prend effet qu'après votre acceptation, le paiement de la première prime et la délivrance de la police. Vous pouvez obtenir un devis pour l'auto, le voyage et l'assurance professionnelle directement en ligne.",
        suggestions: isEn
          ? ['How to reduce my premium?', 'How is home insurance premium calculated?']
          : ['Comment réduire ma prime ?', "Comment est calculée la prime d'habitation ?"],
        buttons: [{ label: t('assistant.btn_quote'), href: '/?service=devis' }],
      },
    };
  }

  /* ── 7. Réponse par défaut / Fallback ── */
  return {
    text: isEn
      ? 'I could not find a specific answer to your question.'
      : "Je n'ai pas trouvé de réponse précise à votre question.",
    content: {
      text: isEn
        ? 'I could not find a specific answer to your question. You can:'
        : "Je n'ai pas trouvé de réponse précise à votre question. Vous pouvez :",
      infoLines: isEn
        ? [
            '• Browse our complete FAQ',
            `• Call us at ${SITE.phones[0]}`,
            `• Send an email to ${SITE.email}`,
            '• Or use one of the links below.',
          ]
        : [
            '• Parcourir notre FAQ complète',
            `• Nous contacter au ${SITE.phones[0]}`,
            `• Envoyer un email à ${SITE.email}`,
            '• Ou utiliser un des liens ci-dessous.',
          ],
      buttons: [
        { label: t('assistant.btn_contact_advisor'), href: 'https://www.ldassurances.cm/contact/', external: true },
      ],
    },
  };
}

// ── Composant de rendu d'une réponse riche ─────────────────────────────────

function BotBubble({ msg, suggestionsLabel }: { msg: Message; suggestionsLabel: string }) {
  const c = msg.content;
  return (
    <div className="assistant-msg-bubble">
      {c?.text && <p style={{ margin: 0 }}>{c.text}</p>}

      {c?.infoLines && c.infoLines.length > 0 && (
        <ul className="assistant-info-lines">
          {c.infoLines.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      )}

      {c?.suggestions && c.suggestions.length > 0 && (
        <div className="assistant-suggestions">
          <span className="assistant-suggestions-label">{suggestionsLabel}</span>
          <ul>
            {c.suggestions.map((s, i) => (
              <li key={i}>• {s}</li>
            ))}
          </ul>
        </div>
      )}

      {c?.buttons && c.buttons.length > 0 && (
        <div className="assistant-reply-btns">
          {c.buttons.map((btn, i) => (
            <a
              key={i}
              href={btn.href}
              className="assistant-reply-btn"
              {...(btn.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            >
              {btn.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Composant principal ────────────────────────────────────────────────────

export default function AssistantWidget() {
  const { lang, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => [
    { from: 'bot', text: t('assistant.welcome') },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [showQuick, setShowQuick] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isFirstMount = useRef(true);

  // Adaptation automatique du message de bienvenue lors d'un changement de langue
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    setMessages((prev) => {
      if (prev.length <= 1) {
        return [{ from: 'bot', text: t('assistant.welcome') }];
      }
      return prev;
    });
  }, [lang, t]);

  useEffect(() => {
    if (open && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open, typing]);

  const quickQuestions = [
    t('assistant.q_quote'),
    t('assistant.q_claim'),
    t('assistant.q_auto'),
    t('assistant.q_contact'),
    t('assistant.q_cima'),
    t('assistant.q_reduce_premium'),
  ];

  const sendMessage = useCallback((text: string) => {
    if (!text.trim()) return;
    setShowQuick(false);
    setMessages((prev) => [...prev, { from: 'user', text: text.trim() }]);
    setInput('');
    setTyping(true);
    const delay = 800 + (Date.now() % 400);
    setTimeout(() => {
      setTyping(false);
      const { text: botText, content } = getBotReply(text, lang, t);
      setMessages((prev) => [...prev, { from: 'bot', text: botText, content }]);
    }, delay);
  }, [lang, t]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  const whatsappNumber = SITE.emergencyPhone.replace(/\D/g, '');
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(t('assistant.whatsapp_msg'))}`;

  return (
    <>
      {/* ── Bouton flottant "Besoin d'aide ?" ─────────────────────────────── */}
      {!open && (
        <button
          className="assistant-trigger"
          onClick={() => setOpen(true)}
          aria-label={t('assistant.trigger_bubble')}
          type="button"
        >
          <span className="assistant-trigger-bubble">{t('assistant.trigger_bubble')}</span>
          <img src={assitImg} alt={t('assistant.name')} className="assistant-trigger-avatar" />
          <span className="assistant-online-dot" aria-hidden="true" />
        </button>
      )}

      {/* ── Fenêtre de chat ────────────────────────────────────────────────── */}
      {open && (
        <div className="assistant-panel" role="dialog" aria-label={t('assistant.name')} aria-modal="true">
          {/* En-tête */}
          <div className="assistant-header">
            <div className="assistant-header-info">
              <div className="assistant-header-avatar-wrap">
                <img src={assitImg} alt="" className="assistant-header-avatar" aria-hidden="true" />
                <span className="assistant-online-dot" aria-hidden="true" />
              </div>
              <div>
                <div className="assistant-header-name">{t('assistant.name')}</div>
                <div className="assistant-header-status">
                  <span className="assistant-status-dot" aria-hidden="true" />
                  {t('assistant.status_online')}
                </div>
              </div>
            </div>
            <button
              className="assistant-close"
              onClick={() => setOpen(false)}
              aria-label="Fermer"
              type="button"
            >
              <X size={18} />
            </button>
          </div>

          {/* Zone de messages */}
          <div className="assistant-messages" aria-live="polite">
            {messages.map((msg, i) => (
              <div key={i} className={`assistant-msg assistant-msg-${msg.from}`}>
                {msg.from === 'bot' && (
                  <img src={assitImg} alt="" className="assistant-msg-avatar" aria-hidden="true" />
                )}
                {msg.from === 'bot' && msg.content ? (
                  <BotBubble msg={msg} suggestionsLabel={t('assistant.suggestions_label')} />
                ) : (
                  <div className="assistant-msg-bubble">{msg.text}</div>
                )}
              </div>
            ))}

            {/* Animation frappe */}
            {typing && (
              <div className="assistant-msg assistant-msg-bot">
                <img src={assitImg} alt="" className="assistant-msg-avatar" aria-hidden="true" />
                <div className="assistant-msg-bubble assistant-typing">
                  <span /><span /><span />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Questions rapides — visibles uniquement au début */}
          {showQuick && (
            <div className="assistant-quick">
              <p className="assistant-quick-label">{t('assistant.quick_label')}</p>
              <div className="assistant-quick-list">
                {quickQuestions.map((q) => (
                  <button
                    key={q}
                    type="button"
                    className="assistant-quick-btn"
                    onClick={() => sendMessage(q)}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Zone de saisie */}
          <form className="assistant-input-row" onSubmit={handleSubmit}>
            <input
              type="text"
              className="assistant-input"
              placeholder={t('assistant.input_placeholder')}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              aria-label={t('assistant.input_placeholder')}
              autoComplete="off"
              maxLength={300}
            />
            <button
              type="submit"
              className="assistant-send"
              disabled={!input.trim()}
              aria-label="Envoyer"
            >
              <Send size={16} />
            </button>
          </form>

          {/* Pied */}
          <div className="assistant-footer">
            <span>{t('assistant.footer_note', { phone: SITE.phones[0] })}</span>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="assistant-whatsapp"
              aria-label={t('assistant.whatsapp_btn')}
            >
              <img src={whatsappImg} alt="WhatsApp" width={20} height={20} />
              {t('assistant.whatsapp_btn')}
            </a>
          </div>
        </div>
      )}
    </>
  );
}
