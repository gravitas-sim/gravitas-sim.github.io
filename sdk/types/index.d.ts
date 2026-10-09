// =============================================================================
// Types for the Gravitas Extension SDK's public API (sdk/lib/api.mjs)
// -----------------------------------------------------------------------------
// For editors and for authors who write TypeScript. Gravitas itself is plain
// JavaScript and does not compile against these; tests/sdkContract.test.js
// checks that every export of sdk/lib/api.mjs is declared here and that every
// function declared here exists. The JSON formats have JSON Schemas beside
// this directory (sdk/schemas/).
// =============================================================================

/** A string in every locale an extension declares; English is required. */
export interface Localized {
  en: string;
  [locale: string]: string;
}

export type Offline = 'core' | 'optional' | 'locale' | 'none';
export type AssetRole = 'code' | 'data' | 'provenance' | 'translation' | 'image';

/** gravitas.capability-package/1: gravitas-extension.json. */
export interface CapabilityPackage {
  format: 'gravitas.capability-package';
  formatVersion: 1;
  id: string;
  version: string;
  kind: 'built-in' | 'declarative';
  /** The platform API range the package accepts, such as "^1.0.0". */
  gravitas: string;
  title: Localized;
  requires?: Record<string, string>;
  uses?: Partial<Record<'scenarios' | 'widgets' | 'dataPacks' | 'models', string[]>>;
  provides: {
    dataPacks?: Array<{ id: string; provenance: string; file?: string; entry?: string }>;
    courses?: Array<{ id: string; file: string }>;
    widgetFamilies?: Array<{ id: string; widgets: string[]; entry: string }>;
    routes?: Array<{ path: string }>;
    models?: Array<{ id: string }>;
    scenarios?: Array<{ id: string; file?: string }>;
    /** `file`: an investigation-pack extension's gravitas.investigation-pack/1 file. */
    investigations?: Array<{ id: string; entry?: string; file?: string }>;
    translations?: Array<{ locale: string; investigation?: string; entry?: string }>;
  };
  assets?: Array<{ path: string; role: AssetRole; offline: Offline }>;
  citations: Array<{ text: string; url?: string; doi?: string }>;
  licenses: Array<{ scope: string; license: string }>;
  offline: { policy: 'precache' | 'on-demand' | 'online-only' };
  validation?: Array<{ check: string }>;
  migrations?: Array<{ from: string; to: string; renames?: Record<string, Record<string, string>> }>;
}

/**
 * A written answer's rubric criterion (investigation packs and question banks,
 * Prompt 79): a name and two to five levels, best first. Up to six per answer;
 * every text in each of the file's locales.
 */
export interface RubricCriterion {
  name: Localized;
  levels: Array<{ label: Localized; text: Localized; points?: number }>;
}

/** gravitas.course-pack/1. */
export interface CoursePack {
  format: 'gravitas.course-pack';
  formatVersion: 1;
  id: string;
  version: string;
  locales: string[];
  title: Localized;
  summary?: Localized;
  units: Array<{
    id: string;
    title: Localized;
    lessons: Array<{ lesson: string; teacherNote?: Localized; studentNote?: Localized }>;
  }>;
}

/** A text in each locale, in plain words, with the digest of the English the Spanish was written from. */
export type PlainText = Localized & { esOf?: string };

/** What a lesson was when a course pack /2 named it. */
export interface LessonPin {
  /** The digest of the lesson's steps. */
  fp: string;
  /** How many steps it had. */
  n: number;
  /** The package it came from, and its version. */
  pkg?: [string, string];
  /** An assignment's pin: the digest of each assigned step, in order. */
  f?: string[];
}

/** One item of a course pack /2 (sdk/schemas/course-pack-2.schema.json). */
export type CourseItem = {
  id: string;
  path?: 'core' | 'intro' | 'advanced';
  minutes?: number;
  objectives?: string[];
  needs?: string[];
  studentNote?: PlainText;
  teacherNote?: PlainText;
} & (
  | { kind: 'lesson'; lesson: string; pin?: LessonPin }
  | {
      kind: 'assignment';
      lesson: string;
      steps: string[];
      title?: PlainText;
      intro?: PlainText;
      assignment: { id: string; created: string };
      pin?: LessonPin;
    }
  | { kind: 'scenario'; scenario: string; seed: string; paused?: boolean; title?: PlainText }
  | { kind: 'dataset'; dataset: string; title?: PlainText }
  | {
      /** An investigation pack, carried as its link (the fragment after #). Pinned by the digest of its compiled steps. */
      kind: 'pack';
      pack: string;
      version: string;
      link: string;
      title?: PlainText;
      pin?: LessonPin;
    }
  | {
      kind: 'reading';
      title: PlainText;
      cite: { authors: string; year: number; source: string; doi?: string; url?: string };
      license?: string;
      access: 'open' | 'library' | 'print';
    }
);

/**
 * gravitas.course-pack/2: what the course-pack builder writes. A course-pack
 * extension may carry this or the /1 form (CoursePack).
 */
export interface CoursePack2 {
  format: 'gravitas.course-pack';
  formatVersion: 2;
  id: string;
  version: string;
  /** The platform version it was made with. */
  gravitas: string;
  locales: string[];
  pinning: 'exact' | 'compatible';
  title: PlainText;
  summary?: PlainText;
  audience?: PlainText;
  teacherGuide?: PlainText;
  objectives?: Array<{ id: string; text: PlainText }>;
  prerequisites?: Array<{ lesson: string } | { text: PlainText }>;
  units: Array<{ id: string; title: PlainText; summary?: PlainText; items: CourseItem[] }>;
}

/** gravitas.scenario-pack/1 (sdk/schemas/scenario-pack-1.schema.json). */
export interface ScenarioPack {
  format: 'gravitas.scenario-pack';
  formatVersion: 1;
  id: string;
  version: string;
  locales: string[];
  title: Localized;
  summary: Localized;
  tags?: string[];
  seed: number;
  /** A built-in scenario to start from, by its public id ('solar-system'). */
  scenario?: string;
  settings?: Record<string, number | boolean | string | null | number[]>;
  camera?: { zoom: number; pan?: { x: number; y: number } };
  paused?: boolean;
  observer?: { inclination?: number; positionAngle?: number };
  open?: Array<'lightCurve' | 'radialVelocity' | 'rotationCurve' | 'astrometry' | 'pauseAtEvent' | 'view3d'>;
  tools?: Array<'ruler' | 'protractor' | 'stopwatch'>;
  system?: {
    bodies: Array<{
      name?: string;
      type: 'Star' | 'WhiteDwarf' | 'NeutronStar' | 'BlackHole' | 'GasGiant' | 'Planet';
      mass: number;
      radius?: number;
      primary?: number;
      a?: number;
      e?: number;
      omega?: number;
      phase?: number;
      retrograde?: boolean;
    }>;
  };
  bodies?: Array<{
    name?: string;
    type: 'Star' | 'WhiteDwarf' | 'NeutronStar' | 'BlackHole' | 'GasGiant' | 'Planet';
    mass: number;
    radius?: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
  }>;
}

/** gravitas.observation-data-pack/1 (DATA_PACKS.md has every field). */
export interface ObservationDataPack {
  format: 'gravitas.observation-data-pack';
  formatVersion: 1;
  id: string;
  version: string;
  title: string;
  dataType: 'light-curve' | 'radial-velocity' | 'spectrum' | 'strain' | 'model-grid' | 'system-parameters' | 'rotation-curve';
  origin: 'observed' | 'model' | 'compilation';
  credit: string;
  retrieved: string;
  derived: { file: string; bytes: number; sha256: string };
  transformation: { script: string; version: string; steps: string[] };
  validation: {
    check: string;
    against: object[];
    rule?:
      | { kind: 'folded-depth'; periodDays: number; expected: number; tolerance: number }
      | { kind: 'harmonic-period'; periodDays: number; windowDays: number; harmonics?: number; tolerance: number };
  };
  /** A TESS light curve's CROWDSAP and FLFRCSAP, as its header records them (1.3.0). */
  crowding?: { crowdsap: number; flfrcsap: number };
  [field: string]: unknown;
}

/** The in-memory series every data pack decodes to. */
export interface Observation {
  quantity: string;
  x: { name: string; unit: string; values: Float64Array; scale?: string; reference?: string };
  y: { name: string; unit: string; values: Float64Array };
  err: Float64Array | null;
  source: { kind: 'pack'; id: string; version: string; credit: string };
}

/** What kind of number a quantity is (PROVENANCE.md). */
export type Origin = 'measured' | 'derived' | 'assumed' | 'fitted' | 'fixed' | 'truth' | 'analytic' | 'synthetic';

/** A quantity's uncertainty, and where it comes from. */
export type Uncertainty =
  | { kind: 'none' }
  | { kind: 'sigma'; sigma: number; basis: 'data' | 'model' | 'assumed' | 'scaled' | 'profile' }
  | { kind: 'interval'; lo: number; hi: number; level?: number; basis: 'data' | 'model' | 'assumed' | 'scaled' | 'profile' };

/** gravitas.artifact/1: one scientific result (sdk/schemas/artifact-1.schema.json). */
export interface Artifact {
  format: 'gravitas.artifact';
  formatVersion: 1;
  id: string;
  made: { app: string; platform?: string; engineFingerprint?: string; at?: string };
  source: {
    kind: 'simulation' | 'observation' | 'data-pack' | 'pipeline' | 'inference' | 'experiment' | 'analysis' | 'guide' | 'forward-model';
    id: string;
    version?: string;
    digest?: string;
  };
  provenance?: {
    credit?: string;
    license?: { status: string; statement?: string; basis?: string };
    citations?: string[];
    retrieved?: string;
    reductions?: unknown[];
  };
  /** Each unit is an id of js/units/registry.js, exactly; null is not stated. */
  quantities: Array<{ id: string; value: number; unit: string | null; uncertainty: Uncertainty; origin: Origin; label?: string }>;
  warnings?: string[];
}

/** An instrument, as js/widgets.js loads one. */
export interface Instrument<V = Record<string, number>> {
  id: string;
  title: string;
  note: string;
  controls: Array<{ id: string; label: string; unit?: string; min: number; max: number; step: number; value: number; decimals?: number }>;
  compute?(values: V): unknown;
  readout?(values: V): Array<{ label: string; value: string | number; emphasis?: boolean }>;
  draw(canvas: HTMLCanvasElement, values: V): void;
}

export const SDK_VERSION: string;
export const PLATFORM_API: string;
export const FORMATS: Readonly<Record<string, number>>;
export const EXTENSION_TYPES: Readonly<Record<'data-pack' | 'course-pack' | 'investigation-pack' | 'scenario-pack' | 'capability', { kind: 'declarative' | 'built-in'; code: boolean }>>;
export const LOCALES: readonly string[];
export const INSTRUMENT_API: Readonly<Record<string, { module: string; exports: string[] }>>;
export function translator(
  catalogs: Record<string, Record<string, string>>,
  locale?: string
): (key: string, vars?: Record<string, string | number>) => string;
export function checkCatalogs(catalogs: Record<string, Record<string, string>>): string[];
export const COLOR_TOKENS: Readonly<Record<string, string>>;

export function publicIds(): Promise<{
  lessons: Set<string>;
  widgets: Set<string>;
  scenarios: Set<string>;
  dataPacks: Set<string>;
  courses: Set<string>;
  packages: Map<string, string>;
  lessonTitles: Map<string, Localized>;
}>;
export function acceptsPlatform(range: string): boolean;
export function installedDataPack(id: string): Promise<{ record: ObservationDataPack; file: string; module: object; observation: Observation }>;
export function observationOf(pack: { PACK: object; SERIES: object }): Observation;
export function checkObservation(o: Observation): string[];
export function artifact(parts: Pick<Artifact, 'id' | 'source' | 'quantities'> & Partial<Pick<Artifact, 'provenance' | 'warnings' | 'made'>>): Artifact;
export function validateArtifact(doc: unknown): Array<{ path: string; code: string; message: string }>;
export const ORIGINS: readonly Origin[];
export const BASES: readonly string[];
export const UNCERTAINTY_KINDS: readonly string[];
export const SOURCE_KINDS: readonly string[];
export interface FitsUnit {
  cards: Record<string, string | number | boolean | null>;
  columns?: Record<string, { unit: string | null; values: ArrayLike<number> }>;
}
/** Every header is checked against the file before any data is read; more than `maxUnits` (16) units is an error. */
export function readFits(bytes: Uint8Array, opts?: { maxUnits?: number }): FitsUnit[];
/** `flux` and `crowding` since 1.3.0; without them the output is 1.2.0's. */
export function binTessLightCurve(
  units: FitsUnit[],
  opts: { binMinutes: number; minPerBin: number; errStepPpm: number; fluxStepPpm?: number; flux?: 'PDCSAP' | 'SAP'; crowding?: boolean }
): {
  series: { encoding: 'binned-relative-flux/1' | 'binned-relative-flux/2'; t0: number; binDays: number; n: number; runs: Array<[number, number]>; flux: string; fluxStepPpm?: number; errStepPpm: number; err: string };
  record: { cadences: number; flagged: number; notFinite: number; kept: number; binsDropped: number; bins: number; medianFlux: number; fluxUnit: string | null; fluxColumn?: 'SAP_FLUX'; crowding?: { crowdsap: number | null; flfrcsap: number | null } };
};
/** The depth of the deepest phase slot, folded on a period in days (1.3.0). */
export function foldedDepth(o: Observation, periodDays: number): number;
