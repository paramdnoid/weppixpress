export {}

declare global {
  interface Window {
    requestIdleCallback?: (cb: () => void) => number
    $toast?: (message: string, options?: { type?: string }) => void
    gc?: () => void
  }
}

