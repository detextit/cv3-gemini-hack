import React, { useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { MediaAsset } from '../types';
import { fileToBase64, getMediaType, getMimeType } from '../utils/fileHelpers';

interface UploadZoneProps {
  onUpload: (asset: MediaAsset) => void;
  isProcessing: boolean;
}

const DEMO_CLIPS = [
  { name: 'GSW Clip 1', url: '/gswclip1.mp4' },
  { name: 'GSW Clip 2', url: '/gswclip2.mp4' },
  { name: 'GSW Clip 3', url: '/gswclip3.mp4' },
];

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

  const handleDemoSelect = async (url: string, name: string) => {
    setIsReading(true);
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const file = new File([blob], name + '.mp4', { type: blob.type });

      const type = getMediaType(file);
      const mimeType = getMimeType(file); // Should be video/mp4
      const previewUrl = URL.createObjectURL(file);
      const base64 = await fileToBase64(file);

      onUpload({
        file,
        previewUrl,
        type,
        base64,
        mimeType,
        autoAnalyze: true
      });
    } catch (error) {
      console.error("Error loading demo clip:", error);
      alert("Failed to load demo clip.");
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
        Drag and drop or click to browse. MP4, MOV, JPG, PNG.
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

      {/* Demo Clips Section */}
      <div className="mt-8 pt-6 border-t border-slate-800 w-full">
        <p className="text-xs text-slate-500 mb-3 text-center uppercase tracking-wider font-semibold">
          Or try a demo clip
        </p>
        <div className="grid grid-cols-3 gap-3">
          {DEMO_CLIPS.map((clip, index) => (
            <button
              key={index}
              onClick={() => handleDemoSelect(clip.url, clip.name)}
              disabled={isLoading}
              className="flex flex-col items-center justify-center p-3 rounded-lg border border-slate-800 bg-slate-900/50 hover:bg-slate-800 hover:border-slate-700 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="relative w-full h-24 mb-2 rounded-md overflow-hidden bg-slate-800 group-hover:ring-2 group-hover:ring-emerald-500/50 transition-all">
                <video
                  src={clip.url}
                  className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
                  muted
                  playsInline
                  onMouseOver={e => e.currentTarget.play()}
                  onMouseOut={e => {
                    e.currentTarget.pause();
                    e.currentTarget.currentTime = 0;
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none group-hover:opacity-0 transition-opacity">
                  <div className="w-8 h-8 rounded-full bg-slate-900/50 backdrop-blur-sm flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-white ml-0.5">
                      <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    </svg>
                  </div>
                </div>
              </div>
              <span className="text-xs text-slate-400 group-hover:text-slate-200 font-medium">
                {clip.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UploadZone;
