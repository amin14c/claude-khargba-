export enum OperationType {
  GET    = 'GET',
  LIST   = 'LIST',
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

export function handleFirestoreError(
  error:     unknown,
  operation: OperationType,
  path:      string
): void {
  const msg = error instanceof Error ? error.message : String(error);

  if (msg.includes('offline') || msg.includes('unavailable')) {
    console.warn(`[Firestore] Offline — ${operation} ${path} skipped.`);
    return;
  }
  if (msg.includes('permission-denied')) {
    console.error(`[Firestore] ⛔ Permission denied — ${operation} ${path}`);
    return;
  }
  if (msg.includes('not-found')) {
    console.warn(`[Firestore] Not found — ${operation} ${path}`);
    return;
  }
  console.error(`[Firestore] ${operation} ${path} failed:`, error);
}
