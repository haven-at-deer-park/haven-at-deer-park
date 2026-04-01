'use client';

import dynamic from 'next/dynamic';

const AdminDashboardPage = dynamic(() => import('@/views/AdminDashboard'), { ssr: false });

export default function AdminDashboard() {
  return <AdminDashboardPage />;
}
