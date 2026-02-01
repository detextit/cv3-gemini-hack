import React, { useState, useRef, useEffect } from 'react';
import UploadZone from './components/UploadZone';
import AnalysisView from './components/AnalysisView';
import { MediaAsset, MediaType, AgentEvent } from './types';
import { analyzeMediaAgentic } from './services/geminiService';
import { captureVideoFrame } from './utils/fileHelpers';


const App: React.FC = () => {
  const [media, setMedia] = useState<MediaAsset | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleUpload = (asset: MediaAsset) => {
    setMedia(asset);
    window.history.pushState({ view: 'analysis' }, '');
  };

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // If we go back and there's no state or it's not analysis, close the view
      if (!event.state?.view) {
        setMedia(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleClose = () => {
    if (confirm("End current analysis session?")) {
      // Go back in history if we have state, otherwise just reset
      if (window.history.state?.view === 'analysis') {
        window.history.back();
      } else {
        setMedia(null);
      }
    }
  };

  const handleAnalyze = async (callback: (event: AgentEvent) => void) => {
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

      // Analyze with agentic tool-calling loop
      const result = await analyzeMediaAgentic(
        payload,
        "Analyze this frame. Describe the main elements and actions. Use the show_overlay tool to progressively build up a visual analysis with lines, zones, and annotations.",
        callback
      );

      // Attach the timestamp of the analyzed frame
      if (media.type === MediaType.VIDEO && videoRef.current) {
        return { ...result, timestamp: videoRef.current.currentTime };
      }

      return result;
    } catch (error) {
      console.error(error);
      return { text: "Sorry, I encountered an error analyzing the play." };
    }
  };

  return (
    <div className="h-screen w-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden">

      {/* Header - only show on upload screen */}
      {!media && (
        <header className="h-14 border-b border-slate-800 px-6 flex items-center justify-center shrink-0">
          <h1 className="text-lg font-semibold tracking-tight">detextit</h1>
        </header>
      )}

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-hidden">
        {!media ? (
          <div className="h-full w-full flex items-center justify-center p-6">
            <div className="w-full max-w-xl flex flex-col items-center">
              <p className="text-slate-400 text-center mb-6 max-w-md">
                Gemini Flash agentic analysis for frame-by-frame gameplays and tactical breakdowns.
              </p>
              <div className="w-full">
                <UploadZone onUpload={handleUpload} isProcessing={false} />
              </div>
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
