import { NextResponse } from 'next/server'
import { listTransactions } from '@/lib/store'

// Always read the live store; never serve a build-time snapshot.
export const dynamic = 'force-dynamic'

// GET /api/transactions — returns the transaction log.
// New transactions are recorded as a side effect of POST /api/items (stock
// in/out and transfers both log through lib/store.ts), so this route only
// needs to read the current list.
export async function GET() {
  const sorted = [...(await listTransactions())].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  )
  return NextResponse.json({ transactions: sorted })
}
