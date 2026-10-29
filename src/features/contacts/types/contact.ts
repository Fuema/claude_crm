export interface Contact {
  id: string
  /** The customer the contact works at. */
  customerId: string
  firstName: string
  lastName: string
  /** "First Last", for display and confirmations. */
  fullName: string
  jobTitle: string | null
  email: string | null
  phone: string | null
}
