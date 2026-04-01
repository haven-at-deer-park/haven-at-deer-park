'use client';

import dynamic from 'next/dynamic';

const IndexPage = dynamic(() => import('@/views/Index'), { ssr: false });

export default function Home() {
  return <IndexPage />;
}
