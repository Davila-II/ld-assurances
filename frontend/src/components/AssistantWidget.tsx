import { useState, useRef, useEffect, type FormEvent } from 'react';
import { X, Send } from 'lucide-react';
import assitImg from '../images/assit.png';
import whatsappImg from '../images/whatsapp.png';
import { SITE } from '../siteConfig';

// ── Types ─────────────────────────────────────────────────────────────────

type ReplyButton = {
  label: string;
  /** URL absolue (externe) ou chemin relatif (interne). */
  href: string;
  external?: boolean;
};

type ReplyContent = {
  /** Paragraphe principal. */
  text: string;
  /** Lignes d'info formatées (ex. contact). */
  infoLines?: string[];
  /** "Vous cherchez peut-être aussi :" bullets. */
  suggestions?: string[];
  /** Boutons d'action. */
  buttons?: ReplyButton[];
};

type Message = {
  from: 'bot' | 'user';
  text: string;
  content?: ReplyContent;
};

// ── Questions rapides ──────────────────────────────────────────────────────

const QUICK_QUESTIONS = [
  'Comment obtenir un devis ?',
  'Comment déclarer un sinistre ?',
  'Quels documents pour un devis auto ?',
  'Comment contacter LD ASSURANCES ?',
  "Qu'est-ce que le CIMA ?",
  'Comment réduire ma prime ?',
];

// ── Base de réponses ───────────────────────────────────────────────────────

function getBotReply(question: string): { text: string; content: ReplyContent } {
  const q = question.toLowerCase().trim();

  /* ── Obtenir un devis ── */
  if (q.includes('devis') && !q.includes('auto') && !q.includes('réduire')) {
    return {
      text: 'Voici comment obtenir un devis.',
      content: {
        text: "Le devis en ligne est gratuit et sans engagement. Il vous donne une estimation des primes selon les garanties choisies. Le contrat ne prend effet qu'après votre acceptation, le paiement de la première prime et la délivrance de la police. Vous pouvez obtenir un devis pour l'auto, le voyage et l'assurance professionnelle directement en ligne.",
        suggestions: ["Le devis en ligne est-il engageant ?", 'Devis assurance auto'],
        buttons: [
          { label: 'Demander un devis', href: '/?service=devis' },
        ],
      },
    };
  }

  /* ── Déclarer un sinistre ── */
  if (q.includes('sinistre') || q.includes('déclarer')) {
    return {
      text: 'Voici comment déclarer un sinistre.',
      content: {
        text: `Vous pouvez déclarer un sinistre via le formulaire en ligne (rubrique « Déclaration Sinistre »), par e-mail à ${SITE.email}, ou directement en agence. La déclaration doit intervenir dans les délais prévus au contrat (généralement 5 jours ouvrés). Un numéro de dossier vous sera attribué au format LD-DS-XXXX-JJMMAAAA.`,
        buttons: [
          { label: 'Déclarer un sinistre', href: '/?service=sinistre' },
        ],
      },
    };
  }

  /* ── Documents / devis auto ── */
  if ((q.includes('document') && q.includes('auto')) || (q.includes('auto') && q.includes('devis')) || q.includes('prime auto')) {
    return {
      text: "Voici ce qu'il faut savoir pour un devis auto.",
      content: {
        text: "Notre calculateur de prime auto est conforme aux tarifs ministériels CIMA. Il prend en compte la catégorie du véhicule, la zone de circulation, la puissance fiscale, le carburant, et les garanties choisies. Le calcul se fait en temps réel avec le détail complet : prime RC, garanties, TVA, DTA, accessoires.",
        suggestions: ['Assurance Auto', 'Quels documents fournir pour un devis auto ?'],
        buttons: [
          { label: 'Calculer ma prime auto', href: '/?service=devis' },
        ],
      },
    };
  }

  /* ── Contacter LD ASSURANCES ── */
  if (q.includes('contacter') || q.includes('contact') || q.includes('adresse') || q.includes('téléphone') || q.includes('email')) {
    return {
      text: 'Voici nos coordonnées.',
      content: {
        text: '',
        infoLines: [
          `📍 Adresse : ${SITE.address}, Cameroun`,
          `📞 Téléphones : ${SITE.phones.join(' / ')}`,
          `📧 Email : ${SITE.email}`,
          '🕐 Horaires : Lun-Ven 08h00-17h30, Sam 09h00-13h00, Dim fermé',
        ],
        buttons: [
          { label: 'Page contact', href: 'https://www.ldassurances.cm/contact/', external: true },
        ],
      },
    };
  }

  /* ── CIMA ── */
  if (q.includes('cima')) {
    return {
      text: "Voici ce qu'est le CIMA.",
      content: {
        text: "Le CIMA (Conférence Interafricaine des Marchés d'Assurance) est une organisation régionale regroupant 14 États membres (dont le Cameroun) qui partage un code unique régissant l'activité d'assurance dans la zone CFA.",
        buttons: [
          { label: 'Voir le lexique complet', href: 'https://www.ldassurances.cm/lexique/', external: true },
        ],
      },
    };
  }

  /* ── Réduire ma prime ── */
  if (q.includes('réduire') || q.includes('prime') || q.includes('cotisation')) {
    return {
      text: 'Voici comment optimiser votre prime.',
      content: {
        text: "Le devis en ligne est gratuit et sans engagement. Il vous donne une estimation des primes selon les garanties choisies. Le contrat ne prend effet qu'après votre acceptation, le paiement de la première prime et la délivrance de la police. Vous pouvez obtenir un devis pour l'auto, le voyage et l'assurance professionnelle directement en ligne.",
        suggestions: ['Comment réduire ma prime ?', "Comment est calculée la prime d'habitation ?"],
        buttons: [
          { label: 'Demander un devis', href: '/?service=devis' },
        ],
      },
    };
  }

  /* ── Réponse par défaut ── */
  return {
    text: "Je n'ai pas trouvé de réponse précise à votre question.",
    content: {
      text: "Je n'ai pas trouvé de réponse précise à votre question. Vous pouvez :",
      infoLines: [
        '• Parcourir notre FAQ complète',
        `• Nous contacter au ${SITE.phones[0]}`,
        `• Envoyer un email à ${SITE.email}`,
        '• Ou utiliser un des liens ci-dessous.',
      ],
      buttons: [
        { label: 'Contacter un conseiller', href: 'https://www.ldassurances.cm/contact/', external: true },
      ],
    },
  };
}

// ── Composant de rendu d'une réponse riche ─────────────────────────────────

function BotBubble({ msg }: { msg: Message }) {
  const c = msg.content;
  return (
    <div className="assistant-msg-bubble">
      {/* Texte principal */}
      {c?.text && <p style={{ margin: 0 }}>{c.text}</p>}

      {/* Lignes d'info (contact, fallback) */}
      {c?.infoLines && c.infoLines.length > 0 && (
        <ul className="assistant-info-lines">
          {c.infoLines.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      )}

      {/* Suggestions */}
      {c?.suggestions && c.suggestions.length > 0 && (
        <div className="assistant-suggestions">
          <span className="assistant-suggestions-label">Vous cherchez peut-être aussi :</span>
          <ul>
            {c.suggestions.map((s, i) => (
              <li key={i}>• {s}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Boutons */}
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
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      from: 'bot',
      text: "Bonjour ! 👋 Je suis l'assistant virtuel de LD ASSURANCES. Comment puis-je vous aider aujourd'hui ? Vous pouvez me poser une question sur nos services, nos devis, la déclaration de sinistre, ou tout autre sujet lié à l'assurance.",
    },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [showQuick, setShowQuick] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open, typing]);

  function sendMessage(text: string) {
    if (!text.trim()) return;
    setShowQuick(false);
    setMessages((prev) => [...prev, { from: 'user', text: text.trim() }]);
    setInput('');
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      const { text: botText, content } = getBotReply(text);
      setMessages((prev) => [...prev, { from: 'bot', text: botText, content }]);
    }, 800 + Math.random() * 400);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  const whatsappNumber = SITE.emergencyPhone.replace(/\D/g, '');
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=Bonjour%2C%20je%20souhaite%20des%20informations%20sur%20vos%20services.`;

  return (
    <>
      {/* ── Bouton flottant "Besoin d'aide ?" ─────────────────────────────── */}
      {!open && (
        <button
          className="assistant-trigger"
          onClick={() => setOpen(true)}
          aria-label="Ouvrir l'assistant LD ASSURANCES"
          type="button"
        >
          <span className="assistant-trigger-bubble">Besoin d'aide ? 👋</span>
          <img src={assitImg} alt="Assistant LD ASSURANCES" className="assistant-trigger-avatar" />
          <span className="assistant-online-dot" aria-hidden="true" />
        </button>
      )}

      {/* ── Fenêtre de chat ────────────────────────────────────────────────── */}
      {open && (
        <div className="assistant-panel" role="dialog" aria-label="Assistant LD Assurances" aria-modal="true">

          {/* En-tête */}
          <div className="assistant-header">
            <div className="assistant-header-info">
              <div className="assistant-header-avatar-wrap">
                <img src={assitImg} alt="" className="assistant-header-avatar" aria-hidden="true" />
                <span className="assistant-online-dot" aria-hidden="true" />
              </div>
              <div>
                <div className="assistant-header-name">Assistant LD Assurances</div>
                <div className="assistant-header-status">
                  <span className="assistant-status-dot" aria-hidden="true" />
                  En ligne
                </div>
              </div>
            </div>
            <button
              className="assistant-close"
              onClick={() => setOpen(false)}
              aria-label="Fermer l'assistant"
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
                  <BotBubble msg={msg} />
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
              <p className="assistant-quick-label">Questions fréquentes :</p>
              <div className="assistant-quick-list">
                {QUICK_QUESTIONS.map((q) => (
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
              placeholder="Posez votre question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              aria-label="Votre message"
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
            <span>Assistant automatique · Contactez le {SITE.phones[0]}</span>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="assistant-whatsapp"
              aria-label="Contacter sur WhatsApp"
            >
              <img src={whatsappImg} alt="WhatsApp" width={20} height={20} />
              WhatsApp
            </a>
          </div>
        </div>
      )}
    </>
  );
}
