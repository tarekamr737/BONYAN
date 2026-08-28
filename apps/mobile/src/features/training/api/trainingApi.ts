import { apiRequest } from "../../../core/api/client";
import type {
  CoachMessageResponse,
  GeneratePlanRequest,
  LoggedSetInput,
  WorkoutPlan,
  WorkoutSession,
} from "../types";

export function generateWorkoutPlan(request: GeneratePlanRequest): Promise<WorkoutPlan> {
  return apiRequest<WorkoutPlan>("/api/v1/training/plans", {
    body: request,
    method: "POST",
  });
}

export function getCurrentWorkoutPlan(): Promise<WorkoutPlan | null> {
  return apiRequest<WorkoutPlan | null>("/api/v1/training/plans/current");
}

export function startWorkoutSession(planId: string, dayKey: string): Promise<WorkoutSession> {
  const query = new URLSearchParams({ day_key: dayKey, plan_id: planId });
  return apiRequest<WorkoutSession>(`/api/v1/training/sessions?${query.toString()}`, {
    method: "POST",
  });
}

export function logWorkoutSet(
  sessionId: string,
  loggedSet: LoggedSetInput,
): Promise<WorkoutSession> {
  return apiRequest<WorkoutSession>(`/api/v1/training/sessions/${sessionId}/sets`, {
    body: loggedSet,
    method: "POST",
  });
}

export function completeWorkoutSession(sessionId: string): Promise<WorkoutSession> {
  return apiRequest<WorkoutSession>(`/api/v1/training/sessions/${sessionId}/complete`, {
    method: "POST",
  });
}

export function sendCoachMessage(message: string): Promise<CoachMessageResponse> {
  return apiRequest<CoachMessageResponse>("/api/v1/training/coach", {
    body: { message },
    method: "POST",
  });
}
