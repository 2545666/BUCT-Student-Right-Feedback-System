const configuredApiBase = import.meta.env.VITE_API_BASE || '/api';

export const API_BASE = configuredApiBase.replace(/\/$/, '');
