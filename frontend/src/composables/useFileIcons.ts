// src/composables/useFileIcons.ts
// Drop-in Helper: Liefert Iconify-Icon + optionale Farbe/Klasse je Datei.
// Priorität: 1) Mehrfach-Extension 2) Extension 3) MIME-Gruppe 4) Default

const MULTI_EXT_MAP: Record<string, string> = {
  'tar.gz': 'tabler:file-type-tgz',
  'tar.bz2': 'tabler:archive',
  'tar.xz': 'tabler:archive',
};

const EXT_MAP: Record<string, string> = {
  // Dokumente
  pdf: 'bi:filetype-pdf',
  doc: 'bi:filetype-doc',
  docx: 'bi:filetype-docx',
  rtf: 'bi:filetype-doc',
  odt: 'bi:filetype-doc',
  txt: 'bi:filetype-txt',
  md: 'bi:filetype-md',
  markdown: 'bi:filetype-md',

  // Tabellen/Datensätze
  xls: 'bi:filetype-xls',
  xlsx: 'bi:filetype-xlsx',
  csv: 'bi:filetype-csv',
  tsv: 'bi:filetype-csv',
  numbers: 'bi:filetype-xls',

  // Präsentation
  ppt: 'bi:filetype-ppt',
  pptx: 'bi:filetype-pptx',
  key: 'bi:filetype-ppt',
  odp: 'bi:filetype-ppt',

  // Bilder & Grafiken
  jpg: 'bi:filetype-jpg',
  jpeg: 'bi:filetype-jpg',
  png: 'bi:filetype-png',
  gif: 'bi:filetype-gif',
  webp: 'bi:image',
  svg: 'bi:filetype-svg',
  heic: 'bi:image',
  avif: 'bi:image',
  psd: 'bi:filetype-psd',
  ai: 'bi:filetype-ai',
  eps: 'bi:image',
  ico: 'bi:image',

  // Audio
  mp3: 'bi:filetype-mp3',
  wav: 'bi:filetype-wav',
  flac: 'bi:music-note',
  aac: 'bi:music-note',
  ogg: 'bi:music-note',
  m4a: 'bi:music-note',

  // Video
  mp4: 'bi:filetype-mp4',
  mov: 'bi:filetype-mov',
  mkv: 'bi:camera-video',
  avi: 'bi:camera-video',
  webm: 'bi:camera-video',

  // Archive/Container
  zip: 'bi:file-zip',
  rar: 'bi:file-zip',
  '7z': 'bi:file-zip',
  tar: 'bi:archive',
  gz: 'bi:archive',
  bz2: 'bi:archive',
  xz: 'bi:archive',
  dmg: 'bi:archive',
  iso: 'bi:disc',

  // Code / Markup / Config
  js: 'bi:filetype-js',
  mjs: 'bi:filetype-js',
  cjs: 'bi:filetype-js',
  ts: 'bi:filetype-js',
  json: 'bi:filetype-json',
  jsonc: 'bi:filetype-json',
  map: 'bi:filetype-json',
  html: 'bi:filetype-html',
  htm: 'bi:filetype-html',
  vue: 'bi:code-square',
  svelte: 'bi:code-square',
  jsx: 'bi:filetype-jsx',
  tsx: 'bi:filetype-tsx',
  css: 'bi:filetype-css',
  scss: 'bi:filetype-scss',
  less: 'bi:filetype-css',
  xml: 'bi:filetype-xml',
  yml: 'bi:filetype-yml',
  yaml: 'bi:filetype-yml',
  ini: 'bi:gear',
  env: 'bi:gear',
  conf: 'bi:gear',
  cfg: 'bi:gear',
  toml: 'bi:gear',
  log: 'bi:file-text',

  // Programmiersprachen
  py: 'bi:filetype-py',
  java: 'bi:filetype-java',
  c: 'bi:code-square',
  h: 'bi:code-square',
  cpp: 'bi:code-square',
  hpp: 'bi:code-square',
  cs: 'bi:code-square',
  go: 'bi:code-square',
  rs: 'bi:code-square',
  php: 'bi:filetype-php',
  rb: 'bi:code-square',
  swift: 'bi:code-square',
  kt: 'bi:code-square',
  sql: 'bi:filetype-sql',
  sh: 'bi:terminal',
  bash: 'bi:terminal',
  zsh: 'bi:terminal',
  bat: 'bi:terminal',
  ps1: 'bi:terminal',

  // Datenbanken / Daten
  db: 'bi:database',
  sqlite: 'bi:database',
  sqlite3: 'bi:database',
  parquet: 'bi:database',
  feather: 'bi:database',

  // Fonts
  ttf: 'bi:fonts',
  otf: 'bi:fonts',
  woff: 'bi:fonts',
  woff2: 'bi:fonts',

  // CAD / 3D
  stl: 'bi:box',
  obj: 'bi:box',
  fbx: 'bi:box',
  step: 'bi:box',
  stp: 'bi:box',
  iges: 'bi:box',
  glb: 'bi:box',
  gltf: 'bi:box',

  // System / Installer
  exe: 'bi:filetype-exe',
  msi: 'bi:windows',
  appimage: 'bi:app',
  deb: 'bi:box-seam',
  rpm: 'bi:box-seam',
  apk: 'bi:android2',
  ipa: 'bi:apple',

  // Web/Cert
  cert: 'bi:shield-check',
  crt: 'bi:shield-check',
  pem: 'bi:shield-check',
  p12: 'bi:shield-check',

  // Untertitel / Torrents
  srt: 'bi:chat-square-text',
  vtt: 'bi:chat-square-text',
  torrent: 'bi:download',

  // Sonstiges
  rfa: 'bi:file-earmark',
};

const MIME_FALLBACK: Record<string, string> = {
  image: 'bi:image',
  video: 'bi:camera-video',
  audio: 'bi:music-note',
  text: 'bi:file-text',
  application: 'bi:file-earmark',
  font: 'bi:fonts',
  model: 'bi:box',
};

const COLOR_CLASS: Record<string, string> = {
  pdf: 'text-danger',                 // rot für PDF
  doc: 'text-primary',
  docx: 'text-primary',
  xls: 'text-success',
  xlsx: 'text-success',
  csv: 'text-success',
  ppt: 'text-warning',
  pptx: 'text-warning',
  zip: 'text-muted',
  '7z': 'text-muted',
  rar: 'text-muted',
  tar: 'text-muted',
  gz: 'text-muted',
  jpg: 'text-pink',
  jpeg: 'text-pink',
  png: 'text-pink',
  svg: 'text-pink',
  mp3: 'text-teal',
  wav: 'text-teal',
  mp4: 'text-indigo',
  mov: 'text-indigo',
  js: 'text-yellow',
  ts: 'text-cyan',
  json: 'text-cyan',
  html: 'text-orange',
  css: 'text-blue',
  scss: 'text-purple',
  xml: 'text-orange',
  yml: 'text-cyan',
  yaml: 'text-cyan',
  sql: 'text-lime',
};

function getExtParts(name = ''): { ext: string; multi: string } {
  const base = (name || '').split('/').pop() || '';
  const parts = base.toLowerCase().split('.');
  if (parts.length <= 1) return { ext: '', multi: '' };
  const ext = parts.pop() as string; // letzte
  const prev = parts.pop(); // vorletzte
  const multi = prev ? `${prev}.${ext}` : '';
  return { ext, multi };
}

interface FileIconParams {
  name?: string;
  mime?: string;
}

interface FileIconMeta {
  icon: string;
  class: string;
}

// Public API
export function getFileIconMeta({ name, mime }: FileIconParams = {}): FileIconMeta {
  const { ext, multi } = getExtParts(name);

  // 1) Mehrfach-Extension (z. B. tar.gz)
  if (multi && MULTI_EXT_MAP[multi]) {
    return { icon: MULTI_EXT_MAP[multi], class: COLOR_CLASS[ext] || '' };
  }

  // 2) Exakte Extension
  if (ext && EXT_MAP[ext]) {
    return { icon: EXT_MAP[ext], class: COLOR_CLASS[ext] || '' };
  }

  // 3) MIME-Fallback (image/*, video/*, …)
  if (mime && typeof mime === 'string' && mime.includes('/')) {
    const group = mime.split('/')[0];
    if (MIME_FALLBACK[group]) {
      return { icon: MIME_FALLBACK[group], class: '' };
    }
  }

  // 4) Default
  return { icon: 'bi:file-earmark', class: '' };
}