import { isInternalPath } from '@/lib/url'

describe('isInternalPath', () => {
  it.each(['/', '/employees', '/employees?page=2#top'])(
    'accepts %s',
    (value) => {
      expect(isInternalPath(value)).toBe(true)
    },
  )

  it.each([
    'https://evil.example.com',
    '//evil.example.com',
    '/\\evil.example.com',
    '/\t/evil.example.com',
    '/ /evil.example.com',
    'javascript:alert(1)',
    'employees',
  ])('rejects %s', (value) => {
    expect(isInternalPath(value)).toBe(false)
  })
})
