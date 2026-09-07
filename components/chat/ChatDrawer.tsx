'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Message, UserRole } from '@/types/ride';
import { soundEffects } from '@/lib/audio/soundEffects';
import { Send, X, MessageSquare } from 'lucide-react';

interface ChatDrawerProps {
  rideId: string;
  currentUserId: string;
  currentUserRole: UserRole;
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatDrawer({
  rideId,
  currentUserId,
  currentUserRole,
  isOpen,
  onClose,
}: ChatDrawerProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch initial messages & subscribe to realtime
  useEffect(() => {
    if (!rideId || !isOpen) return;

    // Fetch existing messages
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('ride_id', rideId)
        .order('created_at', { ascending: true });

      if (!error && data) {
        setMessages(data as Message[]);
        setTimeout(scrollToBottom, 100);
      }
    };

    fetchMessages();

    // Subscribe to Realtime messages channel
    const channel = supabase
      .channel(`chat_${rideId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `ride_id=eq.${rideId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => [...prev, newMsg]);

          if (newMsg.sender_id !== currentUserId) {
            soundEffects.playMessageChime();
          }

          setTimeout(scrollToBottom, 100);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [rideId, isOpen, currentUserId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || loading) return;

    const msgText = newMessage.trim();
    setNewMessage('');
    setLoading(true);

    try {
      const { error } = await supabase.from('messages').insert({
        ride_id: rideId,
        sender_id: currentUserId,
        sender_role: currentUserRole,
        message: msgText,
      });

      if (error) {
        console.error('Failed to send message:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-opacity">
      <div className="flex h-full w-full max-w-md flex-col bg-slate-900 text-white shadow-2xl border-l border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 p-4 bg-slate-950">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-amber-400" />
            <h3 className="font-semibold text-slate-100">Ride Chat</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Message Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-900/50">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-slate-500 text-sm">
              <MessageSquare className="h-8 w-8 mb-2 opacity-50 text-slate-400" />
              <p>No messages yet.</p>
              <p className="text-xs">Type below to message your ride partner.</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender_id === currentUserId;
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <span className="text-[10px] text-slate-400 px-1 mb-0.5">
                    {msg.sender_role === 'CAPTAIN' ? 'Captain' : 'Customer'}
                  </span>
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-md ${
                      isMe
                        ? 'bg-amber-500 text-slate-950 font-medium rounded-br-none'
                        : 'bg-slate-800 text-slate-100 border border-slate-700/60 rounded-bl-none'
                    }`}
                  >
                    {msg.message}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <form onSubmit={handleSendMessage} className="border-t border-slate-800 p-3 bg-slate-950 flex gap-2">
          <input
            type="text"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1 rounded-xl bg-slate-800 border border-slate-700 px-4 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || loading}
            className="flex items-center justify-center rounded-xl bg-amber-500 px-4 py-2.5 font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
