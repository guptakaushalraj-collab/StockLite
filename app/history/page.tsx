import DashboardShell from '@/components/DashboardShell'
import TransactionTable from '@/components/TransactionTable'
import { listTransactions, warehouses } from '@/lib/store'

export const dynamic = 'force-dynamic'

export default async function HistoryPage() {
  const transactions = await listTransactions()

  return (
    <DashboardShell>
      <div className="page-header">
        <div>
          <h1>Transaction History</h1>
          <p>A record of every stock movement across warehouses.</p>
        </div>
      </div>
      <TransactionTable
        transactions={transactions}
        warehouses={warehouses}
      />
    </DashboardShell>
  )
}
