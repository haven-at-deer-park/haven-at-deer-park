import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, X, Send, User, Bot } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export const HavenConcierge = () => {
  const location = useLocation();
  
  // Hide concierge on admin pages
  if (location.pathname.startsWith('/admin')) {
    return null;
  }
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [hasShownWhatsAppPrompt, setHasShownWhatsAppPrompt] = useState(false);
  const [showBadge, setShowBadge] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Show notification badge after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isOpen) {
        setShowBadge(true);
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  // Hide badge when chat opens
  useEffect(() => {
    if (isOpen) {
      setShowBadge(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && !hasShownWhatsAppPrompt) {
      const systemMessage: Message = {
        role: 'system',
        content: 'Welcome to Haven Concierge! 👋\n\nI\'m here to help you with questions about our beautiful properties in Vernon, BC. Feel free to ask about amenities, capacity, booking, or anything else!\n\n💬 You can speak to a human at any time. If you request to connect with us, your chat will be sent via WhatsApp to our team.',
      };
      setMessages([systemMessage]);
      setHasShownWhatsAppPrompt(true);
    }
  }, [isOpen, hasShownWhatsAppPrompt]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const sendToWhatsApp = async () => {
    try {
      const MAX_TRANSCRIPT_LENGTH = 2000;
      
      const chatTranscript = messages
        .filter(m => m.role !== 'system')
        .map(m => {
          const role = m.role === 'user' ? 'Guest' : 'Haven Concierge';
          const content = m.content.substring(0, 500);
          return `${role}: ${content}`;
        })
        .join('\n\n')
        .substring(0, MAX_TRANSCRIPT_LENGTH);

      const message = `📱 New Haven Concierge Chat\n\n${chatTranscript}\n\n---\nSession ID: ${sessionId}`;
      const encodedMessage = encodeURIComponent(message);
      
      window.open(`https://wa.me/17787739915?text=${encodedMessage}`, '_blank');

      toast({
        title: "Chat Sent!",
        description: "Your conversation has been sent to our team via WhatsApp.",
      });
    } catch (error) {
      console.error('Error sending to WhatsApp:', error);
      toast({
        title: "Error",
        description: "Failed to send chat. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const requestsHuman = input.toLowerCase().includes('human') || 
                           input.toLowerCase().includes('speak to someone') ||
                           input.toLowerCase().includes('contact') ||
                           input.toLowerCase().includes('talk to') ||
                           input.toLowerCase().includes('real person');

      if (requestsHuman) {
        await sendToWhatsApp();
        const systemResponse: Message = {
          role: 'assistant',
          content: 'I\'ve opened WhatsApp so you can connect with our team directly! They\'ll have your chat history and will be happy to help. 😊',
        };
        setMessages(prev => [...prev, systemResponse]);
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('haven-concierge', {
        body: {
          messages: messages.filter(m => m.role !== 'system').concat(userMessage),
          sessionId,
        },
      });

      if (error) throw error;

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message,
      };
      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Chat Button - Fixed bottom right with attention animation */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2">
          <span className="text-sm font-medium bg-background/95 backdrop-blur-sm px-3 py-2 rounded-lg shadow-md border animate-fade-in">
            Chat with Haven Concierge
          </span>
          <div className="relative">
            <Button
              onClick={() => setIsOpen(true)}
              className="h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 animate-bounce-gentle hover:animate-none"
              size="icon"
            >
              <MessageCircle className="h-6 w-6" />
            </Button>
            {showBadge && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                <span className="relative inline-flex rounded-full h-5 w-5 bg-destructive text-destructive-foreground text-xs items-center justify-center font-bold">1</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Chat Window - Fixed bottom right */}
      {isOpen && (
        <Card className="fixed bottom-6 right-6 w-96 h-[600px] shadow-2xl z-50 flex flex-col animate-scale-in">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-primary text-primary-foreground rounded-t-lg">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              <div>
                <h3 className="font-semibold">Haven Concierge</h3>
                <p className="text-xs opacity-90">Here to help you</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="h-8 w-8 hover:bg-primary-foreground/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex gap-2 ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {message.role !== 'user' && (
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : message.role === 'system'
                        ? 'bg-muted text-muted-foreground border'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                  {message.role === 'user' && (
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                        <User className="h-4 w-4 text-primary-foreground" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-2 justify-start">
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                  <div className="bg-muted rounded-lg p-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about our properties..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              💬 Type "human" to connect with our team
            </p>
          </div>
        </Card>
      )}
    </>
  );
};
