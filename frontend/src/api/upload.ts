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

  async listSessions() {
    const res = await api.get('/upload/sessions')
    return res.data as { sessions: Array<{ id: string; status: string; createdAt: number; targetRelative: string }> }
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
    const res = await api.get(`/upload/sessions/${encodeURIComponent(sessionId)}/files`)
    return res.data as { files: Array<{ id: string; path: string; size?: number; received: number; status: string }> }
  },

  async getFileOffset(sessionId: string, fileId: string) {
    const res = await api.get(`/upload/sessions/${encodeURIComponent(sessionId)}/files/${encodeURIComponent(fileId)}/offset`)
    return res.data as { received: number; size?: number; status: string }
  },

  async uploadChunk(sessionId: string, fileId: string, offset: number, chunk: Blob, opts?: { md5Hex?: string; md5B64?: string; sha256B64?: string }) {
    const url = `/upload/sessions/${encodeURIComponent(sessionId)}/files/${encodeURIComponent(fileId)}/chunk`
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
    return res.data as { received: number; completed: boolean }
  },

  async completeFile(sessionId: string, fileId: string) {
    const res = await api.post(`/upload/sessions/${encodeURIComponent(sessionId)}/files/${encodeURIComponent(fileId)}/complete`)
    return res.data as { file: { path: string } }
  },

  async completeSession(sessionId: string, files?: string[]) {
    const res = await api.post(`/upload/sessions/${encodeURIComponent(sessionId)}/complete`, files ? { files } : {})
    return res.data as { count: number; fileIds: string[] }
  },

  async pauseSession(sessionId: string) {
    const res = await api.post(`/upload/sessions/${encodeURIComponent(sessionId)}/pause`)
    return res.data
  },

  async resumeSession(sessionId: string) {
    const res = await api.post(`/upload/sessions/${encodeURIComponent(sessionId)}/resume`)
    return res.data
  },

  async abortFile(sessionId: string, fileId: string) {
    const res = await api.delete(`/upload/sessions/${encodeURIComponent(sessionId)}/files/${encodeURIComponent(fileId)}`)
    return res.data
  },

  async abortSession(sessionId: string) {
    const res = await api.delete(`/upload/sessions/${encodeURIComponent(sessionId)}`)
    return res.data
  },
}