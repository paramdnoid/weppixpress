import { ref } from 'vue'

export function useDebounce(fn, delay = 300) {
  const timer = ref(null)

  const run = (...args) => {
    if (timer.value) clearTimeout(timer.value)
    timer.value = setTimeout(() => {
      fn(...args)
    }, delay)
  }

  const cancel = () => {
    if (timer.value) clearTimeout(timer.value)
    timer.value = null
  }

  return run
}
