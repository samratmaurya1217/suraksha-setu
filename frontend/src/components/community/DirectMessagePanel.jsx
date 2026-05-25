import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Send, MessageCircle, Loader2, ChevronLeft, Inbox } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const API_URL = (process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000') + '/api/community';

function timeAgo(ts) {
  if (!ts) return '';
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─── Single conversation view ──────────────────────────────────────────────────
const Conversation = ({ myUserId, myName, myPhoto, partner, postId, postSnippet, onBack }) => {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);
  const pollRef = useRef(null);

  const fetchMessages = useCallback(async () => {
    try {
      const url = new URL(`${API_URL}/messages/conversation/${partner.id}`);
      url.searchParams.set('my_user_id', myUserId);
      if (postId) url.searchParams.set('post_id', postId);
      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (e) {
      console.error('DM fetch error', e);
    } finally {
      setLoading(false);
    }
  }, [myUserId, partner.id, postId]);

  useEffect(() => {
    fetchMessages();
    pollRef.current = setInterval(fetchMessages, 5000);
    return () => clearInterval(pollRef.current);
  }, [fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`${API_URL}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_user_id: myUserId,
          from_name: myName,
          from_photo: myPhoto || null,
          to_user_id: partner.id,
          to_name: partner.name,
          post_id: postId || null,
          content: text.trim(),
        }),
      });
      if (res.ok) {
        setText('');
        await fetchMessages();
      }
    } catch (e) {
      console.error('Send error', e);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b bg-muted/40">
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onBack}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src={partner.photo || `https://api.dicebear.com/7.x/avataaars/svg?seed=${partner.name}`} />
          <AvatarFallback>{partner.name?.[0] || '?'}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{partner.name}</p>
          {postSnippet && (
            <p className="text-[10px] text-muted-foreground truncate">Re: {postSnippet}</p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
            Start the conversation!
          </div>
        ) : (
          messages.map(msg => {
            const isMine = msg.from_user_id === myUserId;
            return (
              <div key={msg.id} className={cn('flex gap-2 items-end', isMine && 'flex-row-reverse')}>
                {!isMine && (
                  <Avatar className="h-6 w-6 shrink-0">
                    <AvatarImage src={msg.from_photo || `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.from_name}`} />
                    <AvatarFallback>{msg.from_name?.[0]}</AvatarFallback>
                  </Avatar>
                )}
                <div className={cn(
                  'max-w-[72%] px-3 py-2 rounded-2xl text-sm leading-snug',
                  isMine
                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                    : 'bg-muted rounded-bl-sm'
                )}>
                  {msg.content}
                  <div className={cn(
                    'text-[10px] mt-1 opacity-60',
                    isMine ? 'text-right' : 'text-left'
                  )}>
                    {timeAgo(msg.timestamp)}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t flex gap-2 items-center">
        <Input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="Type a message…"
          className="flex-1 h-9 text-sm"
          disabled={sending}
        />
        <Button
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={send}
          disabled={!text.trim() || sending}
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
};

// ─── Inbox list ────────────────────────────────────────────────────────────────
const InboxView = ({ myUserId, onOpen }) => {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!myUserId) return;
    const fetch_ = async () => {
      try {
        const res = await fetch(`${API_URL}/messages/inbox/${myUserId}`);
        if (res.ok) {
          const data = await res.json();
          setThreads(data.threads || []);
        }
      } catch (e) {
        console.error('Inbox fetch', e);
      } finally {
        setLoading(false);
      }
    };
    fetch_();
    const iv = setInterval(fetch_, 8000);
    return () => clearInterval(iv);
  }, [myUserId]);

  if (loading) return (
    <div className="flex justify-center py-10">
      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
    </div>
  );

  if (threads.length === 0) return (
    <div className="text-center py-10 text-sm text-muted-foreground px-4">
      <Inbox className="w-10 h-10 mx-auto mb-3 opacity-30" />
      No messages yet.<br />
      <span className="text-xs">Click "Message" on a help/offer post to start a chat.</span>
    </div>
  );

  return (
    <div className="overflow-y-auto flex-1">
      {threads.map(thread => (
        <button
          key={thread.partner_id}
          onClick={() => onOpen({
            id: thread.partner_id,
            name: thread.partner_name,
            photo: thread.partner_photo,
          }, thread.post_id, null)}
          className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left border-b last:border-0"
        >
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarImage src={thread.partner_photo || `https://api.dicebear.com/7.x/avataaars/svg?seed=${thread.partner_name}`} />
            <AvatarFallback>{thread.partner_name?.[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold truncate">{thread.partner_name}</p>
              <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                {timeAgo(thread.last_message?.timestamp)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {thread.last_message?.content}
            </p>
          </div>
          {thread.unread_count > 0 && (
            <Badge className="h-5 w-5 p-0 flex items-center justify-center text-[10px] shrink-0 bg-primary text-primary-foreground">
              {thread.unread_count}
            </Badge>
          )}
        </button>
      ))}
    </div>
  );
};

// ─── Main floating panel ───────────────────────────────────────────────────────
/**
 * Props:
 *  - isOpen: bool
 *  - onClose: fn
 *  - myUserId / myName / myPhoto: current user info
 *  - initialPartner: { id, name, photo } — if opening to a specific convo
 *  - initialPostId: string — post context
 *  - initialPostSnippet: string — short post text for header
 */
const DirectMessagePanel = ({
  isOpen,
  onClose,
  myUserId,
  myName,
  myPhoto,
  initialPartner = null,
  initialPostId = null,
  initialPostSnippet = null,
}) => {
  const [view, setView] = useState('inbox'); // 'inbox' | 'conversation'
  const [partner, setPartner] = useState(initialPartner);
  const [postId, setPostId] = useState(initialPostId);
  const [postSnippet, setPostSnippet] = useState(initialPostSnippet);

  // When initialPartner changes from parent (new "Message" button click), open that conversation
  useEffect(() => {
    if (initialPartner) {
      setPartner(initialPartner);
      setPostId(initialPostId);
      setPostSnippet(initialPostSnippet);
      setView('conversation');
    }
  }, [initialPartner?.id, initialPostId]);

  const openConversation = (p, pid, snippet) => {
    setPartner(p);
    setPostId(pid);
    setPostSnippet(snippet);
    setView('conversation');
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col"
      style={{ width: 340, height: 500 }}
    >
      <div className="flex flex-col h-full bg-background border rounded-2xl shadow-2xl overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-primary/5">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">
              {view === 'conversation' && partner ? `Chat with ${partner.name}` : 'Messages'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {view === 'conversation' && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setView('inbox')}
                title="Back to inbox"
              >
                <Inbox className="w-4 h-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Body */}
        {!myUserId ? (
          <div className="flex-1 flex items-center justify-center text-center px-6 text-sm text-muted-foreground">
            <div>
              <MessageCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
              Sign in to send direct messages.
            </div>
          </div>
        ) : view === 'conversation' && partner ? (
          <Conversation
            myUserId={myUserId}
            myName={myName}
            myPhoto={myPhoto}
            partner={partner}
            postId={postId}
            postSnippet={postSnippet}
            onBack={() => setView('inbox')}
          />
        ) : (
          <>
            <InboxView myUserId={myUserId} onOpen={openConversation} />
          </>
        )}
      </div>
    </div>
  );
};

export default DirectMessagePanel;
