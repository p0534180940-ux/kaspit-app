// פונקציות AI/מייל לאתר (מחליף את base44.integrations.Core בצד הדפדפן)
import { createClientFromRequest, Core, serve } from '../_shared/b44.ts';

serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me().catch(() => null);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { op, params } = await req.json().catch(() => ({}));
  const fn = (Core as any)[op];
  if (!fn || !['InvokeLLM', 'TranscribeAudio', 'ExtractDataFromUploadedFile', 'SendEmail'].includes(op)) {
    return Response.json({ error: 'unknown op' }, { status: 400 });
  }
  const out = await fn(params || {});
  return Response.json(out ?? null);
});
