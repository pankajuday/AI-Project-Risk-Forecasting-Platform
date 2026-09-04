import { useState, useEffect, useRef } from 'react';
import {
  Send,
  User,
  Bot,
  Loader2,
  MessageSquareText,
  Sparkles,
  FileText,
  ShieldAlert,
  CalendarClock,
  Copy,
  Check,
} from 'lucide-react';
import { chatApi } from '@/api';
import type { ChatMessage } from '@/types';
import { MdFormatter } from '../../components/MdFormatter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

/* 
   Suggested quick-prompts shown in the empty state
    */
const QUICK_PROMPTS = [
  {
    icon: ShieldAlert,
    label: 'Risk Overview',
    prompt: 'What are the top risks for this project?',
  },
  {
    icon: FileText,
    label: 'Document Summary',
    prompt: 'Summarize the uploaded project documents.',
  },
  {
    icon: CalendarClock,
    label: 'Timeline Check',
    prompt: 'What is the estimated project timeline and key milestones?',
  },
  {
    icon: Sparkles,
    label: 'Key Insights',
    prompt: 'Provide key insights and recommendations for this project.',
  },
];

export default function ChatTab({ projectId }: { projectId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /*  Fetch history  */
  useEffect(() => {
    chatApi
      .getHistory(projectId)
      .then(res => setMessages(res.data.messages || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [projectId]);

  /*  Auto-scroll on new messages  */
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  /*  Send message  */
  const sendMessage = async (text: string) => {
    if (!text.trim() || sending) return;

    setInput('');
    setSending(true);

    const tempUserMsg: ChatMessage = {
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toISOString(),
      sources: [],
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const res = await chatApi.sendMessage(projectId, text.trim());
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: res.data.response,
        timestamp: new Date().toISOString(),
        sources: res.data.sources || [],
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error processing your request. Please try again.',
          timestamp: new Date().toISOString(),
          sources: [],
        },
      ]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleCopy = async (content: string, idx: number) => {
    await navigator.clipboard.writeText(content);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1800);
  };

  /*  Loading skeleton  */
  if (loading) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4 p-6">
        <Skeleton className="h-12 w-3/4 rounded-xl" />
        <Skeleton className="ml-auto h-12 w-1/2 rounded-xl" />
        <Skeleton className="h-20 w-4/5 rounded-xl" />
        <Skeleton className="ml-auto h-12 w-2/3 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="relative -my-2 flex h-[calc(100vh-120px)] flex-col">
      {/*  Messages scroll area  */}
      <div ref={scrollRef} className="flex flex-1 flex-col gap-1 overflow-y-auto px-2 pt-4 pb-28">
        {messages.length === 0 ? (
          /*  Empty state  */
          <div className="m-auto flex max-w-lg flex-col items-center px-4 py-10 text-center">
            {/* Animated bot icon */}
            <div className="relative mb-5">
              <div className="bg-primary/20 absolute inset-0 animate-pulse rounded-full blur-xl" />
              <div className="border-primary/30 bg-primary/10 relative flex size-16 items-center justify-center rounded-full border">
                <Bot size={30} className="text-primary" />
              </div>
            </div>

            <h3 className="text-foreground mb-1.5 text-lg font-semibold">
              Project Intelligence Assistant
            </h3>
            <p className="text-muted-foreground mb-8 max-w-sm text-sm">
              Ask anything about project scope, risks, timeline, deliverables, or your uploaded
              documents.
            </p>

            {/* Quick-prompt cards */}
            <div className="grid w-full grid-cols-1 gap-2.5 sm:grid-cols-2">
              {QUICK_PROMPTS.map(q => {
                const Icon = q.icon;
                return (
                  <button
                    key={q.label}
                    type="button"
                    onClick={() => sendMessage(q.prompt)}
                    disabled={sending}
                    className="group border-border bg-card hover:border-primary/40 hover:bg-accent flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 text-left transition-all hover:shadow-sm disabled:opacity-60"
                  >
                    <div className="bg-primary/10 text-primary group-hover:bg-primary/20 mt-0.5 shrink-0 rounded-lg p-1.5 transition-colors">
                      <Icon size={14} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-foreground text-xs font-semibold">{q.label}</p>
                      <p className="text-muted-foreground mt-0.5 truncate text-[11px]">
                        {q.prompt}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /*  Message list  */
          messages.map((msg, i) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={i}
                className={`mx-auto flex w-full max-w-3xl items-end gap-2.5 ${
                  isUser ? 'flex-row-reverse' : ''
                }`}
              >
                {/* Avatar */}
                <div
                  className={`flex size-8 shrink-0 items-center justify-center rounded-full transition-colors ${
                    isUser
                      ? 'bg-primary text-primary-foreground'
                      : 'border-border bg-muted text-muted-foreground border'
                  }`}
                >
                  {isUser ? <User size={14} /> : <Bot size={14} />}
                </div>

                {/* Bubble */}
                <div
                  className={`group relative max-w-[78%] ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                      isUser
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'border-border bg-card text-card-foreground rounded-bl-md border'
                    }`}
                  >
                    {isUser ? (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      <div className="prose-sm max-w-none">
                        <MdFormatter content={msg.content} />
                      </div>
                    )}
                  </div>

                  {/* Bottom row: sources + copy for assistant messages */}
                  {!isUser && (
                    <div className="mt-1.5 ml-1 flex items-center gap-2">
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="text-muted-foreground text-[10px]">Sources:</span>
                          {msg.sources.map((src, j) => (
                            <Badge
                              key={j}
                              variant="secondary"
                              className="h-4 px-1.5 py-0 text-[9px]"
                            >
                              {src}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Copy button */}
                      <button
                        type="button"
                        onClick={() => handleCopy(msg.content, i)}
                        className="text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer rounded-md p-1 opacity-0 transition-opacity group-hover:opacity-100"
                        title="Copy response"
                      >
                        {copiedIdx === i ? (
                          <Check size={12} className="text-emerald-500" />
                        ) : (
                          <Copy size={12} />
                        )}
                      </button>
                    </div>
                  )}

                  {/* Timestamp */}
                  <p
                    className={`text-muted-foreground mt-1 text-[10px] ${
                      isUser ? 'mr-1 text-right' : 'ml-1'
                    }`}
                  >
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}

        {/* Typing indicator */}
        {sending && (
          <div className="mx-auto flex w-full max-w-3xl items-end gap-2.5">
            <div className="border-border bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-full border">
              <Bot size={14} />
            </div>
            <div className="border-border bg-card rounded-2xl rounded-bl-md border px-4 py-3 shadow-sm">
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <Loader2 size={14} className="text-primary animate-spin" />
                <span>Analyzing document context…</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/*  Input bar  */}
      <div className="from-background sticky inset-x-0 bottom-0 z-10 bg-linear-to-t from-60% to-transparent px-2 pt-3 pb-2">
        <form
          onSubmit={handleSubmit}
          className="border-border bg-card focus-within:border-primary/40 mx-auto flex max-w-3xl items-center gap-2 rounded-2xl border p-1.5 shadow-lg transition-shadow focus-within:shadow-xl"
        >
          <div className="flex flex-1 items-center gap-2 px-2">
            <MessageSquareText size={16} className="text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask about project risks, deliverables, or documents..."
              disabled={sending}
              className="text-foreground placeholder:text-muted-foreground flex-1 bg-transparent py-2.5 text-sm outline-none disabled:opacity-60"
            />
          </div>

          <Button
            type="submit"
            size="sm"
            disabled={!input.trim() || sending}
            className="shrink-0 gap-1.5 rounded-xl px-4"
          >
            {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            <span className="hidden text-xs sm:inline">Send</span>
          </Button>
        </form>

        <p className="text-muted-foreground mt-1.5 text-center text-[10px]">
          AI responses are based on uploaded project documents and may not be 100% accurate.
        </p>
      </div>
    </div>
  );
}
