import { PixelRatio } from 'react-native';

/**
 * DESIGN §6: pixel-art must land on integer numbers of *physical* pixels,
 * but device pixel ratios are not integers (e.g. 2.625). So the scale is
 * computed in physical pixels and converted back to dp:
 *
 *   1. dpr        = PixelRatio.get()          e.g. 2.625
 *   2. physical   = round(targetDp * dpr)     e.g. round(2 * 2.625) = 5
 *   3. artPixelDp = physical / dpr            e.g. 5 / 2.625 = 1.905
 *
 * Every art pixel then occupies exactly `physical` device pixels — crisp,
 * no shimmer. Computed once at startup and exported as PIXEL_SCALE; render
 * pixel art at (spriteSize * PIXEL_SCALE) dp with nearest-neighbour sampling.
 */
const TARGET_ART_PIXEL_DP = 2;

export function computeArtPixelDp(dpr: number, targetDp: number = TARGET_ART_PIXEL_DP): number {
  const physical = Math.round(targetDp * dpr);
  return physical / dpr;
}

export const PIXEL_SCALE = computeArtPixelDp(PixelRatio.get());
