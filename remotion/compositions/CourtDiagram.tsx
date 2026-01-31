import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { CourtDiagramSpec } from '../../types';
import { BasketballCourt, PlayerDots, MovementArrows } from '../components';
import { opacityEntrance } from '../utils/animations';

interface CourtDiagramProps {
  spec: CourtDiagramSpec;
}

/**
 * Court diagram composition for formations and plays
 */
export const CourtDiagram: React.FC<CourtDiagramProps> = ({ spec }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Court dimensions (16:9 aspect ratio for half-court)
  const courtWidth = width * 0.85;
  const courtHeight = height * 0.85;
  const courtX = (width - courtWidth) / 2;
  const courtY = (height - courtHeight) / 2 + 20;

  // Title animation
  const titleOpacity = opacityEntrance(frame, fps, 0, 10);

  return (
    <AbsoluteFill style={{ backgroundColor: '#1e293b' }}>
      {/* Title */}
      {spec.title && (
        <div
          style={{
            position: 'absolute',
            top: 20,
            left: 0,
            right: 0,
            textAlign: 'center',
            color: 'white',
            fontSize: 28,
            fontWeight: 'bold',
            fontFamily: 'system-ui, sans-serif',
            opacity: titleOpacity,
            textShadow: '0 2px 4px rgba(0,0,0,0.5)',
          }}
        >
          {spec.title}
        </div>
      )}

      {/* Formation label */}
      {spec.formationLabel && (
        <div
          style={{
            position: 'absolute',
            top: spec.title ? 60 : 20,
            left: 0,
            right: 0,
            textAlign: 'center',
            color: '#94a3b8',
            fontSize: 16,
            fontFamily: 'system-ui, sans-serif',
            opacity: titleOpacity,
          }}
        >
          {spec.formationLabel}
        </div>
      )}

      {/* Court container */}
      <div
        style={{
          position: 'absolute',
          left: courtX,
          top: courtY,
          width: courtWidth,
          height: courtHeight,
          borderRadius: 8,
          overflow: 'hidden',
          boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
        }}
      >
        {/* Basketball court */}
        <BasketballCourt width={courtWidth} height={courtHeight} />

        {/* SVG overlay for players and arrows */}
        <svg
          width={courtWidth}
          height={courtHeight}
          style={{ position: 'absolute', top: 0, left: 0 }}
        >
          {/* Movement arrows (rendered first, behind players) */}
          {spec.arrows && spec.arrows.length > 0 && (
            <MovementArrows
              arrows={spec.arrows}
              courtWidth={courtWidth}
              courtHeight={courtHeight}
              animate={true}
            />
          )}

          {/* Players */}
          <PlayerDots
            players={spec.players}
            courtWidth={courtWidth}
            courtHeight={courtHeight}
            animate={true}
          />

          {/* Annotations */}
          {spec.annotations?.map((annotation, index) => {
            const x = (annotation.position.x / 100) * courtWidth;
            const y = (annotation.position.y / 100) * courtHeight;
            const opacity = interpolate(
              frame - (30 + index * 3),
              [0, 10],
              [0, 1],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
            );

            return (
              <g key={annotation.id} opacity={opacity}>
                <rect
                  x={x - 40}
                  y={y - 12}
                  width={80}
                  height={24}
                  fill="rgba(0,0,0,0.8)"
                  rx={4}
                />
                <text
                  x={x}
                  y={y + 4}
                  textAnchor="middle"
                  fill={annotation.color || '#22c55e'}
                  fontSize={12}
                  fontWeight="bold"
                  fontFamily="system-ui, sans-serif"
                >
                  {annotation.text}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div
        style={{
          position: 'absolute',
          bottom: 20,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          gap: 30,
          opacity: interpolate(frame, [20, 35], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
        }}
      >
        <LegendItem color="#ef4444" label="Offense" />
        <LegendItem color="#3b82f6" label="Defense" />
      </div>
    </AbsoluteFill>
  );
};

const LegendItem: React.FC<{ color: string; label: string }> = ({ color, label }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      color: '#94a3b8',
      fontSize: 14,
      fontFamily: 'system-ui, sans-serif',
    }}
  >
    <div
      style={{
        width: 16,
        height: 16,
        borderRadius: '50%',
        backgroundColor: color,
      }}
    />
    {label}
  </div>
);
