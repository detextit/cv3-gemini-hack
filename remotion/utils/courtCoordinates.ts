import { CourtPosition } from '../../types';

// Court dimensions in normalized 0-100 scale
// Half-court view: basket at (50, 8), three-point arc radius ~47.5 from basket
export const COURT = {
  // Paint dimensions
  PAINT_LEFT: 34,
  PAINT_RIGHT: 66,
  PAINT_TOP: 40,

  // Free throw line
  FREE_THROW_Y: 40,
  FREE_THROW_CIRCLE_RADIUS: 12,

  // Three-point line
  THREE_POINT_RADIUS: 47.5,
  THREE_POINT_CORNER_X: 6,

  // Basket position
  BASKET_X: 50,
  BASKET_Y: 8,

  // Court boundaries
  COURT_WIDTH: 100,
  COURT_HEIGHT: 100,
} as const;

/**
 * Convert normalized court coordinates (0-100) to pixel coordinates
 */
export function courtToPixels(
  position: CourtPosition,
  width: number,
  height: number
): { x: number; y: number } {
  return {
    x: (position.x / 100) * width,
    y: (position.y / 100) * height,
  };
}

/**
 * Convert pixel coordinates to normalized court coordinates (0-100)
 */
export function pixelsToCourt(
  x: number,
  y: number,
  width: number,
  height: number
): CourtPosition {
  return {
    x: (x / width) * 100,
    y: (y / height) * 100,
  };
}

/**
 * Calculate distance between two court positions in feet
 * NBA half-court is 47 feet x 50 feet
 */
export function calculateDistanceFeet(
  from: CourtPosition,
  to: CourtPosition
): number {
  const dx = ((to.x - from.x) / 100) * 50; // 50 feet wide
  const dy = ((to.y - from.y) / 100) * 47; // 47 feet long (half-court)
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Check if a position is inside the paint
 */
export function isInPaint(position: CourtPosition): boolean {
  return (
    position.x >= COURT.PAINT_LEFT &&
    position.x <= COURT.PAINT_RIGHT &&
    position.y <= COURT.PAINT_TOP
  );
}

/**
 * Check if a position is behind the three-point line
 */
export function isBehindThreePointLine(position: CourtPosition): boolean {
  const dx = position.x - COURT.BASKET_X;
  const dy = position.y - COURT.BASKET_Y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Corner threes
  if (position.x <= COURT.THREE_POINT_CORNER_X || position.x >= 100 - COURT.THREE_POINT_CORNER_X) {
    return position.y >= 14; // Approximate corner three boundary
  }

  return distance >= COURT.THREE_POINT_RADIUS;
}

/**
 * Get the angle from basket to a position (in degrees, 0 = straight up)
 */
export function getAngleFromBasket(position: CourtPosition): number {
  const dx = position.x - COURT.BASKET_X;
  const dy = position.y - COURT.BASKET_Y;
  return (Math.atan2(dx, dy) * 180) / Math.PI;
}
