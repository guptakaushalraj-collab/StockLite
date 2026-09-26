import { Product, Transaction } from './types'
import * as memory from './seed-data'
import {
  databaseUrl,
  dbApplyStockMovement,
  dbApplyTransfer,
  dbListProducts,
  dbListTransactions,
} from './db'

// The one data API pages and routes use. With DATABASE_URL (or POSTGRES_URL)
// set, data lives in Postgres and survives restarts and serverless cold
// starts; without it, the seeded in-memory store is used (local dev).

export const warehouses = memory.warehouses

export const usingDatabase = () => Boolean(databaseUrl())

export async function listProducts(): Promise<Product[]> {
  return usingDatabase() ? dbListProducts() : memory.products
}

export async function listTransactions(): Promise<Transaction[]> {
  return usingDatabase() ? dbListTransactions() : memory.transactions
}

export async function stockMovement(
  productId: string,
  quantity: number,
  direction: 'IN' | 'OUT',
): Promise<{ product: Product; products: Product[] }> {
  if (usingDatabase()) {
    return dbApplyStockMovement(productId, quantity, direction)
  }
  const product = memory.applyStockMovement(productId, quantity, direction)
  return { product, products: memory.products }
}

export async function transfer(
  productId: string,
  destWarehouseId: string,
  quantity: number,
): Promise<{ source: Product; destination: Product; products: Product[] }> {
  if (usingDatabase()) {
    return dbApplyTransfer(productId, destWarehouseId, quantity)
  }
  const result = memory.applyTransfer(productId, destWarehouseId, quantity)
  return { ...result, products: memory.products }
}
