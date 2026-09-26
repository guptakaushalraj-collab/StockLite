import { Pool, PoolClient } from 'pg'
import { Product, Transaction, TransactionType } from './types'
import {
  seedProducts,
  seedTransactions,
  warehouseName,
  warehouses,
} from './seed-data'
import {
  StockError,
  assertCanAdd,
  assertCanStockOut,
  assertCanTransfer,
  assertValidQuantity,
} from './stock-rules'

// Postgres-backed store, used when DATABASE_URL (or POSTGRES_URL, as set by
// Vercel's Neon integration) is present. Every write runs in a single
// transaction with the rows it touches locked, so concurrent requests can't
// oversell stock and a failed request leaves nothing behind.

export function databaseUrl() {
  return process.env.DATABASE_URL ?? process.env.POSTGRES_URL
}

// One pool per server instance, shared across route bundles in dev.
const globalForDb = globalThis as typeof globalThis & {
  __stocklitePool?: Pool
  __stockliteSchema?: Promise<void>
}

function pool() {
  return (globalForDb.__stocklitePool ??= new Pool({
    connectionString: databaseUrl(),
    // Serverless functions each hold their own pool; keep it small.
    max: 5,
  }))
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS products (
  id text PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL,
  warehouse_id text NOT NULL,
  current_stock integer NOT NULL CHECK (current_stock >= 0),
  reorder_threshold integer NOT NULL CHECK (reorder_threshold >= 0),
  UNIQUE (warehouse_id, name, category)
);
CREATE TABLE IF NOT EXISTS transactions (
  id text PRIMARY KEY,
  seq bigint NOT NULL UNIQUE,
  product_id text NOT NULL REFERENCES products (id),
  product_name text NOT NULL,
  warehouse_id text NOT NULL,
  warehouse_name text NOT NULL,
  type text NOT NULL
    CHECK (type IN ('IN', 'OUT', 'TRANSFER_OUT', 'TRANSFER_IN')),
  quantity integer NOT NULL CHECK (quantity > 0),
  timestamp timestamptz NOT NULL,
  linked_transaction_id text
);
CREATE SEQUENCE IF NOT EXISTS product_id_seq;
CREATE SEQUENCE IF NOT EXISTS transaction_id_seq;
`

const productNumber = (id: string) => Number(id.replace(/^p-/, '')) || 0
const transactionNumber = (id: string) => Number(id.replace(/^t-/, '')) || 0
const pad = (n: number | string) => String(n).padStart(3, '0')

// Creates the tables and loads the seed data on first use. The advisory lock
// stops two cold-starting instances from seeding at the same time.
async function createAndSeed() {
  const client = await pool().connect()
  try {
    await client.query('BEGIN')
    await client.query("SELECT pg_advisory_xact_lock(hashtext('stocklite'))")
    await client.query(SCHEMA)
    const { rows } = await client.query(
      'SELECT count(*)::int AS n FROM products',
    )
    if (rows[0].n === 0) {
      for (const p of seedProducts) {
        await client.query(
          `INSERT INTO products
             (id, name, category, warehouse_id, current_stock, reorder_threshold)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            p.id,
            p.name,
            p.category,
            p.warehouseId,
            p.currentStock,
            p.reorderThreshold,
          ],
        )
      }
      for (const t of seedTransactions) {
        await client.query(
          `INSERT INTO transactions
             (id, seq, product_id, product_name, warehouse_id, warehouse_name,
              type, quantity, timestamp, linked_transaction_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            t.id,
            transactionNumber(t.id),
            t.productId,
            t.productName,
            t.warehouseId,
            t.warehouseName,
            t.type,
            t.quantity,
            t.timestamp,
            t.linkedTransactionId ?? null,
          ],
        )
      }
      await client.query("SELECT setval('product_id_seq', $1)", [
        Math.max(...seedProducts.map((p) => productNumber(p.id))),
      ])
      await client.query("SELECT setval('transaction_id_seq', $1)", [
        Math.max(...seedTransactions.map((t) => transactionNumber(t.id))),
      ])
    }
    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    throw err
  } finally {
    client.release()
  }
}

function ensureSchema() {
  globalForDb.__stockliteSchema ??= createAndSeed().catch((err) => {
    // Let the next request try again instead of caching the failure.
    globalForDb.__stockliteSchema = undefined
    throw err
  })
  return globalForDb.__stockliteSchema
}

type ProductRow = {
  id: string
  name: string
  category: string
  warehouse_id: string
  current_stock: number
  reorder_threshold: number
}

type TransactionRow = {
  id: string
  product_id: string
  product_name: string
  warehouse_id: string
  warehouse_name: string
  type: TransactionType
  quantity: number
  timestamp: Date
  linked_transaction_id: string | null
}

const toProduct = (r: ProductRow): Product => ({
  id: r.id,
  name: r.name,
  category: r.category,
  warehouseId: r.warehouse_id,
  currentStock: r.current_stock,
  reorderThreshold: r.reorder_threshold,
})

const toTransaction = (r: TransactionRow): Transaction => ({
  id: r.id,
  productId: r.product_id,
  productName: r.product_name,
  warehouseId: r.warehouse_id,
  warehouseName: r.warehouse_name,
  type: r.type,
  quantity: r.quantity,
  timestamp: r.timestamp.toISOString(),
  ...(r.linked_transaction_id
    ? { linkedTransactionId: r.linked_transaction_id }
    : {}),
})

async function selectProducts(client: Pool | PoolClient) {
  const { rows } = await client.query<ProductRow>(
    'SELECT * FROM products ORDER BY id',
  )
  return rows.map(toProduct)
}

export async function dbListProducts() {
  await ensureSchema()
  return selectProducts(pool())
}

export async function dbListTransactions() {
  await ensureSchema()
  const { rows } = await pool().query<TransactionRow>(
    'SELECT * FROM transactions ORDER BY timestamp DESC, seq DESC',
  )
  return rows.map(toTransaction)
}

async function inTransaction<T>(work: (client: PoolClient) => Promise<T>) {
  await ensureSchema()
  const client = await pool().connect()
  try {
    await client.query('BEGIN')
    const result = await work(client)
    await client.query('COMMIT')
    return result
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    throw err
  } finally {
    client.release()
  }
}

async function insertTransaction(
  client: PoolClient,
  tx: {
    seq: number
    product: Product
    type: TransactionType
    quantity: number
    timestamp: Date
    linkedSeq?: number
  },
) {
  await client.query(
    `INSERT INTO transactions
       (id, seq, product_id, product_name, warehouse_id, warehouse_name,
        type, quantity, timestamp, linked_transaction_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      `t-${pad(tx.seq)}`,
      tx.seq,
      tx.product.id,
      tx.product.name,
      tx.product.warehouseId,
      warehouseName(tx.product.warehouseId),
      tx.type,
      tx.quantity,
      tx.timestamp,
      tx.linkedSeq === undefined ? null : `t-${pad(tx.linkedSeq)}`,
    ],
  )
}

async function nextTransactionSeqs(client: PoolClient, count: number) {
  const { rows } = await client.query<{ seq: string }>(
    "SELECT nextval('transaction_id_seq') AS seq FROM generate_series(1, $1)",
    [count],
  )
  return rows.map((r) => Number(r.seq))
}

async function lockProducts(client: PoolClient, ids: string[]) {
  // Lock in id order so two transfers in opposite directions can't deadlock.
  const { rows } = await client.query<ProductRow>(
    'SELECT * FROM products WHERE id = ANY($1) ORDER BY id FOR UPDATE',
    [ids],
  )
  return new Map(rows.map((r) => [r.id, toProduct(r)]))
}

export async function dbApplyStockMovement(
  productId: string,
  quantity: number,
  direction: 'IN' | 'OUT',
) {
  return inTransaction(async (client) => {
    const product = (await lockProducts(client, [productId])).get(productId)
    if (!product) throw new StockError('Product not found')

    assertValidQuantity(quantity)
    if (direction === 'OUT') assertCanStockOut(product.currentStock, quantity)
    else assertCanAdd(product.currentStock, quantity)

    const { rows } = await client.query<ProductRow>(
      'UPDATE products SET current_stock = $2 WHERE id = $1 RETURNING *',
      [
        productId,
        product.currentStock + (direction === 'IN' ? quantity : -quantity),
      ],
    )
    const updated = toProduct(rows[0])

    const [seq] = await nextTransactionSeqs(client, 1)
    await insertTransaction(client, {
      seq,
      product: updated,
      type: direction,
      quantity,
      timestamp: new Date(),
    })

    return { product: updated, products: await selectProducts(client) }
  })
}

export async function dbApplyTransfer(
  productId: string,
  destWarehouseId: string,
  quantity: number,
) {
  return inTransaction(async (client) => {
    const { rows: found } = await client.query<ProductRow>(
      'SELECT * FROM products WHERE id = $1',
      [productId],
    )
    if (!found[0]) throw new StockError('Source product not found')

    // Find the destination row (if the product is stocked there yet), then
    // lock source and destination together before validating.
    const { rows: destRows } = await client.query<{ id: string }>(
      `SELECT id FROM products
       WHERE warehouse_id = $1 AND name = $2 AND category = $3`,
      [destWarehouseId, found[0].name, found[0].category],
    )
    const destId = destRows[0]?.id
    const locked = await lockProducts(
      client,
      destId ? [productId, destId] : [productId],
    )
    const source = locked.get(productId)!
    const existingDest = destId ? locked.get(destId) : undefined

    assertCanTransfer(
      source.warehouseId,
      destWarehouseId,
      warehouses.map((w) => w.id),
      source.currentStock,
      quantity,
    )
    if (existingDest) assertCanAdd(existingDest.currentStock, quantity)

    const { rows: srcRows } = await client.query<ProductRow>(
      `UPDATE products SET current_stock = current_stock - $2
       WHERE id = $1 RETURNING *`,
      [source.id, quantity],
    )
    // Existing destination row (already locked): increment it. Otherwise
    // create it; ON CONFLICT covers another request creating the same row in
    // the meantime. Only the insert path draws a new product id.
    const { rows: dstRows } = existingDest
      ? await client.query<ProductRow>(
          `UPDATE products SET current_stock = current_stock + $2
           WHERE id = $1 RETURNING *`,
          [existingDest.id, quantity],
        )
      : await client.query<ProductRow>(
          `INSERT INTO products
             (id, name, category, warehouse_id, current_stock,
              reorder_threshold)
           VALUES ('p-' || lpad(nextval('product_id_seq')::text, 3, '0'),
                   $1, $2, $3, $4, $5)
           ON CONFLICT (warehouse_id, name, category)
           DO UPDATE SET
             current_stock = products.current_stock + EXCLUDED.current_stock
           RETURNING *`,
          [
            source.name,
            source.category,
            destWarehouseId,
            quantity,
            source.reorderThreshold,
          ],
        )
    const updatedSource = toProduct(srcRows[0])
    const destination = toProduct(dstRows[0])

    const [outSeq, inSeq] = await nextTransactionSeqs(client, 2)
    const timestamp = new Date()
    await insertTransaction(client, {
      seq: outSeq,
      product: updatedSource,
      type: 'TRANSFER_OUT',
      quantity,
      timestamp,
      linkedSeq: inSeq,
    })
    await insertTransaction(client, {
      seq: inSeq,
      product: destination,
      type: 'TRANSFER_IN',
      quantity,
      timestamp,
      linkedSeq: outSeq,
    })

    return {
      source: updatedSource,
      destination,
      products: await selectProducts(client),
    }
  })
}
