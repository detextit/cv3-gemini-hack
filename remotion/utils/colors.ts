// Team color palette for basketball visualizations

export const TEAM_COLORS = {
  offense: {
    primary: '#ef4444',    // red-500
    secondary: '#fca5a5',  // red-300
    stroke: '#dc2626',     // red-600
  },
  defense: {
    primary: '#3b82f6',    // blue-500
    secondary: '#93c5fd',  // blue-300
    stroke: '#2563eb',     // blue-600
  },
  neutral: {
    primary: '#6b7280',    // gray-500
    secondary: '#d1d5db',  // gray-300
    stroke: '#4b5563',     // gray-600
  },
} as const;

export const COURT_COLORS = {
  surface: '#d97706',      // amber-600 (hardwood)
  lines: '#ffffff',        // white
  paint: '#ea580c',        // orange-600 (slightly darker)
  key: '#c2410c',          // orange-700
  threePoint: '#ffffff',   // white
} as const;

export const ANNOTATION_COLORS = {
  primary: '#22c55e',      // green-500
  warning: '#eab308',      // yellow-500
  error: '#ef4444',        // red-500
  info: '#3b82f6',         // blue-500
} as const;

export const SPACING_COLORS = {
  optimal: '#22c55e',      // green-500
  suboptimal: '#eab308',   // yellow-500
  poor: '#ef4444',         // red-500
} as const;

export const GRADE_COLORS = {
  A: '#22c55e',            // green-500
  B: '#84cc16',            // lime-500
  C: '#eab308',            // yellow-500
  D: '#f97316',            // orange-500
  F: '#ef4444',            // red-500
} as const;

/**
 * Get color for a team type
 */
export function getTeamColor(team: 'offense' | 'defense' | 'neutral' | 'home' | 'away'): string {
  if (team === 'home') return TEAM_COLORS.offense.primary;
  if (team === 'away') return TEAM_COLORS.defense.primary;
  return TEAM_COLORS[team]?.primary || TEAM_COLORS.neutral.primary;
}

/**
 * Get stroke color for a team type
 */
export function getTeamStroke(team: 'offense' | 'defense' | 'neutral'): string {
  return TEAM_COLORS[team]?.stroke || TEAM_COLORS.neutral.stroke;
}

/**
 * Get color for spacing based on optimality
 */
export function getSpacingColor(isOptimal?: boolean): string {
  if (isOptimal === undefined) return SPACING_COLORS.suboptimal;
  return isOptimal ? SPACING_COLORS.optimal : SPACING_COLORS.poor;
}
