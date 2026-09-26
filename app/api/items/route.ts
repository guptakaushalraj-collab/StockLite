import { NextResponse } from 'next/server'
import { listProducts, stockMovement, transfer } from '@/lib/store'
import { StockError } from '@/lib/stock-rules'

// Always read the live store; never serve a build-time snapshot.
export const dynamic = 'force-dynamic'

// Accept a JSON number or a numeric string; anything else (null, booleans,
// empty strings, "abc") becomes NaN so validation rejects it instead of
// silently coercing it to 0 or 1.
function parseQuantity(value: unknown): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string' && value.trim() !== '') return Number(value)
  return NaN
}

export async function GET() {
  return NextResponse.json({ products: await listProducts() })
}

const badRequest = (error: string) =>
  NextResponse.json({ error }, { status: 400 })

export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const action = body.action

  try {
    if (action === 'stock') {
      const { productId, quantity, direction } = body as {
        productId: string
        quantity: unknown
        direction: 'IN' | 'OUT'
      }
      if (typeof productId !== 'string') {
        return badRequest('productId is required')
      }
      if (direction !== 'IN' && direction !== 'OUT') {
        return badRequest('direction must be IN or OUT')
      }
      const result = await stockMovement(
        productId,
        parseQuantity(quantity),
        direction,
      )
      return NextResponse.json(result)
    }

    if (action === 'transfer') {
      const { productId, destWarehouseId, quantity } = body as {
        productId: string
        destWarehouseId: string
        quantity: unknown
      }
      if (typeof productId !== 'string') {
        return badRequest('productId is required')
      }
      if (typeof destWarehouseId !== 'string') {
        return badRequest('destWarehouseId is required')
      }
      const result = await transfer(
        productId,
        destWarehouseId,
        parseQuantity(quantity),
      )
      return NextResponse.json(result)
    }

    return badRequest('Unknown action')
  } catch (err) {
    if (err instanceof StockError) return badRequest(err.message)
    // Anything else (e.g. the database being unreachable) is our fault; log
    // it and don't leak internals to the client.
    console.error('POST /api/items failed', err)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 },
    )
  }
}
