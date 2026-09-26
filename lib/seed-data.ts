import { Product, Transaction, TransactionType, Warehouse } from './types'
import {
  StockError,
  assertCanAdd,
  assertCanStockOut,
  assertCanTransfer,
  assertValidQuantity,
} from './stock-rules'

export const warehouses: Warehouse[] = [
  {
    id: 'wh-north',
    name: 'North Distribution Center',
    location: 'Elkridge, MD',
  },
  { id: 'wh-south', name: 'South Fulfillment Hub', location: 'Waco, TX' },
]

export const seedProducts: Product[] = [
  {
    id: 'p-001',
    name: 'Corrugated Shipping Box (M)',
    category: 'Packaging',
    warehouseId: 'wh-north',
    currentStock: 420,
    reorderThreshold: 100,
  },
  {
    id: 'p-002',
    name: 'Corrugated Shipping Box (M)',
    category: 'Packaging',
    warehouseId: 'wh-south',
    currentStock: 38,
    reorderThreshold: 100,
  },
  {
    id: 'p-003',
    name: 'Stretch Wrap Film 18in',
    category: 'Packaging',
    warehouseId: 'wh-north',
    currentStock: 64,
    reorderThreshold: 60,
  },
  {
    id: 'p-004',
    name: 'Stretch Wrap Film 18in',
    category: 'Packaging',
    warehouseId: 'wh-south',
    currentStock: 15,
    reorderThreshold: 60,
  },
  {
    id: 'p-005',
    name: 'Packing Tape, Clear 48mm',
    category: 'Packaging',
    warehouseId: 'wh-north',
    currentStock: 210,
    reorderThreshold: 80,
  },
  {
    id: 'p-006',
    name: 'Heavy-Duty Pallet Jack',
    category: 'Equipment',
    warehouseId: 'wh-south',
    currentStock: 6,
    reorderThreshold: 5,
  },
  {
    id: 'p-007',
    name: 'Heavy-Duty Pallet Jack',
    category: 'Equipment',
    warehouseId: 'wh-north',
    currentStock: 3,
    reorderThreshold: 5,
  },
  {
    id: 'p-008',
    name: 'Steel Shelving Unit 5-Tier',
    category: 'Equipment',
    warehouseId: 'wh-north',
    currentStock: 12,
    reorderThreshold: 4,
  },
  {
    id: 'p-009',
    name: 'Forklift Safety Vest',
    category: 'Safety',
    warehouseId: 'wh-south',
    currentStock: 25,
    reorderThreshold: 20,
  },
  {
    id: 'p-010',
    name: 'Forklift Safety Vest',
    category: 'Safety',
    warehouseId: 'wh-north',
    currentStock: 20,
    reorderThreshold: 20,
  },
  {
    id: 'p-011',
    name: 'Nitrile Gloves (Box of 100)',
    category: 'Safety',
    warehouseId: 'wh-north',
    currentStock: 140,
    reorderThreshold: 50,
  },
  {
    id: 'p-012',
    name: 'Nitrile Gloves (Box of 100)',
    category: 'Safety',
    warehouseId: 'wh-south',
    currentStock: 9,
    reorderThreshold: 50,
  },
  {
    id: 'p-013',
    name: 'First Aid Kit, Wall-Mount',
    category: 'Safety',
    warehouseId: 'wh-south',
    currentStock: 8,
    reorderThreshold: 8,
  },
  {
    id: 'p-014',
    name: 'Handheld Barcode Scanner',
    category: 'Electronics',
    warehouseId: 'wh-north',
    currentStock: 18,
    reorderThreshold: 6,
  },
  {
    id: 'p-015',
    name: 'Handheld Barcode Scanner',
    category: 'Electronics',
    warehouseId: 'wh-south',
    currentStock: 4,
    reorderThreshold: 6,
  },
  {
    id: 'p-016',
    name: 'Label Printer, Thermal',
    category: 'Electronics',
    warehouseId: 'wh-north',
    currentStock: 9,
    reorderThreshold: 3,
  },
  {
    id: 'p-017',
    name: 'Warehouse Radio, Two-Way',
    category: 'Electronics',
    warehouseId: 'wh-south',
    currentStock: 11,
    reorderThreshold: 10,
  },
  {
    id: 'p-018',
    name: 'Wooden Pallet, Standard',
    category: 'Materials',
    warehouseId: 'wh-north',
    currentStock: 320,
    reorderThreshold: 150,
  },
  {
    id: 'p-019',
    name: 'Wooden Pallet, Standard',
    category: 'Materials',
    warehouseId: 'wh-south',
    currentStock: 132,
    reorderThreshold: 150,
  },
  {
    id: 'p-020',
    name: 'Cardboard Dunnage Sheets',
    category: 'Materials',
    warehouseId: 'wh-south',
    currentStock: 55,
    reorderThreshold: 55,
  },
]

// A few sample transactions so the History page isn't empty on first load.
export const seedTransactions: Transaction[] = [
  {
    id: 't-001',
    productId: 'p-002',
    productName: 'Corrugated Shipping Box (M)',
    warehouseId: 'wh-south',
    warehouseName: 'South Fulfillment Hub',
    type: 'OUT',
    quantity: 62,
    timestamp: '2026-09-15T14:32:00Z',
  },
  {
    id: 't-002',
    productId: 'p-018',
    productName: 'Wooden Pallet, Standard',
    warehouseId: 'wh-north',
    warehouseName: 'North Distribution Center',
    type: 'IN',
    quantity: 100,
    timestamp: '2026-09-16T09:05:00Z',
  },
  {
    id: 't-003',
    productId: 'p-011',
    productName: 'Nitrile Gloves (Box of 100)',
    warehouseId: 'wh-north',
    warehouseName: 'North Distribution Center',
    type: 'TRANSFER_OUT',
    quantity: 40,
    timestamp: '2026-09-17T11:20:00Z',
    linkedTransactionId: 't-004',
  },
  {
    id: 't-004',
    productId: 'p-012',
    productName: 'Nitrile Gloves (Box of 100)',
    warehouseId: 'wh-south',
    warehouseName: 'South Fulfillment Hub',
    type: 'TRANSFER_IN',
    quantity: 40,
    timestamp: '2026-09-17T11:20:00Z',
    linkedTransactionId: 't-003',
  },
]

// In dev, Next can load this module more than once (one copy per route
// bundle), and each copy would get its own arrays, so a write from an API
// route could be invisible to a page. Keep the live store on globalThis so
// every copy shares one set of data.
type Store = {
  products: Product[]
  transactions: Transaction[]
  nextTransactionSeq: number
}
const globalForStore = globalThis as typeof globalThis & {
  __stockliteStore?: Store
}
// Copies, so the exported seed data stays pristine for seeding Postgres.
const store: Store = (globalForStore.__stockliteStore ??= {
  products: seedProducts.map((p) => ({ ...p })),
  transactions: seedTransactions.map((t) => ({ ...t })),
  nextTransactionSeq: seedTransactions.length + 1,
})

export const products = store.products
export const transactions = store.transactions

export function warehouseName(id: string) {
  return warehouses.find((w) => w.id === id)?.name ?? id
}

export function findProduct(id: string) {
  return products.find((p) => p.id === id)
}

export function recordTransaction(input: {
  productId: string
  productName: string
  warehouseId: string
  type: TransactionType
  quantity: number
  linkedTransactionId?: string
  timestamp?: string
}): Transaction {
  const tx: Transaction = {
    id: `t-${String(store.nextTransactionSeq++).padStart(3, '0')}`,
    productId: input.productId,
    productName: input.productName,
    warehouseId: input.warehouseId,
    warehouseName: warehouseName(input.warehouseId),
    type: input.type,
    quantity: input.quantity,
    timestamp: input.timestamp ?? new Date().toISOString(),
    linkedTransactionId: input.linkedTransactionId,
  }
  transactions.push(tx)
  return tx
}

// -------------------------------------------------------------------------
// TASK 2 — Stock In / Stock Out
// -------------------------------------------------------------------------

// Validates everything before touching the product, so a rejected movement
// leaves stock unchanged and logs nothing.
export function applyStockMovement(
  productId: string,
  quantity: number,
  direction: 'IN' | 'OUT',
): Product {
  const product = findProduct(productId)
  if (!product) throw new StockError('Product not found')

  assertValidQuantity(quantity)
  if (direction === 'OUT') assertCanStockOut(product.currentStock, quantity)
  else assertCanAdd(product.currentStock, quantity)

  product.currentStock += direction === 'IN' ? quantity : -quantity

  recordTransaction({
    productId: product.id,
    productName: product.name,
    warehouseId: product.warehouseId,
    type: direction,
    quantity,
  })

  return product
}

// -------------------------------------------------------------------------
// TASK 3 — Warehouse Transfer
// -------------------------------------------------------------------------

// The same product stocked in another warehouse is a separate row with the
// same name and category.
function findProductInWarehouse(like: Product, warehouseId: string) {
  return products.find(
    (p) =>
      p.warehouseId === warehouseId &&
      p.name === like.name &&
      p.category === like.category,
  )
}

function nextProductId() {
  const max = products.reduce(
    (m, p) => Math.max(m, Number(p.id.replace(/^p-/, '')) || 0),
    0,
  )
  return `p-${String(max + 1).padStart(3, '0')}`
}

// All validation happens before the first write, so a rejected transfer
// leaves both warehouses and the transaction log untouched.
export function applyTransfer(
  productId: string,
  destWarehouseId: string,
  quantity: number,
): { source: Product; destination: Product } {
  const source = findProduct(productId)
  if (!source) throw new StockError('Source product not found')

  assertCanTransfer(
    source.warehouseId,
    destWarehouseId,
    warehouses.map((w) => w.id),
    source.currentStock,
    quantity,
  )

  let destination = findProductInWarehouse(source, destWarehouseId)
  if (destination) assertCanAdd(destination.currentStock, quantity)
  if (!destination) {
    destination = {
      id: nextProductId(),
      name: source.name,
      category: source.category,
      warehouseId: destWarehouseId,
      currentStock: 0,
      reorderThreshold: source.reorderThreshold,
    }
    products.push(destination)
  }

  source.currentStock -= quantity
  destination.currentStock += quantity

  const timestamp = new Date().toISOString()
  const out = recordTransaction({
    productId: source.id,
    productName: source.name,
    warehouseId: source.warehouseId,
    type: 'TRANSFER_OUT',
    quantity,
    timestamp,
  })
  const inbound = recordTransaction({
    productId: destination.id,
    productName: destination.name,
    warehouseId: destination.warehouseId,
    type: 'TRANSFER_IN',
    quantity,
    timestamp,
    linkedTransactionId: out.id,
  })
  out.linkedTransactionId = inbound.id

  return { source, destination }
}
