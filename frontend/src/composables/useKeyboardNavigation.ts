import { ref, Ref, computed } from 'vue';
import type { FileItem } from '../types';

interface KeyboardNavigationOptions {
  items: Ref<FileItem[]>;
  onSelect?: (item: FileItem) => void;
  onOpen?: (item: FileItem) => void;
  onDelete?: (items: FileItem[]) => void;
  onRename?: (item: FileItem) => void;
}

export function useKeyboardNavigation(options: KeyboardNavigationOptions) {
  const { items, onSelect, onOpen, onDelete, onRename } = options;
  
  const focusedItem = ref<FileItem | null>(null);
  const focusedIndex = computed(() => {
    if (!focusedItem.value) return -1;
    return items.value.findIndex(item => item.path === focusedItem.value?.path);
  });

  // Keyboard shortcuts map
  const shortcuts = new Map<string, (event: KeyboardEvent) => void>([
    ['Enter', handleEnter],
    ['Delete', handleDelete],
    ['F2', handleRename],
    ['ArrowUp', handleArrowUp],
    ['ArrowDown', handleArrowDown],
    ['ArrowLeft', handleArrowLeft],
    ['ArrowRight', handleArrowRight],
    ['Home', handleHome],
    ['End', handleEnd],
    ['PageUp', handlePageUp],
    ['PageDown', handlePageDown],
    ['a', handleSelectAll],
    ['Escape', handleEscape]
  ]);

  // Handle keyboard events
  function handleKeyDown(event: KeyboardEvent) {
    const key = event.key;
    const ctrl = event.ctrlKey || event.metaKey;
    const shift = event.shiftKey;
    
    // Build shortcut key
    let shortcutKey = '';
    if (ctrl) shortcutKey += 'Ctrl+';
    if (shift) shortcutKey += 'Shift+';
    shortcutKey += key;
    
    // Check for exact match first
    if (shortcuts.has(shortcutKey)) {
      event.preventDefault();
      shortcuts.get(shortcutKey)!(event);
      return;
    }
    
    // Check for key without modifiers
    if (shortcuts.has(key)) {
      event.preventDefault();
      shortcuts.get(key)!(event);
    }
  }

  // Navigation handlers
  function handleArrowUp(event: KeyboardEvent) {
    navigateBy(-1, event.shiftKey);
  }

  function handleArrowDown(event: KeyboardEvent) {
    navigateBy(1, event.shiftKey);
  }

  function handleArrowLeft(event: KeyboardEvent) {
    navigateBy(-1, event.shiftKey);
  }

  function handleArrowRight(event: KeyboardEvent) {
    navigateBy(1, event.shiftKey);
  }

  function handleHome(event: KeyboardEvent) {
    navigateTo(0, event.shiftKey);
  }

  function handleEnd(event: KeyboardEvent) {
    navigateTo(items.value.length - 1, event.shiftKey);
  }

  function handlePageUp(event: KeyboardEvent) {
    navigateBy(-10, event.shiftKey);
  }

  function handlePageDown(event: KeyboardEvent) {
    navigateBy(10, event.shiftKey);
  }

  // Action handlers
  function handleEnter() {
    if (focusedItem.value) {
      onOpen?.(focusedItem.value);
    }
  }

  function handleDelete() {
    if (focusedItem.value) {
      onDelete?.([focusedItem.value]);
    }
  }

  function handleRename() {
    if (focusedItem.value) {
      onRename?.(focusedItem.value);
    }
  }

  function handleSelectAll(event: KeyboardEvent) {
    if (event.ctrlKey || event.metaKey) {
      items.value.forEach(item => onSelect?.(item));
    }
  }

  function handleEscape() {
    focusedItem.value = null;
  }

  // Navigation helpers
  function navigateBy(delta: number, select: boolean = false) {
    const currentIndex = focusedIndex.value;
    const newIndex = Math.max(0, Math.min(items.value.length - 1, currentIndex + delta));
    
    if (newIndex !== currentIndex && items.value[newIndex]) {
      focusedItem.value = items.value[newIndex];
      
      if (select) {
        onSelect?.(focusedItem.value);
      }
    }
  }

  function navigateTo(index: number, select: boolean = false) {
    if (index >= 0 && index < items.value.length) {
      focusedItem.value = items.value[index];
      
      if (select) {
        // Select range from current to target
        const currentIndex = focusedIndex.value;
        const start = Math.min(currentIndex, index);
        const end = Math.max(currentIndex, index);
        
        for (let i = start; i <= end; i++) {
          onSelect?.(items.value[i]);
        }
      }
    }
  }

  return {
    focusedItem,
    focusedIndex,
    handleKeyDown,
    navigateBy,
    navigateTo
  };
}