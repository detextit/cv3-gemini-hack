import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MediaAsset, MediaType, VisualizationSpec, PlayDiagramSpec, AgentEvent, ThinkingStep, OverlayData } from '../types';
import { Loader2 } from 'lucide-react';
import { VideoOverlay } from './VideoOverlay';
import { toast } from 'sonner';

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
  const toastIdRef = useRef<number | string | null>(null);

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
      setThinkingSteps(prev => {
        const next = [
          ...prev,
          {
            id: args.id,
            thinking: args.thinking,
            stage: args.stage,
          }
        ].slice(-20);
        return next;
      });
    }
  }, []);

  const getStageTitle = (stage: string | null): string => {
    switch (stage) {
      case 'capture': return 'Capturing frame';
      case 'think': return 'Thinking';
      case 'diagram': return 'Diagramming';
      case 'finalize': return 'Finalizing';
      default: return 'Analyzing';
    }
  };

  const buildProgressLines = (stage: string | null, steps: ThinkingStep[]): string[] => {
    const stageLine = `Stage: ${getStageTitle(stage)}`;
    const stepLines = steps.slice(-4).map(step => step.thinking);
    if (stepLines.length === 0) {
      return [stageLine, 'Processing...'];
    }
    return [stageLine, ...stepLines].slice(0, 5);
  };

  const summarizeToLines = (text: string, maxLines: number): string[] => {
    const normalized = text.replace(/\s+/g, ' ').trim();
    if (!normalized) return ['No summary available.'];
    const sentences = normalized.match(/[^.!?]+[.!?]+|[^.!?]+$/g);
    const lines = (sentences ?? [normalized]).map(line => line.trim());
    return lines.slice(0, maxLines);
  };

  const showThinkingToast = useCallback((title: string, lines: string[], duration: number) => {
    const id = toast.custom(
      (toastId) => (
        <div className="max-w-[320px] rounded-lg border border-slate-700/70 bg-slate-950/95 px-3 py-2 shadow-lg shadow-black/40">
          <div className="text-[10px] uppercase tracking-wide text-slate-400">{title}</div>
          <div className="mt-1 space-y-1">
            {lines.map((line, index) => (
              <p key={`${toastId}-${index}`} className="text-xs leading-snug text-slate-100">
                {line}
              </p>
            ))}
          </div>
        </div>
      ),
      { id: toastIdRef.current ?? undefined, duration }
    );
    toastIdRef.current = id;
  }, []);

  useEffect(() => {
    if (isAnalyzing) {
      const lines = buildProgressLines(currentStage, thinkingSteps);
      showThinkingToast('Analysis', lines, Infinity);
    }
  }, [currentStage, thinkingSteps, isAnalyzing, showThinkingToast]);

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
      showThinkingToast('Analysis', ['Stage: Preparing', 'Starting analysis...'], Infinity);
      const result = await onAnalyze(handleAgentEvent);
      setAnalysis(result);
      if (result?.text) {
        showThinkingToast('Analysis complete', summarizeToLines(result.text, 5), 6000);
      } else {
        showThinkingToast('Analysis complete', ['No summary returned.'], 4000);
      }
    } catch (error) {
      console.error('Analysis failed:', error);
      setAnalysis({ text: 'Analysis failed. Please try again.' });
      showThinkingToast('Analysis failed', ['Please try again.'], 4000);
    } finally {
      setIsAnalyzing(false);
      setCurrentStage(null);
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
    <div className="flex h-full flex-col overflow-hidden animate-in fade-in duration-300">
      <div className="flex-1 flex flex-col border-b border-slate-800">
        <div className="px-4 py-3 flex items-center justify-between border-b border-slate-800">
          <div className="min-w-0">
            <p className="text-sm text-slate-200 truncate">{media.file.name}</p>
            <p className="text-xs text-slate-400">{statusLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="px-3 py-1.5 text-xs font-medium rounded-md bg-slate-100 text-slate-900 hover:bg-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {analysis ? 'Analyze again' : 'Analyze'}
            </button>
            <button
              onClick={onClose}
              className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              Close
            </button>
          </div>
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
    </div>
  );
};

export default AnalysisView;
