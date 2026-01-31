import React, { useState } from 'react';
import { Upload, Video, Image as ImageIcon, Loader2 } from 'lucide-react';
import { MediaAsset } from '../types';
import { fileToBase64, getMediaType, getMimeType } from '../utils/fileHelpers';

interface UploadZoneProps {
  onUpload: (asset: MediaAsset) => void;
  isProcessing: boolean;
}

const UploadZone: React.FC<UploadZoneProps> = ({ onUpload, isProcessing }) => {
  const [isReading, setIsReading] = useState(false);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsReading(true);

    try {
      const type = getMediaType(file);
      const mimeType = getMimeType(file);
      const previewUrl = URL.createObjectURL(file);
      const base64 = await fileToBase64(file);

      onUpload({
        file,
        previewUrl,
        type,
        base64,
        mimeType
      });
    } catch (error) {
      console.error("Error processing file:", error);
      alert("Failed to process file. Please try a different format.");
    } finally {
      setIsReading(false);
    }
  };

  const isLoading = isProcessing || isReading;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-700 rounded-2xl bg-slate-800/50 hover:bg-slate-800/80 transition-all duration-300 group">
      <div className="relative w-24 h-24 mb-6 flex items-center justify-center bg-blue-500/10 rounded-full group-hover:scale-110 transition-transform duration-300">
        {isLoading ? (
            <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
        ) : (
            <Upload className="w-10 h-10 text-blue-400" />
        )}
        <div className={`absolute inset-0 rounded-full border border-blue-500/30 ${isLoading ? 'animate-spin' : 'animate-pulse'}`}></div>
      </div>
      
      <h3 className="text-2xl font-semibold text-white mb-2">
        {isReading ? "Reading Media..." : "Upload Game Footage"}
      </h3>
      <p className="text-slate-400 mb-8 text-center max-w-md">
        Drag and drop your video clip or image here, or click to browse.
        <br/><span className="text-xs text-slate-500 mt-2 block">Supports MP4, MOV, JPG, PNG (Max 20MB)</span>
      </p>

      <label className={`
        relative overflow-hidden
        px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg 
        cursor-pointer transition-colors shadow-lg shadow-blue-500/20
        ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
      `}>
        <span className="relative z-10 flex items-center gap-2">
            {isLoading ? 'Processing...' : 'Select File'}
        </span>
        <input 
          type="file" 
          className="hidden" 
          accept="image/*,video/*"
          onChange={handleFileChange}
          disabled={isLoading}
        />
      </label>

      <div className="mt-12 flex gap-8 text-slate-500">
        <div className="flex flex-col items-center gap-2">
            <Video className="w-6 h-6" />
            <span className="text-xs">Game Clips</span>
        </div>
        <div className="flex flex-col items-center gap-2">
            <ImageIcon className="w-6 h-6" />
            <span className="text-xs">Formation Photos</span>
        </div>
      </div>
    </div>
  );
};

export default UploadZone;