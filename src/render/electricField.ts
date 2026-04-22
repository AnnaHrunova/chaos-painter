export type ElectricPresetId = 'dipole' | 'quadrupole' | 'capacitor';

export type ElectricViewMode = 'hybrid' | 'potential' | 'lines';

export type ElectricSettings = {
  preset: ElectricPresetId;
  viewMode: ElectricViewMode;
  fieldStrength: number;
  lineDensity: number;
  probeDrift: number;
  animate: boolean;
  glow: boolean;
};

export type ElectricCharge = {
  x: number;
  y: number;
  q: number;
};

export type ElectricFrameStats = {
  charges: number;
  maxField: number;
  minPotential: number;
  maxPotential: number;
  streamlineCount: number;
  sampleStep: number;
};

const EPSILON = 28;
const FIELD_LIMIT = 24;
const TWO_PI = Math.PI * 2;
const FIELD_COLORS = {
  positive: '#ff8754',
  negative: '#61d7ff',
  line: 'rgba(222, 241, 255, 0.82)',
  glow: 'rgba(97, 215, 255, 0.18)',
};
let potentialBufferCanvas: HTMLCanvasElement | null = null;

export function measureElectricCanvas(
  canvas: HTMLCanvasElement,
  maxDevicePixelRatio = 1.25,
) {
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(320, Math.floor(rect.width));
  const height = Math.max(280, Math.floor(rect.height));
  const devicePixelRatio = Math.min(window.devicePixelRatio || 1, maxDevicePixelRatio);

  return {
    width,
    height,
    pixelWidth: Math.max(1, Math.round(width * devicePixelRatio)),
    pixelHeight: Math.max(1, Math.round(height * devicePixelRatio)),
    devicePixelRatio,
  };
}

export function getElectricPresetLabel(preset: ElectricPresetId) {
  switch (preset) {
    case 'dipole':
      return 'Dipole';
    case 'quadrupole':
      return 'Quadrupole';
    case 'capacitor':
      return 'Plate Gate';
    default:
      return preset;
  }
}

export function getElectricPresetDescription(preset: ElectricPresetId) {
  switch (preset) {
    case 'dipole':
      return 'Классическая пара зарядов с сильной центральной связкой и чистыми силовыми линиями.';
    case 'quadrupole':
      return 'Четыре заряда с симметричной топологией, где поле красиво ломает осевую интуицию.';
    case 'capacitor':
      return 'Две плотные пластины разного знака, чтобы увидеть почти однородную зону и срыв поля на краях.';
    default:
      return '';
  }
}

export function buildCharges(
  preset: ElectricPresetId,
  width: number,
  height: number,
  fieldStrength: number,
): ElectricCharge[] {
  const cx = width / 2;
  const cy = height / 2;
  const unit = Math.min(width, height);
  const magnitude = fieldStrength * 0.9;

  if (preset === 'dipole') {
    return [
      { x: cx - unit * 0.16, y: cy, q: magnitude },
      { x: cx + unit * 0.16, y: cy, q: -magnitude },
    ];
  }

  if (preset === 'quadrupole') {
    return [
      { x: cx - unit * 0.16, y: cy - unit * 0.16, q: magnitude },
      { x: cx + unit * 0.16, y: cy - unit * 0.16, q: -magnitude },
      { x: cx - unit * 0.16, y: cy + unit * 0.16, q: -magnitude },
      { x: cx + unit * 0.16, y: cy + unit * 0.16, q: magnitude },
    ];
  }

  const charges: ElectricCharge[] = [];
  const plateCount = 7;
  const gap = unit * 0.24;
  for (let index = 0; index < plateCount; index += 1) {
    const t = plateCount === 1 ? 0 : index / (plateCount - 1);
    const y = height * 0.18 + t * height * 0.64;
    charges.push({ x: cx - gap / 2, y, q: magnitude * 0.48 });
    charges.push({ x: cx + gap / 2, y, q: -magnitude * 0.48 });
  }
  return charges;
}

export function renderElectricFieldScene({
  canvas,
  settings,
  phase,
}: {
  canvas: HTMLCanvasElement;
  settings: ElectricSettings;
  phase: number;
}): ElectricFrameStats {
  const viewport = measureElectricCanvas(canvas);
  if (canvas.width !== viewport.pixelWidth || canvas.height !== viewport.pixelHeight) {
    canvas.width = viewport.pixelWidth;
    canvas.height = viewport.pixelHeight;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return {
      charges: 0,
      maxField: 0,
      minPotential: 0,
      maxPotential: 0,
      streamlineCount: 0,
      sampleStep: 0,
    };
  }

  ctx.setTransform(viewport.devicePixelRatio, 0, 0, viewport.devicePixelRatio, 0, 0);
  ctx.clearRect(0, 0, viewport.width, viewport.height);

  const charges = buildCharges(
    settings.preset,
    viewport.width,
    viewport.height,
    settings.fieldStrength,
  );
  const sampleStep = settings.viewMode === 'potential' ? 4 : settings.viewMode === 'hybrid' ? 5 : 9;
  const fieldResult =
    settings.viewMode === 'lines'
      ? analyzeField(charges, viewport.width, viewport.height, sampleStep)
      : paintPotentialMap(ctx, viewport.width, viewport.height, charges, sampleStep);

  if (settings.viewMode === 'lines') {
    paintTechnicalBackground(ctx, viewport.width, viewport.height);
  }

  if (settings.viewMode !== 'potential') {
    drawStreamlines({
      ctx,
      width: viewport.width,
      height: viewport.height,
      charges,
      settings,
      phase,
    });
  }

  drawChargeSprites(ctx, charges, settings.glow);

  return {
    charges: charges.length,
    maxField: fieldResult.maxField,
    minPotential: fieldResult.minPotential,
    maxPotential: fieldResult.maxPotential,
    streamlineCount: estimateStreamlineCount(charges, settings.lineDensity),
    sampleStep,
  };
}

function paintPotentialMap(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  charges: ElectricCharge[],
  sampleStep: number,
) {
  const analyzed = analyzeField(charges, width, height, sampleStep);
  const { columns, rows, potentials, fields, minPotential, maxPotential, maxField } = analyzed;
  const image = ctx.createImageData(columns, rows);
  const normalizedRange = Math.max(Math.abs(minPotential), Math.abs(maxPotential), 0.0001);

  for (let index = 0; index < potentials.length; index += 1) {
    const bias = clamp(potentials[index] / normalizedRange, -1, 1);
    const magnitude = clamp(fields[index] / Math.max(maxField, 0.001), 0, 1);
    const color = mixFieldColor(bias, magnitude);
    const dataIndex = index * 4;
    image.data[dataIndex] = color.r;
    image.data[dataIndex + 1] = color.g;
    image.data[dataIndex + 2] = color.b;
    image.data[dataIndex + 3] = color.a;
  }

  const bufferCanvas = potentialBufferCanvas ?? document.createElement('canvas');
  potentialBufferCanvas = bufferCanvas;
  bufferCanvas.width = columns;
  bufferCanvas.height = rows;
  const bufferContext = bufferCanvas.getContext('2d');
  if (bufferContext) {
    bufferContext.putImageData(image, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(bufferCanvas, 0, 0, columns, rows, 0, 0, width, height);
  }

  const overlay = ctx.createRadialGradient(width * 0.5, height * 0.5, 0, width * 0.5, height * 0.5, width * 0.7);
  overlay.addColorStop(0, 'rgba(255,255,255,0.02)');
  overlay.addColorStop(1, 'rgba(2,6,12,0.48)');
  ctx.fillStyle = overlay;
  ctx.fillRect(0, 0, width, height);

  drawFieldGrid(ctx, width, height);

  return { minPotential, maxPotential, maxField };
}

function analyzeField(
  charges: ElectricCharge[],
  width: number,
  height: number,
  sampleStep: number,
) {
  const columns = Math.max(1, Math.ceil(width / sampleStep));
  const rows = Math.max(1, Math.ceil(height / sampleStep));
  let minPotential = Number.POSITIVE_INFINITY;
  let maxPotential = Number.NEGATIVE_INFINITY;
  let maxField = 0;
  const potentials = new Float32Array(columns * rows);
  const fields = new Float32Array(columns * rows);

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const x = column * sampleStep + sampleStep * 0.5;
      const y = row * sampleStep + sampleStep * 0.5;
      const sample = sampleField(charges, x, y);
      const index = row * columns + column;
      potentials[index] = sample.potential;
      fields[index] = sample.magnitude;
      minPotential = Math.min(minPotential, sample.potential);
      maxPotential = Math.max(maxPotential, sample.potential);
      maxField = Math.max(maxField, sample.magnitude);
    }
  }

  return { columns, rows, potentials, fields, minPotential, maxPotential, maxField };
}

function paintTechnicalBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  const background = ctx.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, '#07131f');
  background.addColorStop(0.6, '#08101a');
  background.addColorStop(1, '#03070d');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  const vignette = ctx.createRadialGradient(width * 0.5, height * 0.5, 0, width * 0.5, height * 0.5, width * 0.72);
  vignette.addColorStop(0, 'rgba(89, 217, 255, 0.05)');
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);

  drawFieldGrid(ctx, width, height);
}

function drawFieldGrid(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.save();
  ctx.strokeStyle = 'rgba(160, 195, 224, 0.08)';
  ctx.lineWidth = 1;
  const step = 56;
  ctx.beginPath();
  for (let x = step; x < width; x += step) {
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, height);
  }
  for (let y = step; y < height; y += step) {
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(width, y + 0.5);
  }
  ctx.stroke();
  ctx.restore();
}

function drawStreamlines({
  ctx,
  width,
  height,
  charges,
  settings,
  phase,
}: {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  charges: ElectricCharge[];
  settings: ElectricSettings;
  phase: number;
}) {
  const seedCount = Math.max(10, Math.round(settings.lineDensity));
  const streamlineStep = 8;
  const maxSegments = settings.preset === 'capacitor' ? 96 : 128;
  const dashOffset = -(phase * (18 + settings.probeDrift * 10));
  const chargeRadius = 14;

  ctx.save();
  ctx.strokeStyle = FIELD_COLORS.line;
  ctx.lineWidth = settings.viewMode === 'lines' ? 1.55 : 1.2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.setLineDash([5, 10]);
  ctx.lineDashOffset = dashOffset;
  if (settings.glow) {
    ctx.shadowColor = FIELD_COLORS.glow;
    ctx.shadowBlur = 14;
  }

  ctx.beginPath();
  for (const charge of charges) {
    if (charge.q <= 0) {
      continue;
    }

    for (let index = 0; index < seedCount; index += 1) {
      const angle = (index / seedCount) * TWO_PI;
      let x = charge.x + Math.cos(angle) * chargeRadius;
      let y = charge.y + Math.sin(angle) * chargeRadius;
      ctx.moveTo(x, y);

      for (let segment = 0; segment < maxSegments; segment += 1) {
        const sample = sampleField(charges, x, y);
        if (sample.magnitude < 0.0001) {
          break;
        }

        const velocity = clamp(sample.magnitude * 0.024, 0.4, 1.6);
        x += sample.ex * streamlineStep * velocity;
        y += sample.ey * streamlineStep * velocity;

        if (x < -24 || x > width + 24 || y < -24 || y > height + 24) {
          break;
        }

        if (isNearOppositeCharge(charges, x, y, charge.q, chargeRadius * 0.95)) {
          ctx.lineTo(x, y);
          break;
        }

        ctx.lineTo(x, y);
      }
    }
  }
  ctx.stroke();
  ctx.restore();
}

function drawChargeSprites(
  ctx: CanvasRenderingContext2D,
  charges: ElectricCharge[],
  glow: boolean,
) {
  for (const charge of charges) {
    const radius = 11 + Math.min(9, Math.abs(charge.q) * 1.1);
    const color = charge.q > 0 ? FIELD_COLORS.positive : FIELD_COLORS.negative;
    const halo = ctx.createRadialGradient(charge.x, charge.y, radius * 0.2, charge.x, charge.y, radius * 2.4);
    halo.addColorStop(0, charge.q > 0 ? 'rgba(255, 135, 84, 0.48)' : 'rgba(97, 215, 255, 0.42)');
    halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(charge.x, charge.y, radius * 2.4, 0, TWO_PI);
    ctx.fill();

    ctx.save();
    if (glow) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 18;
    }
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(charge.x, charge.y, radius, 0, TWO_PI);
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = 'rgba(7, 11, 17, 0.82)';
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.arc(charge.x, charge.y, radius, 0, TWO_PI);
    ctx.stroke();

    ctx.save();
    ctx.strokeStyle = 'rgba(244, 251, 255, 0.88)';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(charge.x - radius * 0.35, charge.y);
    ctx.lineTo(charge.x + radius * 0.35, charge.y);
    if (charge.q > 0) {
      ctx.moveTo(charge.x, charge.y - radius * 0.35);
      ctx.lineTo(charge.x, charge.y + radius * 0.35);
    }
    ctx.stroke();
    ctx.restore();
  }
}

function sampleField(charges: ElectricCharge[], x: number, y: number) {
  let potential = 0;
  let ex = 0;
  let ey = 0;

  for (const charge of charges) {
    const dx = x - charge.x;
    const dy = y - charge.y;
    const distanceSquared = dx * dx + dy * dy + EPSILON;
    const distance = Math.sqrt(distanceSquared);
    potential += charge.q / distance;
    const fieldFactor = charge.q / distanceSquared;
    ex += (fieldFactor * dx) / distance;
    ey += (fieldFactor * dy) / distance;
  }

  const rawMagnitude = Math.sqrt(ex * ex + ey * ey);
  const magnitude = Math.min(FIELD_LIMIT, rawMagnitude);
  if (rawMagnitude > 0) {
    ex /= rawMagnitude;
    ey /= rawMagnitude;
  }

  return { potential, ex, ey, magnitude };
}

function isNearOppositeCharge(
  charges: ElectricCharge[],
  x: number,
  y: number,
  sourceCharge: number,
  threshold: number,
) {
  for (const charge of charges) {
    if (Math.sign(charge.q) === Math.sign(sourceCharge)) {
      continue;
    }

    const dx = x - charge.x;
    const dy = y - charge.y;
    if (dx * dx + dy * dy <= threshold * threshold) {
      return true;
    }
  }

  return false;
}

function estimateStreamlineCount(charges: ElectricCharge[], lineDensity: number) {
  const positiveCharges = charges.filter((charge) => charge.q > 0).length;
  return positiveCharges * Math.max(10, Math.round(lineDensity));
}

function mixFieldColor(bias: number, magnitude: number) {
  const positive = { r: 255, g: 122, b: 69 };
  const negative = { r: 92, g: 242, b: 255 };
  const neutral = { r: 8, g: 18, b: 30 };
  const source = bias >= 0 ? positive : negative;
  const amount = Math.abs(bias);
  const r = neutral.r + (source.r - neutral.r) * amount;
  const g = neutral.g + (source.g - neutral.g) * amount;
  const b = neutral.b + (source.b - neutral.b) * amount;
  const lift = 0.18 + magnitude * 0.66;
  return {
    r: Math.round(clamp(r * lift, 0, 255)),
    g: Math.round(clamp(g * lift, 0, 255)),
    b: Math.round(clamp(b * lift, 0, 255)),
    a: Math.round(150 + magnitude * 92),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
