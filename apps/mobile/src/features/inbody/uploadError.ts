export function getUploadErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return "The report could not be uploaded. Check the file and retry.";
  }
  if (/network request failed|failed to fetch/i.test(error.message)) {
    return "BONYAN could not reach the server. Check your connection and retry.";
  }
  return error.message;
}
