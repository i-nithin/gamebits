function clerkField(error: unknown) {
  if (!error || typeof error !== "object") return null;
  if ("errors" in error && Array.isArray(error.errors)) {
    const first = error.errors[0];
    if (first && typeof first === "object") return first;
  }
  return error;
}

export function clerkErrorCode(error: unknown) {
  const field = clerkField(error);
  if (field && "code" in field && typeof field.code === "string" && field.code !== "api_response_error") {
    return field.code;
  }
  return null;
}

export function clerkMessage(error: unknown, fallback = "Something went wrong. Try again.") {
  const field = clerkField(error);
  if (field && "longMessage" in field && typeof field.longMessage === "string" && field.longMessage.length > 0) {
    return field.longMessage;
  }
  return fallback;
}
