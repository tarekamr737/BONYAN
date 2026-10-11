import { apiRequest } from "../../core/api/client";

export type Mission = {category: "workout" | "nutrition" | "recovery" | "checkin"; completed: number; target: number; points: number; maximum: number};
export type ProgressScore = {version: string; value: number | null; coverage: number; ranked: boolean; dimensions: Record<string, number | null>; weights: Record<string, number>; missing: string[]; basis: string};
export type GameOverview = {rules_version: string; server_time: string; timezone: string; week_start: string; week_end: string; progress_score: ProgressScore; xp: number; level: number; next_level_xp: number; mission_points: number; missions: Mission[]; badges: string[]; season: {id: string; starts_at: string; ends_at: string}; league_opt_in: boolean; partner_redemption_enabled: boolean};
export function getGameOverview(): Promise<GameOverview> {return apiRequest("/api/v1/game/overview");}
export function checkIn(kind: "recovery" | "checkin"): Promise<GameOverview> {return apiRequest("/api/v1/game/check-ins", {method: "POST", body: {kind}});}
export type ActivityEvent = {id: string; kind: string; local_day: string; version: string; eligible: boolean; created_at: string};
export function getActivity(before?: string): Promise<{items: ActivityEvent[]; next_cursor: string | null}> {return apiRequest(`/api/v1/game/activity${before ? `?before=${encodeURIComponent(before)}` : ""}`);}
