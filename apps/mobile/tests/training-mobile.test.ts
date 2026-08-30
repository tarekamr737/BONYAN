import { afterEach, describe, expect, it, vi } from "vitest";

import {
  completeWorkoutSession,
  generateWorkoutPlan,
  getCurrentWorkoutPlan,
  logWorkoutSet,
  removeWorkoutSet,
  sendCoachMessage,
  startWorkoutSession,
} from "../src/features/training/api/trainingApi";

afterEach(() => {
  vi.unstubAllGlobals();
});

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
}

describe("training mobile API", () => {
  it("uses API data endpoints for plan generation and reads", async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(jsonResponse(null)));
    vi.stubGlobal("fetch", fetchMock);

    await getCurrentWorkoutPlan();
    await generateWorkoutPlan({
      activate: true,
      days_per_week: 3,
      equipment: ["bodyweight"],
      experience: "beginner",
      goal: "general_fitness",
      session_duration_minutes: 45,
    });

    expect(fetchMock.mock.calls[0]?.[0]).toContain("/api/v1/training/plans/current");
    expect(fetchMock.mock.calls[1]?.[0]).toContain("/api/v1/training/plans");
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).not.toHaveProperty(
      "latest_inbody",
    );
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).not.toHaveProperty(
      "recent_history",
    );
  });

  it("wires session start, log, remove, complete, and coach send endpoints", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(() => Promise.resolve(jsonResponse({ id: "session-1" })));
    vi.stubGlobal("fetch", fetchMock);

    await startWorkoutSession("plan-1", "day-1");
    await logWorkoutSet("session-1", {
      completed: true,
      prescription_index: 0,
      reps: 10,
      set_number: 1,
      weight_kg: 20,
    });
    await removeWorkoutSet("session-1", 0, 1);
    await completeWorkoutSession("session-1");
    await sendCoachMessage("Explain my training plan", [{ name: "get_current_plan" }]);

    expect(fetchMock.mock.calls[0]?.[0]).toContain(
      "/api/v1/training/sessions?day_key=day-1&plan_id=plan-1",
    );
    expect(fetchMock.mock.calls[1]?.[0]).toContain("/api/v1/training/sessions/session-1/sets");
    expect(fetchMock.mock.calls[2]?.[0]).toContain(
      "/api/v1/training/sessions/session-1/sets?prescription_index=0&set_number=1",
    );
    expect(fetchMock.mock.calls[3]?.[0]).toContain(
      "/api/v1/training/sessions/session-1/complete",
    );
    expect(fetchMock.mock.calls[4]?.[0]).toContain("/api/v1/training/coach");
    expect(JSON.parse(String(fetchMock.mock.calls[4]?.[1]?.body))).toEqual({
      message: "Explain my training plan",
      tool_calls: [{ name: "get_current_plan" }],
    });
  });
});
