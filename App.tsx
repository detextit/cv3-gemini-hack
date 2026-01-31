import React, { useState, useRef } from 'react';
import UploadZone from './components/UploadZone';
import AnalysisView from './components/AnalysisView';
import { MediaAsset, MediaType } from './types';
import { analyzeMedia } from './services/geminiService';
import { captureVideoFrame } from './utils/fileHelpers';
import { Activity, ShieldCheck, Play } from 'lucide-react';

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
        "Analyze this frame. Identify player positions, formations, and tactical insights. If you can detect players, provide bounding box visualizations. Show any movement patterns or plays being executed.",
        []
      );

      return result;
    } catch (error) {
      console.error(error);
      return { text: "Sorry, I encountered an error analyzing the play." };
    }
  };

  return (
    <div className="h-screen w-screen bg-slate-950 text-slate-50 flex flex-col overflow-hidden">
      {/* Top Navigation Bar */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md flex items-center justify-between px-6 shrink-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 transform rotate-3">
            <Play className="text-white fill-current" size={20} />
          </div>
          <div>
            <h1 className="font-bold text-xl tracking-tight text-white leading-none">
              PlayBook<span className="text-blue-500">AI</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-medium tracking-wider uppercase mt-1">
              Agentic Sports Vision
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-2 text-slate-400 text-xs font-medium">
            <ShieldCheck size={14} className="text-green-500" />
            <span>Secure Environment</span>
          </div>
          <div className="h-4 w-px bg-slate-800"></div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-xs text-slate-300">Gemini 2.5 Flash + Remotion</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-hidden">
        {!media ? (
          <div className="h-full w-full flex flex-col items-center justify-center p-6 relative">
            {/* Background Decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-blue-600/10 blur-[120px] rounded-full"></div>
              <div className="absolute top-[40%] -right-[10%] w-[40%] h-[60%] bg-indigo-600/10 blur-[120px] rounded-full"></div>
            </div>

            <div className="relative z-10 w-full max-w-2xl h-[400px]">
              <UploadZone onUpload={handleUpload} isProcessing={false} />
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl w-full relative z-10">
              {[
                { icon: Activity, title: "Tactical Analysis", desc: "Identify offensive and defensive formations instantly." },
                { icon: Play, title: "Player Tracking", desc: "Count players and analyze spacing using computer vision." },
                { icon: ShieldCheck, title: "Rule Verification", desc: "Check for potential offsides or fouls." }
              ].map((item, i) => (
                <div key={i} className="bg-slate-900/40 border border-slate-800 p-4 rounded-xl backdrop-blur-sm">
                  <item.icon className="w-6 h-6 text-blue-400 mb-2" />
                  <h4 className="text-sm font-semibold text-white mb-1">{item.title}</h4>
                  <p className="text-xs text-slate-400">{item.desc}</p>
                </div>
              ))}
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