/**
 * JSON Parser Web Worker
 * Offloads heavy JSON parsing to prevent main thread blocking
 */

self.onmessage = function(e: MessageEvent) {
  try {
    const result = JSON.parse(e.data)
    self.postMessage(result)
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : 'Parse error' })
  }
}