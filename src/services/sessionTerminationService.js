const attemptCleanup = async (label, operation, onCleanupError) => {
  try {
    await operation();
  } catch (error) {
    onCleanupError(label, error);
  }
};

export const runSessionTermination = async ({
  disconnect,
  clearFilters,
  clearStorage,
  signOut,
  resetState,
  onCleanupError = () => {},
}) => {
  await attemptCleanup('runtime disconnect', disconnect, onCleanupError);
  await attemptCleanup('session filters', clearFilters, onCleanupError);
  await attemptCleanup('application storage', clearStorage, onCleanupError);

  // Authentication state is authoritative. Do not present an unauthenticated
  // client state until Firebase has confirmed sign-out.
  await signOut();
  resetState();
};
