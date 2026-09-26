'use client'

import { useMemo, useState } from 'react'
import {
  Product,
  Warehouse,
  getStockStatus,
  getStockStatusLabel,
  isLowStock,
} from '@/lib/types'
import StatusBadge from '@/components/StatusBadge'
import LowStockSummary from '@/components/LowStockSummary'

export default function InventoryTable({
  products,
  warehouses,
}: {
  products: Product[]
  warehouses: Warehouse[]
}) {
  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category))).sort(),
    [products],
  )
  const warehouseName = (id: string) =>
    warehouses.find((w) => w.id === id)?.name ?? id

  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedWarehouse, setSelectedWarehouse] = useState('all')
  const [lowStockOnly, setLowStockOnly] = useState(false)

  const visibleProducts = useMemo(() => {
    return products.filter((p) => {
      if (selectedCategory !== 'all' && p.category !== selectedCategory)
        return false
      if (selectedWarehouse !== 'all' && p.warehouseId !== selectedWarehouse)
        return false
      if (lowStockOnly && !isLowStock(p)) return false
      return true
    })
  }, [products, selectedCategory, selectedWarehouse, lowStockOnly])

  const lowStockCount = useMemo(
    () => products.filter(isLowStock).length,
    [products],
  )
  const filtersActive =
    selectedCategory !== 'all' || selectedWarehouse !== 'all' || lowStockOnly
  const clearFilters = () => {
    setSelectedCategory('all')
    setSelectedWarehouse('all')
    setLowStockOnly(false)
  }
  const showLowStockFor = (warehouseId: string) => {
    setSelectedCategory('all')
    setSelectedWarehouse(warehouseId)
    setLowStockOnly(true)
    document
      .getElementById('inventory-filters')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <>
      <div className="summary-strip">
        <div className="summary-tile">
          <div className="value">{products.length}</div>
          <div className="label">Total SKUs tracked</div>
        </div>
        <div className="summary-tile">
          <div className="value">{warehouses.length}</div>
          <div className="label">Warehouses</div>
        </div>
        <div className="summary-tile">
          <div className="value">{categories.length}</div>
          <div className="label">Categories</div>
        </div>
        <div className="summary-tile">
          <div className="value">
            {products
              .reduce((sum, p) => sum + p.currentStock, 0)
              .toLocaleString('en-US')}
          </div>
          <div className="label">Units on hand</div>
        </div>
      </div>

      <LowStockSummary
        products={products}
        warehouses={warehouses}
        onShow={showLowStockFor}
      />

      <div className="filter-bar" id="inventory-filters">
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          aria-label="Filter by category"
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          value={selectedWarehouse}
          onChange={(e) => setSelectedWarehouse(e.target.value)}
          aria-label="Filter by warehouse"
        >
          <option value="all">All warehouses</option>
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>

        <label className="checkbox-filter">
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={(e) => setLowStockOnly(e.target.checked)}
          />
          Low stock only ({lowStockCount})
        </label>

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
          Showing {visibleProducts.length} of {products.length} products
        </span>
      </div>

      <div className="panel table-panel">
        {products.length === 0 ? (
          <div className="empty-state">
            <h3>No products in inventory yet</h3>
            <p>Products will appear here once stock is added.</p>
          </div>
        ) : visibleProducts.length === 0 ? (
          <div className="empty-state">
            <h3>No products match these filters</h3>
            <p>
              {lowStockOnly
                ? 'No products in this selection are at or below their reorder threshold.'
                : 'Try a different category or warehouse.'}
            </p>
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
          <div className="table-scroll" tabIndex={0} aria-label="Inventory table">
            <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Warehouse</th>
                <th>Current stock</th>
                <th>Reorder threshold</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {visibleProducts.map((product) => {
                const status = getStockStatus(product)
                return (
                  <tr key={product.id}>
                    <td>{product.name}</td>
                    <td>{product.category}</td>
                    <td>{warehouseName(product.warehouseId)}</td>
                    <td>{product.currentStock}</td>
                    <td>{product.reorderThreshold}</td>
                    <td>
                      <StatusBadge
                        status={status}
                        label={getStockStatusLabel(status)}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
