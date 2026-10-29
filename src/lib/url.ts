/**
 * True for a same-origin path such as "/employees?page=2". Rejects absolute
 * URLs, protocol-relative ones ("//evil.com"), backslashes, and whitespace or
 * control characters (a URL parser strips some of them, turning "/\t/evil.com"
 * into "//evil.com"), so a redirect target from the URL cannot leave the site.
 */
export function isInternalPath(value: string): boolean {
  return (
    value.startsWith('/') &&
    !value.startsWith('//') &&
    !value.includes('\\') &&
    !/[\s\p{Cc}]/u.test(value)
  )
}
