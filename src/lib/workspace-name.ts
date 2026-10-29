import { z } from 'zod'

/** A workspace name, entered at sign-up and when creating a workspace. */
export const workspaceNameSchema = z
  .string()
  .trim()
  .min(1, 'Workspace name is required')
  .max(80, 'Use at most 80 characters')
