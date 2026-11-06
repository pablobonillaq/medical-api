import { describe, expect, it } from 'vitest'
import { readCookie } from './cookies.js'

describe('readCookie', () => {
  it('finds a cookie among others', () => {
    expect(readCookie('theme=dark; access_token=abc.def; lang=es', 'access_token')).toBe('abc.def')
  })

  it('keeps "=" characters inside the value', () => {
    expect(readCookie('token=a=b==', 'token')).toBe('a=b==')
  })

  it('decodes URL-encoded values', () => {
    expect(readCookie('name=Ana%20Garay', 'name')).toBe('Ana Garay')
  })

  it('returns undefined when the cookie or the header is missing', () => {
    expect(readCookie('theme=dark', 'access_token')).toBeUndefined()
    expect(readCookie(undefined, 'access_token')).toBeUndefined()
  })

  it('does not match cookies whose name only starts the same', () => {
    expect(readCookie('access_token_old=1', 'access_token')).toBeUndefined()
  })

  it('returns undefined for a malformed value instead of throwing', () => {
    expect(readCookie('token=%E0%A4%A', 'token')).toBeUndefined()
  })
})
