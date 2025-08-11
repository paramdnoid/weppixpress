import { ref, unref, type UnwrapRef } from 'vue';

export interface UseDragAndDropOptions<T = unknown> {
  /**
   * Validate whether a drop on `target` is allowed for the given items.
   * If it returns false, drop will be ignored.
   */
  isValidDrop?: (items: UnwrapRef<T>[], target: UnwrapRef<T>) => boolean;
  /**
   * Called after a successful drop.
   */
  onDrop?: (items: UnwrapRef<T>[], target: UnwrapRef<T>, event: DragEvent) => void;
  /**
   * 'copy' | 'move' | 'link' (used for cursor feedback)
   */
  dropEffect?: DataTransfer['dropEffect'];
}

export function useDragAndDrop<T = unknown>(options: UseDragAndDropOptions<T> = {}) {
  type U = UnwrapRef<T>;

  const __dndStore = new Map<string, U[]>();

  const isDragging = ref(false);
  const draggedItems = ref<U[]>([]);
  const dragSource = ref<U | null>(null);

  // A custom MIME so we only react to drags initiated by our app
  const MIME = 'application/x-dnd-items';

  const handleDragStart = (event: DragEvent, items: T[] | T, source?: T) => {
    const list = (Array.isArray(items) ? items : [items]).map((it) => unref(it)) as U[];
    draggedItems.value = list;
    dragSource.value = source ? (unref(source) as U) : (list.length === 1 ? list[0] : null);
    isDragging.value = true;

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      try {
        event.dataTransfer.setData(MIME, JSON.stringify(list));
      } catch {
        // Fallback: at least mark that it's our drag
        event.dataTransfer.setData(MIME, '[]');
      }
    }
  };

  const handleDragOver = (event: DragEvent, _target?: T) => {
    // Must preventDefault to allow drop
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = options.dropEffect ?? 'move';
    }
    // You can add hover styling outside using isDragging/target checks
  };

  const readItemsFromEvent = (event: DragEvent): U[] | null => {
    const dt = event.dataTransfer;
    if (!dt) return null;
    const payload = dt.getData(MIME);
    if (!payload) return null;
    try {
      const parsed = JSON.parse(payload) as U[];
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  };

  const handleDrop = (event: DragEvent, target: U) => {
    event.preventDefault();
    const fromEvent = readItemsFromEvent(event);
    const items = fromEvent ?? draggedItems.value;

    // Reset drag state
    isDragging.value = false;
    draggedItems.value = [];
    dragSource.value = null;

    if (!items || items.length === 0) return;

    if (options.isValidDrop && !options.isValidDrop(items as U[], target)) {
      return;
    }

    options.onDrop?.(items as U[], target, event);
  };

  // Optional helper if you want to cancel drag (e.g., on Escape)
  const cancelDrag = () => {
    isDragging.value = false;
    draggedItems.value = [];
    dragSource.value = null;
  };

  return {
    isDragging,
    draggedItems,
    dragSource,
    handleDragStart,
    handleDragOver,
    handleDrop,
    cancelDrag,
  };
}