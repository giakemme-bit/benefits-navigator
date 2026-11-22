// Answers are kept in memory only. This removes what earlier versions saved on the device.
const KEY = 'benefits-navigator:v1';

export function clearState() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // Storage disabled: nothing to remove.
  }
}
