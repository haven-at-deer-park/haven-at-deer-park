import type { Metadata } from 'next';
import BookingPage from '@/views/BookingPage';

export const metadata: Metadata = {
  title: 'Book Your Stay',
  description: 'Reserve your vacation rental at The Haven at Deer Park. Choose between our 7-person suite, 12-person suite, or the entire property for up to 20 guests.',
  alternates: {
    canonical: 'https://havenatdeerpark.com/booking',
  },
};

export default function Booking() {
  return <BookingPage />;
}
