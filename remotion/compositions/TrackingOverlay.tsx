import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { TrackingOverlaySpec } from '../../types';
import { BoundingBoxes } from '../components';

interface TrackingOverlayProps {
  spec: TrackingOverlaySpec;
  frameImage?: string; // Optional base64 background image
}

/**
 * Tracking overlay composition for bounding boxes on video frames
 */
export const TrackingOverlay: React.FC<TrackingOverlayProps> = ({ spec, frameImage }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Count by team
  const homePlayers = spec.boundingBoxes.filter(b => b.team === 'home').length;
  const awayPlayers = spec.boundingBoxes.filter(b => b.team === 'away').length;
  const totalDetections = spec.boundingBoxes.length;

  // Stats animation
  const statsOpacity = interpolate(
    frame,
    [10, 25],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return (
    <AbsoluteFill style={{ backgroundColor: '#0f172a' }}>
      {/* Background image if provided */}
      {frameImage && (
        <img
          src={frameImage.startsWith('data:') ? frameImage : `data:image/jpeg;base64,${frameImage}`}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
          }}
          alt="Video frame"
        />
      )}

      {/* Fallback gradient background */}
      {!frameImage && (
        <div
          style={{
            width: '100%',
            height: '100%',
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          }}
        />
      )}

      {/* Bounding boxes overlay */}
      <svg
        width={width}
        height={height}
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        <BoundingBoxes
          boxes={spec.boundingBoxes}
          containerWidth={width}
          containerHeight={height}
          animate={true}
        />
      </svg>

      {/* Detection stats overlay */}
      <div
        style={{
          position: 'absolute',
          top: 20,
          left: 20,
          backgroundColor: 'rgba(0,0,0,0.8)',
          borderRadius: 8,
          padding: '12px 16px',
          opacity: statsOpacity,
        }}
      >
        <div
          style={{
            color: '#94a3b8',
            fontSize: 12,
            marginBottom: 8,
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          PLAYER DETECTION
        </div>
        <div
          style={{
            display: 'flex',
            gap: 20,
          }}
        >
          <StatItem label="Total" value={totalDetections} color="white" />
          {homePlayers > 0 && (
            <StatItem
              label="Home"
              value={homePlayers}
              color={spec.teamColors?.home || '#ef4444'}
            />
          )}
          {awayPlayers > 0 && (
            <StatItem
              label="Away"
              value={awayPlayers}
              color={spec.teamColors?.away || '#3b82f6'}
            />
          )}
        </div>
      </div>

      {/* Timestamp indicator */}
      <div
        style={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          backgroundColor: 'rgba(0,0,0,0.8)',
          borderRadius: 4,
          padding: '6px 12px',
          opacity: statsOpacity,
        }}
      >
        <span
          style={{
            color: '#22c55e',
            fontSize: 14,
            fontFamily: 'monospace',
          }}
        >
          ● LIVE TRACKING
        </span>
      </div>
    </AbsoluteFill>
  );
};

const StatItem: React.FC<{ label: string; value: number; color: string }> = ({
  label,
  value,
  color,
}) => (
  <div style={{ textAlign: 'center' }}>
    <div
      style={{
        color,
        fontSize: 24,
        fontWeight: 'bold',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {value}
    </div>
    <div
      style={{
        color: '#64748b',
        fontSize: 11,
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {label}
    </div>
  </div>
);
