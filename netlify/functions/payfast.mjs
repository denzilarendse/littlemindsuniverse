import handler from '../../api/payfast.js';
import { adaptVercelHandler } from './_adapter.mjs';
export default adaptVercelHandler(handler);
export const config = { path: '/api/payfast' };
