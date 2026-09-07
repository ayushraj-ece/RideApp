'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Message, UserRole } from '@/types/ride';
import { soundEffects } from '@/lib/audio/soundEffects';
import {
  Send,
  X,
  MessageSquare,
  Phone,
  User,
  Bike,
  CheckCheck,
} from 'lucide-react';

interface ChatDrawerProps {
  rideId: string;
  currentUserId: string;
  currentUserRole: UserRole;
  recipientName?: string;
  recipientPhone?: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatDrawer({
  rideId,
  currentUserId,
  currentUserRole,
  recipientName,
  recipientPhone,
  isOpen,
  onClose,
}: ChatDrawerProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [partnerInfo, setPartnerInfo] = useState<{
    name: string;
    phone: string;
    subtitle: string;
  }>({
    name: recipientName || (currentUserRole === 'CUSTOMER' ? 'Captain' : 'Customer'),
    phone: recipientPhone || '+91 98765 43210',
    subtitle: currentUserRole === 'CUSTOMER' ? 'Captain • Active' : 'Customer • Active',
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Quick reply chips based on user role
  const quickReplies =
    currentUserRole === 'CUSTOMER'
      ? [
          "I'm at the pickup spot",
          'How far are you?',
          'Please wait 2 mins',
          'Call me when you arrive',
        ]
      : [
          "I'm on my way!",
          "I've arrived at pickup location",
          'Slightly stuck in traffic',
          'Please come outside',
        ];

  // Fetch partner info & existing messages
  useEffect(() => {
    if (!rideId || !isOpen) return;

    const fetchDetails = async () => {
      // 1. Fetch Ride & Partner Details if not fully passed
      const { data: rideData } = await supabase
        .from('rides')
        .select(`
          *,
          customer:profiles!rides_customer_id_fkey(id, name, phone),
          captain:captains!rides_captain_id_fkey(
            id, vehicle_type, vehicle_number, vehicle_model,
            profile:profiles(id, name, phone)
          )
        `)
        .eq('id', rideId)
        .single();

      if (rideData) {
        if (currentUserRole === 'CUSTOMER') {
          const captProf = (rideData as any).captain?.profile;
          const captObj = (rideData as any).captain;
          setPartnerInfo({
            name: captProf?.name || recipientName || 'Captain',
            phone: captProf?.phone || recipientPhone || '+91 98765 43210',
            subtitle: captObj ? `${captObj.vehicle_model} (${captObj.vehicle_number})` : 'Captain • Online',
          });
        } else {
          const custProf = (rideData as any).customer;
          setPartnerInfo({
            name: custProf?.name || recipientName || 'Customer',
            phone: custProf?.phone || recipientPhone || '+91 98765 43210',
            subtitle: 'Customer • Active Ride',
          });
        }
      }

      // 2. Fetch existing messages
      const { data: msgData } = await supabase
        .from('messages')
        .select('*')
        .eq('ride_id', rideId)
        .order('created_at', { ascending: true });

      if (msgData) {
        setMessages(msgData as Message[]);
        setTimeout(scrollToBottom, 100);
      }
    };

    fetchDetails();

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
  }, [rideId, isOpen, currentUserId, currentUserRole, recipientName, recipientPhone]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || newMessage.trim();
    if (!text || loading) return;

    if (!textToSend) setNewMessage('');
    setLoading(true);

    try {
      const { error } = await supabase.from('messages').insert({
        ride_id: rideId,
        sender_id: currentUserId,
        sender_role: currentUserRole,
        message: text,
      });

      if (error) {
        console.error('Failed to send message:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCall = () => {
    const cleanNum = partnerInfo.phone.replace(/[^0-9+]/g, '');
    window.location.href = `tel:${cleanNum || '+919876543210'}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-md transition-opacity">
      <div className="flex h-full w-full max-w-md flex-col bg-slate-950 text-white shadow-2xl border-l border-slate-800 animate-in slide-in-from-right duration-200">
        
        {/* HEADER: Partner Info & Call Button */}
        <div className="flex items-center justify-between border-b border-slate-800/80 px-4 py-3.5 bg-slate-900/90 backdrop-blur-xl">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <div className="h-10 w-10 rounded-2xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-400 font-bold shadow-inner">
                {currentUserRole === 'CUSTOMER' ? <Bike className="h-5 w-5" /> : <User className="h-5 w-5" />}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-slate-950" />
            </div>

            <div className="min-w-0">
              <h3 className="font-extrabold text-slate-100 text-sm truncate">{partnerInfo.name}</h3>
              <p className="text-[11px] text-slate-400 truncate font-medium">{partnerInfo.subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* CALL BUTTON */}
            <button
              onClick={handleCall}
              title={`Call ${partnerInfo.name}`}
              className="flex items-center gap-1.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-3.5 py-1.5 text-xs font-extrabold shadow-md transition-transform active:scale-95"
            >
              <Phone className="h-3.5 w-3.5 fill-slate-950" />
              <span>Call</span>
            </button>

            {/* CLOSE BUTTON */}
            <button
              onClick={onClose}
              className="rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* QUICK REPLIES BAR */}
        <div className="p-2.5 bg-slate-900/40 border-b border-slate-800/60 overflow-x-auto flex gap-2 scrollbar-none">
          {quickReplies.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(chip)}
              className="px-3 py-1.5 rounded-full bg-slate-800/80 hover:bg-amber-500/20 hover:border-amber-500/40 border border-slate-700/60 text-[11px] font-semibold text-slate-300 hover:text-amber-400 whitespace-nowrap transition-colors"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* MESSAGE FEED */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-950/60">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-slate-500 text-xs space-y-2 p-6">
              <div className="h-12 w-12 rounded-2xl bg-slate-900 flex items-center justify-center text-amber-400 border border-slate-800">
                <MessageSquare className="h-6 w-6" />
              </div>
              <div>
                <p className="font-bold text-slate-300">Start Conversation</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Send a message or tap a quick response chip above to reach out.</p>
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender_id === currentUserId;
              const formattedTime = new Date(msg.created_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <span className="text-[9px] text-slate-400 px-1 mb-1 font-bold">
                    {msg.sender_role === 'CAPTAIN' ? 'Captain' : 'Customer'}
                  </span>

                  <div
                    className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-xs shadow-md space-y-1 ${
                      isMe
                        ? 'bg-amber-400 text-slate-950 font-bold rounded-br-none'
                        : 'bg-slate-900 text-slate-100 border border-slate-800 rounded-bl-none'
                    }`}
                  >
                    <p className="leading-relaxed">{msg.message}</p>
                    <div className={`flex items-center justify-end gap-1 text-[9px] ${isMe ? 'text-slate-800' : 'text-slate-400'}`}>
                      <span>{formattedTime}</span>
                      {isMe && <CheckCheck className="h-3 w-3 text-slate-900" />}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* MESSAGE INPUT FORM */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="border-t border-slate-800/80 p-3 bg-slate-900/90 flex gap-2"
        >
          <input
            type="text"
            placeholder="Type your message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1 rounded-2xl bg-slate-800/80 border border-slate-700/60 px-4 py-3 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || loading}
            className="flex items-center justify-center rounded-2xl bg-amber-400 px-4.5 py-3 font-extrabold text-slate-950 hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed transition-transform active:scale-95 shadow-md shrink-0"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
