import { useState, useEffect, useRef } from 'react';
import { Send, User, Bot, Loader2 } from 'lucide-react';
import { chatApi } from '@/api';
import type { ChatMessage } from '@/types';
import { MdFormatter } from '../../components/MdFormatter';

export default function ChatTab({ projectId }: { projectId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatApi
      .getHistory(projectId)
      .then(res => setMessages(res.data.messages || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [projectId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;

    const userText = input.trim();
    setInput('');
    setSending(true);

    // Optimistic UI update
    const tempUserMsg: ChatMessage = {
      role: 'user',
      content: userText,
      timestamp: new Date().toISOString(),
      sources: [],
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const res = await chatApi.sendMessage(projectId, userText);
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: res.data.response,
        timestamp: new Date().toISOString(),
        sources: res.data.sources || [],
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error answering your request. Please try again.',
          timestamp: new Date().toISOString(),
          sources: [],
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="skeleton h-[350px]" />;

  return (
    <div className="relative -my-2 flex h-[calc(100vh-120px)] flex-col">
      {/*  Messages Scroll Area  */}
      <div
        ref={scrollRef}
        className="flex flex-1 flex-col gap-5 overflow-y-auto px-1 pt-3 pb-[100px]"
      >
        {messages.length === 0 ? (
          <div className="m-auto p-10 text-center text-(--text-muted)">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full border border-indigo-500/25 bg-(--accent-soft)">
              <Bot size={28} color="#a5b4fc" />
            </div>
            <h3 className="mb-1.5 text-[17px] font-bold text-(--text-primary)">
              Project Intelligence Assistant
            </h3>
            <p className="mx-auto max-w-sm text-[13.5px] text-(--text-secondary)">
              Ask anything about project scope, risks, timeline, deliverables, or document details.
            </p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              className={`flex items-start gap-3.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div
                className={`flex size-8.5 shrink-0 items-center justify-center rounded-full ${msg.role === 'user' ? 'bg-indigo-500' : 'border border-indigo-500/30 bg-[#021023]'}`}
              >
                {msg.role === 'user' ? (
                  <User size={16} color="#fff" />
                ) : (
                  <Bot size={16} color="#a5b4fc" />
                )}
              </div>

              <div className="max-w-[80%]">
                <div
                  className={`rounded-[14px] px-4.5 py-3 text-sm leading-[1.6] shadow-(--shadow-sm) ${msg.role === 'user' ? 'rounded-tr-sm bg-linear-to-br from-indigo-600 to-indigo-500 text-white' : 'rounded-tl-sm border border-(--border) bg-(--bg-surface) text-(--text-primary)'}`}
                >
                  <div className={msg.role === 'assistant' ? 'markdown-body' : ''}>
                    <MdFormatter content={msg.content} />
                  </div>
                </div>

                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-(--text-muted)">
                    <span>Source context:</span>
                    <span className="font-medium text-indigo-300">{msg.sources.join(', ')}</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {sending && (
          <div className="flex items-center gap-3.5">
            <div className="flex size-8.5 items-center justify-center rounded-full border border-indigo-500/30 bg-[#021023]">
              <Bot size={16} color="#a5b4fc" />
            </div>
            <div className="flex items-center gap-2 rounded-[14px] rounded-tl-sm border border-(--border) bg-(--bg-surface) px-4.5 py-3 text-[13px] text-(--text-muted)">
              <Loader2 size={15} className="anim-spin" color="#a5b4fc" />
              <span>Analyzing document context...</span>
            </div>
          </div>
        )}
      </div>

      {/*  Fixed Prompt Input Area at Bottom  */}
      <form
        onSubmit={handleSend}
        className="sticky inset-x-0 bottom-0 z-10 bg-linear-to-t from-(--bg-base) from-80% to-transparent py-4 pb-2 backdrop-blur-sm"
      >
        <div className="relative flex items-center rounded-[14px] border border-(--border-glow) bg-(--bg-surface) px-1.5 py-1 shadow-(--shadow-md)">
          <input
            type="text"
            className="input border-0 bg-transparent px-4 py-3 text-sm text-(--text-primary) shadow-none"
            placeholder="Ask about project risks, deliverables, or uploaded document details..."
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={sending}
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="btn btn-primary mr-1 shrink-0 rounded-[10px] px-4 py-2"
          >
            <Send size={15} />
            <span className="hidden sm:inline">Send</span>
          </button>
        </div>
      </form>
    </div>
  );
}
