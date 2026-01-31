import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { SpacingAnalysisSpec } from '../../types';
import { BasketballCourt, PlayerDots, DistanceLines } from '../components';
import { GRADE_COLORS } from '../utils/colors';
import { scaleEntrance } from '../utils/animations';

interface SpacingAnalysisProps {
  spec: SpacingAnalysisSpec;
}

/**
 * Spacing analysis composition with distance metrics and grade
 */
export const SpacingAnalysis: React.FC<SpacingAnalysisProps> = ({ spec }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Court dimensions
  const courtWidth = width * 0.75;
  const courtHeight = height * 0.80;
  const courtX = 40;
  const courtY = (height - courtHeight) / 2 + 20;

  // Grade panel dimensions
  const panelWidth = width - courtWidth - 80;
  const panelX = courtX + courtWidth + 20;

  // Animations
  const titleOpacity = interpolate(
    frame,
    [0, 10],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const gradeScale = scaleEntrance(frame, fps, 30);

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

        {/* SVG overlay */}
        <svg
          width={courtWidth}
          height={courtHeight}
          style={{ position: 'absolute', top: 0, left: 0 }}
        >
          {/* Distance lines (rendered first, behind players) */}
          {spec.spacingMetrics && (
            <DistanceLines
              metrics={spec.spacingMetrics}
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
        </svg>
      </div>

      {/* Grade and metrics panel */}
      <div
        style={{
          position: 'absolute',
          left: panelX,
          top: courtY,
          width: panelWidth,
          height: courtHeight,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        {/* Grade card */}
        {spec.spacingGrade && (
          <div
            style={{
              backgroundColor: 'rgba(0,0,0,0.4)',
              borderRadius: 12,
              padding: 24,
              textAlign: 'center',
              transform: `scale(${gradeScale})`,
            }}
          >
            <div
              style={{
                color: '#94a3b8',
                fontSize: 14,
                marginBottom: 12,
                fontFamily: 'system-ui, sans-serif',
                letterSpacing: 2,
              }}
            >
              SPACING GRADE
            </div>
            <div
              style={{
                fontSize: 72,
                fontWeight: 'bold',
                color: GRADE_COLORS[spec.spacingGrade],
                fontFamily: 'system-ui, sans-serif',
                textShadow: `0 0 30px ${GRADE_COLORS[spec.spacingGrade]}40`,
              }}
            >
              {spec.spacingGrade}
            </div>
            <div
              style={{
                color: '#64748b',
                fontSize: 12,
                marginTop: 8,
                fontFamily: 'system-ui, sans-serif',
              }}
            >
              {getGradeDescription(spec.spacingGrade)}
            </div>
          </div>
        )}

        {/* Metrics summary */}
        {spec.spacingMetrics && spec.spacingMetrics.length > 0 && (
          <div
            style={{
              backgroundColor: 'rgba(0,0,0,0.4)',
              borderRadius: 12,
              padding: 20,
              opacity: interpolate(frame, [40, 55], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              }),
            }}
          >
            <div
              style={{
                color: '#94a3b8',
                fontSize: 12,
                marginBottom: 16,
                fontFamily: 'system-ui, sans-serif',
                letterSpacing: 2,
              }}
            >
              DISTANCE METRICS
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <MetricRow
                label="Avg Distance"
                value={`${calculateAverageDistance(spec.spacingMetrics).toFixed(1)} ft`}
              />
              <MetricRow
                label="Min Distance"
                value={`${Math.min(...spec.spacingMetrics.map((m) => m.distance)).toFixed(1)} ft`}
              />
              <MetricRow
                label="Max Distance"
                value={`${Math.max(...spec.spacingMetrics.map((m) => m.distance)).toFixed(1)} ft`}
              />
              <MetricRow
                label="Optimal Pairs"
                value={`${spec.spacingMetrics.filter((m) => m.isOptimal).length}/${spec.spacingMetrics.length}`}
              />
            </div>
          </div>
        )}

        {/* Analysis notes */}
        <div
          style={{
            backgroundColor: 'rgba(0,0,0,0.4)',
            borderRadius: 12,
            padding: 20,
            flex: 1,
            opacity: interpolate(frame, [60, 75], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
          }}
        >
          <div
            style={{
              color: '#94a3b8',
              fontSize: 12,
              marginBottom: 12,
              fontFamily: 'system-ui, sans-serif',
              letterSpacing: 2,
            }}
          >
            ANALYSIS
          </div>
          <div
            style={{
              color: '#cbd5e1',
              fontSize: 13,
              lineHeight: 1.6,
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            {getSpacingAnalysis(spec)}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const MetricRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}
  >
    <span
      style={{
        color: '#64748b',
        fontSize: 13,
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {label}
    </span>
    <span
      style={{
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {value}
    </span>
  </div>
);

function getGradeDescription(grade: 'A' | 'B' | 'C' | 'D' | 'F'): string {
  const descriptions = {
    A: 'Excellent floor spacing',
    B: 'Good spacing, minor issues',
    C: 'Average, room for improvement',
    D: 'Poor spacing, clustered',
    F: 'Critical spacing issues',
  };
  return descriptions[grade];
}

function calculateAverageDistance(
  metrics: { distance: number }[]
): number {
  if (metrics.length === 0) return 0;
  return metrics.reduce((sum, m) => sum + m.distance, 0) / metrics.length;
}

function getSpacingAnalysis(spec: SpacingAnalysisSpec): string {
  const offensePlayers = spec.players.filter((p) => p.team === 'offense').length;
  const avgDistance = spec.spacingMetrics
    ? calculateAverageDistance(spec.spacingMetrics)
    : 0;

  if (avgDistance > 15) {
    return `With ${offensePlayers} offensive players maintaining an average of ${avgDistance.toFixed(1)}ft spacing, the floor is well spread. This creates driving lanes and passing options.`;
  } else if (avgDistance > 10) {
    return `The ${offensePlayers} offensive players have moderate spacing at ${avgDistance.toFixed(1)}ft average. Consider spreading wider to create better opportunities.`;
  } else {
    return `Spacing is tight with ${avgDistance.toFixed(1)}ft average distance. Players are clustered, making it easier for defense to help and contest.`;
  }
}
