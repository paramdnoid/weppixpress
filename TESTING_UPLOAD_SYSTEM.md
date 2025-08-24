# 🧪 Testing the New Upload System

## ⚠️ **Authentication Required**

The upload system requires user authentication. The 400 errors you're seeing are actually authentication errors.

## 📋 **Test Steps:**

### 1. **Start Both Servers**

**Backend (Terminal 1):**
```bash
cd /Users/andre/Projects/weppixpress/backend
npm start
```
✅ Should show: `🚀 Backend + WS running on http://localhost:3001`

**Frontend (Terminal 2):**
```bash
cd /Users/andre/Projects/weppixpress/frontend  
npm run dev
```
✅ Should show: `Local: http://localhost:3000`

### 2. **Login First**
1. Open browser: `http://localhost:3000`
2. Navigate to **Login** page (`/auth/login`)
3. Login with your credentials
4. Verify you're authenticated (check localStorage for `accessToken`)

### 3. **Test Upload System**
1. Navigate to **Files** page (`/files`)
2. Try uploading files using one of these methods:

   **Method A: Drag & Drop**
   - Drag files/folders directly onto the file manager area
   - Should show folder scanning modal for folders
   - Upload queue appears in bottom-right

   **Method B: Upload Button**
   - Click "Menu" → "Upload Files/Folders"
   - Select files or folders
   - Upload process starts automatically

### 4. **Test Features**
- ✅ **Large Files**: Try files >100MB
- ✅ **Folders**: Upload entire folder structures
- ✅ **Pause/Resume**: Use controls in upload queue
- ✅ **Page Refresh**: Refresh page during upload
- ✅ **Progress**: Watch real-time progress and ETA

## 🔍 **Debugging**

### Authentication Issues:
```bash
# Check if backend is running
curl http://localhost:3001/api/health

# Check authentication (replace TOKEN)
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3001/api/chunked-upload/active
```

### Server Logs:
The backend now includes debug logging:
```
Initialize upload request body: { fileName: '...', fileSize: '...', ... }
User: { userId: '...', ... }
```

### Browser Console:
- Check for authentication tokens: `localStorage.getItem('accessToken')`
- Look for upload service errors
- Monitor network requests in DevTools

## ✅ **Expected Behavior**

### Successful Upload Flow:
1. **Folder Scan Modal**: Shows progress when scanning large folders
2. **Upload Queue**: Appears in bottom-right with progress bars
3. **Real-time Updates**: Speed, ETA, progress percentage
4. **Pause/Resume**: Full control over upload process
5. **Persistence**: Uploads continue after page refresh

### Error Handling:
- **Not Logged In**: Redirects to login page
- **Network Issues**: Shows retry options
- **File Too Large**: Shows size limit error
- **Server Issues**: Shows friendly error messages

## 🚨 **Common Issues**

### "Authentication Required"
- **Solution**: Login to the application first
- **Check**: `localStorage.getItem('accessToken')` should return a token

### "Port 3001 Already in Use"
- **Solution**: `lsof -ti:3001 | xargs kill -9`
- **Then**: Restart backend server

### "Request Failed with Status 400"
- **Cause**: Usually authentication or validation errors
- **Check**: Server logs for specific error details
- **Solution**: Ensure proper login and valid file selection

### Upload Queue Not Showing
- **Cause**: Upload initialization failed
- **Check**: Browser console for error messages
- **Solution**: Verify authentication and file selection

## 🎯 **Test Scenarios**

1. **Small Files**: Upload 2-3 small files (< 1MB)
2. **Large Files**: Upload files 10MB-100MB+ 
3. **Folders**: Upload folder with subfolders
4. **Mixed Content**: Upload combination of files and folders
5. **Network Issues**: Pause WiFi during upload, then resume
6. **Page Refresh**: Refresh browser during active uploads
7. **Multiple Sessions**: Open multiple tabs and upload simultaneously

## 📊 **Performance Monitoring**

Watch backend logs for:
- Memory usage warnings
- Upload cleanup service logs
- Session management activity
- WebSocket broadcasting events

The system is optimized for:
- **Memory**: 2MB chunks, optimized streaming
- **Performance**: Concurrent uploads, background cleanup
- **Reliability**: Session persistence, error recovery

---

## 🚀 **Ready to Test!**

1. ✅ Backend running on port 3001
2. ✅ Frontend running on port 3000  
3. ✅ User logged in and authenticated
4. ✅ Upload system ready for testing

**Start by logging in, then try uploading some files!** 🎉