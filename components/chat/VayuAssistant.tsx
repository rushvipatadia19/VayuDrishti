'use client';

import React, { useState } from 'react';

interface VayuAssistantProps {
  caseContext?: {
    incidentId?: string;
    title?: string;
    pollutant?: string;
    reportedValue?: number | null;
    stationName?: string;
    status?: string;
    isAnomaly?: boolean;
    standardLimit?: number;
    exceeded?: boolean;
    explanation?: string;
  };
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function VayuAssistant({ caseContext }: VayuAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        'Namaste! I am Vayu Assistant (वायुदृष्टि सहायक). You can ask me about statutory CPCB air quality standards, PM2.5/PM10 health impacts, anomaly evaluation, or the incident response lifecycle.',
    },
  ]);

  async function handleSend(textToSend?: string) {
    const text = textToSend || input;
    if (!text.trim() || loading) return;

    const newMessages: Message[] = [...messages, { role: 'user', content: text.trim() }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.slice(-5), // Send last 5 turns
          caseContext,
        }),
      });

      const json = await res.json();
      if (json.success && json.data?.message) {
        setMessages([...newMessages, { role: 'assistant', content: json.data.message }]);
      } else {
        setMessages([
          ...newMessages,
          {
            role: 'assistant',
            content: 'Unable to reach assistant engine at this time. Please retry in a moment.',
          },
        ]);
      }
    } catch {
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: 'Network connection issue. Please check your connectivity and try again.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const suggestedPrompts = caseContext?.incidentId
    ? [
        'Why was this incident flagged?',
        'What does the CPCB standard mean here?',
        'What corrective action is recommended?',
      ]
    : [
        'Explain what PM2.5 means.',
        'What are CPCB 24-hour limits for PM10?',
        'How does the incident workflow work?',
      ];

  return (
    <>
      {/* Floating Trigger Button */}
      <div className="fixed bottom-6 right-6 z-[999]">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-4 py-3 bg-emerald-900 hover:bg-emerald-950 text-white rounded-full shadow-lg border border-emerald-700/50 text-sm font-medium transition-all hover:scale-105"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Vayu Assistant</span>
        </button>
      </div>

      {/* Floating Chat Modal */}
      {isOpen && (
        <div className="fixed bottom-20 right-6 z-[1000] w-[370px] sm:w-[410px] h-[520px] bg-white rounded-2xl shadow-2xl border border-stone-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="bg-emerald-900 text-white p-3.5 flex justify-between items-center border-b border-emerald-800">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-emerald-800 flex items-center justify-center font-bold text-xs">
                व
              </div>
              <div>
                <div className="font-semibold text-xs leading-none">Vayu Assistant · वायुदृष्टि</div>
                <div className="text-[10px] text-emerald-200 mt-0.5">
                  AI-assisted statutory screening & environmental guidance
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-emerald-300 hover:text-white text-lg leading-none px-2"
            >
              &times;
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-[#faf9f6]">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] p-3 rounded-xl text-xs leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-emerald-800 text-white rounded-br-xs'
                      : 'bg-white text-stone-800 border border-stone-200 rounded-bl-xs shadow-xs'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-stone-200 text-stone-500 p-2.5 rounded-xl text-xs italic flex items-center gap-1.5 shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-stone-400 animate-ping" />
                  Formulating regulatory guidance...
                </div>
              </div>
            )}
          </div>

          {/* Quick Prompts */}
          <div className="px-3 py-2 bg-stone-50 border-t border-stone-200 flex flex-wrap gap-1.5">
            {suggestedPrompts.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(prompt)}
                className="text-[10px] bg-white border border-stone-300 hover:border-emerald-700 hover:text-emerald-800 text-stone-600 px-2 py-1 rounded-full transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input Footer */}
          <div className="p-2.5 bg-white border-t border-stone-200 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask about air standards, health, or this case..."
              className="flex-1 px-3 py-2 text-xs border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-700"
            />
            <button
              type="button"
              disabled={loading || !input.trim()}
              onClick={() => handleSend()}
              className="px-3 py-2 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white rounded-lg text-xs font-semibold"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}

