// Validation shared by the in-memory store and the Postgres store, so both
// accept and reject exactly the same requests with the same messages.

// A request the caller got wrong (bad quantity, not enough stock, ...).
// API routes return these as 400s; any other error is a server fault.
export class StockError extends Error {}

// Postgres `integer` columns top out at 2^31 - 1; use the same ceiling in
// memory so both stores agree on what is "too large".
export const MAX_STOCK = 2_147_483_647

// Stock is counted in whole units, so a valid quantity is a positive integer.
export function assertValidQuantity(
  quantity: unknown,
): asserts quantity is number {
  if (
    typeof quantity !== 'number' ||
    !Number.isInteger(quantity) ||
    quantity <= 0 ||
    quantity > MAX_STOCK
  ) {
    throw new StockError('Quantity must be a whole number greater than 0')
  }
}

export function assertCanAdd(currentStock: number, quantity: number) {
  if (currentStock + quantity > MAX_STOCK) {
    throw new StockError('Quantity is too large for this product')
  }
}

export function assertCanStockOut(currentStock: number, quantity: number) {
  if (quantity > currentStock) {
    throw new StockError(
      `Only ${currentStock} in stock — cannot stock out ${quantity}`,
    )
  }
}

export function assertCanTransfer(
  sourceWarehouseId: string,
  destWarehouseId: string,
  knownWarehouseIds: string[],
  sourceStock: number,
  quantity: number,
) {
  if (!knownWarehouseIds.includes(destWarehouseId)) {
    throw new StockError('Destination warehouse not found')
  }
  if (destWarehouseId === sourceWarehouseId) {
    throw new StockError('Source and destination warehouses must be different')
  }
  assertValidQuantity(quantity)
  if (quantity > sourceStock) {
    throw new StockError(
      `Only ${sourceStock} in stock at the source — cannot transfer ${quantity}`,
    )
  }
}
