'use client'

import { useEffect, useMemo, useState } from 'react'
import { Transaction, Warehouse } from '@/lib/types'

const TYPE_LABELS: Record<string, string> = {
  IN: 'Stock in',
  OUT: 'Stock out',
  TRANSFER_OUT: 'Transfer out',
  TRANSFER_IN: 'Transfer in',
}

function timeOf(t: Transaction) {
  const ms = Date.parse(t.timestamp)
  return Number.isNaN(ms) ? 0 : ms
}

// "t-012" -> 12; reflects the order transactions were recorded.
function seqOf(id: string | undefined) {
  return id ? Number(id.replace(/^t-/, '')) || 0 : 0
}

// Newest first. Ties (same timestamp) fall back to recording order, newest
// first, while keeping a transfer's OUT/IN pair together with OUT on top.
function compareNewestFirst(a: Transaction, b: Transaction) {
  const byTime = timeOf(b) - timeOf(a)
  if (byTime !== 0) return byTime
  const group = (t: Transaction) =>
    t.linkedTransactionId
      ? Math.min(seqOf(t.id), seqOf(t.linkedTransactionId))
      : seqOf(t.id)
  const byGroup = group(b) - group(a)
  if (byGroup !== 0) return byGroup
  const outFirst = (t: Transaction) => (t.type === 'TRANSFER_OUT' ? 0 : 1)
  return outFirst(a) - outFirst(b)
}

// The server renders in its own time zone, the browser in the viewer's, so
// render a fixed UTC string first (identical on both, no hydration
// mismatch) and switch to the viewer's local time once mounted.
function Timestamp({ iso }: { iso: string }) {
  const date = new Date(iso)
  const valid = !Number.isNaN(date.getTime())
  const [text, setText] = useState(() =>
    valid ? `${date.toLocaleString('en-US', { timeZone: 'UTC' })} UTC` : '—',
  )
  useEffect(() => {
    if (valid) setText(new Date(iso).toLocaleString())
  }, [iso, valid])
  return <time dateTime={valid ? iso : undefined}>{text}</time>
}

export default function TransactionTable({
  transactions,
  warehouses,
}: {
  transactions: Transaction[]
  warehouses: Warehouse[]
}) {
  const [typeFilter, setTypeFilter] = useState('all')
  const [warehouseFilter, setWarehouseFilter] = useState('all')

  const visibleTransactions = useMemo(() => {
    return transactions
      .filter(
        (t) =>
          (typeFilter === 'all' || t.type === typeFilter) &&
          (warehouseFilter === 'all' || t.warehouseId === warehouseFilter),
      )
      .sort(compareNewestFirst)
  }, [transactions, typeFilter, warehouseFilter])

  const filtersActive = typeFilter !== 'all' || warehouseFilter !== 'all'
  const clearFilters = () => {
    setTypeFilter('all')
    setWarehouseFilter('all')
  }

  return (
    <>
      <div className="filter-bar">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          aria-label="Filter by type"
        >
          <option value="all">All types</option>
          <option value="IN">Stock in</option>
          <option value="OUT">Stock out</option>
          <option value="TRANSFER_OUT">Transfer out</option>
          <option value="TRANSFER_IN">Transfer in</option>
        </select>

        <select
          value={warehouseFilter}
          onChange={(e) => setWarehouseFilter(e.target.value)}
          aria-label="Filter by warehouse"
        >
          <option value="all">All warehouses</option>
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>

        {filtersActive && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={clearFilters}
          >
            Clear filters
          </button>
        )}

        <span className="filter-count" aria-live="polite">
          Showing {visibleTransactions.length} of {transactions.length}{' '}
          transactions
        </span>
      </div>

      <div className="panel table-panel">
        {transactions.length === 0 ? (
          <div className="empty-state">
            <h3>No transactions yet</h3>
            <p>Stock movements and transfers will be listed here.</p>
          </div>
        ) : visibleTransactions.length === 0 ? (
          <div className="empty-state">
            <h3>No transactions match these filters</h3>
            <p>Try a different type or warehouse.</p>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ marginTop: 14 }}
              onClick={clearFilters}
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="table-scroll" tabIndex={0} aria-label="Transaction history table">
            <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Warehouse</th>
                <th>Type</th>
                <th>Quantity</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {visibleTransactions.map((t) => (
                <tr key={t.id}>
                  <td>{t.productName}</td>
                  <td>{t.warehouseName}</td>
                  <td>{TYPE_LABELS[t.type] ?? t.type}</td>
                  <td>{t.quantity}</td>
                  <td>
                    <Timestamp iso={t.timestamp} />
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
