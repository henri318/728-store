export interface DesignPositionData {
  imageUrl: string;
  x: number;
  y: number;
  scale: number;
  rotation_deg: number;
  opacity: number;
  blend_mode: string;
}

export function coerceDesignPosition(
  value: unknown,
): DesignPositionData | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.imageUrl !== 'string' ||
    candidate.imageUrl.length === 0
  ) {
    return null;
  }
  return {
    imageUrl: candidate.imageUrl,
    x: typeof candidate.x === 'number' ? candidate.x : 0.5,
    y: typeof candidate.y === 'number' ? candidate.y : 0.5,
    scale: typeof candidate.scale === 'number' ? candidate.scale : 100,
    rotation_deg:
      typeof candidate.rotation_deg === 'number' ? candidate.rotation_deg : 0,
    opacity: typeof candidate.opacity === 'number' ? candidate.opacity : 100,
    blend_mode:
      typeof candidate.blend_mode === 'string'
        ? candidate.blend_mode
        : 'source-over',
  };
}
