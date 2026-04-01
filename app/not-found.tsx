'use client';

import dynamic from 'next/dynamic';

const NotFoundPage = dynamic(() => import('@/views/NotFound'), { ssr: false });

export default function NotFound() {
  return <NotFoundPage />;
}
