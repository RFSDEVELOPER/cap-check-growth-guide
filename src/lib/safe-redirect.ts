/** Accepts only same-site paths like "/conta" so sign-in can never send people to another site. */
export function safeRedirect(value: unknown, fallback = "/conta"): string {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (value.startsWith("/auth")) return fallback;
  return value;
}

export const AFTER_LOGIN_KEY = "ciacap-after-login";
export const PENDING_QUIZ_KEY = "ciacap-quiz-pending";
