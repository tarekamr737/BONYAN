import { apiRequest } from "../../../core/api/client";
import type {
  CoachMessageResponse,
  CoachMessage,
  ExerciseMediaAccess,
  GeneratePlanRequest,
  LoggedSetInput,
  WorkoutPlan,
  WorkoutSession,
  ExerciseSearchResponse,
  ManualPlanRequest,
} from "../types";

export function searchExercises(query: string): Promise<ExerciseSearchResponse> {
  return apiRequest(`/api/v1/training/exercises?query=${encodeURIComponent(query)}&page_size=20`);
}

export function createManualWorkoutPlan(request: ManualPlanRequest): Promise<WorkoutPlan> {
  return apiRequest("/api/v1/training/plans/manual", { body: request, method: "POST" });
}

export function getExerciseMediaAccess(exerciseId: string): Promise<ExerciseMediaAccess | null> {
  return apiRequest<ExerciseMediaAccess | null>(
    `/api/v1/training/exercises/${encodeURIComponent(exerciseId)}/media`,
  );
}

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
  const query = `day_key=${encodeURIComponent(dayKey)}&plan_id=${encodeURIComponent(planId)}`;
  return apiRequest<WorkoutSession>(`/api/v1/training/sessions?${query}`, {
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

export function removeWorkoutSet(
  sessionId: string,
  prescriptionIndex: number,
  setNumber: number,
): Promise<WorkoutSession> {
  const query = new URLSearchParams({
    prescription_index: String(prescriptionIndex),
    set_number: String(setNumber),
  });
  return apiRequest<WorkoutSession>(
    `/api/v1/training/sessions/${sessionId}/sets?${query.toString()}`,
    {
      method: "DELETE",
    },
  );
}

export function sendCoachMessage(
  message: string,
): Promise<CoachMessageResponse> {
  return apiRequest<CoachMessageResponse>("/api/v1/training/coach", {
    body: { message },
    method: "POST",
  });
}

export function getCoachMessages(): Promise<CoachMessage[]> {
  return apiRequest<CoachMessage[]>("/api/v1/training/coach/messages?limit=50");
}

export function getWorkoutSessions(limit = 20): Promise<WorkoutSession[]> {
  return apiRequest<WorkoutSession[]>(`/api/v1/training/sessions?limit=${limit}`);
}

export function getWorkoutPlan(planId: string): Promise<WorkoutPlan> {
  return apiRequest(`/api/v1/training/plans/${encodeURIComponent(planId)}`);
}
export function activateWorkoutPlan(planId: string): Promise<WorkoutPlan> {
  return apiRequest(`/api/v1/training/plans/${encodeURIComponent(planId)}/activate`, {method: "POST"});
}
export function getWorkoutSession(sessionId: string): Promise<WorkoutSession> {
  return apiRequest(`/api/v1/training/sessions/${encodeURIComponent(sessionId)}`);
}

export type SubstituteRequest = {plan_id: string; day_key: string; prescription_index: number; available_equipment: string[]; expected_exercise_id?: string};
export function substituteExercise(request: SubstituteRequest, preview = false): Promise<WorkoutPlan> {
  return apiRequest(`/api/v1/training/substitutions${preview ? "/preview" : ""}`, {method: "POST", body: request});
}
