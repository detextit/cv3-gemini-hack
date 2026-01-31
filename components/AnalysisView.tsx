import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MediaAsset, MediaType, VisualizationSpec, PlayDiagramSpec, AgentEvent, ThinkingStep, OverlayData } from '../types';
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
  onAnalyze: (callback: (event: AgentEvent) => void) => Promise<AnalysisResult | null>;
}

// Helper to merge overlay data into accumulated spec
function mergeOverlayIntoSpec(current: PlayDiagramSpec, overlay: OverlayData): PlayDiagramSpec {
  return {
    ...current,
    attackLines: [...(current.attackLines || []), ...(overlay.attackLines || [])],
    defenseLines: [...(current.defenseLines || []), ...(overlay.defenseLines || [])],
    movementPaths: [...(current.movementPaths || []), ...(overlay.movementPaths || [])],
    zones: [...(current.zones || []), ...(overlay.zones || [])],
    annotations: [...(current.annotations || []), ...(overlay.annotations || [])],
  };
}

const AnalysisView: React.FC<AnalysisViewProps> = ({ media, onClose, videoRef, onAnalyze }) => {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [overlayDimensions, setOverlayDimensions] = useState({ width: 0, height: 0 });
  const mediaContainerRef = useRef<HTMLDivElement>(null);

  // Agentic state - accumulated overlay and thinking steps
  const [accumulatedOverlay, setAccumulatedOverlay] = useState<PlayDiagramSpec>({
    type: 'play_diagram',
    title: 'Analysis',
    attackLines: [],
    defenseLines: [],
    movementPaths: [],
    zones: [],
    annotations: [],
  });
  const [thinkingSteps, setThinkingSteps] = useState<ThinkingStep[]>([]);
  const [currentStage, setCurrentStage] = useState<string | null>(null);

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

  // Callback handler for agentic events
  const handleAgentEvent = useCallback((event: AgentEvent) => {
    if (event.type === 'tool_call') {
      const { args } = event;

      // Merge new overlay elements into accumulated state
      if (args.overlay) {
        setAccumulatedOverlay(prev => mergeOverlayIntoSpec(prev, args.overlay));
      }

      // Update current stage
      if (args.stage) {
        setCurrentStage(args.stage);
      }

      // Append thinking step to progress list
      setThinkingSteps(prev => [
        ...prev,
        {
          id: args.id,
          thinking: args.thinking,
          stage: args.stage,
        }
      ]);
    }
  }, []);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setAnalysis(null);
    // Reset agentic state
    setAccumulatedOverlay({
      type: 'play_diagram',
      title: 'Analysis',
      attackLines: [],
      defenseLines: [],
      movementPaths: [],
      zones: [],
      annotations: [],
    });
    setThinkingSteps([]);
    setCurrentStage(null);

    try {
      const result = await onAnalyze(handleAgentEvent);
      setAnalysis(result);
    } catch (error) {
      console.error('Analysis failed:', error);
      setAnalysis({ text: 'Analysis failed. Please try again.' });
    } finally {
      setIsAnalyzing(false);
      setCurrentStage(null);
    }
  };

  // Get human-readable stage title
  const getStageTitle = (stage: string | null): string => {
    switch (stage) {
      case 'capture': return 'Capturing frame';
      case 'think': return 'Thinking';
      case 'diagram': return 'Diagramming';
      case 'finalize': return 'Finalizing';
      default: return 'Analyzing';
    }
  };

  // Check if we have any overlay elements to show
  const hasOverlayElements = accumulatedOverlay.attackLines?.length ||
    accumulatedOverlay.defenseLines?.length ||
    accumulatedOverlay.movementPaths?.length ||
    accumulatedOverlay.zones?.length ||
    accumulatedOverlay.annotations?.length;

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

            {/* Show accumulated overlay during analysis (real-time updates) */}
            {isAnalyzing && hasOverlayElements && overlayDimensions.width > 0 && (
              <VideoOverlay
                specs={[accumulatedOverlay]}
                containerWidth={overlayDimensions.width}
                containerHeight={overlayDimensions.height}
              />
            )}

            {/* Show final overlay after analysis completes */}
            {!isAnalyzing && analysis?.visualizations && overlayDimensions.width > 0 && (
              <VideoOverlay
                specs={analysis.visualizations}
                containerWidth={overlayDimensions.width}
                containerHeight={overlayDimensions.height}
              />
            )}

            {/* Compact analyzing indicator - positioned in corner so overlay is visible */}
            {isAnalyzing && (
              <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-700/60 bg-slate-950/80 shadow-lg shadow-black/40 animate-in fade-in slide-in-from-top-2 duration-300">
                <Loader2 className="w-4 h-4 text-slate-200 animate-spin" />
                <span className="text-sm font-medium text-slate-100">
                  {getStageTitle(currentStage)}
                </span>
              </div>
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
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-slate-300 animate-spin" />
                <h3 className="text-slate-100 font-medium">Analyzing...</h3>
              </div>

              {/* Thinking steps progress */}
              {thinkingSteps.length > 0 && (
                <div className="space-y-2">
                  {thinkingSteps.map((step, index) => (
                    <div
                      key={step.id}
                      className="flex items-start gap-2 text-sm animate-in fade-in slide-in-from-left-2 duration-200"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${
                        step.stage === 'capture' ? 'bg-yellow-400' :
                        step.stage === 'think' ? 'bg-blue-400' :
                        step.stage === 'diagram' ? 'bg-green-400' :
                        step.stage === 'finalize' ? 'bg-purple-400' :
                        'bg-slate-400'
                      }`} />
                      <p className="text-slate-300">{step.thinking}</p>
                    </div>
                  ))}
                </div>
              )}

              {thinkingSteps.length === 0 && (
                <p className="text-slate-400 text-sm">Processing image...</p>
              )}
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
