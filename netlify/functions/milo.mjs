import handler from '../../api/milo.js';
import { adaptVercelHandler } from './_adapter.mjs';
export default adaptVercelHandler(handler);
export const config = { path: '/api/milo' };
