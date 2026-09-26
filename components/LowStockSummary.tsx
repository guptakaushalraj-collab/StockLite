'use client'

import { Product, Warehouse, getStockStatus, isLowStock } from '@/lib/types'

// Per-warehouse count of products at or below their reorder threshold.
export default function LowStockSummary({
  products,
  warehouses,
  onShow,
}: {
  products: Product[]
  warehouses: Warehouse[]
  onShow: (warehouseId: string) => void
}) {
  return (
    <section className="low-stock-summary" aria-label="Low stock by warehouse">
      {warehouses.map((w) => {
        const low = products
          .filter((p) => p.warehouseId === w.id && isLowStock(p))
          .sort(
            (a, b) =>
              a.currentStock / (a.reorderThreshold || 1) -
              b.currentStock / (b.reorderThreshold || 1),
          )
        const below = low.filter((p) => getStockStatus(p) === 'critical').length
        const at = low.length - below

        return (
          <div key={w.id} className="low-stock-card">
            <div className="low-stock-card-head">
              <div>
                <h3>{w.name}</h3>
                <p>{w.location}</p>
              </div>
              <div
                className={`low-stock-count ${low.length ? 'has-low' : ''}`}
              >
                {low.length}
              </div>
            </div>

            {low.length === 0 ? (
              <p className="low-stock-none">
                All products are above their reorder threshold.
              </p>
            ) : (
              <>
                <p className="low-stock-breakdown">
                  {low.length} need replenishment · {below} below threshold ·{' '}
                  {at} at threshold
                </p>
                <ul className="low-stock-list">
                  {low.map((p) => (
                    <li key={p.id}>
                      <span
                        className={`status-dot status-dot-${getStockStatus(p)}`}
                      />
                      <span className="low-stock-name">{p.name}</span>
                      <span className="low-stock-qty">
                        {p.currentStock} / {p.reorderThreshold}
                      </span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="btn btn-secondary low-stock-show"
                  onClick={() => onShow(w.id)}
                >
                  Show in table
                </button>
              </>
            )}
          </div>
        )
      })}
    </section>
  )
}
