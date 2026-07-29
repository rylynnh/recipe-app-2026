const ADMIN_PIN_KEY = 'mise_admin_pin';
const ADMIN_MODE_EVENT = 'mise:admin-mode-changed';

export const isAdminMode = () => Boolean(sessionStorage.getItem(ADMIN_PIN_KEY));
export const getAdminPin = () => sessionStorage.getItem(ADMIN_PIN_KEY);

export function enableAdminMode(pin: string) {
  sessionStorage.setItem(ADMIN_PIN_KEY, pin);
  window.dispatchEvent(new Event(ADMIN_MODE_EVENT));
}

export function disableAdminMode() {
  sessionStorage.removeItem(ADMIN_PIN_KEY);
  window.dispatchEvent(new Event(ADMIN_MODE_EVENT));
}

export { ADMIN_MODE_EVENT };
