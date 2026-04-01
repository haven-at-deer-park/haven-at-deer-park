'use client';

import dynamic from 'next/dynamic';

const AdminLoginPage = dynamic(() => import('@/views/AdminLogin'), { ssr: false });

export default function AdminLogin() {
  return <AdminLoginPage />;
}
