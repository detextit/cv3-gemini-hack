import React, { useState, useRef, useEffect } from 'react';
import { MediaAsset, MediaType, VisualizationSpec } from '../types';
import { Loader2 } from 'lucide-react';
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

  const statusLabel = isAnalyzing ? 'Analyzing' : analysis ? 'Ready' : 'Idle';

  return (
    <div className="flex h-full flex-col md:flex-row overflow-hidden animate-in fade-in duration-300">
      <div className="flex-1 flex flex-col border-b md:border-b-0 md:border-r border-slate-800">
        <div className="px-4 py-3 flex items-center justify-between border-b border-slate-800">
          <div className="min-w-0">
            <p className="text-sm text-slate-200 truncate">{media.file.name}</p>
            <p className="text-xs text-slate-400">{statusLabel}</p>
          </div>
          <button
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            Close
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center p-4 bg-black/20">
          <div ref={mediaContainerRef} className="relative max-w-full max-h-full">
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

            {analysis?.visualizations && overlayDimensions.width > 0 && (
              <VideoOverlay
                specs={analysis.visualizations}
                containerWidth={overlayDimensions.width}
                containerHeight={overlayDimensions.height}
              />
            )}
          </div>
        </div>

        <div className="px-4 py-3 text-xs text-slate-400 flex items-center gap-4 border-t border-slate-800">
          <span>Type: {media.type}</span>
          <span>Size: {(media.file.size / (1024 * 1024)).toFixed(2)} MB</span>
        </div>
      </div>

      <div className="w-full md:w-96 flex flex-col bg-slate-950">
        <div className="px-4 py-3 border-b border-slate-800">
          <h2 className="text-sm font-semibold text-slate-100">Analysis</h2>
          <p className="text-xs text-slate-400">Analyze the current frame.</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {!analysis && !isAnalyzing && (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <h3 className="text-slate-100 font-medium mb-2">Ready</h3>
              <p className="text-slate-400 text-sm mb-6 max-w-[280px]">
                Click analyze to generate a summary of the current frame.
              </p>
              <button
                onClick={handleAnalyze}
                className="px-4 py-2 bg-slate-100 text-slate-900 text-sm font-medium rounded-md hover:bg-white transition-colors"
              >
                Analyze
              </button>
            </div>
          )}

          {isAnalyzing && (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <Loader2 className="w-6 h-6 text-slate-300 animate-spin mb-3" />
              <h3 className="text-slate-100 font-medium mb-1">Analyzing...</h3>
              <p className="text-slate-400 text-sm">This may take a few seconds.</p>
            </div>
          )}

          {analysis && !isAnalyzing && (
            <div className="space-y-4">
              <div className="prose prose-invert prose-sm max-w-none prose-p:my-2 prose-headings:text-slate-200 prose-strong:text-slate-100 prose-code:bg-slate-900 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-ul:my-2 prose-li:my-0">
                <ReactMarkdown>{analysis.text}</ReactMarkdown>
              </div>

              <div className="pt-4 border-t border-slate-800 space-y-2">
                {analysis.visualizations && analysis.visualizations.length > 0 && (
                  <button
                    onClick={() => setAnalysis({ ...analysis, visualizations: undefined })}
                    className="w-full px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 text-sm font-medium rounded-md transition-colors"
                  >
                    Clear overlays
                  </button>
                )}
                <button
                  onClick={handleAnalyze}
                  className="w-full px-4 py-2 bg-slate-100 hover:bg-white text-slate-900 text-sm font-medium rounded-md transition-colors"
                >
                  Analyze again
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
