import React, { useState } from 'react';
import { Player } from '@remotion/player';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { VisualizationSpec } from '../types';
import { CourtDiagram, TrackingOverlay, TrajectoryPlot, SpacingAnalysis } from '../remotion/compositions';

interface RemotionVisualizerProps {
  specs: VisualizationSpec[];
}

// Map visualization types to their Remotion components
const COMPOSITION_MAP = {
  court_diagram: CourtDiagram,
  tracking_overlay: TrackingOverlay,
  trajectory: TrajectoryPlot,
  spacing_analysis: SpacingAnalysis,
} as const;

// Duration settings per visualization type
const DURATION_MAP = {
  court_diagram: 150,
  tracking_overlay: 150,
  trajectory: 180,
  spacing_analysis: 180,
} as const;

/**
 * Remotion Player wrapper that renders visualization specs
 * Supports pagination for multiple visualizations
 */
export const RemotionVisualizer: React.FC<RemotionVisualizerProps> = ({ specs }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!specs || specs.length === 0) {
    return null;
  }

  const currentSpec = specs[currentIndex];
  const Component = COMPOSITION_MAP[currentSpec.type];
  const duration = DURATION_MAP[currentSpec.type];

  if (!Component) {
    console.warn(`Unknown visualization type: ${currentSpec.type}`);
    return null;
  }

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : specs.length - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev < specs.length - 1 ? prev + 1 : 0));
  };

  return (
    <div className="relative rounded-lg overflow-hidden border border-white/10 shadow-lg bg-slate-900">
      {/* Header */}
      <div className="bg-slate-800 px-3 py-1.5 text-[10px] text-slate-400 flex items-center justify-between border-b border-slate-700">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span>Interactive Visualization</span>
        </div>
        {specs.length > 1 && (
          <span className="text-slate-500">
            {currentIndex + 1} / {specs.length}
          </span>
        )}
      </div>

      {/* Player */}
      <div className="relative aspect-video bg-slate-950">
        <Player
          component={Component}
          inputProps={{ spec: currentSpec }}
          durationInFrames={duration}
          fps={30}
          compositionWidth={1920}
          compositionHeight={1080}
          style={{
            width: '100%',
            height: '100%',
          }}
          controls
          loop
          autoPlay
        />
      </div>

      {/* Pagination controls (if multiple visualizations) */}
      {specs.length > 1 && (
        <>
          {/* Navigation buttons */}
          <button
            onClick={goToPrevious}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/50 hover:bg-black/70 rounded-full text-white/80 hover:text-white transition-colors"
            aria-label="Previous visualization"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/50 hover:bg-black/70 rounded-full text-white/80 hover:text-white transition-colors"
            aria-label="Next visualization"
          >
            <ChevronRight size={20} />
          </button>

          {/* Pagination dots */}
          <div className="absolute bottom-14 left-1/2 -translate-x-1/2 flex gap-1.5">
            {specs.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentIndex
                    ? 'bg-white'
                    : 'bg-white/30 hover:bg-white/50'
                }`}
                aria-label={`Go to visualization ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default RemotionVisualizer;
