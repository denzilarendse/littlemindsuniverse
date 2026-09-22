import test from 'node:test';
import assert from 'node:assert/strict';
import { applyCors } from '../api/_lib/http.js';

function responseStub(){
  const headers=new Map();
  return {
    statusCode:null,ended:false,
    setHeader(k,v){headers.set(String(k).toLowerCase(),String(v));},
    status(code){this.statusCode=code;return this;},
    end(){this.ended=true;return this;},
    header(name){return headers.get(String(name).toLowerCase());}
  };
}

function productionEnv(){
  process.env.PUBLIC_APP_URL='https://littlemindsuniverse.co.za';
  process.env.VERCEL_ENV='production';
  process.env.NODE_ENV='production';
  process.env.PAYFAST_SANDBOX='false';
  process.env.CORS_ALLOWED_ORIGINS='https://www.littlemindsuniverse.co.za';
}

test('production CORS allows only configured web origins',()=>{
  productionEnv();
  const allowed=responseStub();
  assert.equal(applyCors({method:'POST',headers:{origin:'https://littlemindsuniverse.co.za'}},allowed),false);
  assert.equal(allowed.header('access-control-allow-origin'),'https://littlemindsuniverse.co.za');

  const www=responseStub();
  applyCors({method:'POST',headers:{origin:'https://www.littlemindsuniverse.co.za'}},www);
  assert.equal(www.header('access-control-allow-origin'),'https://www.littlemindsuniverse.co.za');

  const localhost=responseStub();
  applyCors({method:'POST',headers:{origin:'http://localhost:5500'}},localhost);
  assert.equal(localhost.header('access-control-allow-origin'),undefined);

  const unknown=responseStub();
  applyCors({method:'POST',headers:{origin:'https://attacker.example'}},unknown);
  assert.equal(unknown.header('access-control-allow-origin'),undefined);
});

test('development CORS permits explicit localhost origins without wildcarding production',()=>{
  process.env.PUBLIC_APP_URL='https://littlemindsuniverse.co.za';
  process.env.VERCEL_ENV='development';
  process.env.NODE_ENV='development';
  process.env.PAYFAST_SANDBOX='true';
  process.env.CORS_ALLOWED_ORIGINS='';
  const res=responseStub();
  applyCors({method:'POST',headers:{origin:'http://localhost:5500'}},res);
  assert.equal(res.header('access-control-allow-origin'),'http://localhost:5500');
  assert.equal(res.header('access-control-allow-methods'),'POST, OPTIONS');
  assert.match(res.header('access-control-allow-headers'),/Authorization/);
});

test('preflight from unknown origin returns no CORS grant',()=>{
  productionEnv();
  const res=responseStub();
  assert.equal(applyCors({method:'OPTIONS',headers:{origin:'https://attacker.example'}},res),true);
  assert.equal(res.statusCode,204);
  assert.equal(res.ended,true);
  assert.equal(res.header('access-control-allow-origin'),undefined);
});
