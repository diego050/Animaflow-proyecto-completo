import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Sparkles, Lightbulb } from 'lucide-react';
import { getHistory, type HistoryMessage, type SceneEditResponse } from '../../../api/sceneEdit';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatPanelProps {
  onSend: (prompt: string) => Promise<SceneEditResponse>;
  disabled: boolean;
  jobId: string;
}

const QUICK_SUGGESTIONS = [
  { icon: '🎨', text: 'Cambia el fondo a azul oscuro' },
  { icon: '📐', text: 'Mueve el objeto a la derecha' },
  { icon: '✨', text: 'Animación de entrada con bounce' },
  { icon: '📝', text: 'Texto más grande y amarillo' },
];

export function ChatPanel({ onSend, disabled, jobId }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const history = await getHistory(jobId);
        // Convert to ChatMessage format
        const chatMessages: ChatMessage[] = history.map(msg => ({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content,
          timestamp: new Date(), // We don't store exact time in frontend, use now
        }));
        setMessages(chatMessages);
      } catch (err) {
        console.error('Failed to load chat history:', err);
      }
    };

    if (jobId) {
      loadHistory();
    }
  }, [jobId]);

  // Close suggestions dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    if (showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSuggestions]);

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
      const response = await onSend(userMessage.content);

      if (response.intent === 'query') {
        // Query response: show answer text
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: response.answer || 'No se pudo procesar la consulta.',
            timestamp: new Date(),
          },
        ]);
      } else if (response.intent === 'recommend') {
        // Recommend response: show suggestions
        const recText =
          response.recommendations
            ?.map((r) => `• ${r.description}`)
            .join('\n') || 'No hay recomendaciones disponibles.';
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `💡 Sugerencias:\n${recText}`,
            timestamp: new Date(),
          },
        ]);
      } else {
        // Edit response: show confirmation
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `✅ ${response.explanation || 'Cambios aplicados correctamente'}`,
            timestamp: new Date(),
          },
        ]);
      }
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

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <div className="px-4 py-3 border-b border-border-tech/50">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-mint-precision" />
          <h3 className="text-sm font-semibold text-text-primary font-display">Asistente IA</h3>
        </div>
        <p className="text-[11px] text-text-secondary/40 mt-0.5">Describe los cambios que quieres hacer</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-6">
            <Sparkles size={24} className="mx-auto text-mint-precision/30 mb-3" />
            <p className="text-xs text-text-secondary/50 mb-3">
              ¿Qué quieres cambiar?
            </p>
            <div className="grid grid-cols-2 gap-2">
              {QUICK_SUGGESTIONS.map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => setInput(suggestion.text)}
                  className="flex items-center gap-1.5 text-left text-[11px] text-text-secondary/50 hover:text-mint-precision hover:bg-mint-precision/5 transition-colors px-3 py-2 rounded-lg border border-border-tech/30 hover:border-mint-precision/20"
                >
                  <span>{suggestion.icon}</span>
                  <span className="truncate">{suggestion.text}</span>
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
            <div className="max-w-[90%]">
              <div
                className={`rounded-2xl px-3.5 py-2.5 text-xs ${
                  msg.role === 'user'
                    ? 'bg-mint-precision/10 text-mint-precision border border-mint-precision/20 rounded-br-md'
                    : 'bg-surface-high text-text-secondary border border-border-tech/50 rounded-bl-md'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
              <p className={`text-[9px] text-text-secondary/30 mt-1 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                {formatTime(msg.timestamp)}
              </p>
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="bg-surface-high rounded-2xl rounded-bl-md px-3.5 py-2.5 border border-border-tech/50">
              <div className="flex items-center gap-2">
                <Loader2 size={14} className="animate-spin text-text-secondary/50" />
                <span className="text-xs text-text-secondary/50">Pensando...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border-tech/50">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ej: Cambia el color del fondo a azul..."
              disabled={disabled || sending}
              rows={2}
              className="w-full bg-surface-lowest border border-border-tech rounded-lg px-3 py-2 text-xs text-text-primary placeholder:text-text-secondary/30 focus:border-mint-precision focus:ring-1 focus:ring-mint-precision/20 outline-none resize-none disabled:opacity-50"
              style={{ maxHeight: '80px' }}
            />
          </div>
          <div className="flex flex-col gap-1">
            {/* Suggestions dropdown button */}
            <div className="relative" ref={suggestionsRef}>
              <button
                onClick={() => setShowSuggestions(!showSuggestions)}
                disabled={disabled || sending}
                className="p-2 rounded-lg text-text-secondary/50 hover:text-cadmium-orange hover:bg-cadmium-orange/10 transition-colors disabled:opacity-30"
                title="Sugerencias rápidas"
              >
                <Lightbulb size={14} />
              </button>
              {showSuggestions && (
                <div className="absolute bottom-full right-0 mb-2 w-56 bg-surface-container border border-border-tech rounded-lg shadow-xl z-50 p-2 space-y-1">
                  {QUICK_SUGGESTIONS.map((suggestion, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setInput(suggestion.text);
                        setShowSuggestions(false);
                      }}
                      className="w-full text-left text-[11px] text-text-secondary/60 hover:text-mint-precision hover:bg-mint-precision/5 transition-colors px-2.5 py-1.5 rounded"
                    >
                      {suggestion.icon} {suggestion.text}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={disabled || sending || !input.trim()}
              className="p-2 rounded-lg bg-mint-precision text-deep-slate hover:bg-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
