import { ref, Ref } from 'vue'

export interface FileUploadOptions {
  onProgress?: (progress: number) => void
  onSuccess?: (files: File[]) => void
  onError?: (error: Error) => void
}

export function useFileUpload(options: FileUploadOptions = {}) {
  const { onProgress, onSuccess, onError } = options
  
  const isUploading = ref(false)
  const uploadProgress = ref(0)
  
  async function uploadFiles(
    files: File[], 
    uploadFunction: (formData: FormData, progressCallback?: (progress: number) => void) => Promise<any>
  ) {
    if (!files.length) return
    
    const formData = new FormData()
    files.forEach(file => {
      formData.append('files', file)
    })
    
    isUploading.value = true
    uploadProgress.value = 0
    
    try {
      await uploadFunction(formData, (progress) => {
        uploadProgress.value = progress
        onProgress?.(progress)
      })
      
      onSuccess?.(files)
    } catch (error) {
      onError?.(error as Error)
      throw error
    } finally {
      isUploading.value = false
      uploadProgress.value = 0
    }
  }
  
  function handleFileInput(event: Event) {
    const target = event.target as HTMLInputElement
    const files = Array.from(target.files || [])
    
    // Clear the input so the same files can be selected again
    target.value = ''
    
    return files
  }
  
  return {
    isUploading,
    uploadProgress,
    uploadFiles,
    handleFileInput
  }
}