import handler from '../../api/payfast-itn.js';
import { adaptVercelHandler } from './_adapter.mjs';
export default adaptVercelHandler(handler, { rawBody: true });
export const config = { path: '/api/payfast-itn' };
