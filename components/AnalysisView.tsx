import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MediaAsset, MediaType, VisualizationSpec, PlayDiagramSpec, AgentEvent, ThinkingStep, OverlayData } from '../types';
import { Loader2, Scan, Command, FileText } from 'lucide-react';
import { VideoOverlay } from './VideoOverlay';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from './ui/drawer';

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
  const mediaWrapperRef = useRef<HTMLDivElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

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

  // Update overlay dimensions when media element changes
  useEffect(() => {
    const updateDimensions = () => {
      // Get the actual video/img element dimensions
      const video = videoRef?.current;
      const img = mediaWrapperRef.current?.querySelector('img');
      const mediaEl = video || img;

      if (mediaEl) {
        setOverlayDimensions({
          width: mediaEl.clientWidth,
          height: mediaEl.clientHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);

    // Also update when video loads
    const video = videoRef?.current;
    if (video) {
      video.addEventListener('loadedmetadata', updateDimensions);
      video.addEventListener('resize', updateDimensions);
    }

    // Poll a few times to catch late layout updates
    const timeouts = [100, 300, 500].map(ms =>
      setTimeout(updateDimensions, ms)
    );

    return () => {
      window.removeEventListener('resize', updateDimensions);
      if (video) {
        video.removeEventListener('loadedmetadata', updateDimensions);
        video.removeEventListener('resize', updateDimensions);
      }
      timeouts.forEach(clearTimeout);
    };
  }, [videoRef]);

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + Enter to analyze
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!isAnalyzing) {
          handleAnalyze();
        }
      }
      // Escape to close
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAnalyzing, onClose]);

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
      case 'diagram': return 'Diagramming play';
      case 'think': return 'Analyzing';
      case 'finalize': return 'Finalizing';
      default: return 'Processing';
    }
  };

  

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

  // Check if we have any overlay elements to show
  const hasOverlayElements = accumulatedOverlay.attackLines?.length ||
    accumulatedOverlay.defenseLines?.length ||
    accumulatedOverlay.movementPaths?.length ||
    accumulatedOverlay.zones?.length ||
    accumulatedOverlay.annotations?.length;

  // Detect if user is on Mac for keyboard shortcut display
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  return (
    <div className="flex h-full flex-col overflow-hidden animate-in fade-in duration-300">
      {/* Header with centered branding */}
      <div className="h-10 px-4 flex items-center justify-center border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-sm shrink-0 relative">
        <h1 className="text-sm font-semibold tracking-tight text-slate-200">detextit</h1>
        <button
          onClick={onClose}
          className="absolute right-4 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          title="Close (Esc)"
        >
          Close
        </button>
      </div>

      {/* Full-height video area - using all available space */}
      <div className="flex-1 flex items-center justify-center bg-black relative overflow-hidden min-h-0">
        {/* Wrapper that sizes to the actual media - full width */}
        <div ref={mediaWrapperRef} className="relative w-full h-full flex items-center justify-center">
          {media.type === MediaType.VIDEO ? (
            <video
              ref={videoRef}
              src={media.previewUrl}
              controls
              className="w-full max-h-full object-contain block"
              autoPlay
              loop
              muted
            />
          ) : (
            <img
              src={media.previewUrl}
              alt="Analysis Target"
              className="w-full max-h-full object-contain block"
            />
          )}

          {/* Pulsing grid processing effect - shows during analysis before model responds */}
          {isAnalyzing && !hasOverlayElements && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 via-transparent to-emerald-500/5 animate-pulse" />
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage: `
                    linear-gradient(rgba(16, 185, 129, 0.3) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(16, 185, 129, 0.3) 1px, transparent 1px)
                  `,
                  backgroundSize: '40px 40px',
                  animation: 'pulse 2s ease-in-out infinite'
                }}
              />
              <div className="relative px-6 py-3 rounded-xl bg-slate-950/80 border border-emerald-500/30 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-sm font-medium text-emerald-300">Processing frame...</span>
                </div>
              </div>
            </div>
          )}

          {/* Overlay container - positioned exactly over the media element */}
          {isAnalyzing && hasOverlayElements && overlayDimensions.width > 0 && (
            <div className="absolute inset-0">
              <VideoOverlay
                specs={[accumulatedOverlay]}
                containerWidth={overlayDimensions.width}
                containerHeight={overlayDimensions.height}
              />
            </div>
          )}

          {/* Show final overlay after analysis completes */}
          {!isAnalyzing && analysis?.visualizations && overlayDimensions.width > 0 && (
            <div className="absolute inset-0">
              <VideoOverlay
                specs={analysis.visualizations}
                containerWidth={overlayDimensions.width}
                containerHeight={overlayDimensions.height}
              />
            </div>
          )}

          {/* Analyzing indicator - corner badge (only when we have overlay elements) */}
          {isAnalyzing && hasOverlayElements && (
            <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-700/60 bg-slate-950/90 shadow-lg shadow-black/40 animate-in fade-in slide-in-from-top-2 duration-300">
              <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
              <span className="text-sm font-medium text-slate-100">
                {getStageTitle(currentStage)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Footer with Centered Analyze Button and Copyright */}
      <div className="h-14 px-4 flex items-center justify-center border-t border-slate-800/50 bg-slate-950/80 backdrop-blur-sm shrink-0 relative">
        {/* Copyright - absolute positioned left */}
        <div className="absolute left-4 text-[10px] text-slate-600">
          © detextit
        </div>

        {/* Centered Button Group */}
        <div className="flex items-center gap-2">
          {/* Analyze Button */}
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="flex items-center gap-3 px-5 py-2 text-sm font-medium rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-900/30"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <Scan className="w-4 h-4" />
                <span>{analysis ? 'Analyze Again' : 'Analyze Frame'}</span>
                <span className="hidden sm:flex items-center gap-1 text-xs text-emerald-200/70 border-l border-emerald-500/50 pl-3">
                  {isMac ? (
                    <>
                      <Command className="w-3 h-3" />
                      <span>↵</span>
                    </>
                  ) : (
                    <span>Ctrl+↵</span>
                  )}
                </span>
              </>
            )}
          </button>

          {/* View Analysis Button - only show when we have analysis */}
          {analysis && (
            <button
              onClick={() => setDrawerOpen(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all shadow-lg shadow-black/30"
            >
              <FileText className="w-4 h-4" />
              <span>View Analysis</span>
            </button>
          )}
        </div>

        {/* File info - absolute positioned right */}
        <div className="absolute right-4 flex items-center gap-3 text-[10px] text-slate-600">
          <span>{(media.file.size / (1024 * 1024)).toFixed(1)} MB</span>
        </div>
      </div>

      {/* Analysis Drawer */}
      <Drawer direction="right" open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Analysis Results</DrawerTitle>
            <DrawerDescription>AI-generated analysis of the current frame</DrawerDescription>
          </DrawerHeader>
          <div className="no-scrollbar overflow-y-auto px-4 flex-1">
            <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
              {analysis?.text || 'No analysis available.'}
            </p>
          </div>
          <DrawerFooter>
            <DrawerClose asChild>
              <button className="w-full py-2 px-4 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors">
                Close
              </button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
};

export default AnalysisView;
