// Shared types for the deterministic prediction core.

export type LifeArea =
  | "Career"
  | "Relationships"
  | "Marriage"
  | "Wealth"
  | "Health"
  | "Spiritual"
  | "Family"
  | "Travel"
  | "Education"
  | "General";

export type EventType =
  | "dasha_shift"
  | "transit_ingress"
  | "transit_to_natal"
  | "retrograde_station"
  | "sade_sati_phase"
  | "yoga_activation"
  | "eclipse_window";

export interface TriggerSignal {
  kind:
    | "vimshottari"
    | "gochara"
    | "ashtakavarga"
    | "divisional"
    | "yoga"
    | "retrograde";
  detail: string;          // human-readable, e.g. "Saturn 2°14' applying conjunction to natal Sun"
  weight: number;          // 0..1 contribution to confidence
}

export interface PredictedEvent {
  event_type: EventType;
  life_area: LifeArea;
  headline: string;        // short, factual: "Career visibility window"
  window_start: string;    // ISO date YYYY-MM-DD
  window_end: string;
  confidence: number;      // 0..100
  triggers: TriggerSignal[];
}
