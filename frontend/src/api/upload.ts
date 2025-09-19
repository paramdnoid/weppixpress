import api from './axios'

export interface RegisterFileInput {
  path: string
  size?: number
}

export interface RegisterFileResult {
  fileId: string
  path: string
}

export const uploadApi = {
  async createSession(targetPath: string) {
    const res = await api.post('/upload/sessions', { targetPath })
    return res.data as { id: string; status: string; targetRelative: string }
  },


  async registerFiles(sessionId: string, files: RegisterFileInput[]) {
    const res = await api.post(`/upload/sessions/${encodeURIComponent(sessionId)}/files`, { files })
    return res.data as { files: RegisterFileResult[] }
  },

  async getSessionStatus(sessionId: string) {
    const res = await api.get(`/upload/sessions/${encodeURIComponent(sessionId)}/status`)
    return res.data
  },

  async listFiles(sessionId: string) {
    // Get files from session status since there's no dedicated list endpoint
    const status = await this.getSessionStatus(sessionId)
    return { files: status.files || [] }
  },

  async getFileOffset(sessionId: string, fileId: string) {
    // Get file offset from session status since there's no dedicated offset endpoint
    const status = await this.getSessionStatus(sessionId)
    const file = status.files?.find((f: any) => f.id === fileId)
    return {
      received: file?.received || 0,
      size: file?.size || 0,
      status: file?.status || 'pending'
    }
  },

  async uploadChunk(sessionId: string, fileId: string, offset: number, chunk: Blob, opts?: { md5Hex?: string; md5B64?: string; sha256B64?: string }) {
    const url = `/upload/sessions/${encodeURIComponent(sessionId)}/files/${encodeURIComponent(fileId)}/stream`
    const res = await api.put(url, chunk, {
      params: { offset },
      headers: {
        'Content-Type': 'application/octet-stream',
        ...(opts?.md5Hex ? { 'X-Chunk-MD5': opts.md5Hex } : {}),
        ...(opts?.md5B64 ? { 'Content-MD5': opts.md5B64 } : {}),
        ...(opts?.sha256B64 ? { 'X-Chunk-SHA256': opts.sha256B64 } : {}),
      },
      // do not timeout long chunk uploads
      timeout: 0,
      // important for large uploads
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    })
    return res.data as { received: number; completed: boolean; throughput?: number }
  },

  async completeFile(_sessionId: string, fileId: string) {
    // File completion is handled automatically by the streaming upload
    // Just return success for compatibility
    return { file: { path: fileId } }
  },

  async completeSession(sessionId: string, _files?: string[]) {
    // Session completion is handled automatically
    // Just return success for compatibility
    const status = await this.getSessionStatus(sessionId)
    return {
      count: status.files?.filter((f: any) => f.status === 'completed').length || 0,
      fileIds: status.files?.filter((f: any) => f.status === 'completed').map((f: any) => f.id) || []
    }
  },

  async pauseSession(_sessionId: string) {
    // Session pause/resume is handled client-side in the optimized version
    return { status: 'paused' }
  },

  async resumeSession(_sessionId: string) {
    // Session pause/resume is handled client-side in the optimized version
    return { status: 'active' }
  },

  async abortFile(_sessionId: string, _fileId: string) {
    // File abortion is handled client-side in the optimized version
    return { status: 'aborted' }
  },

  async abortSession(_sessionId: string) {
    // Session abortion is handled client-side in the optimized version
    return { status: 'aborted' }
  },
}