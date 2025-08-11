import { ref, computed, watch, Ref, ComputedRef } from 'vue';
import { debounce } from 'lodash-es';

interface VirtualListOptions<T> {
  items: ComputedRef<T[]>;
  container: Ref<HTMLElement | undefined>;
  itemHeight: number;
  itemsPerRow?: number;
  buffer?: number;
  preloadImages?: boolean;
}

interface VirtualListReturn<T> {
  visibleItems: ComputedRef<T[]>;
  spacerStyle: ComputedRef<any>;
  viewportStyle: ComputedRef<any>;
  handleScroll: (event: Event) => void;
  scrollToItem: (index: number) => void;
  scrollToTop: () => void;
  scrollToBottom: () => void;
}

export function useVirtualList<T extends { path: string }>(
  options: VirtualListOptions<T>
): VirtualListReturn<T> {
  const {
    items,
    container,
    itemHeight,
    itemsPerRow = 1,
    buffer = 2,
    preloadImages = true
  } = options;

  // State
  const scrollTop = ref(0);
  const containerHeight = ref(0);
  const visibleRange = ref({ start: 0, end: 0 });

  // Calculate total height
  const totalHeight = computed(() => {
    const rows = Math.ceil(items.value.length / itemsPerRow);
    return rows * itemHeight;
  });

  // Calculate visible items
  const visibleItems = computed(() => {
    const start = visibleRange.value.start;
    const end = visibleRange.value.end;
    
    const visibleItems = items.value.slice(
      start * itemsPerRow,
      (end + 1) * itemsPerRow
    );

    // Preload images for next batch
    if (preloadImages) {
      const nextBatch = items.value.slice(
        (end + 1) * itemsPerRow,
        (end + buffer + 1) * itemsPerRow
      );
      preloadItemImages(nextBatch);
    }

    return visibleItems;
  });

  // Spacer style for maintaining scroll position
  const spacerStyle = computed(() => ({
    height: `${totalHeight.value}px`
  }));

  // Viewport style for positioning visible items
  const viewportStyle = computed(() => ({
    transform: `translateY(${visibleRange.value.start * itemHeight}px)`
  }));

  // Update visible range based on scroll
  const updateVisibleRange = debounce(() => {
    if (!container.value) return;

    const scrollTop = container.value.scrollTop;
    const height = container.value.clientHeight;

    const startRow = Math.floor(scrollTop / itemHeight) - buffer;
    const endRow = Math.ceil((scrollTop + height) / itemHeight) + buffer;

    visibleRange.value = {
      start: Math.max(0, startRow),
      end: Math.min(Math.ceil(items.value.length / itemsPerRow) - 1, endRow)
    };
  }, 16); // ~60fps

  // Handle scroll event
  const handleScroll = (event: Event) => {
    const target = event.target as HTMLElement;
    scrollTop.value = target.scrollTop;
    updateVisibleRange();
  };

  // Scroll to specific item
  const scrollToItem = (index: number) => {
    if (!container.value) return;

    const row = Math.floor(index / itemsPerRow);
    const targetScrollTop = row * itemHeight;
    
    container.value.scrollTo({
      top: targetScrollTop,
      behavior: 'smooth'
    });
  };

  // Scroll helpers
  const scrollToTop = () => {
    container.value?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToBottom = () => {
    container.value?.scrollTo({ top: totalHeight.value, behavior: 'smooth' });
  };

  // Preload images
  const preloadItemImages = (items: T[]) => {
    items.forEach(item => {
      if ('thumbnailId' in item) {
        const img = new Image();
        img.src = `/api/files/thumbnail/${(item as any).thumbnailId}`;
      }
    });
  };

  // Watch container size changes
  const resizeObserver = new ResizeObserver(entries => {
    for (const entry of entries) {
      containerHeight.value = entry.contentRect.height;
      updateVisibleRange();
    }
  });

  watch(container, (newContainer, oldContainer) => {
    if (oldContainer) {
      resizeObserver.unobserve(oldContainer);
    }
    if (newContainer) {
      resizeObserver.observe(newContainer);
      containerHeight.value = newContainer.clientHeight;
      updateVisibleRange();
    }
  });

  // Initial update
  watch(items, () => {
    updateVisibleRange();
  }, { immediate: true });

  return {
    visibleItems,
    spacerStyle,
    viewportStyle,
    handleScroll,
    scrollToItem,
    scrollToTop,
    scrollToBottom
  };
}