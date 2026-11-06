/**
 * Safely parse any timestamp representation (Firestore Timestamp, number in ms, number in seconds, ISO string, etc.) into epoch milliseconds.
 * @param {any} startedAt 
 * @returns {number} Timestamp in milliseconds, or 0 if invalid
 */
export function parseStartedAt(startedAt) {
  if (!startedAt) return 0;
  let startMs = 0;

  if (typeof startedAt === 'number') {
    // If timestamp is in seconds (< 1e11, e.g. 1770550000), scale to milliseconds
    startMs = startedAt < 1e11 ? startedAt * 1000 : startedAt;
  } else if (typeof startedAt === 'string') {
    const parsed = new Date(startedAt).getTime();
    if (!isNaN(parsed)) {
      startMs = parsed < 1e11 ? parsed * 1000 : parsed;
    }
  } else if (typeof startedAt === 'object') {
    if (typeof startedAt.toMillis === 'function') {
      startMs = startedAt.toMillis();
    } else if (typeof startedAt.toDate === 'function') {
      startMs = startedAt.toDate().getTime();
    } else if (startedAt.seconds !== undefined) {
      startMs = startedAt.seconds * 1000;
    } else if (startedAt._seconds !== undefined) {
      startMs = startedAt._seconds * 1000;
    }
  }

  return startMs;
}
