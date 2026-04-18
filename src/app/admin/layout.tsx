import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { AdminSidebarClient } from './_components/AdminSidebarClient'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user || (session.user as any).role !== 'ADMIN') {
    redirect('/dashboard')
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebarClient />
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  )
}
