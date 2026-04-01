'use client';

import dynamic from 'next/dynamic';

const GalleryPage = dynamic(() => import('@/views/Gallery'), { ssr: false });

export default function Gallery() {
  return <GalleryPage />;
}
