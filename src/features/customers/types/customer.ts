import { z } from 'zod'

export const customerStatusSchema = z.enum(['active', 'archived'])

export type CustomerStatus = z.infer<typeof customerStatusSchema>

export const CUSTOMER_STATUS_LABELS: Record<CustomerStatus, string> = {
  active: 'Active',
  archived: 'Archived',
}

export interface Customer {
  id: string
  name: string
  industry: string | null
  /** An http(s) URL. */
  website: string | null
  email: string | null
  phone: string | null
  address: string | null
  status: CustomerStatus
}

/** A customer in a picker (e.g. a deal's customer). */
export interface CustomerOption {
  id: string
  name: string
  /** Archived customers appear only in `'all'` lists, e.g. filters. */
  isArchived: boolean
}

export type CustomerOptionStatus = 'active' | 'all'

export interface CustomerPage {
  items: Customer[]
  total: number
  page: number
  pageSize: number
}

/** True for an absolute `http://` or `https://` URL, the only kind shown as a link. */
export function isHttpUrl(value: string): boolean {
  if (!URL.canParse(value)) return false
  const { protocol } = new URL(value)
  return protocol === 'http:' || protocol === 'https:'
}
