import crypto from 'node:crypto';
import { applyCors, HttpError, requireMethod, requireUuid, sendError } from './_lib/http.js';
import { authenticateRequest, adminGet, adminRpc, userRpc } from './_lib/supabase.js';

const NOTIFICATIONS = {
  homework_published: {
    templateEnv: 'WHATSAPP_TEMPLATE_HOMEWORK_PUBLISHED',
    languageEnv: 'WHATSAPP_TEMPLATE_HOMEWORK_LANGUAGE',
    defaultLanguage: 'en_US',
    resource: 'learning_item'
  },
  weekly_report_published: {
    templateEnv: 'WHATSAPP_TEMPLATE_WEEKLY_REPORT',
    languageEnv: 'WHATSAPP_TEMPLATE_WEEKLY_REPORT_LANGUAGE',
    defaultLanguage: 'en_US',
    resource: 'weekly_report'
  }
};

function notificationConfig(type) {
  const config = NOTIFICATIONS[String(type || '').trim()];
  if (!config) throw new HttpError(400, 'Unsupported notification type');
  const template = String(process.env[config.templateEnv] || '').trim();
  if (!template) throw new HttpError(503, `Template ${config.templateEnv} is not configured`);
  return {
    ...config,
    template,
    language: String(process.env[config.languageEnv] || config.defaultLanguage).trim()
  };
}

async function assertBusinessEvent({ type, config, actorId, learnerId, referenceId, accessToken }) {
  const teacherAccess = await userRpc(accessToken, 'teacher_can_access_learner', { p_learner_id: learnerId });
  if (teacherAccess !== true) throw new HttpError(403, 'Teacher is not authorized for this learner');

  if (config.resource === 'learning_item') {
    const owns = await userRpc(accessToken, 'teacher_owns_learning_item', { p_learning_item_id: referenceId });
    if (owns !== true) throw new HttpError(403, 'Teacher is not authorized for this learning item');
    const items = await adminGet(`learning_items?select=id,teacher_profile_id,status,published_at&id=eq.${encodeURIComponent(referenceId)}&limit=1`);
    const recipients = await adminGet(`learning_item_recipients?select=learner_id&learning_item_id=eq.${encodeURIComponent(referenceId)}&learner_id=eq.${encodeURIComponent(learnerId)}&limit=1`);
    const item = Array.isArray(items) ? items[0] : null;
    if (!item || item.teacher_profile_id !== actorId || item.status !== 'published' || !item.published_at) {
      throw new HttpError(409, 'Learning item is not in a published notification state');
    }
    if (!Array.isArray(recipients) || recipients.length !== 1) throw new HttpError(403, 'Learner is not assigned to this learning item');
    return;
  }

  if (config.resource === 'weekly_report') {
    const reports = await adminGet(
      `weekly_reports?select=id,learner_id,teacher_profile_id,status,approved_at&id=eq.${encodeURIComponent(referenceId)}&limit=1`
    );
    const report = Array.isArray(reports) ? reports[0] : null;
    if (!report || report.learner_id !== learnerId || report.teacher_profile_id !== actorId || report.status !== 'approved' || !report.approved_at) {
      throw new HttpError(403, 'Weekly report is not an approved notification for this learner');
    }
    return;
  }

  throw new HttpError(400, `Unsupported business event: ${type}`);
}

async function resolveRecipients(learnerId) {
  const links = await adminGet(
    `guardian_learner_links?select=guardian_profile_id,verified,can_receive_whatsapp&learner_id=eq.${encodeURIComponent(learnerId)}&verified=is.true&can_receive_whatsapp=is.true`
  );
  const results = [];
  for (const link of Array.isArray(links) ? links : []) {
    const contacts = await adminGet(
      `whatsapp_contacts?select=profile_id,phone_e164,opted_in&profile_id=eq.${encodeURIComponent(link.guardian_profile_id)}&opted_in=is.true&limit=1`
    );
    const contact = Array.isArray(contacts) ? contacts[0] : null;
    if (contact?.phone_e164 && /^\+[1-9]\d{7,14}$/.test(contact.phone_e164)) {
      results.push({ guardianProfileId: link.guardian_profile_id, phone: contact.phone_e164 });
    }
  }
  return results;
}

function idempotencyKey({ actorId, learnerId, guardianProfileId, type, referenceId }) {
  const raw = `${actorId}|${learnerId}|${guardianProfileId}|${type}|${referenceId}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}

async function sendTemplate({ phone, template, language }) {
  const token = String(process.env.WHATSAPP_ACCESS_TOKEN || '');
  const phoneId = String(process.env.WHATSAPP_PHONE_NUMBER_ID || '');
  if (!token || !phoneId) throw new HttpError(503, 'WhatsApp is not configured');
  const version = String(process.env.WHATSAPP_GRAPH_VERSION || 'v24.0');
  const endpoint = `https://graph.facebook.com/${version}/${encodeURIComponent(phoneId)}/messages`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: phone.replace('+', ''),
      type: 'template',
      template: { name: template, language: { code: language } }
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const code = data?.error?.code ? `meta_${data.error.code}` : `http_${response.status}`;
    const error = new HttpError(502, 'WhatsApp delivery failed');
    error.providerCode = code;
    throw error;
  }
  return data?.messages?.[0]?.id || null;
}

export async function dispatchNotification(req) {
  const { user, accessToken } = await authenticateRequest(req);
  const body = req.body || {};
  const type = String(body.notification_type || '').trim();
  const config = notificationConfig(type);
  const learnerId = requireUuid(body.learner_id, 'learner_id');
  const referenceId = requireUuid(body.reference_id, 'reference_id');

  await assertBusinessEvent({ type, config, actorId: user.id, learnerId, referenceId, accessToken });
  const recipients = await resolveRecipients(learnerId);
  if (!recipients.length) return { ok: true, sent: 0, skipped: 'no_opted_in_recipient' };

  const outcomes = [];
  for (const recipient of recipients) {
    const key = idempotencyKey({
      actorId: user.id,
      learnerId,
      guardianProfileId: recipient.guardianProfileId,
      type,
      referenceId
    });
    const reservations = await adminRpc('reserve_whatsapp_dispatch', {
      p_idempotency_key: key,
      p_actor_profile_id: user.id,
      p_learner_id: learnerId,
      p_guardian_profile_id: recipient.guardianProfileId,
      p_notification_type: type,
      p_reference_id: referenceId
    });
    const reservation = Array.isArray(reservations) ? reservations[0] : null;
    if (!reservation?.dispatch_id) throw new HttpError(502, 'Could not reserve notification dispatch');
    if (!reservation.should_send) {
      outcomes.push({ guardian_profile_id: recipient.guardianProfileId, duplicate: true });
      continue;
    }

    try {
      const messageId = await sendTemplate({
        phone: recipient.phone,
        template: config.template,
        language: config.language
      });
      await adminRpc('complete_whatsapp_dispatch', {
        p_dispatch_id: reservation.dispatch_id,
        p_provider_message_id: messageId
      });
      outcomes.push({ guardian_profile_id: recipient.guardianProfileId, sent: true, message_id: messageId });
    } catch (error) {
      await adminRpc('fail_whatsapp_dispatch', {
        p_dispatch_id: reservation.dispatch_id,
        p_error_code: error?.providerCode || 'provider_error'
      }).catch(() => null);
      throw error;
    }
  }

  return { ok: true, sent: outcomes.filter(v => v.sent).length, outcomes };
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  try {
    requireMethod(req, 'POST');
    return res.status(200).json(await dispatchNotification(req));
  } catch (error) {
    return sendError(res, error);
  }
}
