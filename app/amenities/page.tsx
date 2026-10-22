import type { Metadata } from 'next';
import Amenities from '@/views/Amenities';

export const metadata: Metadata = {
  title: 'Amenities & Features',
  description: 'Explore the luxury amenities at The Haven at Deer Park: private hot tub, mountain-view balconies, entertainment rooms, full kitchens, fast Wi-Fi, and outdoor BBQ areas.',
  alternates: {
    canonical: 'https://havenatdeerpark.com/amenities',
  },
};

export default function AmenitiesPage() {
  return <Amenities />;
}
