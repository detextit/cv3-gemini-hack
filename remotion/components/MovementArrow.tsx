import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { MovementArrow as MovementArrowType } from '../../types';
import { courtToPixels } from '../utils/courtCoordinates';
import { drawProgress, staggerDelay } from '../utils/animations';

interface MovementArrowProps {
  arrow: MovementArrowType;
  courtWidth: number;
  courtHeight: number;
  index?: number;
  animate?: boolean;
}

/**
 * Animated movement arrow component
 */
export const MovementArrow: React.FC<MovementArrowProps> = ({
  arrow,
  courtWidth,
  courtHeight,
  index = 0,
  animate = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const from = courtToPixels(arrow.from, courtWidth, courtHeight);
  const to = courtToPixels(arrow.to, courtWidth, courtHeight);

  // Calculate arrow geometry
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);

  // Animation
  const delay = staggerDelay(index, 5) + 15; // Start after players appear
  const progress = animate ? drawProgress(frame, fps, delay, 20) : 1;

  // Arrowhead size
  const arrowHeadLength = 12;
  const arrowHeadWidth = 8;

  // Calculate current endpoint based on animation progress
  const currentLength = length * progress;
  const currentEndX = from.x + Math.cos(angle) * currentLength;
  const currentEndY = from.y + Math.sin(angle) * currentLength;

  // Arrowhead points
  const arrowTipX = currentEndX;
  const arrowTipY = currentEndY;
  const arrowBaseX = currentEndX - Math.cos(angle) * arrowHeadLength;
  const arrowBaseY = currentEndY - Math.sin(angle) * arrowHeadLength;
  const arrowLeft = {
    x: arrowBaseX - Math.sin(angle) * arrowHeadWidth / 2,
    y: arrowBaseY + Math.cos(angle) * arrowHeadWidth / 2,
  };
  const arrowRight = {
    x: arrowBaseX + Math.sin(angle) * arrowHeadWidth / 2,
    y: arrowBaseY - Math.cos(angle) * arrowHeadWidth / 2,
  };

  const color = arrow.color || '#22c55e';
  const opacity = interpolate(progress, [0, 0.1, 1], [0, 1, 1]);

  return (
    <g opacity={opacity}>
      {/* Arrow line */}
      <line
        x1={from.x}
        y1={from.y}
        x2={currentEndX - Math.cos(angle) * arrowHeadLength}
        y2={currentEndY - Math.sin(angle) * arrowHeadLength}
        stroke={color}
        strokeWidth={3}
        strokeDasharray={arrow.dashed ? '8,4' : undefined}
        strokeLinecap="round"
      />

      {/* Arrowhead */}
      {progress > 0.5 && (
        <polygon
          points={`${arrowTipX},${arrowTipY} ${arrowLeft.x},${arrowLeft.y} ${arrowRight.x},${arrowRight.y}`}
          fill={color}
        />
      )}

      {/* Label */}
      {arrow.label && progress > 0.8 && (
        <text
          x={(from.x + to.x) / 2}
          y={(from.y + to.y) / 2 - 10}
          textAnchor="middle"
          fill="white"
          fontSize={11}
          fontWeight="bold"
          fontFamily="system-ui, sans-serif"
          style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
        >
          {arrow.label}
        </text>
      )}
    </g>
  );
};

interface MovementArrowsProps {
  arrows: MovementArrowType[];
  courtWidth: number;
  courtHeight: number;
  animate?: boolean;
}

/**
 * Render multiple movement arrows
 */
export const MovementArrows: React.FC<MovementArrowsProps> = ({
  arrows,
  courtWidth,
  courtHeight,
  animate = true,
}) => {
  return (
    <g>
      {arrows.map((arrow, index) => (
        <MovementArrow
          key={arrow.id}
          arrow={arrow}
          courtWidth={courtWidth}
          courtHeight={courtHeight}
          index={index}
          animate={animate}
        />
      ))}
    </g>
  );
};
