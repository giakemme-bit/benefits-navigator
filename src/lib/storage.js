// Answers and language are kept in memory only.
// This removes what earlier versions of the site saved on the device.
const KEYS = ['benefits-navigator:v1', 'benefits-navigator:lang'];

export function clearState() {
  for (const key of KEYS) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Storage disabled: nothing to remove.
    }
  }
}
