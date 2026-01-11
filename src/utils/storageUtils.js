/**
 * Get user from either localStorage or sessionStorage
 * Checks localStorage first (30-day remember me), then sessionStorage
 */
export const getStoredUser = () => {
  const localUser = localStorage.getItem("user");
  if (localUser) {
    return JSON.parse(localUser);
  }
  
  const sessionUser = sessionStorage.getItem("user");
  if (sessionUser) {
    return JSON.parse(sessionUser);
  }
  
  return null;
};

/**
 * Clear user from both storage types (for logout)
 */
export const clearStoredUser = () => {
  localStorage.removeItem("user");
  sessionStorage.removeItem("user");
};

/**
 * Get raw user string for fallback parsing (returns empty object string if not found)
 */
export const getStoredUserString = () => {
  return localStorage.getItem("user") || sessionStorage.getItem("user") || "{}";
};
