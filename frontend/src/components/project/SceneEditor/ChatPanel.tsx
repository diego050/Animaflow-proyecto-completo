import { useState, useRef, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatPanelProps {
  onSend: (prompt: string) => Promise<void>;
  disabled: boolean;
}

export function ChatPanel({ onSend, disabled }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || disabled || sending) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setSending(true);

    try {
      await onSend(userMessage.content);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Cambios aplicados correctamente',
          timestamp: new Date(),
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Error: ${err instanceof Error ? err.message : 'No se pudo aplicar el cambio'}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const examples = [
    'Mové el objeto a la derecha',
    'Cambiá el fondo a azul oscuro',
    'Que entre con bounce y salga con fade',
    'Texto más grande y en amarillo',
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <p className="text-xs text-text-secondary/50 mb-2">
              Ejemplos de comandos:
            </p>
            <div className="space-y-1.5">
              {examples.map((example, i) => (
                <button
                  key={i}
                  onClick={() => setInput(example)}
                  className="block w-full text-left text-xs text-text-secondary/40 hover:text-mint-precision transition-colors px-3 py-1.5 rounded hover:bg-mint-precision/5"
                >
                  &ldquo;{example}&rdquo;
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-xs ${
                msg.role === 'user'
                  ? 'bg-mint-precision/10 text-mint-precision'
                  : 'bg-surface-high text-text-secondary'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="bg-surface-high rounded-lg px-3 py-2">
              <Loader2 size={14} className="animate-spin text-text-secondary/50" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border-tech/50">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribi que queres cambiar..."
            disabled={disabled || sending}
            rows={2}
            className="flex-1 bg-surface-lowest border border-border-tech rounded-lg px-3 py-2 text-xs text-text-primary placeholder:text-text-secondary/30 focus:border-mint-precision focus:ring-1 focus:ring-mint-precision/20 outline-none resize-none disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={disabled || sending || !input.trim()}
            className="self-end p-2 rounded-lg bg-mint-precision text-deep-slate hover:bg-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
