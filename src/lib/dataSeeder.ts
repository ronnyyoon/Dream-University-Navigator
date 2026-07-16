export async function checkNeedSeeding(): Promise<boolean> {
  // Always return false in offline local mode since we load from local JSON and seedData directly
  return false;
}

export async function seedInitialData(): Promise<void> {
  // No-op in offline mode
  return Promise.resolve();
}
