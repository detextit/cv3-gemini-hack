import { MediaType } from '../types';

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the Data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const getMediaType = (file: File): MediaType => {
  // Check mime type first
  if (file.type && file.type.startsWith('video/')) {
    return MediaType.VIDEO;
  }
  
  // Fallback to extension check if mime type is empty or generic
  const extension = file.name.split('.').pop()?.toLowerCase();
  const videoExtensions = ['mp4', 'mov', 'webm', 'avi', 'mkv', 'm4v', '3gp', 'ts'];
  if (extension && videoExtensions.includes(extension)) {
    return MediaType.VIDEO;
  }

  return MediaType.IMAGE;
};

export const getMimeType = (file: File): string => {
    if (file.type && file.type.length > 0) return file.type;
    
    // Fallback MIME types for common extensions
    const extension = file.name.split('.').pop()?.toLowerCase();
    switch(extension) {
        case 'mp4': return 'video/mp4';
        case 'mov': return 'video/quicktime';
        case 'webm': return 'video/webm';
        case 'avi': return 'video/x-msvideo';
        case 'mkv': return 'video/x-matroska';
        case '3gp': return 'video/3gpp';
        case 'png': return 'image/png';
        case 'jpg': 
        case 'jpeg': return 'image/jpeg';
        case 'webp': return 'image/webp';
        case 'gif': return 'image/gif';
        default: return 'application/octet-stream';
    }
};

export const captureVideoFrame = (video: HTMLVideoElement): string => {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error("Could not get canvas context");
  
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  // Get base64 string, removing the Data URL prefix
  const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
  return dataUrl.split(',')[1];
};

export const formatTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};