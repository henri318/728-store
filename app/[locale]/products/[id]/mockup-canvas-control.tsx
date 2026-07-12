'use client';

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import {
  DEFAULT_DESIGN_BLEND_MODE,
  DEFAULT_DESIGN_OPACITY_PERCENT,
  DEFAULT_DESIGN_ROTATION_DEG,
  DEFAULT_DESIGN_SCALE_PERCENT,
  MAX_DESIGN_OPACITY_PERCENT,
  MAX_DESIGN_ROTATION_DEG,
  MAX_DESIGN_SCALE_PERCENT,
  MIN_DESIGN_OPACITY_PERCENT,
  MIN_DESIGN_ROTATION_DEG,
  MIN_DESIGN_SCALE_PERCENT,
  type DesignPosition,
} from '@/modules/products/domain/value-objects/product-customization-config';
import { drawCover, drawDesign } from '@/shared/presentation/canvas-utils';
import styles from './mockup-canvas-control.module.css';

const CANVAS_WIDTH = 300;
const CANVAS_HEIGHT = 225;

interface MockupCanvasControlLabels {
  canvasLabel: string;
  canvasHelp: string;
  productImageAlt: string;
  designImageAlt: string;
  uploadDesign: string;
  replaceDesign: string;
  removeDesign: string;
  uploading: string;
  invalidImage: string;
  imageTooLarge: string;
  scaleLabel: string;
  rotationLabel: string;
  opacityLabel: string;
  positionXLabel: string;
  positionYLabel: string;
  positionReadoutLabel: string;
  resetLabel: string;
  uploadingLabel: string;
}

interface MockupCanvasControlProps {
  productImageUrl: string;
  /**
   * Optional URL to seed the canvas with — typically a saved buyer draft
   * (cart draft) from a previous session.
   */
  initialDesignUrl?: string | null;
  initialPosition?: Partial<DesignPosition> | null;
  labels: MockupCanvasControlLabels;
  onUpload: (
    file: File,
  ) => Promise<{ imageUploadId: string; imageUrl: string }>;
  onPositionChange: (position: DesignPosition | null) => void;
}

interface DragState {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startX: number;
  startY: number;
}

const MAX_DESIGN_FILE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_MIME_TYPES = new Set(['image/png', 'image/jpeg']);

export function MockupCanvasControl({
  productImageUrl,
  initialDesignUrl = null,
  initialPosition = null,
  labels,
  onUpload,
  onPositionChange,
}: MockupCanvasControlProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const productImageRef = useRef<HTMLImageElement | null>(null);
  const designImageRef = useRef<HTMLImageElement | null>(null);
  const [designImageUrl, setDesignImageUrl] = useState<string | null>(
    initialDesignUrl,
  );
  const [position, setPosition] = useState<DesignPosition>(() =>
    buildInitialPosition(initialPosition, initialDesignUrl),
  );
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const designFileInputId = useId();
  const positionReadoutId = useId();
  const errorId = useId();
  const statusId = useId();

  // Notify parent of position changes — payload is the source of truth,
  // not the UI. Parent persists to cart/order draft.
  useEffect(() => {
    if (!designImageUrl) {
      onPositionChange(null);
      return;
    }
    onPositionChange(position);
  }, [designImageUrl, position, onPositionChange]);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = '#f4f2e6';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const productImage = productImageRef.current;
    if (
      productImage &&
      productImage.complete &&
      productImage.naturalWidth > 0
    ) {
      drawCover(ctx, productImage, CANVAS_WIDTH, CANVAS_HEIGHT);
    }

    const designImage = designImageRef.current;
    if (
      designImage &&
      designImageUrl &&
      designImage.complete &&
      designImage.naturalWidth > 0
    ) {
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = position.opacity / 100;
      drawDesign(ctx, designImage, position, CANVAS_WIDTH, CANVAS_HEIGHT);
    }

    ctx.restore();
  }, [designImageUrl, position]);

  const configureCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = Math.round(CANVAS_WIDTH * dpr);
    canvas.height = Math.round(CANVAS_HEIGHT * dpr);
    canvas.getContext('2d')?.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawCanvas();
  }, [drawCanvas]);

  useEffect(() => {
    configureCanvas();
    const mediaQuery = globalThis.matchMedia?.(
      `(resolution: ${window.devicePixelRatio || 1}dppx)`,
    );
    mediaQuery?.addEventListener('change', configureCanvas);
    window.addEventListener('resize', configureCanvas);
    return () => {
      mediaQuery?.removeEventListener('change', configureCanvas);
      window.removeEventListener('resize', configureCanvas);
    };
  }, [configureCanvas]);

  useEffect(() => {
    const designImg = designImageRef.current;
    if (designImg && designImageUrl && !designImg.complete) {
      const onDesignLoad = () => {
        drawCanvas();
      };
      designImg.addEventListener('load', onDesignLoad);
      return () => designImg.removeEventListener('load', onDesignLoad);
    }
    drawCanvas();
  }, [drawCanvas, designImageUrl, position]);

  const handleFileSelected = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0] ?? null;
      event.target.value = '';
      if (!file) return;

      if (!ACCEPTED_MIME_TYPES.has(file.type)) {
        setError(labels.invalidImage);
        return;
      }

      if (file.size > MAX_DESIGN_FILE_BYTES) {
        setError(labels.imageTooLarge);
        return;
      }

      setError(null);
      setUploading(true);

      try {
        const result = await onUpload(file);
        setDesignImageUrl(result.imageUrl);
        setPosition((current) => ({
          ...current,
          imageUrl: result.imageUrl,
        }));
      } catch {
        setError(labels.uploadingLabel);
      } finally {
        setUploading(false);
      }
    },
    [
      labels.imageTooLarge,
      labels.invalidImage,
      labels.uploadingLabel,
      onUpload,
    ],
  );

  const handleRemoveDesign = useCallback(() => {
    setDesignImageUrl(null);
    setPosition(buildDefaultPosition());
    setError(null);
  }, []);

  const handleReset = useCallback(() => {
    if (!designImageUrl) return;
    setPosition({
      imageUrl: designImageUrl,
      x: 0.5,
      y: 0.5,
      scale: DEFAULT_DESIGN_SCALE_PERCENT,
      rotation_deg: DEFAULT_DESIGN_ROTATION_DEG,
      opacity: DEFAULT_DESIGN_OPACITY_PERCENT,
      blend_mode: DEFAULT_DESIGN_BLEND_MODE,
    });
  }, [designImageUrl]);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      if (!designImageUrl) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0) return;
      const scaleX = CANVAS_WIDTH / rect.width;
      const scaleY = CANVAS_HEIGHT / rect.height;

      const startX = (event.clientX - rect.left) * scaleX;
      const startY = (event.clientY - rect.top) * scaleY;

      event.currentTarget.setPointerCapture(event.pointerId);
      setDragState({
        pointerId: event.pointerId,
        startClientX: startX,
        startClientY: startY,
        startX: position.x * CANVAS_WIDTH,
        startY: position.y * CANVAS_HEIGHT,
      });
    },
    [designImageUrl, position.x, position.y],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      if (!dragState) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0) return;
      const scaleX = CANVAS_WIDTH / rect.width;
      const scaleY = CANVAS_HEIGHT / rect.height;

      const currentX = (event.clientX - rect.left) * scaleX;
      const currentY = (event.clientY - rect.top) * scaleY;

      const deltaX = (currentX - dragState.startClientX) / CANVAS_WIDTH;
      const deltaY = (currentY - dragState.startClientY) / CANVAS_HEIGHT;

      setPosition((current) => ({
        ...current,
        x: clamp01(dragState.startX / CANVAS_WIDTH + deltaX),
        y: clamp01(dragState.startY / CANVAS_HEIGHT + deltaY),
      }));
    },
    [dragState],
  );

  const handlePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      if (!dragState) return;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      setDragState(null);
    },
    [dragState],
  );

  const onScaleChange = useCallback((value: number) => {
    setPosition((current) => ({ ...current, scale: value }));
  }, []);

  const onRotationChange = useCallback((value: number) => {
    setPosition((current) => ({ ...current, rotation_deg: value }));
  }, []);

  const onOpacityChange = useCallback((value: number) => {
    setPosition((current) => ({ ...current, opacity: value }));
  }, []);

  const positionReadout = useMemo(
    () => `${Math.round(position.x * 100)}% / ${Math.round(position.y * 100)}%`,
    [position.x, position.y],
  );

  return (
    <div className={styles.shell}>
      <div className={styles.canvasFrame}>
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className={styles.canvas}
          aria-label={labels.canvasLabel}
          aria-describedby={`${positionReadoutId} ${error ? errorId : ''} ${
            uploading ? statusId : ''
          }`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
        {/* Hidden seeds for the canvas draw routine. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={productImageRef}
          src={productImageUrl}
          alt=""
          aria-hidden="true"
          onLoad={drawCanvas}
          className={styles.hiddenImage}
          crossOrigin="anonymous"
        />
        {designImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            ref={designImageRef}
            src={designImageUrl}
            alt={labels.designImageAlt}
            onLoad={drawCanvas}
            className={styles.hiddenImage}
            crossOrigin="anonymous"
          />
        ) : null}
      </div>

      <p id={positionReadoutId} className={styles.readout} aria-live="polite">
        {labels.positionReadoutLabel}: {positionReadout}
      </p>

      <div className={styles.uploadRow}>
        <label className={styles.uploadButton} htmlFor={designFileInputId}>
          {designImageUrl ? labels.replaceDesign : labels.uploadDesign}
        </label>
        <input
          id={designFileInputId}
          type="file"
          accept="image/png,image/jpeg"
          className={styles.fileInput}
          onChange={handleFileSelected}
          disabled={uploading}
        />
        {designImageUrl ? (
          <>
            <button
              type="button"
              className={styles.ghostButton}
              onClick={handleRemoveDesign}
              disabled={uploading}
            >
              {labels.removeDesign}
            </button>
            <button
              type="button"
              className={styles.ghostButton}
              onClick={handleReset}
              disabled={uploading}
            >
              {labels.resetLabel}
            </button>
          </>
        ) : null}
      </div>

      {uploading ? (
        <p
          id={statusId}
          className={styles.status}
          role="status"
          aria-live="polite"
        >
          {labels.uploading}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      <div className={styles.controls}>
        <label className={styles.control}>
          <span>{labels.scaleLabel}</span>
          <input
            type="range"
            min={MIN_DESIGN_SCALE_PERCENT}
            max={MAX_DESIGN_SCALE_PERCENT}
            step={1}
            value={position.scale}
            onChange={(event) => onScaleChange(Number(event.target.value))}
            disabled={!designImageUrl}
            aria-valuemin={MIN_DESIGN_SCALE_PERCENT}
            aria-valuemax={MAX_DESIGN_SCALE_PERCENT}
            aria-valuenow={position.scale}
          />
        </label>
        <label className={styles.control}>
          <span>{labels.rotationLabel}</span>
          <input
            type="range"
            min={MIN_DESIGN_ROTATION_DEG}
            max={MAX_DESIGN_ROTATION_DEG}
            step={1}
            value={position.rotation_deg}
            onChange={(event) => onRotationChange(Number(event.target.value))}
            disabled={!designImageUrl}
            aria-valuemin={MIN_DESIGN_ROTATION_DEG}
            aria-valuemax={MAX_DESIGN_ROTATION_DEG}
            aria-valuenow={position.rotation_deg}
          />
        </label>
        <label className={styles.control}>
          <span>{labels.opacityLabel}</span>
          <input
            type="range"
            min={MIN_DESIGN_OPACITY_PERCENT}
            max={MAX_DESIGN_OPACITY_PERCENT}
            step={1}
            value={position.opacity}
            onChange={(event) => onOpacityChange(Number(event.target.value))}
            disabled={!designImageUrl}
            aria-valuemin={MIN_DESIGN_OPACITY_PERCENT}
            aria-valuemax={MAX_DESIGN_OPACITY_PERCENT}
            aria-valuenow={position.opacity}
          />
        </label>
      </div>

      {/* Visually hidden position data — never shown to the user, only
          rendered so screen readers can announce the values. */}
      <p className={styles.visuallyHidden}>
        {labels.positionXLabel}: {position.x.toFixed(3)} ·{' '}
        {labels.positionYLabel}: {position.y.toFixed(3)}
      </p>
    </div>
  );
}

function buildInitialPosition(
  initial: Partial<DesignPosition> | null,
  designUrl: string | null,
): DesignPosition {
  const base = buildDefaultPosition();
  if (designUrl) {
    return {
      ...base,
      imageUrl: designUrl,
      ...initial,
    };
  }
  return base;
}

function buildDefaultPosition(): DesignPosition {
  return {
    imageUrl: '',
    x: 0.5,
    y: 0.5,
    scale: DEFAULT_DESIGN_SCALE_PERCENT,
    rotation_deg: DEFAULT_DESIGN_ROTATION_DEG,
    opacity: DEFAULT_DESIGN_OPACITY_PERCENT,
    blend_mode: DEFAULT_DESIGN_BLEND_MODE,
  };
}

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0.5;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}
