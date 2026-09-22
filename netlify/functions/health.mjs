import handler from '../../api/health.js';
import { adaptVercelHandler } from './_adapter.mjs';
export default adaptVercelHandler(handler);
export const config = { path: '/api/health' };
