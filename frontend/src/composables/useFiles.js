import { ref } from 'vue'

function getExtension(item) {
  const parts = item?.name?.split('.') || [];
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
}

export function getFileIcon(item) {
  const ext = getExtension(item);
  const map = {
    xml: 'bxs:file-xml',
    html: 'bxs:file-html',
    md: 'bxs:file-md',
    js: 'bxs:file-js',
    ts: 'bxs:file-js',
    txt: 'bxs:file-txt',
    jpg: 'bxs:file-jpg',
    jpeg: 'bxs:file-jpg',
    png: 'bxs:file-jpg',
    gif: 'bxs:file-jpg',
    webp: 'bxs:file-jpg',
    bmp: 'bxs:file-jpg',
    pdf: 'bxs:file-pdf',
    json: 'bxs:file-json',
    zip: 'bxs:file-archive',
    rar: 'bxs:file-archive',
    csv: 'bxs:file-csv',
    doc: 'bxs:file-doc',
    docx: 'bxs:file-doc',
    xls: 'bxs:file-xls',
    xlsx: 'bxs:file-xls',
    ppt: 'bxs:file-ppt',
    pptx: 'bxs:file-ppt',
    mp3: 'bxs:file-music',
    wav: 'bxs:file-music',
    mp4: 'bxs:file-video',
    mov: 'bxs:file-video',
    avi: 'bxs:file-video',
    svg: 'bxs:file-jpg',
    php: 'bxs:file-js',
    py: 'bxs:file-js'
  };
  return map[ext] || 'bxs:file';
}

export function getFileColor(item) {
  if (item.type === 'folder') return 'folder';
  const ext = getExtension(item);
  const map = {
    pdf: 'red',
    doc: 'blue',
    docx: 'blue',
    xls: 'green',
    xlsx: 'green',
    ppt: 'orange',
    pptx: 'orange',
    txt: 'gray',
    md: 'gray',
    json: 'teal',
    js: 'yellow',
    ts: 'indigo',
    html: 'pink',
    css: 'cyan',
    svg: 'purple',
    php: 'indigo',
    py: 'blue',
    zip: 'dark',
    rar: 'dark',
    mp3: 'purple',
    mp4: 'purple',
    mov: 'purple',
    jpg: 'rose',
    jpeg: 'rose',
    png: 'rose',
    gif: 'rose',
    bmp: 'rose',
  };
  return map[ext] || 'file';
}

export function getFileComparator(sortKey = '', sortDir = 'asc') {
  return function compare(a, b) {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
    if (sortKey === 'size' && a.type === 'file' && b.type === 'file') {
      return (a.size - b.size) * (sortDir === 'asc' ? 1 : -1);
    }
    if (sortKey === 'modified') {
      const aTime = a._parsedUpdatedAt || (a._parsedUpdatedAt = new Date(a.updatedAt).getTime());
      const bTime = b._parsedUpdatedAt || (b._parsedUpdatedAt = new Date(b.updatedAt).getTime());
      return (aTime - bTime) * (sortDir === 'asc' ? 1 : -1);
    }
    return a.name.toLowerCase().localeCompare(b.name.toLowerCase()) * (sortDir === 'asc' ? 1 : -1);
  };
}

export function getSizeFormated(bytes) {
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  if (!bytes) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + sizes[i];
}

export function getDateFormated(dateStr) {
  const dateFormatter = new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return dateStr ? dateFormatter.format(new Date(dateStr)) : ''
}
