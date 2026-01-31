import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { SpacingMetric } from '../../types';
import { courtToPixels } from '../utils/courtCoordinates';
import { getSpacingColor } from '../utils/colors';
import { drawProgress, staggerDelay } from '../utils/animations';

interface DistanceLineProps {
  metric: SpacingMetric;
  courtWidth: number;
  courtHeight: number;
  index?: number;
  animate?: boolean;
}

/**
 * Animated distance/spacing line with label
 */
export const DistanceLine: React.FC<DistanceLineProps> = ({
  metric,
  courtWidth,
  courtHeight,
  index = 0,
  animate = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const from = courtToPixels(metric.from, courtWidth, courtHeight);
  const to = courtToPixels(metric.to, courtWidth, courtHeight);

  // Animation
  const delay = staggerDelay(index, 4) + 20;
  const progress = animate ? drawProgress(frame, fps, delay, 25) : 1;
  const opacity = interpolate(progress, [0, 0.1, 1], [0, 1, 1]);

  // Calculate current endpoint based on animation progress
  const currentX = from.x + (to.x - from.x) * progress;
  const currentY = from.y + (to.y - from.y) * progress;

  // Midpoint for label
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;

  const color = getSpacingColor(metric.isOptimal);

  return (
    <g opacity={opacity}>
      {/* Line */}
      <line
        x1={from.x}
        y1={from.y}
        x2={currentX}
        y2={currentY}
        stroke={color}
        strokeWidth={2}
        strokeDasharray="6,3"
      />

      {/* Endpoint markers */}
      <circle cx={from.x} cy={from.y} r={4} fill={color} />
      {progress > 0.9 && (
        <circle cx={to.x} cy={to.y} r={4} fill={color} />
      )}

      {/* Distance label */}
      {progress > 0.7 && (
        <g>
          <rect
            x={midX - 25}
            y={midY - 12}
            width={50}
            height={24}
            fill="rgba(0,0,0,0.8)"
            rx={4}
          />
          <text
            x={midX}
            y={midY + 4}
            textAnchor="middle"
            fill="white"
            fontSize={12}
            fontWeight="bold"
            fontFamily="system-ui, sans-serif"
          >
            {metric.distance.toFixed(1)}ft
          </text>
        </g>
      )}

      {/* Custom label */}
      {metric.label && progress > 0.9 && (
        <text
          x={midX}
          y={midY + 24}
          textAnchor="middle"
          fill={color}
          fontSize={10}
          fontFamily="system-ui, sans-serif"
        >
          {metric.label}
        </text>
      )}
    </g>
  );
};

interface DistanceLinesProps {
  metrics: SpacingMetric[];
  courtWidth: number;
  courtHeight: number;
  animate?: boolean;
}

/**
 * Render multiple distance lines
 */
export const DistanceLines: React.FC<DistanceLinesProps> = ({
  metrics,
  courtWidth,
  courtHeight,
  animate = true,
}) => {
  return (
    <g>
      {metrics.map((metric, index) => (
        <DistanceLine
          key={metric.id}
          metric={metric}
          courtWidth={courtWidth}
          courtHeight={courtHeight}
          index={index}
          animate={animate}
        />
      ))}
    </g>
  );
};
