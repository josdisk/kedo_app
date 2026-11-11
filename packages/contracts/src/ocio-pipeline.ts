/** Portable OCIO/ACES pipeline descriptors (COL-002/011) — no libOpenColorIO link. */

export const OCIO_CONFIG_VERSION = "kedov-aces-lite-1.0" as const;

export interface ColorSpaceDesc {
  name: string;
  family: string;
  is_data: boolean;
  description?: string;
}

export interface DisplayView {
  name: string;
  colorspace: string;
  description?: string;
}

export interface DisplayDesc {
  name: string;
  views: DisplayView[];
}

export interface OcioConfigDescriptor {
  schema_version: string;
  name: string;
  description: string;
  ocio_compatible: boolean;
  libocio_required: boolean;
  working_space: string;
  roles: {
    reference: string;
    scene_linear: string;
    compositing_log?: string;
    color_timing?: string;
    data?: string;
    default?: string;
  };
  colorspaces: ColorSpaceDesc[];
  displays: DisplayDesc[];
}

export interface DisplayTransformRequest {
  working_space: string;
  display: string;
  view: string;
}

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** Packaged ACES-lite descriptor mirroring native/media-color/ocio/kedov_aces_lite.json */
export function packagedAcesLiteConfig(): OcioConfigDescriptor {
  return {
    schema_version: "1.0",
    name: "kedov-aces-lite",
    description:
      "Packaged ACES-compatible roles for KeDo Smart V (COL-002). libOpenColorIO remains license-gated.",
    ocio_compatible: true,
    libocio_required: false,
    working_space: "ACEScg",
    roles: {
      reference: "ACES2065-1",
      scene_linear: "ACEScg",
      compositing_log: "ACEScct",
      color_timing: "ACEScct",
      data: "Raw",
      default: "ACEScg",
    },
    colorspaces: [
      { name: "ACES2065-1", family: "ACES", is_data: false },
      { name: "ACEScg", family: "ACES", is_data: false },
      { name: "ACEScct", family: "ACES", is_data: false },
      { name: "Linear Rec.709", family: "Display", is_data: false },
      { name: "sRGB", family: "Display", is_data: false },
      { name: "Raw", family: "Data", is_data: true },
    ],
    displays: [
      {
        name: "sRGB",
        views: [
          { name: "ACES", colorspace: "sRGB" },
          { name: "Un-tone-mapped", colorspace: "Linear Rec.709" },
        ],
      },
      {
        name: "Rec.709",
        views: [{ name: "ACES", colorspace: "sRGB" }],
      },
    ],
  };
}

export function validateOcioConfig(cfg: OcioConfigDescriptor): string[] {
  const errors: string[] = [];
  if (!cfg.name) errors.push("missing name");
  if (!cfg.working_space) errors.push("missing working_space");
  if (!cfg.colorspaces?.length) errors.push("no colorspaces");
  if (!cfg.displays?.length) errors.push("no displays");
  if (!cfg.colorspaces.some((c) => c.name === cfg.working_space)) {
    errors.push("working_space not listed in colorspaces");
  }
  if (cfg.libocio_required) {
    errors.push("libocio_required=true but linking is license-gated in this build");
  }
  for (const d of cfg.displays ?? []) {
    if (!d.views?.length) errors.push(`display ${d.name} has no views`);
  }
  return errors;
}

function mulMat3(m: number[], inRgb: Rgb): Rgb {
  return {
    r: m[0]! * inRgb.r + m[1]! * inRgb.g + m[2]! * inRgb.b,
    g: m[3]! * inRgb.r + m[4]! * inRgb.g + m[5]! * inRgb.b,
    b: m[6]! * inRgb.r + m[7]! * inRgb.g + m[8]! * inRgb.b,
  };
}

function srgbEotf(lin: number): number {
  if (lin <= 0.0031308) return 12.92 * lin;
  return 1.055 * Math.pow(lin, 1 / 2.4) - 0.055;
}

function clamp01(c: Rgb): Rgb {
  const sat = (v: number) => Math.min(1, Math.max(0, v));
  return { r: sat(c.r), g: sat(c.g), b: sat(c.b) };
}

/**
 * ACEScg → display transform lite (mirrors native apply_display_transform).
 * Approximate — not a certified Academy Output Transform.
 */
export function applyDisplayTransform(
  sceneLinearAcescg: Rgb,
  req: DisplayTransformRequest,
): { ok: boolean; out: Rgb; message: string; path: string } {
  if (req.working_space !== "ACEScg") {
    return {
      ok: false,
      out: sceneLinearAcescg,
      message: "unsupported working_space",
      path: "",
    };
  }
  if (req.display !== "sRGB" && req.display !== "Rec.709") {
    return {
      ok: false,
      out: sceneLinearAcescg,
      message: "unsupported display",
      path: "",
    };
  }

  const acescgToXyz = [
    0.6624541811, 0.1341932422, 0.1562437705, 0.2722287168, 0.6740817658,
    0.0536895174, -0.0055746495, 0.0040607335, 1.0103391003,
  ];
  const xyzToRec709 = [
    3.2404542, -1.5371385, -0.4985314, -0.9692660, 1.8760108, 0.0415560,
    0.0556434, -0.2040259, 1.0572252,
  ];
  const xyz = mulMat3(acescgToXyz, sceneLinearAcescg);
  const lin709 = mulMat3(xyzToRec709, xyz);

  if (req.view === "Un-tone-mapped") {
    return {
      ok: true,
      out: lin709,
      message: "ok",
      path: "ACEScg → XYZ → Linear Rec.709",
    };
  }

  const soft = (v: number) => {
    const x = Math.max(0, v);
    return (x / (x + 0.18)) * 0.18 * (1 + x);
  };
  const mapped = { r: soft(lin709.r), g: soft(lin709.g), b: soft(lin709.b) };
  return {
    ok: true,
    out: clamp01({
      r: srgbEotf(mapped.r),
      g: srgbEotf(mapped.g),
      b: srgbEotf(mapped.b),
    }),
    message: "ok",
    path: "ACEScg → XYZ → Rec.709 → soft OT → sRGB EOTF",
  };
}

export function deltaE76Approx(a: Rgb, b: Rgb): number {
  const toLab = (rgb: Rgb): Rgb => {
    const m = [
      0.4124564, 0.3575761, 0.1804375, 0.2126729, 0.7151522, 0.072175,
      0.0193339, 0.119192, 0.9503041,
    ];
    const xyz = mulMat3(m, clamp01(rgb));
    const f = (t: number) =>
      t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
    const fx = f(xyz.r / 0.95047);
    const fy = f(xyz.g / 1.0);
    const fz = f(xyz.b / 1.08883);
    return { r: 116 * fy - 16, g: 500 * (fx - fy), b: 200 * (fy - fz) };
  };
  const la = toLab(a);
  const lb = toLab(b);
  const dL = la.r - lb.r;
  const da = la.g - lb.g;
  const db = la.b - lb.b;
  return Math.sqrt(dL * dL + da * da + db * db);
}
