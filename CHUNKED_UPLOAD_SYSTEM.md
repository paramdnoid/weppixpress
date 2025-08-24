# Chunked Upload System

## 🚀 Overview

A complete replacement for the existing upload functionality with professional-grade chunked uploads supporting files >10GB, folder uploads, pause/resume, and persistent progress across page refreshes.

## ✨ Features

### Backend Features
- **Chunked Upload**: 2MB default chunks (configurable)
- **Session Management**: Redis-based persistence with 24h TTL
- **Pause/Resume/Cancel**: Full upload lifecycle control
- **Memory Optimization**: 16KB stream buffers, garbage collection
- **Automatic Cleanup**: Background service for expired sessions
- **Progress Tracking**: Real-time progress and ETA calculation
- **File Verification**: Size validation after assembly

### Frontend Features
- **Visual Folder Scanning**: Progress modal for large folder analysis
- **Upload Queue UI**: Bottom-right persistent queue with progress bars
- **Drag & Drop**: Support for files and entire folder structures
- **Speed & ETA Display**: Real-time upload speed and time remaining
- **Persistent State**: Uploads survive page refresh
- **Professional UI**: Modern, responsive design

## 📁 New Files Created

### Backend
```
backend/controllers/chunkedUploadController.js  # Main upload logic
backend/routes/chunkedUpload.js                # API routes
backend/services/uploadCleanupService.js       # Background cleanup
backend/test/simple-upload-test.js             # Basic test
backend/.env.upload-optimized                  # Config template
```

### Frontend
```
frontend/src/services/chunkedUploadService.ts      # Upload service
frontend/src/services/folderScannerService.ts      # Folder analysis
frontend/src/composables/useChunkedUpload.ts       # Vue composable
frontend/src/components/FileManager/UploadQueue.vue         # Upload UI
frontend/src/components/FileManager/FolderScanModal.vue     # Scan progress
```

## 🔧 API Endpoints

### Chunked Upload API (`/api/chunked-upload`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/init` | POST | Initialize upload session |
| `/chunk/:uploadId` | POST | Upload chunk |
| `/status/:uploadId` | GET | Get upload progress |
| `/pause/:uploadId` | POST | Pause upload |
| `/resume/:uploadId` | POST | Resume upload |
| `/cancel/:uploadId` | DELETE | Cancel and cleanup |
| `/active` | GET | List active uploads |

## ⚡ Performance Optimizations

### Memory Management
- **Reduced Chunk Size**: 2MB chunks (down from 5MB)
- **Small Stream Buffers**: 16KB buffers to minimize memory usage
- **Garbage Collection**: Forced GC every 10 chunks during finalization
- **Limited Concurrency**: Max 3 concurrent uploads by default

### Configuration
```bash
# Environment Variables
UPLOAD_CHUNK_SIZE=2097152        # 2MB chunks
MAX_CONCURRENT_UPLOADS=2         # Limit concurrent uploads
MAX_UPLOAD_FILE_SIZE=53687091200 # 50GB max file size
UPLOAD_SESSION_TTL=86400         # 24 hour session TTL

# Node.js Options (recommended)
NODE_OPTIONS="--max-old-space-size=4096 --expose-gc"
```

## 🔄 Upload Process Flow

### 1. Initialization
```javascript
// Client initiates upload
POST /api/chunked-upload/init
{
  fileName: "large-file.zip",
  fileSize: 10737418240,
  relativePath: "projects/folder",
  chunkSize: 2097152
}

// Server responds with session
{
  uploadId: "uuid-123",
  chunkSize: 2097152,
  totalChunks: 5120,
  targetPath: "/uploads/user/projects/folder/large-file.zip"
}
```

### 2. Chunk Upload
```javascript
// Upload each chunk
POST /api/chunked-upload/chunk/:uploadId
FormData: {
  chunk: Blob,
  chunkIndex: 0
}

// Server responds with progress
{
  success: true,
  completed: false,
  progress: 1.95,
  uploadedChunks: 100,
  totalChunks: 5120
}
```

### 3. Finalization
When all chunks are uploaded, the server automatically assembles the file, validates the size, and broadcasts completion via WebSocket.

## 🛠️ Integration

### Backend Integration
The system is automatically integrated when the server starts:

```javascript
// server.js
import chunkedUploadRoutes from './routes/chunkedUpload.js';
import uploadCleanupService from './services/uploadCleanupService.js';

app.use('/api/chunked-upload', chunkedUploadRoutes);

// Start cleanup service
if (process.env.NODE_ENV !== 'test') {
  uploadCleanupService.start();
}
```

### Frontend Integration
The FileView component now includes the upload UI:

```vue
<template>
  <!-- Folder Scan Modal -->
  <FolderScanModal
    :isVisible="isScanning"
    :progress="scanProgress"
    :scanResult="scanResult"
    @cancel="cancelScanning"
    @start="startUploads"
  />

  <!-- Upload Queue (Bottom Right) -->
  <UploadQueue
    :uploads="uploads"
    @pause="pauseUpload"
    @resume="resumeUpload"
    @cancel="cancelUpload"
    @remove="removeUpload"
    @pauseAll="pauseAllUploads"
    @resumeAll="resumeAllUploads"
    @clearCompleted="clearCompleted"
  />
</template>
```

## 🧪 Testing

### Basic Functionality Test
```bash
node test/simple-upload-test.js
```

### Manual Testing
1. Start the server: `npm start`
2. Open the frontend file manager
3. Drag & drop a large file or folder
4. Observe the scanning progress modal
5. Monitor upload progress in the bottom-right queue
6. Test pause/resume/cancel functionality

## 🚨 Troubleshooting

### High Memory Usage
- Ensure `UPLOAD_CHUNK_SIZE=2097152` (2MB)
- Set `MAX_CONCURRENT_UPLOADS=2` or lower
- Use Node.js flags: `--max-old-space-size=4096 --expose-gc`

### Cache Service Errors
- Verify Redis is running: `redis-cli ping`
- Check Redis URL: `REDIS_URL=redis://localhost:6379`
- The system includes a `keys` method for session cleanup

### Upload Failures
- Check disk space in upload directory
- Verify file permissions
- Monitor server logs for detailed error messages
- Check network connectivity for resume functionality

## 📈 Monitoring

The system includes comprehensive logging and monitoring:
- Upload progress tracking
- Session cleanup metrics
- Error reporting and recovery
- WebSocket broadcasting for real-time updates
- Memory usage monitoring

## 🔒 Security

- Path sanitization for upload destinations
- File size and type validation
- Session-based access control
- Rate limiting on upload endpoints
- Automatic cleanup of temporary files

---

The chunked upload system provides a robust, scalable solution for handling large file uploads with professional UX and optimal performance characteristics.