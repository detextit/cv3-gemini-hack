import React, { useState, useRef, useEffect } from 'react';
import { MediaAsset, MediaType, VisualizationSpec } from '../types';
import { X, PlayCircle, Sparkles, Loader2, Bot } from 'lucide-react';
import { VideoOverlay } from './VideoOverlay';
import ReactMarkdown from 'react-markdown';

interface AnalysisResult {
  text: string;
  visualizations?: VisualizationSpec[];
}

interface AnalysisViewProps {
  media: MediaAsset;
  onClose: () => void;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  onAnalyze: () => Promise<AnalysisResult | null>;
}

const AnalysisView: React.FC<AnalysisViewProps> = ({ media, onClose, videoRef, onAnalyze }) => {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [overlayDimensions, setOverlayDimensions] = useState({ width: 0, height: 0 });
  const mediaContainerRef = useRef<HTMLDivElement>(null);

  // Update overlay dimensions when media container changes
  useEffect(() => {
    const updateDimensions = () => {
      if (mediaContainerRef.current) {
        const mediaEl = mediaContainerRef.current.querySelector('video, img');
        if (mediaEl) {
          setOverlayDimensions({
            width: mediaEl.clientWidth,
            height: mediaEl.clientHeight,
          });
        }
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);

    // Also update when video loads
    const video = videoRef?.current;
    if (video) {
      video.addEventListener('loadedmetadata', updateDimensions);
    }

    return () => {
      window.removeEventListener('resize', updateDimensions);
      if (video) {
        video.removeEventListener('loadedmetadata', updateDimensions);
      }
    };
  }, [videoRef]);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const result = await onAnalyze();
      setAnalysis(result);
    } catch (error) {
      console.error('Analysis failed:', error);
      setAnalysis({ text: 'Analysis failed. Please try again.' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex h-full overflow-hidden animate-in fade-in duration-500">
      {/* Media Column with Overlays */}
      <div className="flex-1 bg-black/40 flex flex-col relative group">

        {/* Toolbar Overlay */}
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-20 bg-gradient-to-b from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="flex items-center gap-3">
            <span className="px-2 py-1 bg-indigo-600 text-white text-[10px] font-bold tracking-wider rounded uppercase">
              {isAnalyzing ? 'Analyzing...' : analysis ? 'Analysis Ready' : 'Ready'}
            </span>
            <span className="text-white/80 text-sm font-medium drop-shadow-md">
              {media.file.name}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-black/50 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Media Container with Overlay */}
        <div className="flex-1 flex items-center justify-center p-6 overflow-hidden">
          <div
            ref={mediaContainerRef}
            className="relative max-w-full max-h-full rounded-lg overflow-hidden shadow-2xl ring-1 ring-white/10"
          >
            {media.type === MediaType.VIDEO ? (
              <video
                ref={videoRef}
                src={media.previewUrl}
                controls
                className="max-h-[80vh] w-auto object-contain bg-black"
                autoPlay
                loop
                muted
              />
            ) : (
              <img
                src={media.previewUrl}
                alt="Analysis Target"
                className="max-h-[80vh] w-auto object-contain bg-black"
              />
            )}

            {/* Video Overlay for visualizations */}
            {analysis?.visualizations && overlayDimensions.width > 0 && (
              <VideoOverlay
                specs={analysis.visualizations}
                containerWidth={overlayDimensions.width}
                containerHeight={overlayDimensions.height}
              />
            )}

            {/* Scan lines effect (visual polish) */}
            <div className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
          </div>
        </div>

        {/* Metadata Footer */}
        <div className="h-14 border-t border-white/10 bg-slate-900/50 backdrop-blur text-slate-400 text-xs flex items-center px-6 gap-6">
          <div className="flex items-center gap-2">
            <PlayCircle size={14} className="text-indigo-400" />
            <span>Source: {media.type}</span>
          </div>
          <div className="w-px h-4 bg-white/10"></div>
          <div>
            Size: {(media.file.size / (1024 * 1024)).toFixed(2)} MB
          </div>
        </div>
      </div>

      {/* Tactics Panel (Sidebar) */}
      <div className="w-[400px] border-l border-white/5 bg-slate-900 shadow-2xl z-20 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-white text-sm">Tactical Analysis</h2>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                <span className="text-xs text-slate-400">Gemini Vision</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4">
          {!analysis && !isAnalyzing && (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-indigo-600/20 flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8 text-indigo-400" />
              </div>
              <h3 className="text-white font-medium mb-2">Ready to Analyze</h3>
              <p className="text-slate-400 text-sm mb-6 max-w-[280px]">
                Click the button below to analyze the current frame for formations, player positions, and tactics.
              </p>
              <button
                onClick={handleAnalyze}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2"
              >
                <Sparkles size={18} />
                Analyze Play
              </button>
            </div>
          )}

          {isAnalyzing && (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-indigo-600/20 flex items-center justify-center mb-4 animate-pulse">
                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
              </div>
              <h3 className="text-white font-medium mb-2">Analyzing Frame...</h3>
              <p className="text-slate-400 text-sm">
                Detecting players, formations, and tactics
              </p>
            </div>
          )}

          {analysis && !isAnalyzing && (
            <div className="space-y-4">
              {/* Analysis Text */}
              <div className="prose prose-invert prose-sm max-w-none prose-p:my-2 prose-headings:text-indigo-300 prose-strong:text-indigo-200 prose-code:bg-slate-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-ul:my-2 prose-li:my-0">
                <ReactMarkdown>{analysis.text}</ReactMarkdown>
              </div>

              {/* Re-analyze button */}
              <div className="pt-4 border-t border-slate-800">
                <button
                  onClick={handleAnalyze}
                  className="w-full px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Sparkles size={16} />
                  Re-analyze Current Frame
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalysisView;