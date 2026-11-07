import { useState, useRef, useEffect, type FormEvent } from 'react';
import { X, Send } from 'lucide-react';
import assitImg from '../images/assit.png';
import whatsappImg from '../images/whatsapp.png';
import { SITE } from '../siteConfig';

// ── Données statiques ──────────────────────────────────────────────────────

const QUICK_QUESTIONS = [
  'Comment obtenir un devis ?',
  'Comment déclarer un sinistre ?',
  'Quels documents pour un devis auto ?',
  'Comment contacter LD ASSURANCES ?',
  "Qu'est-ce que le CIMA ?",
  'Comment réduire ma prime ?',
];

type Message = {
  from: 'bot' | 'user';
  text: string;
};

function getBotReply(question: string): string {
  const q = question.toLowerCase();

  if (q.includes('devis auto') || q.includes('documents') && q.includes('auto')) {
    return 'Pour un devis automobile, préparez : la carte grise, votre permis de conduire, le relevé d\'information de votre ancien assureur et une pièce d\'identité. Cliquez sur « Faire un devis » pour commencer !';
  }
  if (q.includes('devis')) {
    return 'Pour obtenir un devis, rendez-vous sur notre page de devis en ligne ou appelez-nous au ' + SITE.phones[0] + '. C\'est rapide et sans engagement !';
  }
  if (q.includes('sinistre') || q.includes('déclarer')) {
    return 'Pour déclarer un sinistre, utilisez notre formulaire en ligne (menu « Urgence Sinistre ») ou appelez directement notre ligne 24/7 : ' + SITE.emergencyPhone + '.';
  }
  if (q.includes('contacter') || q.includes('contact')) {
    return 'Vous pouvez nous joindre par téléphone au ' + SITE.phones[0] + ', par email à ' + SITE.email + ', ou en agence à ' + SITE.address + '.';
  }
  if (q.includes('cima')) {
    return 'Le CIMA (Conférence Interafricaine des Marchés d\'Assurances) est l\'organisme de réglementation des assurances en Afrique centrale et de l\'Ouest. LD ASSURANCES SA est agréée et opère en conformité totale avec le Code CIMA.';
  }
  if (q.includes('prime') || q.includes('réduire')) {
    return 'Pour réduire votre prime, pensez au bonus de fidélité, au paiement annuel, à la franchise relevée ou au regroupement de vos contrats chez nous. Contactez-nous pour une étude personnalisée !';
  }
  if (q.includes('horaire') || q.includes('ouvert')) {
    return 'Nos agences sont ouvertes du lundi au vendredi de 08h00 à 17h30, et le samedi de 09h00 à 13h00. Notre ligne d\'urgence sinistre est disponible 24h/24 et 7j/7.';
  }
  if (q.includes('agence') || q.includes('bureau')) {
    return 'LD ASSURANCES SA est présent à Douala, Yaoundé et Bafoussam. Notre siège social est situé au Carrefour Arno, Akwa-Douala.';
  }

  return 'Merci pour votre question ! Pour une réponse précise et personnalisée, n\'hésitez pas à nous appeler au ' + SITE.phones[0] + ' ou à envoyer un message sur WhatsApp. Un conseiller vous répondra dans les plus brefs délais.';
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open, typing]);

  function sendMessage(text: string) {
    if (!text.trim()) return;
    setMessages((prev) => [...prev, { from: 'user', text: text.trim() }]);
    setInput('');
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMessages((prev) => [...prev, { from: 'bot', text: getBotReply(text) }]);
    }, 900 + Math.random() * 400);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  const whatsappNumber = SITE.emergencyPhone.replace(/\D/g, '');
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=Bonjour%2C%20je%20souhaite%20obtenir%20des%20informations%20sur%20vos%20services.`;

  return (
    <>
      {/* ── Bouton flottant "Besoin d'aide ?" ── */}
      {!open && (
        <button
          className="assistant-trigger"
          onClick={() => setOpen(true)}
          aria-label="Ouvrir l'assistant LD ASSURANCES"
          type="button"
        >
          <span className="assistant-trigger-bubble">
            Besoin d'aide ? 👋
          </span>
          <img
            src={assitImg}
            alt="Assistant LD ASSURANCES"
            className="assistant-trigger-avatar"
          />
          <span className="assistant-online-dot" aria-hidden="true" />
        </button>
      )}

      {/* ── Fenêtre de chat ── */}
      {open && (
        <div className="assistant-panel" role="dialog" aria-label="Assistant LD ASSURANCES" aria-modal="true">

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
          <div className="assistant-messages" aria-live="polite" aria-label="Conversation">
            {messages.map((msg, i) => (
              <div key={i} className={`assistant-msg assistant-msg-${msg.from}`}>
                {msg.from === 'bot' && (
                  <img src={assitImg} alt="" className="assistant-msg-avatar" aria-hidden="true" />
                )}
                <div className="assistant-msg-bubble">{msg.text}</div>
              </div>
            ))}
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

          {/* Questions rapides */}
          {messages.length <= 1 && (
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

          {/* Pied de fenêtre */}
          <div className="assistant-footer">
            <span>Assistant automatique · Pour une aide personnalisée, contactez le {SITE.phones[0]}</span>
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
