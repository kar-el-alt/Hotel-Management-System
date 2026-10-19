import { mockApi } from './mockApi';
import { realApi } from './realApi';

// Mock mode is the default so frontend work does not depend on the backend.
// Set REACT_APP_USE_MOCK=false to use the real API.
export const USE_MOCK = process.env.REACT_APP_USE_MOCK !== 'false';

export const api = USE_MOCK ? mockApi : realApi;
