import { handleApi } from '../../api/handler.js';

export async function onRequest(context) {
  return handleApi(context.request, context.env);
}
