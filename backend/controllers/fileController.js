import { promises, existsSync, mkdirSync } from 'fs';
import { dirname, resolve as _resolve, join, relative } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { filesize } from 'filesize';
import dotenv from 'dotenv';

dotenv.config();
const baseDir = _resolve(process.env.UPLOAD_DIR || join(__dirname, '../..', 'uploads'));
const MAX_PARALLEL_STATS = 20;
const fsp = promises;

async function parallelMap(array, limit, asyncFn) {
  const ret = [];
  let idx = 0;
  async function next() {
    if (idx >= array.length) return;
    const i = idx++;
    ret[i] = asyncFn(array[i], i, array);
    await ret[i];
    return next();
  }
  const pool = [];
  for (let i = 0; i < Math.min(limit, array.length); i++) pool.push(next());
  await Promise.all(pool);
  return Promise.all(ret);
}

async function readItemRecursively(item, targetPath, baseDirUser) {
  const fullPath = join(targetPath, item.name);
  try {
    const stats = await fsp.stat(fullPath);
    const isFile = item.isFile();
    const children = item.isDirectory()
      ? await fsp.readdir(fullPath, { withFileTypes: true }).then(subItems =>
          parallelMap(subItems, MAX_PARALLEL_STATS, subItem =>
            readItemRecursively(subItem, fullPath, baseDirUser)
          )
        )
      : undefined;

    return {
      name: item.name,
      path: relative(baseDirUser, fullPath),
      type: item.isDirectory() ? 'folder' : 'file',
      size: isFile ? { formatted: filesize(stats.size), bytes: stats.size } : null,
      updated: stats.mtime.toISOString(),
      children: children?.filter(Boolean) ?? undefined
    };
  } catch {
    return null;
  }
}

// --- Get folder listing (ultra-fast, non-blocking, no folder sizes here) ---
export async function getFolderFiles(req, res) {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized: Missing user ID' });
  }
  const baseDirUser = ensureUserUploadDir(userId);
  let relativePath = (req.query.path || '').replace(/^\/+/, '');
  const targetPath = _resolve(baseDirUser, relativePath);
  if (relative(baseDirUser, targetPath).startsWith('..')) {
    return res.status(400).json({ error: 'Invalid path' });
  }

  try {
    await fsp.access(targetPath);
  } catch {
    return res.json({ children: [] });
  }

  try {
    const items = await fsp.readdir(targetPath, { withFileTypes: true });
    const children = await parallelMap(items, MAX_PARALLEL_STATS, item =>
      readItemRecursively(item, targetPath, baseDirUser)
    );

    res.json({ children: children.filter(Boolean) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to read directory' });
  }
};


// --- Hilfsfunktionen ---
function ensureUserUploadDir(userId) {
  const userDir = join(baseDir, userId.toString());
  if (!existsSync(userDir)) {
    mkdirSync(userDir, { recursive: true });
  }
  return userDir;
}