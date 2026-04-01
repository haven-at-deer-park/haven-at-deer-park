'use client';

import dynamic from 'next/dynamic';

const ContactPage = dynamic(() => import('@/views/Contact'), { ssr: false });

export default function Contact() {
  return <ContactPage />;
}
