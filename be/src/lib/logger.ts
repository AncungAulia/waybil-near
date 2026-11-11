export function logError(
  operation: string,
  error: unknown,
  context: { route?: string; code?: string; txHash?: string } = {},
): void {
  const candidate = error as { code?: unknown } | null;
  const code =
    typeof candidate?.code === "string" && /^[A-Z_0-9]{1,64}$/.test(candidate.code)
      ? candidate.code
      : undefined;
  console.error(
    JSON.stringify({
      level: "error",
      operation,
      error: error instanceof Error ? error.constructor.name : "UnknownError",
      code,
      ...context,
    }),
  );
}
