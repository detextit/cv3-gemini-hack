import React from 'react';
import { VisualizationSpec, BoundingBox as BoundingBoxType } from '../types';

interface VideoOverlayProps {
    specs: VisualizationSpec[];
    containerWidth: number;
    containerHeight: number;
}

/**
 * Renders SVG overlays (bounding boxes, arrows, lines) on top of the video frame
 * Uses normalized 0-100 coordinate system, scaled to container dimensions
 */
export const VideoOverlay: React.FC<VideoOverlayProps> = ({
    specs,
    containerWidth,
    containerHeight,
}) => {
    if (!specs || specs.length === 0) return null;

    // Scale normalized coordinates (0-100) to pixel values
    const scaleX = (x: number) => (x / 100) * containerWidth;
    const scaleY = (y: number) => (y / 100) * containerHeight;

    return (
        <svg
            width={containerWidth}
            height={containerHeight}
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                pointerEvents: 'none',
            }}
        >
            <defs>
                {/* Arrow marker for movement arrows */}
                <marker
                    id="arrowhead"
                    markerWidth="10"
                    markerHeight="7"
                    refX="9"
                    refY="3.5"
                    orient="auto"
                >
                    <polygon points="0 0, 10 3.5, 0 7" fill="#22c55e" />
                </marker>
                <marker
                    id="arrowhead-blue"
                    markerWidth="10"
                    markerHeight="7"
                    refX="9"
                    refY="3.5"
                    orient="auto"
                >
                    <polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6" />
                </marker>
            </defs>

            {specs.map((spec, specIndex) => (
                <g key={specIndex}>
                    {/* Bounding Boxes (tracking_overlay) */}
                    {spec.type === 'tracking_overlay' &&
                        spec.boundingBoxes.map((box, i) => (
                            <BoundingBox
                                key={`box-${i}`}
                                box={box}
                                scaleX={scaleX}
                                scaleY={scaleY}
                            />
                        ))}

                    {/* Court diagram players and arrows */}
                    {(spec.type === 'court_diagram' || spec.type === 'spacing_analysis') && (
                        <>
                            {/* Player markers as circles */}
                            {spec.players?.map((player, i) => (
                                <g key={`player-${i}`}>
                                    <circle
                                        cx={scaleX(player.position.x)}
                                        cy={scaleY(player.position.y)}
                                        r={16}
                                        fill={
                                            player.team === 'offense'
                                                ? '#ef4444'
                                                : player.team === 'defense'
                                                    ? '#3b82f6'
                                                    : '#6b7280'
                                        }
                                        stroke="white"
                                        strokeWidth={2}
                                        style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}
                                    />
                                    {player.jerseyNumber && (
                                        <text
                                            x={scaleX(player.position.x)}
                                            y={scaleY(player.position.y) + 4}
                                            textAnchor="middle"
                                            fontSize={12}
                                            fontWeight="bold"
                                            fill="white"
                                        >
                                            {player.jerseyNumber}
                                        </text>
                                    )}
                                    {player.hasBall && (
                                        <circle
                                            cx={scaleX(player.position.x) + 12}
                                            cy={scaleY(player.position.y) - 12}
                                            r={6}
                                            fill="#f97316"
                                            stroke="white"
                                            strokeWidth={1}
                                        />
                                    )}
                                </g>
                            ))}

                            {/* Movement arrows */}
                            {spec.type === 'court_diagram' &&
                                spec.arrows?.map((arrow, i) => (
                                    <g key={`arrow-${i}`}>
                                        <line
                                            x1={scaleX(arrow.from.x)}
                                            y1={scaleY(arrow.from.y)}
                                            x2={scaleX(arrow.to.x)}
                                            y2={scaleY(arrow.to.y)}
                                            stroke={arrow.color || '#22c55e'}
                                            strokeWidth={3}
                                            strokeDasharray={arrow.dashed ? '8,4' : undefined}
                                            markerEnd="url(#arrowhead)"
                                            style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }}
                                        />
                                        {arrow.label && (
                                            <text
                                                x={(scaleX(arrow.from.x) + scaleX(arrow.to.x)) / 2}
                                                y={(scaleY(arrow.from.y) + scaleY(arrow.to.y)) / 2 - 8}
                                                textAnchor="middle"
                                                fontSize={11}
                                                fill="white"
                                                style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))' }}
                                            >
                                                {arrow.label}
                                            </text>
                                        )}
                                    </g>
                                ))}

                            {/* Spacing lines */}
                            {spec.type === 'spacing_analysis' &&
                                spec.spacingMetrics?.map((metric, i) => (
                                    <g key={`spacing-${i}`}>
                                        <line
                                            x1={scaleX(metric.from.x)}
                                            y1={scaleY(metric.from.y)}
                                            x2={scaleX(metric.to.x)}
                                            y2={scaleY(metric.to.y)}
                                            stroke={metric.isOptimal ? '#22c55e' : '#f59e0b'}
                                            strokeWidth={2}
                                            strokeDasharray="4,4"
                                            opacity={0.7}
                                        />
                                        <text
                                            x={(scaleX(metric.from.x) + scaleX(metric.to.x)) / 2}
                                            y={(scaleY(metric.from.y) + scaleY(metric.to.y)) / 2 - 6}
                                            textAnchor="middle"
                                            fontSize={10}
                                            fill="white"
                                            style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))' }}
                                        >
                                            {metric.distance.toFixed(1)}ft
                                        </text>
                                    </g>
                                ))}
                        </>
                    )}

                    {/* Trajectory paths */}
                    {spec.type === 'trajectory' &&
                        spec.trajectories?.map((traj, i) => {
                            if (traj.points.length < 2) return null;
                            const pathData = traj.points
                                .map((p, idx) =>
                                    idx === 0
                                        ? `M ${scaleX(p.x)} ${scaleY(p.y)}`
                                        : `L ${scaleX(p.x)} ${scaleY(p.y)}`
                                )
                                .join(' ');

                            return (
                                <path
                                    key={`traj-${i}`}
                                    d={pathData}
                                    fill="none"
                                    stroke={
                                        traj.team === 'offense'
                                            ? '#ef4444'
                                            : traj.team === 'defense'
                                                ? '#3b82f6'
                                                : '#9ca3af'
                                    }
                                    strokeWidth={3}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    opacity={0.8}
                                    style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }}
                                />
                            );
                        })}
                </g>
            ))}
        </svg>
    );
};

/**
 * Individual bounding box component
 */
const BoundingBox: React.FC<{
    box: BoundingBoxType;
    scaleX: (v: number) => number;
    scaleY: (v: number) => number;
}> = ({ box, scaleX, scaleY }) => {
    const x = scaleX(box.x);
    const y = scaleY(box.y);
    const width = scaleX(box.width);
    const height = scaleY(box.height);

    const color =
        box.team === 'home' ? '#ef4444' : box.team === 'away' ? '#3b82f6' : '#22c55e';

    return (
        <g>
            <rect
                x={x}
                y={y}
                width={width}
                height={height}
                fill="none"
                stroke={color}
                strokeWidth={2}
                rx={4}
                style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.5))' }}
            />
            {box.label && (
                <g>
                    <rect
                        x={x}
                        y={y - 20}
                        width={box.label.length * 8 + 12}
                        height={18}
                        fill={color}
                        rx={2}
                    />
                    <text
                        x={x + 6}
                        y={y - 6}
                        fontSize={11}
                        fontWeight="bold"
                        fill="white"
                    >
                        {box.label}
                    </text>
                </g>
            )}
            {box.confidence !== undefined && (
                <text
                    x={x + width - 4}
                    y={y - 6}
                    textAnchor="end"
                    fontSize={9}
                    fill={color}
                >
                    {(box.confidence * 100).toFixed(0)}%
                </text>
            )}
        </g>
    );
};

export default VideoOverlay;
