import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { BoundingBox as BoundingBoxType } from '../../types';
import { getTeamColor } from '../utils/colors';
import { scaleEntrance, staggerDelay } from '../utils/animations';

interface BoundingBoxProps {
  box: BoundingBoxType;
  containerWidth: number;
  containerHeight: number;
  index?: number;
  animate?: boolean;
}

/**
 * Animated bounding box component for video overlay
 */
export const BoundingBox: React.FC<BoundingBoxProps> = ({
  box,
  containerWidth,
  containerHeight,
  index = 0,
  animate = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Convert normalized coordinates to pixels
  const x = (box.x / 100) * containerWidth;
  const y = (box.y / 100) * containerHeight;
  const width = (box.width / 100) * containerWidth;
  const height = (box.height / 100) * containerHeight;

  // Animation
  const delay = staggerDelay(index, 2);
  const scale = animate ? scaleEntrance(frame, fps, delay) : 1;
  const opacity = interpolate(scale, [0, 1], [0, 0.9]);

  // Color based on team
  const color = box.team ? getTeamColor(box.team) : '#22c55e';

  return (
    <g opacity={opacity}>
      {/* Bounding box */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="none"
        stroke={color}
        strokeWidth={3}
        rx={4}
      />

      {/* Corner brackets for style */}
      <CornerBrackets
        x={x}
        y={y}
        width={width}
        height={height}
        color={color}
        size={12}
      />

      {/* Label background */}
      {box.label && (
        <g>
          <rect
            x={x}
            y={y - 24}
            width={box.label.length * 8 + 16}
            height={20}
            fill={color}
            rx={4}
          />
          <text
            x={x + 8}
            y={y - 10}
            fill="white"
            fontSize={12}
            fontWeight="bold"
            fontFamily="system-ui, sans-serif"
          >
            {box.label}
            {box.confidence !== undefined && ` ${Math.round(box.confidence * 100)}%`}
          </text>
        </g>
      )}
    </g>
  );
};

interface CornerBracketsProps {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  size: number;
}

const CornerBrackets: React.FC<CornerBracketsProps> = ({
  x,
  y,
  width,
  height,
  color,
  size,
}) => {
  const strokeWidth = 3;

  return (
    <g stroke={color} strokeWidth={strokeWidth} fill="none">
      {/* Top-left */}
      <path d={`M ${x} ${y + size} L ${x} ${y} L ${x + size} ${y}`} />
      {/* Top-right */}
      <path d={`M ${x + width - size} ${y} L ${x + width} ${y} L ${x + width} ${y + size}`} />
      {/* Bottom-left */}
      <path d={`M ${x} ${y + height - size} L ${x} ${y + height} L ${x + size} ${y + height}`} />
      {/* Bottom-right */}
      <path d={`M ${x + width - size} ${y + height} L ${x + width} ${y + height} L ${x + width} ${y + height - size}`} />
    </g>
  );
};

interface BoundingBoxesProps {
  boxes: BoundingBoxType[];
  containerWidth: number;
  containerHeight: number;
  animate?: boolean;
}

/**
 * Render multiple bounding boxes
 */
export const BoundingBoxes: React.FC<BoundingBoxesProps> = ({
  boxes,
  containerWidth,
  containerHeight,
  animate = true,
}) => {
  return (
    <g>
      {boxes.map((box, index) => (
        <BoundingBox
          key={box.id}
          box={box}
          containerWidth={containerWidth}
          containerHeight={containerHeight}
          index={index}
          animate={animate}
        />
      ))}
    </g>
  );
};
