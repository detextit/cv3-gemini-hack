import React from 'react';
import { COURT_COLORS } from '../utils/colors';
import { COURT } from '../utils/courtCoordinates';

interface BasketballCourtProps {
  width: number;
  height: number;
  showFullCourt?: boolean;
}

/**
 * SVG half-court basketball court component
 */
export const BasketballCourt: React.FC<BasketballCourtProps> = ({
  width,
  height,
  showFullCourt = false,
}) => {
  const strokeWidth = 2;
  const lineColor = COURT_COLORS.lines;

  // Scale helpers
  const scaleX = (x: number) => (x / 100) * width;
  const scaleY = (y: number) => (y / 100) * height;

  // Paint rectangle
  const paintLeft = scaleX(COURT.PAINT_LEFT);
  const paintRight = scaleX(COURT.PAINT_RIGHT);
  const paintTop = scaleY(COURT.PAINT_TOP);
  const paintWidth = paintRight - paintLeft;

  // Three-point arc
  const basketX = scaleX(COURT.BASKET_X);
  const basketY = scaleY(COURT.BASKET_Y);
  const threePointRadius = scaleX(COURT.THREE_POINT_RADIUS);

  // Free throw circle
  const ftCircleRadius = scaleX(COURT.FREE_THROW_CIRCLE_RADIUS);
  const ftLineY = scaleY(COURT.FREE_THROW_Y);

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* Court surface */}
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill={COURT_COLORS.surface}
      />

      {/* Paint/Key area */}
      <rect
        x={paintLeft}
        y={0}
        width={paintWidth}
        height={paintTop}
        fill={COURT_COLORS.paint}
        stroke={lineColor}
        strokeWidth={strokeWidth}
      />

      {/* Restricted area (semicircle near basket) */}
      <path
        d={`M ${scaleX(46)} ${basketY}
            A ${scaleX(4)} ${scaleX(4)} 0 0 1 ${scaleX(54)} ${basketY}`}
        fill="none"
        stroke={lineColor}
        strokeWidth={strokeWidth}
      />

      {/* Three-point line */}
      <path
        d={`
          M ${scaleX(COURT.THREE_POINT_CORNER_X)} 0
          L ${scaleX(COURT.THREE_POINT_CORNER_X)} ${scaleY(14)}
          A ${threePointRadius} ${threePointRadius} 0 0 0 ${scaleX(100 - COURT.THREE_POINT_CORNER_X)} ${scaleY(14)}
          L ${scaleX(100 - COURT.THREE_POINT_CORNER_X)} 0
        `}
        fill="none"
        stroke={lineColor}
        strokeWidth={strokeWidth}
      />

      {/* Free throw circle (top half) */}
      <path
        d={`M ${paintLeft} ${ftLineY}
            A ${ftCircleRadius} ${ftCircleRadius} 0 0 0 ${paintRight} ${ftLineY}`}
        fill="none"
        stroke={lineColor}
        strokeWidth={strokeWidth}
      />

      {/* Free throw circle (bottom half - dashed) */}
      <path
        d={`M ${paintLeft} ${ftLineY}
            A ${ftCircleRadius} ${ftCircleRadius} 0 0 1 ${paintRight} ${ftLineY}`}
        fill="none"
        stroke={lineColor}
        strokeWidth={strokeWidth}
        strokeDasharray="5,5"
      />

      {/* Basket */}
      <circle
        cx={basketX}
        cy={basketY}
        r={scaleX(1.5)}
        fill="none"
        stroke="#f97316"
        strokeWidth={3}
      />

      {/* Backboard */}
      <line
        x1={scaleX(44)}
        y1={scaleY(4)}
        x2={scaleX(56)}
        y2={scaleY(4)}
        stroke={lineColor}
        strokeWidth={3}
      />

      {/* Baseline */}
      <line
        x1={0}
        y1={0}
        x2={width}
        y2={0}
        stroke={lineColor}
        strokeWidth={strokeWidth}
      />

      {/* Sidelines */}
      <line
        x1={0}
        y1={0}
        x2={0}
        y2={height}
        stroke={lineColor}
        strokeWidth={strokeWidth}
      />
      <line
        x1={width}
        y1={0}
        x2={width}
        y2={height}
        stroke={lineColor}
        strokeWidth={strokeWidth}
      />

      {/* Half-court line (if full court) */}
      {showFullCourt && (
        <line
          x1={0}
          y1={height}
          x2={width}
          y2={height}
          stroke={lineColor}
          strokeWidth={strokeWidth}
        />
      )}

      {/* Center court circle (at top for half-court view) */}
      <path
        d={`M ${scaleX(38)} ${height}
            A ${scaleX(12)} ${scaleX(12)} 0 0 1 ${scaleX(62)} ${height}`}
        fill="none"
        stroke={lineColor}
        strokeWidth={strokeWidth}
      />
    </svg>
  );
};
