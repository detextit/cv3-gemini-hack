import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { TrajectorySpec, PlayerTrajectory } from '../../types';
import { BasketballCourt } from '../components';
import { courtToPixels } from '../utils/courtCoordinates';
import { getTeamColor } from '../utils/colors';
import { drawProgress, staggerDelay } from '../utils/animations';

interface TrajectoryPlotProps {
  spec: TrajectorySpec;
}

/**
 * Trajectory plot composition for movement paths
 */
export const TrajectoryPlot: React.FC<TrajectoryPlotProps> = ({ spec }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Court dimensions
  const courtWidth = width * 0.85;
  const courtHeight = height * 0.85;
  const courtX = (width - courtWidth) / 2;
  const courtY = (height - courtHeight) / 2 + 20;

  // Title animation
  const titleOpacity = interpolate(
    frame,
    [0, 10],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

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

        {/* SVG overlay for trajectories */}
        <svg
          width={courtWidth}
          height={courtHeight}
          style={{ position: 'absolute', top: 0, left: 0 }}
        >
          {spec.trajectories.map((trajectory, index) => (
            <TrajectoryPath
              key={trajectory.id}
              trajectory={trajectory}
              courtWidth={courtWidth}
              courtHeight={courtHeight}
              index={index}
              frame={frame}
              fps={fps}
              animate={spec.animatePlayback ?? true}
            />
          ))}
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
        {spec.trajectories.map((traj) => (
          <div
            key={traj.id}
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
                width: 24,
                height: 4,
                borderRadius: 2,
                backgroundColor: getTeamColor(traj.team),
              }}
            />
            {traj.label || `Player ${traj.playerId}`}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

interface TrajectoryPathProps {
  trajectory: PlayerTrajectory;
  courtWidth: number;
  courtHeight: number;
  index: number;
  frame: number;
  fps: number;
  animate: boolean;
}

const TrajectoryPath: React.FC<TrajectoryPathProps> = ({
  trajectory,
  courtWidth,
  courtHeight,
  index,
  frame,
  fps,
  animate,
}) => {
  if (trajectory.points.length < 2) return null;

  const delay = staggerDelay(index, 8);
  const progress = animate ? drawProgress(frame, fps, delay, 60) : 1;

  const color = getTeamColor(trajectory.team);

  // Convert points to pixel coordinates
  const pixelPoints = trajectory.points.map((p) =>
    courtToPixels(p, courtWidth, courtHeight)
  );

  // Build path string up to current progress
  const totalPoints = pixelPoints.length;
  const visibleCount = Math.ceil(progress * (totalPoints - 1)) + 1;
  const visiblePoints = pixelPoints.slice(0, visibleCount);

  // Interpolate final point position
  if (visibleCount < totalPoints && progress > 0) {
    const segmentProgress = (progress * (totalPoints - 1)) % 1;
    const lastFullIndex = visibleCount - 2;
    if (lastFullIndex >= 0 && lastFullIndex < totalPoints - 1) {
      const from = pixelPoints[lastFullIndex];
      const to = pixelPoints[lastFullIndex + 1];
      visiblePoints[visiblePoints.length - 1] = {
        x: from.x + (to.x - from.x) * segmentProgress,
        y: from.y + (to.y - from.y) * segmentProgress,
      };
    }
  }

  const pathD = visiblePoints
    .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
    .join(' ');

  // Current position (animated dot)
  const currentPos = visiblePoints[visiblePoints.length - 1];

  return (
    <g>
      {/* Trail effect */}
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth={4}
        strokeOpacity={0.3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Main path */}
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Start point */}
      <circle
        cx={pixelPoints[0].x}
        cy={pixelPoints[0].y}
        r={6}
        fill={color}
        stroke="white"
        strokeWidth={2}
      />

      {/* Current position (moving dot) */}
      {currentPos && progress < 1 && (
        <circle
          cx={currentPos.x}
          cy={currentPos.y}
          r={10}
          fill={color}
          stroke="white"
          strokeWidth={3}
        />
      )}

      {/* End point (when complete) */}
      {progress >= 0.98 && (
        <g>
          <circle
            cx={pixelPoints[totalPoints - 1].x}
            cy={pixelPoints[totalPoints - 1].y}
            r={8}
            fill={color}
            stroke="white"
            strokeWidth={2}
          />
          {/* Arrow indicator at end */}
          <polygon
            points={`
              ${pixelPoints[totalPoints - 1].x},${pixelPoints[totalPoints - 1].y - 12}
              ${pixelPoints[totalPoints - 1].x - 6},${pixelPoints[totalPoints - 1].y - 4}
              ${pixelPoints[totalPoints - 1].x + 6},${pixelPoints[totalPoints - 1].y - 4}
            `}
            fill={color}
          />
        </g>
      )}
    </g>
  );
};
