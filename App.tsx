import React, { useState, useRef } from 'react';
import UploadZone from './components/UploadZone';
import AnalysisView from './components/AnalysisView';
import { MediaAsset, MediaType } from './types';
import { analyzeMedia } from './services/geminiService';
import { captureVideoFrame } from './utils/fileHelpers';

const App: React.FC = () => {
  const [media, setMedia] = useState<MediaAsset | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleUpload = (asset: MediaAsset) => {
    setMedia(asset);
  };

  const handleClose = () => {
    if (confirm("End current analysis session?")) {
      setMedia(null);
    }
  };

  const handleAnalyze = async () => {
    if (!media) return null;

    try {
      let payload = {
        base64: media.base64 || '',
        mimeType: media.mimeType
      };

      // If it's a video, capture the current frame
      if (media.type === MediaType.VIDEO && videoRef.current) {
        // Pause to ensure stable capture
        videoRef.current.pause();

        try {
          const frameBase64 = captureVideoFrame(videoRef.current);
          payload = {
            base64: frameBase64,
            mimeType: 'image/jpeg'
          };
        } catch (e) {
          console.error("Failed to capture frame", e);
        }
      }

      // Analyze with a default tactical prompt
      const result = await analyzeMedia(
        payload,
        "Analyze this frame. Describe the main elements and actions. If you can detect objects, provide bounding box visualizations.",
        []
      );

      return result;
    } catch (error) {
      console.error(error);
      return { text: "Sorry, I encountered an error analyzing the play." };
    }
  };

  return (
    <div className="h-screen w-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden">
      <header className="h-14 border-b border-slate-800 px-6 flex items-center shrink-0">
        <h1 className="text-lg font-semibold tracking-tight">detextit</h1>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-hidden">
        {!media ? (
          <div className="h-full w-full flex items-center justify-center p-6">
            <div className="w-full max-w-xl">
              <UploadZone onUpload={handleUpload} isProcessing={false} />
            </div>
          </div>
        ) : (
          <AnalysisView
            media={media}
            onClose={handleClose}
            videoRef={videoRef}
            onAnalyze={handleAnalyze}
          />
        )}
      </main>
    </div>
  );
};

export default App;
