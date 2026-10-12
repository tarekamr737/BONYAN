import { apiRequest } from "../../core/api/client";

export type Mission = {category: "workout" | "nutrition" | "recovery" | "checkin"; completed: number; target: number; points: number; maximum: number};
export type ProgressScore = {version: string; value: number | null; coverage: number; ranked: boolean; dimensions: Record<string, number | null>; weights: Record<string, number>; missing: string[]; basis: string};
export type GameOverview = {rules_version: string; server_time: string; timezone: string; week_start: string; week_end: string; progress_score: ProgressScore; xp: number; level: number; next_level_xp: number; mission_points: number; missions: Mission[]; badges: string[]; season: {id: string; starts_at: string; ends_at: string}; league_opt_in: boolean; partner_redemption_enabled: boolean};
export function getGameOverview(): Promise<GameOverview> {return apiRequest("/api/v1/game/overview");}
export type ProgressHistory = {id: string; created_at: string; result: ProgressScore};
export function getProgressHistory(): Promise<ProgressHistory[]> {return apiRequest("/api/v1/game/progress/history");}
export function checkIn(kind: "recovery" | "checkin"): Promise<GameOverview> {return apiRequest("/api/v1/game/check-ins", {method: "POST", body: {kind}});}
export type ActivityEvent = {id: string; kind: string; local_day: string; version: string; eligible: boolean; created_at: string};
export function getActivity(before?: string): Promise<{items: ActivityEvent[]; next_cursor: string | null}> {return apiRequest(`/api/v1/game/activity${before ? `?before=${encodeURIComponent(before)}` : ""}`);}
export type LeagueMode = "weekly" | "friends" | "all_time";
export type LeagueEntry = {rank: number | null; display_name: string; avatar_url: string | null; points: number; is_me: boolean; progress_score: number | null; unranked_reason: string | null; badges?: string[]};
export type LeagueView = {mode: LeagueMode; opted_in: boolean; week_end: string; season: GameOverview["season"]; personal_rank: number | null; participants: LeagueEntry[]};
export function getLeague(mode: LeagueMode): Promise<LeagueView> {return apiRequest(`/api/v1/game/league?mode=${mode}`);}
export function setLeagueParticipation(enabled: boolean): Promise<LeagueView> {return apiRequest("/api/v1/game/league/participation", {method: "PUT", body: {enabled}});}
export type Friend = {id: string; display_name: string; status: string; incoming: boolean};
export type FriendsView = {invite_code: string; items: Friend[]};
export function getFriends(): Promise<FriendsView> {return apiRequest("/api/v1/game/friends");}
export function inviteFriend(invite_code: string): Promise<FriendsView> {return apiRequest("/api/v1/game/friends/invitations", {method: "POST", body: {invite_code}});}
export function replyFriend(id: string, accept: boolean): Promise<FriendsView> {return apiRequest(`/api/v1/game/friends/invitations/${id}/reply`, {method: "POST", body: {accept}});}
export type Challenge = {id: string; category: string; status: string; incoming: boolean; target_points: number; my_points: number; friend_points: number; starts_at: string; ends_at: string};
export function getChallenges(): Promise<Challenge[]> {return apiRequest("/api/v1/game/challenges");}
export function createChallenge(friendship_id: string, category: string): Promise<Challenge[]> {return apiRequest("/api/v1/game/challenges", {method: "POST", body: {friendship_id, category}});}
export function replyChallenge(id: string, accept: boolean): Promise<Challenge[]> {return apiRequest(`/api/v1/game/challenges/${id}/reply`, {method: "POST", body: {accept}});}
export function getWallet(): Promise<{badges: string[]; xp: number; partner_redemption_enabled: boolean; partner_offers: unknown[]}> {return apiRequest("/api/v1/game/wallet");}
