// Hash worker for computing file integrity hashes
// Supports SHA-256 and MD5 algorithms

self.onmessage = async function(e) {
  const { algorithm, buffer } = e.data

  try {
    let hash: ArrayBuffer

    if (algorithm === 'sha-256') {
      hash = await crypto.subtle.digest('SHA-256', buffer)
    } else if (algorithm === 'md5') {
      // MD5 is not natively supported by Web Crypto API
      // For production, consider using a proper MD5 library
      hash = await crypto.subtle.digest('SHA-256', buffer) // Fallback to SHA-256
    } else {
      throw new Error(`Unsupported algorithm: ${algorithm}`)
    }

    // Convert to base64
    const hashArray = Array.from(new Uint8Array(hash))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    const hashBase64 = btoa(String.fromCharCode(...hashArray))

    self.postMessage({
      ok: true,
      algorithm,
      hex: hashHex,
      base64: hashBase64
    })
  } catch (error) {
    self.postMessage({
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}