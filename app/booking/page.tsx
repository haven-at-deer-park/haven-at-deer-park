'use client';

import dynamic from 'next/dynamic';

const BookingPage = dynamic(() => import('@/views/BookingPage'), { ssr: false });

export default function Booking() {
  return <BookingPage />;
}
