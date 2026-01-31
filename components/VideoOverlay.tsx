import React from 'react';
import { VisualizationSpec, AttackLine, DefenseLine, MovementPath, ZoneRegion, Annotation, Position } from '../types';

interface VideoOverlayProps {
    specs: VisualizationSpec[];
    containerWidth: number;
    containerHeight: number;
}

// Colors for different line types
const COLORS = {
    attack: '#ef4444',      // Red for attack/offense
    defense: '#3b82f6',     // Blue for defense
    neutral: '#9ca3af',     // Gray for neutral
    attackZone: 'rgba(239, 68, 68, 0.2)',
    defenseZone: 'rgba(59, 130, 246, 0.2)',
    neutralZone: 'rgba(156, 163, 175, 0.2)',
};

/**
 * Renders SVG overlays (lines, paths, zones) on top of the video frame
 * Uses normalized 0-100 coordinate system, scaled to container dimensions
 * 
 * Simplified to focus on:
 * - Attack lines (offensive movement, passes)
 * - Defense lines (defensive positioning, coverage)
 * - Movement paths (player movement trajectories)
 * - Zones (highlighted areas)
 * - Annotations (text labels)
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

    const getStrokeDasharray = (style?: 'solid' | 'dashed' | 'dotted'): string | undefined => {
        switch (style) {
            case 'dashed': return '10,5';
            case 'dotted': return '3,3';
            default: return undefined;
        }
    };

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
                {/* Arrow marker for attack lines */}
                <marker
                    id="arrowhead-attack"
                    markerWidth="10"
                    markerHeight="7"
                    refX="9"
                    refY="3.5"
                    orient="auto"
                >
                    <polygon points="0 0, 10 3.5, 0 7" fill={COLORS.attack} />
                </marker>
                {/* Arrow marker for defense lines */}
                <marker
                    id="arrowhead-defense"
                    markerWidth="10"
                    markerHeight="7"
                    refX="9"
                    refY="3.5"
                    orient="auto"
                >
                    <polygon points="0 0, 10 3.5, 0 7" fill={COLORS.defense} />
                </marker>
                {/* Arrow marker for neutral paths */}
                <marker
                    id="arrowhead-neutral"
                    markerWidth="10"
                    markerHeight="7"
                    refX="9"
                    refY="3.5"
                    orient="auto"
                >
                    <polygon points="0 0, 10 3.5, 0 7" fill={COLORS.neutral} />
                </marker>
            </defs>

            {specs.map((spec, specIndex) => (
                <g key={specIndex}>
                    {spec.type === 'play_diagram' && (
                        <>
                            {/* Zones (render first so they appear behind lines) */}
                            {spec.zones?.map((zone, i) => (
                                <ZonePolygon
                                    key={`zone-${i}`}
                                    zone={zone}
                                    scaleX={scaleX}
                                    scaleY={scaleY}
                                />
                            ))}

                            {/* Attack Lines (red) */}
                            {spec.attackLines?.map((line, i) => (
                                <LineWithArrow
                                    key={`attack-${i}`}
                                    from={line.from}
                                    to={line.to}
                                    label={line.label}
                                    color={COLORS.attack}
                                    strokeDasharray={getStrokeDasharray(line.style)}
                                    arrowId="arrowhead-attack"
                                    scaleX={scaleX}
                                    scaleY={scaleY}
                                />
                            ))}

                            {/* Defense Lines (blue) */}
                            {spec.defenseLines?.map((line, i) => (
                                <LineWithArrow
                                    key={`defense-${i}`}
                                    from={line.from}
                                    to={line.to}
                                    label={line.label}
                                    color={COLORS.defense}
                                    strokeDasharray={getStrokeDasharray(line.style)}
                                    arrowId="arrowhead-defense"
                                    scaleX={scaleX}
                                    scaleY={scaleY}
                                />
                            ))}

                            {/* Movement Paths */}
                            {spec.movementPaths?.map((path, i) => {
                                if (path.points.length < 2) return null;
                                const color = path.type === 'attack' ? COLORS.attack :
                                    path.type === 'defense' ? COLORS.defense : COLORS.neutral;
                                const arrowId = `arrowhead-${path.type}`;
                                const pathData = path.points
                                    .map((p, idx) =>
                                        idx === 0
                                            ? `M ${scaleX(p.x)} ${scaleY(p.y)}`
                                            : `L ${scaleX(p.x)} ${scaleY(p.y)}`
                                    )
                                    .join(' ');

                                return (
                                    <g key={`path-${i}`}>
                                        <path
                                            d={pathData}
                                            fill="none"
                                            stroke={color}
                                            strokeWidth={3}
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeDasharray={getStrokeDasharray(path.style)}
                                            markerEnd={`url(#${arrowId})`}
                                            opacity={0.9}
                                            style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }}
                                        />
                                        {path.label && (
                                            <text
                                                x={scaleX(path.points[Math.floor(path.points.length / 2)].x)}
                                                y={scaleY(path.points[Math.floor(path.points.length / 2)].y) - 8}
                                                textAnchor="middle"
                                                fontSize={11}
                                                fill="white"
                                                style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.9))' }}
                                            >
                                                {path.label}
                                            </text>
                                        )}
                                    </g>
                                );
                            })}

                            {/* Annotations */}
                            {spec.annotations?.map((annotation, i) => (
                                <g key={`annotation-${i}`}>
                                    <rect
                                        x={scaleX(annotation.position.x) - 4}
                                        y={scaleY(annotation.position.y) - 14}
                                        width={annotation.text.length * 7 + 8}
                                        height={18}
                                        fill="rgba(0,0,0,0.7)"
                                        rx={4}
                                    />
                                    <text
                                        x={scaleX(annotation.position.x)}
                                        y={scaleY(annotation.position.y)}
                                        textAnchor="start"
                                        fontSize={12}
                                        fill="white"
                                        fontWeight="500"
                                    >
                                        {annotation.text}
                                    </text>
                                </g>
                            ))}
                        </>
                    )}
                </g>
            ))}
        </svg>
    );
};

/**
 * Line with arrow component
 */
const LineWithArrow: React.FC<{
    from: Position;
    to: Position;
    label?: string;
    color: string;
    strokeDasharray?: string;
    arrowId: string;
    scaleX: (v: number) => number;
    scaleY: (v: number) => number;
}> = ({ from, to, label, color, strokeDasharray, arrowId, scaleX, scaleY }) => {
    return (
        <g>
            <line
                x1={scaleX(from.x)}
                y1={scaleY(from.y)}
                x2={scaleX(to.x)}
                y2={scaleY(to.y)}
                stroke={color}
                strokeWidth={3}
                strokeDasharray={strokeDasharray}
                markerEnd={`url(#${arrowId})`}
                style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }}
            />
            {label && (
                <text
                    x={(scaleX(from.x) + scaleX(to.x)) / 2}
                    y={(scaleY(from.y) + scaleY(to.y)) / 2 - 8}
                    textAnchor="middle"
                    fontSize={11}
                    fill="white"
                    fontWeight="500"
                    style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.9))' }}
                >
                    {label}
                </text>
            )}
        </g>
    );
};

/**
 * Zone polygon component
 */
const ZonePolygon: React.FC<{
    zone: ZoneRegion;
    scaleX: (v: number) => number;
    scaleY: (v: number) => number;
}> = ({ zone, scaleX, scaleY }) => {
    if (zone.points.length < 3) return null;

    const fillColor = zone.type === 'attack' ? COLORS.attackZone :
        zone.type === 'defense' ? COLORS.defenseZone : COLORS.neutralZone;
    const strokeColor = zone.type === 'attack' ? COLORS.attack :
        zone.type === 'defense' ? COLORS.defense : COLORS.neutral;

    const pointsStr = zone.points
        .map(p => `${scaleX(p.x)},${scaleY(p.y)}`)
        .join(' ');

    // Calculate centroid for label
    const centroidX = zone.points.reduce((sum, p) => sum + p.x, 0) / zone.points.length;
    const centroidY = zone.points.reduce((sum, p) => sum + p.y, 0) / zone.points.length;

    return (
        <g>
            <polygon
                points={pointsStr}
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth={2}
                strokeDasharray="5,5"
            />
            {zone.label && (
                <text
                    x={scaleX(centroidX)}
                    y={scaleY(centroidY)}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={12}
                    fill="white"
                    fontWeight="bold"
                    style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.9))' }}
                >
                    {zone.label}
                </text>
            )}
        </g>
    );
};

export default VideoOverlay;
