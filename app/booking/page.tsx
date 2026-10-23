import type { Metadata } from 'next';
import BookingPage from '@/views/BookingPage';

export const metadata: Metadata = {
  title: 'Booking: Suites for 7, 12 or 20 Guests',
  description: 'Booking at The Haven at Deer Park in Vernon, BC: choose the 7-person suite, 12-person suite, or the entire property for up to 20 guests, then check live availability on Airbnb.',
  keywords: ['booking', 'Haven at Deer Park booking', 'Vernon BC vacation rental booking', 'group accommodation Vernon'],
  alternates: {
    canonical: 'https://havenatdeerpark.com/booking',
  },
};

export default function Booking() {
  return <BookingPage />;
}
