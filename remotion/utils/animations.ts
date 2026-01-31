import { spring, interpolate } from 'remotion';

// Standard spring configurations for consistent animations

export const SPRING_CONFIG = {
  // Snappy animations for UI elements
  snappy: {
    damping: 20,
    stiffness: 200,
    mass: 0.5,
  },
  // Smooth animations for player movements
  smooth: {
    damping: 15,
    stiffness: 100,
    mass: 1,
  },
  // Bouncy animations for emphasis
  bouncy: {
    damping: 10,
    stiffness: 150,
    mass: 0.8,
  },
  // Slow animations for trajectories
  slow: {
    damping: 20,
    stiffness: 50,
    mass: 1.5,
  },
} as const;

/**
 * Create an entrance spring animation
 */
export function entranceSpring(
  frame: number,
  fps: number,
  delay: number = 0,
  config: keyof typeof SPRING_CONFIG = 'snappy'
): number {
  return spring({
    frame: frame - delay,
    fps,
    config: SPRING_CONFIG[config],
  });
}

/**
 * Create a scale entrance animation
 */
export function scaleEntrance(
  frame: number,
  fps: number,
  delay: number = 0
): number {
  const progress = entranceSpring(frame, fps, delay, 'bouncy');
  return interpolate(progress, [0, 1], [0, 1]);
}

/**
 * Create an opacity entrance animation
 */
export function opacityEntrance(
  frame: number,
  fps: number,
  delay: number = 0,
  duration: number = 15
): number {
  return interpolate(
    frame - delay,
    [0, duration],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
}

/**
 * Create a draw animation progress (for lines/paths)
 */
export function drawProgress(
  frame: number,
  fps: number,
  delay: number = 0,
  duration: number = 30
): number {
  const progress = spring({
    frame: frame - delay,
    fps,
    config: SPRING_CONFIG.smooth,
    durationInFrames: duration,
  });
  return interpolate(progress, [0, 1], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
}

/**
 * Create a looping pulse animation
 */
export function pulse(frame: number, fps: number, speed: number = 1): number {
  const period = fps / speed;
  const progress = (frame % period) / period;
  return 0.8 + 0.2 * Math.sin(progress * Math.PI * 2);
}

/**
 * Stagger delay for multiple elements
 */
export function staggerDelay(index: number, baseDelay: number = 3): number {
  return index * baseDelay;
}

/**
 * Interpolate along a path of points
 */
export function interpolatePath(
  frame: number,
  fps: number,
  points: { x: number; y: number }[],
  duration: number
): { x: number; y: number } {
  if (points.length < 2) {
    return points[0] || { x: 0, y: 0 };
  }

  const progress = interpolate(
    frame,
    [0, duration],
    [0, points.length - 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const segmentIndex = Math.min(Math.floor(progress), points.length - 2);
  const segmentProgress = progress - segmentIndex;

  const from = points[segmentIndex];
  const to = points[segmentIndex + 1];

  return {
    x: from.x + (to.x - from.x) * segmentProgress,
    y: from.y + (to.y - from.y) * segmentProgress,
  };
}
