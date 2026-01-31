import React, { useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
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
    <div className="w-full flex flex-col items-center justify-center p-8 border border-dashed border-slate-700 rounded-lg bg-slate-900/40">
      <div className="mb-4 flex items-center justify-center">
        {isLoading ? (
          <Loader2 className="w-8 h-8 text-slate-300 animate-spin" />
        ) : (
          <Upload className="w-8 h-8 text-slate-300" />
        )}
      </div>

      <h3 className="text-lg font-medium text-slate-100">
        {isReading ? 'Reading media...' : 'Upload a video or image'}
      </h3>
      <p className="text-sm text-slate-400 mt-2 text-center">
        Drag and drop or click to browse. MP4, MOV, JPG, PNG up to 20MB.
      </p>

      <label
        className={`
          mt-6 inline-flex items-center justify-center
          px-4 py-2 bg-slate-100 text-slate-900 text-sm font-medium rounded-md
          cursor-pointer transition-colors hover:bg-white
          ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        {isLoading ? 'Processing...' : 'Select file'}
        <input
          type="file"
          className="hidden"
          accept="image/*,video/*"
          onChange={handleFileChange}
          disabled={isLoading}
        />
      </label>
    </div>
  );
};

export default UploadZone;
