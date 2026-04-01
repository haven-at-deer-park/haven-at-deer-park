'use client';

import dynamic from 'next/dynamic';

const AmenitiesPage = dynamic(() => import('@/views/Amenities'), { ssr: false });

export default function Amenities() {
  return <AmenitiesPage />;
}
