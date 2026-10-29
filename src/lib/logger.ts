// biome-ignore-all lint/suspicious/noConsole: the logger is the one place allowed to write to the console.

type LogContext = Record<string, unknown>

/**
 * The app's logger. Never pass tokens, passwords, or personal data in the
 * message or context.
 */
export const logger = {
  error(message: string, context?: LogContext): void {
    console.error(message, context ?? {})
  },
  warn(message: string, context?: LogContext): void {
    console.warn(message, context ?? {})
  },
  info(message: string, context?: LogContext): void {
    if (import.meta.env.DEV) {
      console.info(message, context ?? {})
    }
  },
}
