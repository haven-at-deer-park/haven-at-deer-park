'use client';
import React, { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, X, Send, User, Bot } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type ChatMode =
  | 'chat'
  | 'collecting_name'
  | 'collecting_phone'
  | 'collecting_preferred_contact'
  | 'collecting_summary'
  | 'collecting_dates_optional'
  | 'collecting_party_size_optional'
  | 'confirming_contact'
  | 'updating_field'
  | 'submitting'
  | 'submitted';

type InquiryType = 'Booking' | 'Event' | 'Amenities' | 'General' | 'Other';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const INITIAL_LEAD_FORM = {
  name: '',
  phone: '',
  email: '',
  preferredContact: '',
  dates: '',
  partySize: '',
  summary: '',
};

const BOOKING_KEYWORDS = /\b(booking|reservation|availability|dates|stay|lodging|rent|renting|rental|event|party|group|weekend|wedding|retreat|family gathering|vacation|overnight)\b/i;

const EVENT_KEYWORDS = /\b(event|wedding|retreat|family gathering)\b/i;

const AMENITIES_KEYWORDS = /\b(amenities|amenity|hot tub|karaoke|arcade|walkway|pool|games)\b/i;

const HUMAN_TRIGGERS = /\b(human|agent|contact|talk to|speak to someone|speak to a human|real person|booking help|reservation|availability|pricing|call me|whatsapp|text me|rent|renting|rental|stay|lodging|event|retreat|wedding|weekend|group|party)\b/i;

/**
 * Classify inquiry type from summary text.
 */
function classifyInquiry(summary: string): InquiryType {
  const lower = summary.toLowerCase();
  if (EVENT_KEYWORDS.test(lower)) return 'Event';
  if (BOOKING_KEYWORDS.test(lower)) return 'Booking';
  if (AMENITIES_KEYWORDS.test(lower)) return 'Amenities';
  // Very short or generic
  if (lower.length < 15) return 'General';
  return 'General';
}

/**
 * Clean short/terse inquiry summaries into useful sentences.
 */
function cleanSummary(raw: string): string {
  const lower = raw.trim().toLowerCase();
  // Very short single-word answers
  const shortMappings: Record<string, string> = {
    'renting': 'Guest is interested in renting and wants follow-up.',
    'rent': 'Guest is interested in renting and wants follow-up.',
    'rental': 'Guest is interested in a rental and wants follow-up.',
    'booking': 'Guest wants to make a booking.',
    'book': 'Guest wants to make a booking.',
    'price': 'Guest has a pricing question.',
    'pricing': 'Guest has a pricing question.',
    'available': 'Guest is asking about availability.',
    'availability': 'Guest is asking about availability.',
    'help': 'Guest needs help and wants the team to contact them.',
    'amenities': 'Guest has a question about amenities and wants the team to contact them.',
    'stay': 'Guest is interested in staying and wants follow-up.',
    'event': 'Guest is interested in hosting an event.',
    'wedding': 'Guest is interested in hosting a wedding.',
    'retreat': 'Guest is interested in booking a retreat.',
  };

  if (shortMappings[lower]) return shortMappings[lower];
  // Already a decent sentence, return as-is
  return raw.trim();
}

/**
 * Normalize preferred contact input to WhatsApp or SMS.
 * Returns null if unrecognized.
 */
function normalizePreferredContact(input: string): 'WhatsApp' | 'SMS' | null {
  const lower = input.trim().toLowerCase();
  if (['whatsapp', 'whats app', 'wa'].includes(lower)) return 'WhatsApp';
  if (['sms', 'text', 'txt'].includes(lower)) return 'SMS';
  return null;
}

/**
 * Validate phone number with strict digit-count rules.
 * - 10 digits: US/Canada local (e.g. 7787739915)
 * - 11 digits starting with 1: US/Canada with country code (e.g. 17787739915)
 * - Starts with + and 8-15 digits: international (e.g. +639816597336)
 * - Everything else: rejected
 */
function isValidPhone(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) return false;
  // Reject obvious garbage (only punctuation, letters, etc.)
  if (!/[0-9]/.test(trimmed)) return false;

  const hasPlus = trimmed.startsWith('+');
  const digitsOnly = trimmed.replace(/[^0-9]/g, '');

  if (hasPlus) {
    // International: 8-15 digits after +
    return digitsOnly.length >= 8 && digitsOnly.length <= 15;
  }

  // US/Canada: exactly 10 digits
  if (digitsOnly.length === 10) return true;

  // US/Canada with country code: exactly 11 digits starting with 1
  if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) return true;

  return false;
}

/**
 * Check if a date answer is too vague (bare month name, "soon", etc.)
 * and needs clarification before accepting.
 */
function isVagueDate(input: string): { vague: boolean; month?: string } {
  const lower = input.trim().toLowerCase();
  // Bare month or "this/next month"
  const monthMatch = lower.match(/^(this |next )?(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)$/i);
  if (monthMatch) {
    return { vague: true, month: monthMatch[2] };
  }
  // Generic vague words
  if (/^(soon|sometime|whenever|later|eventually)$/i.test(lower)) {
    return { vague: true };
  }
  return { vague: false };
}

/** Check if a date/party-size answer is an explicit unsure/unknown. */
function isUnsureAnswer(input: string): boolean {
  const lower = input.trim().toLowerCase();
  return /\b(not sure|not sure yet|unknown|tbd|unsure|don.?t know|i dunno|idk|still deciding|no idea|flexible)\b/i.test(lower);
}

/**
 * Check if the input looks like a valid date answer.
 * Bare numbers alone (e.g. "12") are NOT valid dates.
 * Must contain recognizable date patterns, month/day names,
 * relative words (tomorrow, weekend, etc.), or explicit flexibility.
 */
function isValidDateAnswer(input: string): boolean {
  const lower = input.trim().toLowerCase();
  if (!lower) return false;
  // Explicit unsure is valid
  if (isUnsureAnswer(lower)) return true;
  const hasMonth = /\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\b/i.test(lower);
  const hasDigit = /\d/.test(lower);
  // Must have a month name + a number: "May 10", "June 1-5", "Dec 20 2026"
  if (hasMonth && hasDigit) return true;
  // Relative time words (no month needed)
  if (/\b(tomorrow|today|tonight|weekend|next week|this week|next month|this month|end of|beginning of|first week|last week)\b/i.test(lower)) return true;
  // Flexibility
  if (/\b(flexible|anytime|any time|whenever|open)\b/i.test(lower)) return true;
  return false;
}

/**
 * Build the full transcript from all messages (for Supabase storage).
 * Capped at 25000 characters. Includes ALL messages unfiltered.
 */
function buildFullTranscript(msgs: Message[]): string {
  const MAX_STORAGE = 25000;
  return msgs
    .filter(m => m.role !== 'system')
    .map(m => {
      const role = m.role === 'user' ? 'Guest' : 'Bot';
      return `${role}: ${m.content}`;
    })
    .join('\n')
    .substring(0, MAX_STORAGE);
}

/** Patterns that indicate validation noise in bot messages */
const VALIDATION_NOISE_BOT = [
  /doesn.t look like a valid phone/i,
  /please enter your full phone number/i,
  /please choose whatsapp or sms/i,
  /please enter a valid number/i,
  /could you please share your name/i,
];

/** Patterns that indicate junk user input during slot collection */
const VALIDATION_NOISE_USER = [
  /^[^a-z0-9]*$/i,          // Only punctuation/symbols
  /^(none|what|email|na|n\/a)$/i,  // Common invalid slot answers
];

/**
 * Build a high-signal conversation context for the Twilio notification.
 * Filters out validation noise (invalid phone attempts, repeated prompts).
 * Full transcript is saved separately to Supabase unfiltered.
 */
function buildContextExcerpt(msgs: Message[]): string {
  const MAX_EXCERPT = 1200;
  const lines: string[] = [];

  for (let i = 0; i < msgs.length; i++) {
    const m = msgs[i];
    if (m.role === 'system') continue;

    // Skip bot validation noise
    if (m.role === 'assistant' && VALIDATION_NOISE_BOT.some(p => p.test(m.content))) {
      continue;
    }

    // Skip user junk that precedes a validation noise bot message
    if (m.role === 'user' && i + 1 < msgs.length) {
      const next = msgs[i + 1];
      if (next.role === 'assistant' && VALIDATION_NOISE_BOT.some(p => p.test(next.content))) {
        continue; // Skip the invalid attempt
      }
    }

    // Skip standalone user junk
    if (m.role === 'user' && VALIDATION_NOISE_USER.some(p => p.test(m.content.trim()))) {
      continue;
    }

    const role = m.role === 'user' ? 'Guest' : 'Bot';
    let content = m.content;
    // Shorten long bot responses
    if (m.role === 'assistant' && content.length > 200) {
      const cutPoint = content.lastIndexOf('. ', 200);
      content = cutPoint > 100 ? content.substring(0, cutPoint + 1) : content.substring(0, 200);
      content += '...';
    }
    lines.push(`${role}: ${content}`);
  }

  let result = lines.join('\n');
  if (result.length > MAX_EXCERPT) {
    result = result.substring(0, MAX_EXCERPT);
    const lastNewline = result.lastIndexOf('\n');
    if (lastNewline > MAX_EXCERPT * 0.5) {
      result = result.substring(0, lastNewline);
    }
    result = result.trimEnd() + '...';
  }
  return result;
}

export const HavenConcierge = () => {
  const pathname = usePathname();
  
  // Hide concierge on admin pages
  if (pathname?.startsWith('/admin')) {
    return null;
  }

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [chatMode, setChatMode] = useState<ChatMode>('chat');
  const [needsBookingDetails, setNeedsBookingDetails] = useState(false);
  const [inquiryType, setInquiryType] = useState<InquiryType>('General');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [leadForm, setLeadForm] = useState({ ...INITIAL_LEAD_FORM });
  const [sessionContact, setSessionContact] = useState({ name: '', phone: '', preferredContact: '' });
  const [updateTarget, setUpdateTarget] = useState<'name' | 'phone' | 'preferredContact' | null>(null);

  const [hasShownWelcome, setHasShownWelcome] = useState(false);
  const [showBadge, setShowBadge] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
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
    if (isOpen && !hasShownWelcome) {
      const systemMessage: Message = {
        role: 'system',
        content: 'Welcome to Haven Concierge!\n\nI\'m here to help you with questions about our beautiful properties in Vernon, BC. Feel free to ask about amenities, capacity, booking, or anything else!\n\nYou can speak to a human at any time. If you request to connect with us, your chat will be sent to our team.',
      };
      setMessages([systemMessage]);
      setHasShownWelcome(true);
    }
  }, [isOpen, hasShownWelcome]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatMode, isOpen]);

  /**
   * Reset lead form and related state for a fresh handoff.
   */
  const resetLeadState = () => {
    setLeadForm({ ...INITIAL_LEAD_FORM });
    setNeedsBookingDetails(false);
    setInquiryType('General');
    setIsSubmitting(false);
  };

  /**
   * Submit the lead to the Edge Function.
   */
  const submitLead = async (finalForm: typeof leadForm, classifiedType: InquiryType, currentMessages: Message[]) => {
    if (isSubmitting) return; // Duplicate submit guard
    setIsSubmitting(true);
    setChatMode('submitting');
    setMessages(prev => [...prev, { role: 'assistant', content: 'Got it! Sending your request now...' }]);
    setIsLoading(true);

    try {
      const fullTranscript = buildFullTranscript(currentMessages);
      const contextExcerpt = buildContextExcerpt(currentMessages);

      const cleanedSummary = cleanSummary(finalForm.summary);

      const { data, error } = await supabase.functions.invoke('haven-concierge', {
        body: {
          action: 'capture_and_notify',
          sessionId,
          leadData: {
            name: finalForm.name,
            phone: finalForm.phone,
            email: finalForm.email || '',
            preferredContact: finalForm.preferredContact,
            dates: finalForm.dates || null,
            partySize: finalForm.partySize || null,
            rawPartySize: finalForm.partySize || null,
            summary: cleanedSummary,
            inquiryType: classifiedType,
            notes: cleanedSummary,
          },
          fullTranscript,
          contextExcerpt,
        },
      });

      if (error) throw error;

      setChatMode('submitted');
      const contactMethod = finalForm.preferredContact || 'your preferred method';
      const confirmMessage: Message = {
        role: 'assistant',
        content: `Thank you, ${finalForm.name}. I sent your request to our team. They'll follow up by ${contactMethod} shortly.`,
      };
      setMessages(prev => [...prev, confirmMessage]);
      toast({
        title: 'Request Sent!',
        description: 'Our team will be in touch soon.',
      });

      // Preserve contact for session memory, then reset inquiry state
      setSessionContact({
        name: finalForm.name,
        phone: finalForm.phone,
        preferredContact: finalForm.preferredContact,
      });
      resetLeadState();
      setChatMode('chat');
    } catch (error) {
      console.error('Error submitting lead:', error);
      const fallbackName = finalForm.name || 'there';
      const saveMessage: Message = {
        role: 'assistant',
        content: `Thank you, ${fallbackName}. Your request was saved. Our team will follow up as soon as possible.`,
      };
      setMessages(prev => [...prev, saveMessage]);
      toast({
        title: 'Error',
        description: 'Failed to send request. Please try again.',
        variant: 'destructive',
      });
      resetLeadState();
      setChatMode('chat');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async (overrideInput?: string) => {
    const textToSend = overrideInput || input.trim();
    if (!textToSend || isLoading) return;

    const userMessage: Message = { role: 'user', content: textToSend };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    const currentInput = textToSend;
    if (!overrideInput) setInput('');
    setIsLoading(true);

    try {
      // --- confirming_contact (repeat handoff) ---
      if (chatMode === 'confirming_contact') {
        const lower = currentInput.trim().toLowerCase();
        if (/^(yes|yep|yeah|correct|that.?s? correct|same|use that|y|yea|sure|ok)$/i.test(lower)) {
          // Reuse session contact
          setLeadForm(p => ({ ...p, name: sessionContact.name, phone: sessionContact.phone, preferredContact: sessionContact.preferredContact }));
          setChatMode('collecting_summary');
          setMessages(prev => [...prev, { role: 'assistant', content: 'Great! What do you need help with this time?' }]);
        } else if (/^(no|nope|nah|update|change|different)$/i.test(lower)) {
          setChatMode('updating_field');
          setMessages(prev => [...prev, { role: 'assistant', content: 'What should I update: name, phone, or preferred contact?' }]);
        } else {
          setMessages(prev => [...prev, { role: 'assistant', content: 'Please say "yes" to keep the same contact info, or "no" to update it.' }]);
        }
        setIsLoading(false);
        return;
      }

      // --- updating_field (partial contact update) ---
      if (chatMode === 'updating_field') {
        const lower = currentInput.trim().toLowerCase();
        if (/\bname\b/i.test(lower)) {
          setUpdateTarget('name');
          setLeadForm(p => ({ ...p, phone: sessionContact.phone, preferredContact: sessionContact.preferredContact }));
          setChatMode('collecting_name');
          setMessages(prev => [...prev, { role: 'assistant', content: 'What is your name?' }]);
        } else if (/\bphone\b/i.test(lower)) {
          setUpdateTarget('phone');
          setLeadForm(p => ({ ...p, name: sessionContact.name, preferredContact: sessionContact.preferredContact }));
          setChatMode('collecting_phone');
          setMessages(prev => [...prev, { role: 'assistant', content: 'What is the best phone or WhatsApp number to reach you at?' }]);
        } else if (/\b(preferred|contact|whatsapp|sms)\b/i.test(lower)) {
          setUpdateTarget('preferredContact');
          setLeadForm(p => ({ ...p, name: sessionContact.name, phone: sessionContact.phone }));
          setChatMode('collecting_preferred_contact');
          setMessages(prev => [...prev, { role: 'assistant', content: 'Do you prefer WhatsApp or SMS?' }]);
        } else {
          setMessages(prev => [...prev, { role: 'assistant', content: 'Please choose what to update: name, phone, or preferred contact.' }]);
        }
        setIsLoading(false);
        return;
      }

      // --- collecting_name ---
      if (chatMode === 'collecting_name') {
        if (!currentInput.trim()) {
          setMessages(prev => [...prev, { role: 'assistant', content: 'Could you please share your name so our team knows who to reach out to?' }]);
          setIsLoading(false);
          return;
        }
        setLeadForm(p => ({ ...p, name: currentInput.trim() }));
        if (updateTarget === 'name') {
          setUpdateTarget(null);
          setChatMode('collecting_summary');
          setMessages(prev => [...prev, { role: 'assistant', content: 'Name updated. Could you briefly summarize what you need help with?' }]);
        } else {
          setChatMode('collecting_phone');
          setMessages(prev => [...prev, { role: 'assistant', content: `Thanks ${currentInput.trim()}! What is the best phone or WhatsApp number to reach you at?` }]);
        }
        setIsLoading(false);
        return;
      }

      // --- collecting_phone ---
      if (chatMode === 'collecting_phone') {
        if (!isValidPhone(currentInput)) {
          setMessages(prev => [...prev, { role: 'assistant', content: 'Please enter your full phone number with area code. If you are outside the US or Canada, include your country code.' }]);
          setIsLoading(false);
          return;
        }
        setLeadForm(p => ({ ...p, phone: currentInput.trim() }));
        if (updateTarget === 'phone') {
          setUpdateTarget(null);
          setChatMode('collecting_summary');
          setMessages(prev => [...prev, { role: 'assistant', content: 'Phone updated. Could you briefly summarize what you need help with?' }]);
        } else {
          setChatMode('collecting_preferred_contact');
          setMessages(prev => [...prev, { role: 'assistant', content: 'Do you prefer WhatsApp or SMS?' }]);
        }
        setIsLoading(false);
        return;
      }

      // --- collecting_preferred_contact ---
      if (chatMode === 'collecting_preferred_contact') {
        const normalized = normalizePreferredContact(currentInput);
        if (!normalized) {
          setMessages(prev => [...prev, { role: 'assistant', content: 'Please choose WhatsApp or SMS so our team knows the best way to reach you.' }]);
          setIsLoading(false);
          return;
        }
        setLeadForm(p => ({ ...p, preferredContact: normalized }));
        if (updateTarget === 'preferredContact') {
          setUpdateTarget(null);
        }
        setChatMode('collecting_summary');
        setMessages(prev => [...prev, { role: 'assistant', content: 'Could you briefly summarize what you need help with?' }]);
        setIsLoading(false);
        return;
      }

      // --- collecting_summary ---
      if (chatMode === 'collecting_summary') {
        const rawSummary = currentInput.trim();
        const lower = rawSummary.toLowerCase();

        // Reject vague trigger-only answers
        if (/^(human|agent|help|hi|hello|hey|test)$/i.test(lower)) {
          setMessages(prev => [...prev, { role: 'assistant', content: 'What specifically do you need help with: booking, availability, amenities, pricing, or something else?' }]);
          setIsLoading(false);
          return;
        }

        // Handle user asking a question during summary collection
        if (/^(what|how|do you|can you|is there|are there|does|where|when)\b/i.test(lower) && AMENITIES_KEYWORDS.test(lower)) {
          setMessages(prev => [...prev, { role: 'assistant', content: 'Haven includes amenities such as hot tub access, the Infinite Walkway, karaoke, arcade games, and gaming consoles. Would you like our team to follow up about amenities, booking, pricing, or something else?' }]);
          setIsLoading(false);
          return; // Stay in collecting_summary
        }

        const cleaned = cleanSummary(rawSummary);
        const classified = classifyInquiry(rawSummary);
        setInquiryType(classified);

        const updatedForm = { ...leadForm, summary: cleaned };
        setLeadForm(updatedForm);

        const isBookingRelated = needsBookingDetails || BOOKING_KEYWORDS.test(lower);

        if (isBookingRelated) {
          setChatMode('collecting_dates_optional');
          setMessages(prev => [...prev, { role: 'assistant', content: 'What dates are you considering?' }]);
        } else {
          submitLead(updatedForm, classified, nextMessages);
        }
        setIsLoading(false);
        return;
      }

      // --- collecting_dates_optional ---
      if (chatMode === 'collecting_dates_optional') {
        const lower = currentInput.toLowerCase();

        // Detect questions about availability instead of actual dates
        if (/\b(what dates|are you available|is.+available|can i check|what.+open|do you have|when.+available|any.+available)\b/i.test(lower)) {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: "I don't have live availability inside this chat. Tell me the dates you want checked, and our team can confirm availability. What dates should our team check for you?",
          }]);
          setIsLoading(false);
          return; // Stay in collecting_dates_optional
        }

        // Detect vague month-only or vague time answers
        const vagueCheck = isVagueDate(currentInput);
        if (vagueCheck.vague) {
          const monthLabel = vagueCheck.month
            ? vagueCheck.month.charAt(0).toUpperCase() + vagueCheck.month.slice(1)
            : null;
          const msg = monthLabel
            ? `Do you have specific dates or a date range in ${monthLabel}, or should I mark you as flexible in ${monthLabel}?`
            : 'Do you have specific dates in mind, or should I mark you as flexible?';
          setMessages(prev => [...prev, { role: 'assistant', content: msg }]);
          setIsLoading(false);
          return; // Stay in collecting_dates_optional
        }

        // Reject garbage that doesn't look like a date
        if (!isValidDateAnswer(currentInput)) {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: "Please provide a date, date range, or say 'not sure yet' if you are unsure.",
          }]);
          setIsLoading(false);
          return; // Stay in collecting_dates_optional — do NOT move to party size
        }

        // Normalize unsure answers to a clean value
        const dateValue = isUnsureAnswer(currentInput) ? 'Not sure yet' : currentInput;
        const updatedForm = { ...leadForm, dates: dateValue };
        setLeadForm(updatedForm);
        setChatMode('collecting_party_size_optional');
        setMessages(prev => [...prev, { role: 'assistant', content: 'How many guests will be staying or attending?' }]);
        setIsLoading(false);
        return;
      }

      // --- collecting_party_size_optional ---
      if (chatMode === 'collecting_party_size_optional') {
        const lower = currentInput.toLowerCase();

        // Detect capacity questions instead of actual party size
        if (/\b(how many can|what.+capacity|can.+fit|max.+guests|how big|how.+large)\b/i.test(lower)) {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: 'Capacity depends on the property and setup. To help the team respond accurately, about how many guests are in your group?',
          }]);
          setIsLoading(false);
          return; // Stay in collecting_party_size_optional
        }

        // Extract a number from the input (handles "around 12", "maybe 8", etc.)
        const numberMatch = currentInput.match(/\d+/);
        const parsed = numberMatch ? parseInt(numberMatch[0]) : NaN;
        const unsure = isUnsureAnswer(currentInput);

        // If no number and not an explicit unsure answer, reject and re-ask
        if (isNaN(parsed) && !unsure) {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: 'About how many guests will be staying or attending? You can give an estimate, or say "not sure" if you are unsure.',
          }]);
          setIsLoading(false);
          return; // Stay in collecting_party_size_optional — do NOT submit
        }

        // Valid answer: number or explicit unsure
        const partySizeValue = !isNaN(parsed) ? String(parsed) : 'Not sure yet';

        // Hard guard: do not submit if dates are empty/invalid for booking leads
        const currentDates = leadForm.dates;
        if (!currentDates || (!isValidDateAnswer(currentDates) && !isUnsureAnswer(currentDates) && currentDates !== 'Not sure yet')) {
          setChatMode('collecting_dates_optional');
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: "Before I submit, I still need your preferred dates. What dates are you considering, or say 'not sure yet' if flexible?",
          }]);
          setIsLoading(false);
          return;
        }

        const finalForm = {
          ...leadForm,
          partySize: partySizeValue,
        };
        setLeadForm(finalForm);
        submitLead(finalForm, inquiryType, nextMessages);
        setIsLoading(false);
        return;
      }

      // --- Check for human handoff triggers ---
      if (HUMAN_TRIGGERS.test(currentInput.toLowerCase()) && chatMode === 'chat') {
        // Reset inquiry state for a fresh handoff
        resetLeadState();
        setNeedsBookingDetails(BOOKING_KEYWORDS.test(currentInput.toLowerCase()));

        // If we have session contact from a previous handoff, confirm instead of re-collecting
        if (sessionContact.name && sessionContact.phone && sessionContact.preferredContact) {
          setChatMode('confirming_contact');
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `I still have your contact as ${sessionContact.name} at ${sessionContact.phone}, preferred by ${sessionContact.preferredContact}. Is that still correct?`,
          }]);
        } else {
          setChatMode('collecting_name');
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: "I'd be happy to connect you with our team! First, what is your name?",
          }]);
        }
        setIsLoading(false);
        return;
      }

      // --- Normal AI chat ---
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
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive',
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
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex items-center gap-2">
          <span className="hidden sm:inline text-sm font-medium bg-background/95 backdrop-blur-sm px-3 py-2 rounded-lg shadow-md border animate-fade-in">
            Chat with Haven Concierge
          </span>
          <div className="relative">
            <Button
              onClick={() => setIsOpen(true)}
              className="h-12 w-12 sm:h-14 sm:w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 animate-bounce-gentle hover:animate-none"
              size="icon"
            >
              <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6" />
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

      {/* Chat Window - Fullscreen on mobile, floating card on desktop */}
      {isOpen && (
        <Card className="fixed inset-0 sm:inset-auto sm:bottom-4 sm:right-4 w-full sm:w-96 h-[100dvh] sm:h-[min(600px,85vh)] shadow-2xl z-50 flex flex-col animate-scale-in sm:rounded-lg rounded-none">
          {/* Header */}
          <div className="flex items-center justify-between p-3 sm:p-4 border-b bg-primary text-primary-foreground sm:rounded-t-lg">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              <div>
                <h3 className="font-semibold text-sm sm:text-base">Haven Concierge</h3>
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
          <ScrollArea className="flex-1 p-3 sm:p-4">
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
              {isLoading && chatMode === 'chat' && (
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
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-3 sm:p-4 border-t pb-safe">
            {messages.length === 1 && chatMode === 'chat' && (
              <div className="flex gap-2 overflow-x-auto pb-3" style={{ scrollbarWidth: 'thin' }}>
                {["What are your amenities?", "How many guests can stay?", "Speak to a human"].map((suggestion, i) => (
                  <Button 
                    key={i} 
                    variant="outline" 
                    size="sm" 
                    className="whitespace-nowrap rounded-full text-xs bg-muted/50 hover:bg-primary hover:text-primary-foreground border-primary/20 transition-colors"
                    onClick={() => handleSend(suggestion)}
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={chatMode === 'chat' ? "Ask about our properties..." : "Type your answer..."}
                disabled={isLoading || chatMode === 'submitting'}
                className="flex-1 text-base sm:text-sm"
              />
              <Button
                onClick={() => handleSend()}
                disabled={isLoading || chatMode === 'submitting' || !input.trim()}
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Type &quot;human&quot; to connect with our team
            </p>
          </div>
        </Card>
      )}
    </>
  );
};
