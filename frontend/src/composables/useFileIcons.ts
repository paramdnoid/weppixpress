// src/composables/useFileIcons.ts
// Refactored to use consolidated file type registry
// Maintains backward compatibility while eliminating duplication

import { getFileIcon as getFileIconFromRegistry, getFileColor as getFileColorFromRegistry } from '@/utils/fileTypeRegistry'

// Keep special multi-extension mappings that aren't in the main registry
const MULTI_EXT_MAP: Record<string, string> = {
  'tar.gz': 'tabler:file-type-tgz',
  'tar.bz2': 'tabler:archive',
  'tar.xz': 'tabler:archive',
};

/**
 * Get file icon using consolidated registry
 */
export function getFileIcon(item: { name?: string; type?: string }): string {
  // Handle multi-extensions first
  if (item.name) {
    const lowerName = item.name.toLowerCase()
    for (const [multiExt, icon] of Object.entries(MULTI_EXT_MAP)) {
      if (lowerName.endsWith(multiExt)) {
        return icon
      }
    }
  }

  // Use registry for standard lookup
  return getFileIconFromRegistry(item)
}

/**
 * Get file color using consolidated registry
 */
export function getFileColor(item: { name?: string; type?: string }): string {
  return getFileColorFromRegistry(item)
}

/**
 * Legacy helper function for file extension lookup
 */
export function getIconByExtension(extension: string): string {
  return getFileIcon({ name: `file.${extension}` })
}

/**
 * Backwards compatibility exports
 */
export function useFileManager() {
  return {
    getFileIcon,
    getFileColor,
    getIconByExtension
  }
}

export { getFileIcon as getIcon }