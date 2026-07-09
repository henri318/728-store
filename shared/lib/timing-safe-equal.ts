import { timingSafeEqual as nodeTimingSafeEqual } from 'node:crypto';

export function isTimingSafeEqual(left: Buffer, right: Buffer): boolean {
  return nodeTimingSafeEqual(left, right);
}
