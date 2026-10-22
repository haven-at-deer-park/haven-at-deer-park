import type { Metadata } from 'next';
import Contact from '@/views/Contact';

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Get in touch with The Haven at Deer Park for inquiries, custom group bookings, event reservations, or questions about your upcoming stay in Vernon, BC.',
  alternates: {
    canonical: 'https://havenatdeerpark.com/contact',
  },
};

export default function ContactPage() {
  return <Contact />;
}
