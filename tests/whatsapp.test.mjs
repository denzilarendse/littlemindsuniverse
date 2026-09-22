import test from 'node:test';
import assert from 'node:assert/strict';
import { dispatchNotification } from '../api/whatsapp.js';

const jsonResponse = (data, status = 200) => new Response(JSON.stringify(data), { status, headers:{'content-type':'application/json'} });

function configure() {
  process.env.SUPABASE_URL='https://project.supabase.co';
  process.env.SUPABASE_PUBLISHABLE_KEY='sb_publishable_test';
  process.env.SUPABASE_SECRET_KEY='sb_secret_test';
  process.env.WHATSAPP_ACCESS_TOKEN='server-token';
  process.env.WHATSAPP_PHONE_NUMBER_ID='12345';
  process.env.WHATSAPP_GRAPH_VERSION='v24.0';
  process.env.WHATSAPP_TEMPLATE_HOMEWORK_PUBLISHED='lmu_homework_published';
}

test('WhatsApp notification resolves authorized recipient/template server-side', async () => {
  configure();
  let metaPayload;
  global.fetch = async (url, options={}) => {
    const u=String(url);
    if (u.endsWith('/auth/v1/user')) return jsonResponse({ id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' });
    if (u.endsWith('/rest/v1/rpc/teacher_can_access_learner')) return jsonResponse(true);
    if (u.endsWith('/rest/v1/rpc/teacher_owns_learning_item')) return jsonResponse(true);
    if (u.includes('/rest/v1/learning_items?')) return jsonResponse([{ id:'cccccccc-cccc-4ccc-8ccc-cccccccccccc', teacher_profile_id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', status:'published', published_at:'2026-09-22T18:00:00Z' }]);
    if (u.includes('/rest/v1/learning_item_recipients?')) return jsonResponse([{ learner_id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' }]);
    if (u.includes('/rest/v1/guardian_learner_links?')) return jsonResponse([{ guardian_profile_id:'dddddddd-dddd-4ddd-8ddd-dddddddddddd', verified:true, can_receive_whatsapp:true }]);
    if (u.includes('/rest/v1/whatsapp_contacts?')) return jsonResponse([{ profile_id:'dddddddd-dddd-4ddd-8ddd-dddddddddddd', phone_e164:'+27821234567', opted_in:true }]);
    if (u.endsWith('/rest/v1/rpc/reserve_whatsapp_dispatch')) return jsonResponse([{ dispatch_id:'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', should_send:true }]);
    if (u.startsWith('https://graph.facebook.com/')) { metaPayload=JSON.parse(options.body); return jsonResponse({ messages:[{id:'wamid.test'}] }); }
    if (u.endsWith('/rest/v1/rpc/complete_whatsapp_dispatch')) return jsonResponse(true);
    throw new Error(`Unexpected fetch ${u}`);
  };

  const result=await dispatchNotification({
    headers:{authorization:'Bearer user-jwt'},
    body:{
      notification_type:'homework_published',
      learner_id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      reference_id:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      to:'+19999999999', template:'attacker_template'
    }
  });
  assert.equal(result.sent,1);
  assert.equal(metaPayload.to,'27821234567');
  assert.equal(metaPayload.template.name,'lmu_homework_published');
});

test('unassigned teacher is denied before provider call', async () => {
  configure();
  let providerCalled=false;
  global.fetch=async url=>{
    const u=String(url);
    if(u.endsWith('/auth/v1/user')) return jsonResponse({id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'});
    if(u.endsWith('/rest/v1/rpc/teacher_can_access_learner')) return jsonResponse(false);
    if(u.startsWith('https://graph.facebook.com/')) providerCalled=true;
    throw Object.assign(new Error('denied'), { status:403 });
  };
  await assert.rejects(()=>dispatchNotification({headers:{authorization:'Bearer user-jwt'},body:{notification_type:'homework_published',learner_id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',reference_id:'cccccccc-cccc-4ccc-8ccc-cccccccccccc'}}), error=>error.status===403);
  assert.equal(providerCalled,false);
});
