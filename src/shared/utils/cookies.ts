// Reads one cookie from a raw Cookie header, e.g. "theme=dark; access_token=eyJ..."
export const readCookie = (header: string | undefined, name: string) => {
  if (!header) return undefined
  for (const part of header.split(';')) {
    const [key, ...value] = part.trim().split('=')
    if (key !== name) continue
    try {
      return decodeURIComponent(value.join('='))
    } catch {
      return undefined
    }
  }
  return undefined
}
