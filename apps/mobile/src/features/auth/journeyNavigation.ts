import { getAccessToken } from "../../core/auth/session";

/** Only user Back actions should revisit questions; redirects must remain free to leave. */
export function shouldStepBack(position: number, complete: boolean, actionType = "GO_BACK"): boolean {
  return position > 0 && !complete && getAccessToken() !== null
    && (actionType === "GO_BACK" || actionType === "POP");
}
