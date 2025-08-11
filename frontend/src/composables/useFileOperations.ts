import { ref, computed } from 'vue';
import type { FileItem } from '../types';

interface FileOperationOptions {
  onProgress?: (progress: number) => void;
  onSuccess?: (result: any) => void;
  onError?: (error: Error) => void;
}

export function useFileOperations() {
  const clipboard = ref<{
    operation: 'copy' | 'cut';
    items: FileItem[];
  } | null>(null);

  const operationQueue = ref<Map<string, AbortController>>(new Map());

  // Copy files to clipboard
  const copy = (items: FileItem[]) => {
    clipboard.value = {
      operation: 'copy',
      items: [...items]
    };
  };

  // Cut files to clipboard
  const cut = (items: FileItem[]) => {
    clipboard.value = {
      operation: 'cut',
      items: [...items]
    };
  };

  // Paste files from clipboard
  const paste = async (destination: string, options?: FileOperationOptions) => {
    if (!clipboard.value) return;

    const { operation, items } = clipboard.value;
    const operationId = crypto.randomUUID();
    const abortController = new AbortController();
    
    operationQueue.value.set(operationId, abortController);

    try {
      if (operation === 'copy') {
        await copyFiles(items, destination, {
          ...options,
          signal: abortController.signal
        });
      } else {
        await moveFiles(items, destination, {
          ...options,
          signal: abortController.signal
        });
        // Clear clipboard after cut operation
        clipboard.value = null;
      }
      
      options?.onSuccess?.({ operation, items, destination });
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        options?.onError?.(error);
      }
    } finally {
      operationQueue.value.delete(operationId);
    }
  };

  // Copy files
  const copyFiles = async (
    items: FileItem[],
    destination: string,
    options?: FileOperationOptions & { signal?: AbortSignal }
  ) => {
    // Implementation would call the API
    console.log('Copying files', items, 'to', destination);
  };

  // Move files
  const moveFiles = async (
    items: FileItem[],
    destination: string,
    options?: FileOperationOptions & { signal?: AbortSignal }
  ) => {
    // Implementation would call the API
    console.log('Moving files', items, 'to', destination);
  };

  // Cancel operation
  const cancelOperation = (operationId: string) => {
    const controller = operationQueue.value.get(operationId);
    if (controller) {
      controller.abort();
      operationQueue.value.delete(operationId);
    }
  };

  // Cancel all operations
  const cancelAllOperations = () => {
    operationQueue.value.forEach(controller => controller.abort());
    operationQueue.value.clear();
  };

  // Check if clipboard has items
  const hasClipboard = computed(() => clipboard.value !== null);

  // Get clipboard info
  const clipboardInfo = computed(() => {
    if (!clipboard.value) return null;
    
    return {
      operation: clipboard.value.operation,
      count: clipboard.value.items.length,
      totalSize: clipboard.value.items.reduce((sum, item) => sum + item.size, 0)
    };
  });

  return {
    clipboard,
    hasClipboard,
    clipboardInfo,
    copy,
    cut,
    paste,
    cancelOperation,
    cancelAllOperations
  };
}