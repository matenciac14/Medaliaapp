import { prisma } from '@/lib/db/prisma'
import { ProposalsClient } from './_components/ProposalsClient'

export default async function AdminNutritionProposalsPage() {
  const proposals = await prisma.foodProposal.findMany({
    where:   { status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true, name: true, category: true,
      kcalPer100g: true, proteinPer100g: true, carbsPer100g: true, fatPer100g: true,
      country: true, notes: true, status: true, reviewNote: true, foodId: true, createdAt: true,
      submittedBy: { select: { name: true } },
    },
  })

  const pendingCount = proposals.filter(p => p.status === 'PENDING').length

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Propuestas de alimentos</h1>
        <p className="text-sm text-gray-500 mt-1">
          {pendingCount > 0
            ? `${pendingCount} propuesta${pendingCount !== 1 ? 's' : ''} pendiente${pendingCount !== 1 ? 's' : ''} de revisión`
            : 'Sin propuestas pendientes'}
        </p>
      </div>
      <ProposalsClient proposals={proposals} />
    </div>
  )
}
