// File type mappings for better maintainability
const FILE_TYPES = {
  // Code files
  CODE: {
    extensions: ['js', 'ts', 'jsx', 'tsx', 'php', 'py', 'java', 'c', 'cpp', 'cs', 'go', 'rs', 'kt'],
    icon: 'bxs:file-js',
    colors: {
      js: 'yellow',
      ts: 'indigo',
      jsx: 'yellow',
      tsx: 'indigo',
      php: 'indigo',
      py: 'blue',
      java: 'red',
      c: 'text-primary',
      cpp: 'blue',
      cs: 'purple',
      go: 'cyan',
      rs: 'orange',
      kt: 'purple'
    }
  },
  
  // Web files
  WEB: {
    extensions: ['html', 'htm', 'css', 'scss', 'sass', 'less'],
    icons: {
      html: 'bxs:file-html',
      htm: 'bxs:file-html',
      css: 'bxs:file-css',
      scss: 'bxs:file-css',
      sass: 'bxs:file-css',
      less: 'bxs:file-css'
    },
    colors: {
      html: 'pink',
      htm: 'pink',
      css: 'cyan',
      scss: 'cyan',
      sass: 'cyan',
      less: 'cyan'
    }
  },

  // Images
  IMAGES: {
    extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'ico', 'tiff', 'tif', 'avif'],
    icon: 'bxs:file-image',
    color: 'rose'
  },

  // Vector graphics
  VECTOR: {
    extensions: ['svg'],
    icon: 'bxs:file-image',
    color: 'purple'
  },

  // Documents
  DOCUMENTS: {
    extensions: ['pdf', 'doc', 'docx', 'odt', 'rtf'],
    icons: {
      pdf: 'bxs:file-pdf',
      doc: 'bxs:file-doc',
      docx: 'bxs:file-doc',
      odt: 'bxs:file-doc',
      rtf: 'bxs:file-doc'
    },
    colors: {
      pdf: 'red',
      doc: 'blue',
      docx: 'blue',
      odt: 'blue',
      rtf: 'blue'
    }
  },

  // Spreadsheets
  SPREADSHEETS: {
    extensions: ['xls', 'xlsx', 'ods', 'csv'],
    icons: {
      xls: 'bxs:file-xls',
      xlsx: 'bxs:file-xls',
      ods: 'bxs:file-xls',
      csv: 'bxs:file-csv'
    },
    colors: {
      xls: 'green',
      xlsx: 'green',
      ods: 'green',
      csv: 'teal'
    }
  },

  // Presentations
  PRESENTATIONS: {
    extensions: ['ppt', 'pptx', 'odp'],
    icons: {
      ppt: 'bxs:file-ppt',
      pptx: 'bxs:file-ppt',
      odp: 'bxs:file-ppt'
    },
    color: 'orange'
  },

  // Audio
  AUDIO: {
    extensions: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a'],
    icon: 'bxs:file-music',
    color: 'purple'
  },

  // Video
  VIDEO: {
    extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv', 'wmv', 'm4v'],
    icon: 'bxs:file-video',
    color: 'purple'
  },

  // Archives
  ARCHIVES: {
    extensions: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'],
    icon: 'bxs:file-archive',
    color: 'dark'
  },

  // Data/Config
  DATA: {
    extensions: ['json', 'xml', 'yaml', 'yml', 'toml', 'ini', 'cfg'],
    icons: {
      json: 'bxs:file-json',
      xml: 'bxs:file-xml',
      yaml: 'bxs:file-doc',
      yml: 'bxs:file-doc',
      toml: 'bxs:file-doc',
      ini: 'bxs:file-doc',
      cfg: 'bxs:file-doc'
    },
    colors: {
      json: 'teal',
      xml: 'orange',
      yaml: 'text-primary',
      yml: 'text-primary',
      toml: 'text-primary',
      ini: 'text-primary',
      cfg: 'text-primary'
    }
  },

  // Text
  TEXT: {
    extensions: ['txt', 'md', 'readme', 'log'],
    icons: {
      txt: 'bxs:file-txt',
      md: 'bxs:file-md',
      readme: 'bxs:file-txt',
      log: 'bxs:file-txt'
    },
    color: 'text-primary'
  }
};

// Folder type detection patterns
const FOLDER_PATTERNS = [

];

function getExtension(item) {
  if (!item?.name) return '';
  
  const name = String(item.name);
  // Handle hidden files (starting with .)
  const fileName = name.startsWith('.') ? name.slice(1) : name;
  
  const parts = fileName.split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
}

function getFileType(extension) {
  for (const [typeName, typeConfig] of Object.entries(FILE_TYPES)) {
    if (typeConfig.extensions.includes(extension)) {
      return { type: typeName.toLowerCase(), config: typeConfig };
    }
  }
  return null;
}

function getFileIcon(item) {
  const folderType = (item.type || '').toLowerCase();
  if (folderType === 'folder' || folderType === 'directory') {
    const name = item.name?.toLowerCase() || '';
    const cleanName = name.startsWith('.') ? name.slice(1) : name;

    // Check for specific folder patterns (use name without leading dot)
    for (const pattern of FOLDER_PATTERNS) {
      if (pattern.pattern.test(cleanName)) {
        return pattern.icon;
      }
    }

    return 'bxs:folder';
  }

  const ext = getExtension(item);
  if (!ext) return 'bxs:file';

  const fileType = getFileType(ext);
  if (fileType) {
    const { config } = fileType;
    
    // Check for extension-specific icons
    if (config.icons && config.icons[ext]) {
      return config.icons[ext];
    }
    
    // Use default icon for the file type
    if (config.icon) {
      return config.icon;
    }
  }

  return 'bxs:file';
}

function getFileColor(item) {
  const folderType = (item.type || '').toLowerCase();
  if (folderType === 'folder' || folderType === 'directory') {
    const name = item.name?.toLowerCase() || '';
    const cleanName = name.startsWith('.') ? name.slice(1) : name;

    // Check for specific folder patterns (use name without leading dot)
    for (const pattern of FOLDER_PATTERNS) {
      if (pattern.pattern.test(cleanName)) {
        return pattern.color;
      }
    }

    return 'folder';
  }

  const ext = getExtension(item);
  if (!ext) return 'file';

  const fileType = getFileType(ext);
  if (fileType) {
    const { config } = fileType;
    
    // Check for extension-specific colors
    if (config.colors && config.colors[ext]) {
      return config.colors[ext];
    }
    
    // Use default color for the file type
    if (config.color) {
      return config.color;
    }
  }

  return 'file';
}

function getFileComparator(sortKey = '', sortDir = 'asc') {
  const multiplier = sortDir === 'asc' ? 1 : -1;
  
  return function compare(a, b) {
    // Always sort folders first (support 'folder' and 'directory')
    const isAFolder = String(a.type || '').toLowerCase() === 'folder' || String(a.type || '').toLowerCase() === 'directory';
    const isBFolder = String(b.type || '').toLowerCase() === 'folder' || String(b.type || '').toLowerCase() === 'directory';
    if (isAFolder !== isBFolder) {
      return isAFolder ? -1 : 1;
    }

    switch (sortKey) {
      case 'size':
        // Only compare size for files
        if (a.type === 'file' && b.type === 'file') {
          const sizeA = Number(a.size) || 0;
          const sizeB = Number(b.size) || 0;
          return (sizeA - sizeB) * multiplier;
        }
        break;

      case 'modified':
        const aTime = a._parsedUpdatedAt ?? 
          (a._parsedUpdatedAt = a.updatedAt ? new Date(a.updatedAt).getTime() : 0);
        const bTime = b._parsedUpdatedAt ?? 
          (b._parsedUpdatedAt = b.updatedAt ? new Date(b.updatedAt).getTime() : 0);
        return (aTime - bTime) * multiplier;

      case 'extension':
        if (a.type === 'file' && b.type === 'file') {
          const extA = getExtension(a);
          const extB = getExtension(b);
          const extComparison = extA.localeCompare(extB);
          if (extComparison !== 0) {
            return extComparison * multiplier;
          }
        }
        break;

      case 'type':
        if (a.type === 'file' && b.type === 'file') {
          const typeA = getFileType(getExtension(a))?.type || 'unknown';
          const typeB = getFileType(getExtension(b))?.type || 'unknown';
          const typeComparison = typeA.localeCompare(typeB);
          if (typeComparison !== 0) {
            return typeComparison * multiplier;
          }
        }
        break;
    }

    // Default to name sorting
    const nameA = (a.name || '').toLowerCase();
    const nameB = (b.name || '').toLowerCase();
    return nameA.localeCompare(nameB, undefined, { numeric: true }) * multiplier;
  };
}

function getDateFormatted(dateStr, options = {}) {
  if (!dateStr) return '';

  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';

    const defaultOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };

    const formatOptions = { ...defaultOptions, ...options };
    const formatter = new Intl.DateTimeFormat(undefined, formatOptions);
    
    return formatter.format(date);
  } catch (error) {
    console.warn('Date formatting error:', error);
    return '';
  }
}

function getFileSize(bytes) {
  if (typeof bytes !== 'number' || bytes < 0) return '';
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  const formatted = unitIndex === 0 ? 
    size.toString() : 
    size.toFixed(size < 10 ? 1 : 0);
    
  return `${formatted} ${units[unitIndex]}`;
}

function isImageFile(item) {
  const ext = getExtension(item);
  const imageExtensions = [...FILE_TYPES.IMAGES.extensions, ...FILE_TYPES.VECTOR.extensions];
  return imageExtensions.includes(ext);
}

function isVideoFile(item) {
  const ext = getExtension(item);
  return FILE_TYPES.VIDEO.extensions.includes(ext);
}

function isAudioFile(item) {
  const ext = getExtension(item);
  return FILE_TYPES.AUDIO.extensions.includes(ext);
}

function isCodeFile(item) {
  const ext = getExtension(item);
  return FILE_TYPES.CODE.extensions.includes(ext) || 
         FILE_TYPES.WEB.extensions.includes(ext);
}

// Enhanced composable with additional utilities
export function useFiles() {
  return {
    getExtension,
    getFileIcon,
    getFileColor,
    getFileComparator,
    getDateFormatted,
    getFileSize,
    getFileType,
    isImageFile,
    isVideoFile,
    isAudioFile,
    isCodeFile,
    
    // Constants for external use
    FILE_TYPES: Object.freeze(FILE_TYPES),
    FOLDER_PATTERNS: Object.freeze(FOLDER_PATTERNS)
  };
}