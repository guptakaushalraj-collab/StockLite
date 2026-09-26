'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Product, Transaction } from '@/lib/types'

const POLL_MS = 5000

// Keeps server-rendered data current in the browser. The page's initial
// props can be stale (a tab left open while stock moved in another tab, or
// a page restored from Next's client cache), so re-fetch from the API on
// mount, whenever the tab regains focus, and every few seconds while it is
// visible.
//
// `pick` extracts the data from the JSON response; define it outside the
// component so it stays stable.
export function useLiveData<T>(
  url: string,
  pick: (json: unknown) => T,
  initial: T,
): [T, (next: T) => void] {
  const [data, setData] = useState(initial)
  // Bumped by every local update, so a fetch that started before it can't
  // overwrite newer data (e.g. the response of a form submit).
  const version = useRef(0)

  const set = useCallback((next: T) => {
    version.current++
    setData(next)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function refresh() {
      if (document.visibilityState !== 'visible') return
      const startedAt = version.current
      try {
        const res = await fetch(url, { cache: 'no-store' })
        if (!res.ok) return
        const next = pick(await res.json())
        if (!cancelled && version.current === startedAt) setData(next)
      } catch {
        // Offline or server restarting: keep showing what we have.
      }
    }

    refresh()
    const timer = setInterval(refresh, POLL_MS)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      cancelled = true
      clearInterval(timer)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [url, pick])

  return [data, set]
}

// Stable pickers for the two API routes.
export const pickProducts = (json: unknown) =>
  (json as { products: Product[] }).products
export const pickTransactions = (json: unknown) =>
  (json as { transactions: Transaction[] }).transactions
