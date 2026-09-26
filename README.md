# StockLite - Warehouse Inventory System

StockLite is a small warehouse inventory app that tracks products across two warehouses, lets staff record stock movements, and keeps a history of every transaction. This starter project provides the UI, seed data, and basic app structure. Your job is to make it actually work.

## Overview

StockLite is a starter project for a warehouse inventory system. It is designed to help staff:

- View products and their stock levels across two warehouses
- Record stock coming in and going out
- Transfer stock between warehouses
- Review a history of every transaction

The UI, seed data, and app structure are already in place, but none of the actual inventory logic is implemented. Participants are expected to build the logic that makes the application work.

## What Has Already Been Built

The starter project already includes the following functionality. Participants should build the remaining functionality described in the tasks below.

- **Inventory grid UI** (`/`): a styled inventory grid
- **Stock In / Stock Out form UI** (`/stock`)
- **Warehouse Transfer form UI** (`/transfer`)
- **Transaction History page UI** (`/history`)
- **Seed data** (`lib/seed-data.ts`): a seeded in-memory store with ~20 products across 2 warehouses, including products above, near, and at their reorder threshold
- **Auth skeleton** (`/login`, `lib/auth.ts`): not real authentication, just the expected shape
- **Stubbed API routes**: `GET /api/items` and `GET /api/transactions`, which return the seeded data as-is
- **UI components** (`components/`): table, forms, status badge, and navigation
- **Shared types** (`lib/types.ts`)

## Features

### Existing Features

- Inventory, Stock In / Stock Out, Warehouse Transfer, and Transaction History pages with styled UI
- Seeded products, warehouses, and transactions in an in-memory store
- Staff login skeleton
- Stubbed read-only API routes for items and transactions

### Features to Be Implemented

- Inventory view with category and low stock filtering
- Stock In and Stock Out with validation and transaction logging
- Warehouse transfers between the two warehouses
- Transaction history with filtering and sorting
- Bug fixes for stock totals, negative inventory, transfers, and low stock status
- _(Stretch)_ Low stock summary panel per warehouse

None of the inventory logic (filtering, validation, stock mutation, transfers, or transaction recording) is implemented yet.

## Tech Stack

- **Language:** TypeScript
- **Framework:** Next.js (App Router)
- **UI:** React components
- **Data storage:** Postgres when `DATABASE_URL` is set, otherwise a seeded in-memory store (see [Data Storage](#data-storage))
- **Package manager:** npm

## Getting Started

### 1. Fork the Repository

Fork this repository to your own GitHub account using the **Fork** button at the top of the repository page.

### 2. Clone the Repository

Clone your fork to your local machine:

```bash
git clone <your-forked-repository-url>
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run the Application

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Data Storage

StockLite picks its storage from the environment:

- **No `DATABASE_URL` (default, local development):** data lives in memory, seeded from `lib/seed-data.ts`. Nothing to set up, but every restart resets it.
- **`DATABASE_URL` (or `POSTGRES_URL`) set:** data lives in Postgres and persists across restarts, deploys and serverless cold starts. On the first request the app creates its tables and loads the seed data, so a new, empty database is all it needs.

### Setting up a database on Vercel

On Vercel, set up a database: the in-memory store is per serverless instance, so without one, changes on the live site can vanish or differ between page loads.

1. Open your project in the Vercel dashboard and go to the **Storage** tab.
2. Choose **Create Database**, pick **Neon** (Serverless Postgres), and connect it to this project. This adds `DATABASE_URL` to the project's environment variables.
3. Redeploy. The first request creates the tables and seeds them.

Any other Postgres works too: set `DATABASE_URL` to its connection string, and use the provider's pooled connection string when there is one.

### Using Postgres locally

```bash
DATABASE_URL=postgres://user:password@localhost:5432/stocklite npm run dev
```

To start over from the seed data, drop the tables (`DROP TABLE transactions, products; DROP SEQUENCE product_id_seq, transaction_id_seq;`) and reload the app.

## Project Structure

```text
app/
├── page.tsx                    # Inventory View
├── stock/page.tsx              # Stock In / Stock Out
├── transfer/page.tsx           # Warehouse Transfer
├── history/page.tsx            # Transaction History
├── login/page.tsx              # Auth skeleton
└── api/
    ├── items/route.ts          # Stubbed items API
    └── transactions/route.ts   # Stubbed transactions API
components/                     # UI components (table, forms, status badge, nav)
lib/
├── seed-data.ts                # Seed data + in-memory store
├── db.ts                       # Postgres store (used when DATABASE_URL is set)
├── store.ts                    # Picks the store; pages and API routes use this
├── stock-rules.ts              # Validation shared by both stores
├── types.ts                    # Shared types
└── auth.ts                     # Stubbed staff user
```

## What Participants Need to Build

The starter project intentionally contains gaps. The seed data and API stubs currently live in memory (`lib/seed-data.ts`). You can mutate that in-memory data directly from the API routes, or wire up whatever storage approach you prefer, as long as the behavior described below is correct.

To find the unfinished areas, look for:

- `TODO` comments, which mark every place where you need to add logic
- API stubs that only return the seeded data and do not support writes

## Participant Tasks

### Task 1 — Inventory View

- Display name, category, warehouse, current stock, and reorder threshold
- Filter by category
- Filter by low stock only
- Apply the correct low stock rule: current stock ≤ threshold
- Ensure the category and low stock filters combine correctly
- Handle the empty state gracefully

### Task 2 — Stock In and Stock Out

- Make the stock in form and API increment the correct warehouse
- Make the stock out form and API decrement the correct warehouse
- Block a stock out that would exceed current stock
- Reject invalid quantities (zero, negative, non-numeric)
- Ensure the UI reflects the new stock level immediately
- Log the operation for transaction history

### Task 3 — Warehouse Transfer

- Provide a transfer form with product, source warehouse, destination warehouse, and quantity
- Deduct the quantity from the source warehouse
- Add the quantity to the destination warehouse
- Reject a transfer if the source has insufficient stock
- Validate both warehouses before writing, so no partial transfer applies on failure
- Record the transfer as a linked pair in the transaction history

### Task 4 — Transaction History

- List transactions with product, warehouse, type, quantity, and timestamp
- Filter by transaction type
- Filter by warehouse
- Sort by most recent timestamp
- Ensure the filters combine correctly

## Debugging Tasks

### Task 5 — Debugging

Fix the following issues:

- Incorrect stock totals after operations
- Negative inventory being allowed
- A transfer that only updates one warehouse
- Incorrect low stock status logic

- **Low stock summary panel:** show counts of products needing replenishment per warehouse

## Expected Behavior

- **Inventory view:** shows name, category, warehouse, current stock, and reorder threshold. A product is low stock when current stock ≤ reorder threshold. Category and low stock filters work together, and an empty result is handled gracefully.
- **Stock in:** increments stock in the correct warehouse and logs the operation for transaction history.
- **Stock out:** decrements stock in the correct warehouse and logs the operation. A stock out that would exceed current stock is blocked, so inventory never goes negative.
- **Validation:** quantities that are zero, negative, or non-numeric are rejected.
- **UI updates:** the UI reflects the new stock level immediately after an operation.
- **Transfers:** the quantity is deducted from the source warehouse and added to the destination warehouse. A transfer is rejected if the source has insufficient stock. Both warehouses are validated before any write, so a failed transfer leaves no partial changes. Each transfer is recorded as a linked pair in the transaction history.
- **Transaction history:** lists product, warehouse, type, quantity, and timestamp, sorted by most recent timestamp. Filters by type and warehouse combine correctly.

## How to Approach the Project

1. Run the application with `npm run dev` and open [http://localhost:3000](http://localhost:3000).
2. Explore the existing pages: Inventory (`/`), Stock (`/stock`), Transfer (`/transfer`), History (`/history`), and Login (`/login`).
3. Search the codebase for `TODO` comments to find the unfinished areas.
4. Inspect the relevant files, such as the page files, the API routes, `lib/seed-data.ts`, and `lib/types.ts`.
5. Implement the required tasks.
6. Test each feature as you build it.
7. Verify edge cases such as invalid quantities, insufficient stock, empty filter results, and failed transfers.

## Important Notes and Constraints

- Keep your changes focused. You should not need to restructure the provided pages or components; just fill in the logic.
- The API stubs return the seeded data as-is. You will need to extend them (or add new handlers) to support writes.
- The seed data and API stubs live in memory (`lib/seed-data.ts`). You may mutate this data directly from the API routes or use another storage approach of your choice.
- The staff auth skeleton (`/login`, `lib/auth.ts`) is not real authentication, just the expected shape.
- The seed data includes products above, near, and at their reorder threshold, which is useful for checking low stock behavior.

## Links

- How to clone and fork this GitHub repository:
- https://drive.google.com/file/d/1jRpIMKBL0hOPOiQ0Han6IWJON1bLjoxU/view?usp=sharing

- Directly download zip file of this GitHub repository:
- https://drive.google.com/file/d/18WZzxo6lle9gS78lQYL_VvpP3ENjW32n/view?usp=sharing
