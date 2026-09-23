import handler from '../../api/whatsapp.js';
import { adaptVercelHandler } from './_adapter.mjs';
export default adaptVercelHandler(handler);
export const config = { path: '/api/whatsapp' };
