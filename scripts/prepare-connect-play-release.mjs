import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  CONNECT_APK_FILENAME,
  CONNECT_EXPECTED_SHA256,
  CONNECT_EXPECTED_SIZE
} from './verify-connect-play-production.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

export function inspectFrozenConnectApk(apkPath){
  if(!apkPath)throw new Error('Signed Connect APK path is required');
  const absolute=path.resolve(apkPath);
  if(!fs.existsSync(absolute))throw new Error(`Signed Connect APK not found: ${absolute}`);
  const stat=fs.statSync(absolute);
  if(!stat.isFile())throw new Error('Signed Connect APK path is not a file');
  if(stat.size!==CONNECT_EXPECTED_SIZE){
    throw new Error(`Signed Connect APK size mismatch: expected ${CONNECT_EXPECTED_SIZE}, got ${stat.size}`);
  }
  const hash=createHash('sha256').update(fs.readFileSync(absolute)).digest('hex');
  if(hash!==CONNECT_EXPECTED_SHA256){
    throw new Error(`Signed Connect APK SHA-256 mismatch: ${hash}`);
  }
  return {absolute,size:stat.size,sha256:hash};
}

export function prepareConnectPlayRelease(apkPath){
  const inspected=inspectFrozenConnectApk(apkPath);
  const build=spawnSync(process.execPath,[path.join(root,'scripts','build.mjs')],{
    cwd:root,
    stdio:'inherit',
    env:process.env
  });
  if(build.status!==0)throw new Error(`Production build failed with exit code ${build.status ?? 'unknown'}`);

  const downloads=path.join(root,'dist','downloads');
  fs.mkdirSync(downloads,{recursive:true});
  const target=path.join(downloads,CONNECT_APK_FILENAME);
  fs.copyFileSync(inspected.absolute,target);
  fs.writeFileSync(
    path.join(downloads,'LittleMinds-Connect-1.0.0.sha256'),
    `${CONNECT_EXPECTED_SHA256}  ${CONNECT_APK_FILENAME}\n`,
    'utf8'
  );

  const deployed=inspectFrozenConnectApk(target);
  for(const required of ['privacy.html','account-data-request.html','assets/privacy-request.js','assets/privacy-controls.js']){
    const candidate=path.join(root,'dist',required);
    if(!fs.existsSync(candidate))throw new Error(`Release artifact missing required Play-readiness file: ${required}`);
  }

  return {dist:path.join(root,'dist'),apk:target,size:deployed.size,sha256:deployed.sha256};
}

function main(){
  const apkPath=process.argv[2]||process.env.LMU_CONNECT_SIGNED_APK;
  try{
    const report=prepareConnectPlayRelease(apkPath);
    console.log('Connect Play release artifact READY');
    console.log(`- dist: ${report.dist}`);
    console.log(`- APK: ${report.apk}`);
    console.log(`- bytes: ${report.size}`);
    console.log(`- SHA-256: ${report.sha256}`);
    console.log('- privacy.html: included');
    console.log('- account-data-request.html: included');
  }catch(error){
    console.error(`Connect Play release preparation FAIL: ${error.message}`);
    process.exitCode=1;
  }
}

if(import.meta.url===new URL(`file://${process.argv[1]}`).href)main();
