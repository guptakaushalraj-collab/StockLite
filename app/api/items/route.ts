import { NextResponse } from 'next/server'
import { applyStockMovement, applyTransfer, products } from '@/lib/seed-data'

// Always read the live in-memory store; never serve a build-time snapshot.
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
  return NextResponse.json({ products })
}

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
      if (direction !== 'IN' && direction !== 'OUT') {
        return NextResponse.json(
          { error: 'direction must be IN or OUT' },
          { status: 400 },
        )
      }
      const product = applyStockMovement(
        productId,
        parseQuantity(quantity),
        direction,
      )
      return NextResponse.json({ product, products })
    }

    if (action === 'transfer') {
      const { productId, destWarehouseId, quantity } = body as {
        productId: string
        destWarehouseId: string
        quantity: unknown
      }
      const { source, destination } = applyTransfer(
        productId,
        destWarehouseId,
        parseQuantity(quantity),
      )
      return NextResponse.json({ source, destination, products })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Request failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
