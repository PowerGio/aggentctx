export type Result<T, E = AppError> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

export function unwrapOr<T, E>(result: Result<T, E>, fallback: T): T {
  return result.ok ? result.value : fallback;
}

export type AppError =
  | { readonly kind: 'file-not-found'; readonly path: string }
  | { readonly kind: 'parse-error'; readonly file: string; readonly reason: string }
  | { readonly kind: 'unsupported-project'; readonly reason: string }
  | { readonly kind: 'write-failed'; readonly path: string; readonly reason: string }
  | { readonly kind: 'security-violation'; readonly reason: string }
  | { readonly kind: 'template-not-found'; readonly stackId: string };

export function formatError(error: AppError): string {
  switch (error.kind) {
    case 'file-not-found':
      return `File not found: ${error.path}`;
    case 'parse-error':
      return `Could not parse ${error.file}: ${error.reason}`;
    case 'unsupported-project':
      return `Unsupported project: ${error.reason}`;
    case 'write-failed':
      return `Could not write ${error.path}: ${error.reason}`;
    case 'security-violation':
      return `Security violation: ${error.reason}`;
    case 'template-not-found':
      return `No template found for stack: ${error.stackId}`;
  }
}
