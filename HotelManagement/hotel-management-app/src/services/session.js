import { ROLES } from '../utils/permissions';

export const SESSION_KEY = 'hotel-session';

// A saved session from an older version of the app (for example with the old role names) is ignored
export const readSession = () => {
  try {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY));
    return session && ROLES.includes(session.role) ? session : null;
  } catch (e) {
    return null;
  }
};

export const saveSession = (account) => {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(account));
  } catch (e) {
    // the app still works until the page is refreshed
  }
};

export const clearSession = () => {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch (e) {
    // nothing to clear
  }
};
