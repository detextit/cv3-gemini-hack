import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { PlayerMarker, CourtPosition } from '../../types';
import { courtToPixels } from '../utils/courtCoordinates';
import { getTeamColor, getTeamStroke } from '../utils/colors';
import { scaleEntrance, pulse, staggerDelay } from '../utils/animations';

interface PlayerDotProps {
  player: PlayerMarker;
  courtWidth: number;
  courtHeight: number;
  index?: number;
  animate?: boolean;
}

/**
 * Animated player marker component
 */
export const PlayerDot: React.FC<PlayerDotProps> = ({
  player,
  courtWidth,
  courtHeight,
  index = 0,
  animate = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const { x, y } = courtToPixels(player.position, courtWidth, courtHeight);
  const color = getTeamColor(player.team);
  const strokeColor = getTeamStroke(player.team);

  // Animation values
  const delay = staggerDelay(index);
  const scale = animate ? scaleEntrance(frame, fps, delay) : 1;
  const pulseScale = player.hasBall ? pulse(frame, fps, 2) : 1;

  const dotRadius = 16;
  const labelFontSize = 11;

  return (
    <g
      transform={`translate(${x}, ${y}) scale(${scale * pulseScale})`}
      style={{ transformOrigin: 'center' }}
    >
      {/* Outer glow for ball handler */}
      {player.hasBall && (
        <circle
          cx={0}
          cy={0}
          r={dotRadius + 8}
          fill="none"
          stroke="#fbbf24"
          strokeWidth={3}
          opacity={0.6}
        />
      )}

      {/* Player dot */}
      <circle
        cx={0}
        cy={0}
        r={dotRadius}
        fill={color}
        stroke={strokeColor}
        strokeWidth={2}
      />

      {/* Jersey number or label */}
      {(player.jerseyNumber !== undefined || player.label) && (
        <text
          x={0}
          y={0}
          textAnchor="middle"
          dominantBaseline="central"
          fill="white"
          fontSize={labelFontSize}
          fontWeight="bold"
          fontFamily="system-ui, sans-serif"
        >
          {player.jerseyNumber ?? player.label}
        </text>
      )}

      {/* External label */}
      {player.label && player.jerseyNumber !== undefined && (
        <text
          x={0}
          y={dotRadius + 14}
          textAnchor="middle"
          fill="white"
          fontSize={10}
          fontFamily="system-ui, sans-serif"
          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
        >
          {player.label}
        </text>
      )}
    </g>
  );
};

interface PlayerDotsProps {
  players: PlayerMarker[];
  courtWidth: number;
  courtHeight: number;
  animate?: boolean;
}

/**
 * Render multiple player dots
 */
export const PlayerDots: React.FC<PlayerDotsProps> = ({
  players,
  courtWidth,
  courtHeight,
  animate = true,
}) => {
  return (
    <g>
      {players.map((player, index) => (
        <PlayerDot
          key={player.id}
          player={player}
          courtWidth={courtWidth}
          courtHeight={courtHeight}
          index={index}
          animate={animate}
        />
      ))}
    </g>
  );
};
