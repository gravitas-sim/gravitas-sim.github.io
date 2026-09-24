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
    scenarios?: Array<{ id: string }>;
    investigations?: Array<{ id: string; entry?: string }>;
    translations?: Array<{ locale: string; investigation?: string; entry?: string }>;
  };
  assets?: Array<{ path: string; role: AssetRole; offline: Offline }>;
  citations: Array<{ text: string; url?: string; doi?: string }>;
  licenses: Array<{ scope: string; license: string }>;
  offline: { policy: 'precache' | 'on-demand' | 'online-only' };
  validation?: Array<{ check: string }>;
  migrations?: Array<{ from: string; to: string; renames?: Record<string, Record<string, string>> }>;
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
    rule?: { kind: 'folded-depth'; periodDays: number; expected: number; tolerance: number };
  };
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
export const EXTENSION_TYPES: Readonly<Record<'data-pack' | 'course-pack' | 'capability', { kind: 'declarative' | 'built-in'; code: boolean }>>;
export const LOCALES: readonly string[];

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
