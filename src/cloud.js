import {PublicClientApplication} from '@azure/msal-browser';
import {makeKey,encryptEvent,decryptEvent,mergeEvents,pendingEvents,remoteName,validateEvent,SCHEMA,bytesToB64,b64ToBytes} from './sync-core.js';
const GRAPH='https://graph.microsoft.com/v1.0';
const SCOPE='Files.ReadWrite.AppFolder';
const META='health-timeline-v2-config.json';
const KEY='health_timeline_v1';
let client=null, account=null, busy=false;
const $=x=>document.getElementById(x);
const note=s=>{$('cloud-message').textContent=s;};
function load(){let r=JSON.parse(localStorage.getItem(KEY)||'[]');if(!Array.isArray(r))throw Error('Local records have invalid format');return r;}
function store(data){localStorage.setItem(KEY,JSON.stringify(data));window.dispatchEvent(new Event('health-records-external-update'));}
async function request(url,token,options={}){
 const r=await fetch(url,{...options,headers:{Authorization:`Bearer ${token}`,...options.headers}});
 if(!r.ok){let detail=(await r.text()).slice(0,400);throw Error(`OneDrive ${r.status}: ${detail}`);}
 return r;
}
async function getToken(){if(!account)throw Error('Sign in to Microsoft first');try{return (await client.acquireTokenSilent({account,scopes:[SCOPE]})).accessToken;}catch{return (await client.acquireTokenPopup({account,scopes:[SCOPE]})).accessToken;}}
async function getFolder(token){return (await request(`${GRAPH}/me/drive/special/approot`,token)).json();}
async function listChildren(token,folder){let url=`${GRAPH}/me/drive/items/${encodeURIComponent(folder.id)}/children?$top=200&$select=id,name,size,file`;let all=[];while(url){const x=await (await request(url,token)).json();all.push(...(x.value||[]));url=x['@odata.nextLink']||null;}return all;}
async function putFile(token,folder,name,data){return request(`${GRAPH}/me/drive/items/${encodeURIComponent(folder.id)}:/${encodeURIComponent(name)}:/content`,token,{method:'PUT',headers:{'Content-Type':'application/json'},body:data});}
async function downloadFile(token,id){return (await request(`${GRAPH}/me/drive/items/${encodeURIComponent(id)}/content`,token)).text();}
async function prepareKey(token,folder,children,pass){let meta=children.find(x=>x.name===META);let salt;
 if(meta){const doc=JSON.parse(await downloadFile(token,meta.id));if(doc.schema!==SCHEMA||typeof doc.salt!=='string')throw Error('Incompatible cloud setup');salt=b64ToBytes(doc.salt);}
 else {if(children.some(x=>x.name.startsWith('event-')))throw Error('Encrypted records exist without a configuration file. Nothing changed.');salt=crypto.getRandomValues(new Uint8Array(16));await putFile(token,folder,META,JSON.stringify({schema:SCHEMA,salt:bytesToB64(salt),kdf:'PBKDF2-SHA256',iterations:310000,cipher:'AES-256-GCM'}));}
 return makeKey(pass,salt);
}
async function init(){const clientId=$('client-id').value.trim();if(!/^[0-9a-f-]{36}$/i.test(clientId))throw Error('Enter the Application (client) ID from Microsoft Entra app registration.');
 localStorage.setItem('health_ms_clientid',clientId);
 client=new PublicClientApplication({auth:{clientId,authority:'https://login.microsoftonline.com/consumers',redirectUri:new URL('auth-redirect.html',document.baseURI).href},cache:{cacheLocation:'sessionStorage'}});
 await client.initialize();
 account=client.getAllAccounts()[0]||null;
}
async function connect(){if(!window.isSecureContext)throw Error('Use HTTPS or localhost; Microsoft login and browser encryption require a secure context.');await init(); if(!account){const result=await client.loginPopup({scopes:[SCOPE],redirectUri:new URL('auth-redirect.html',document.baseURI).href});account=result.account;}note(`Signed in as ${account.username}. Sync is not automatic. Click Sync now.`);}
async function sync(){if(busy)return;busy=true;$('cloud-sync').disabled=true;try{
 if(!account)throw Error('Connect Microsoft account first.');const pass=$('cloud-pass').value; if(pass.length<14)throw Error('Passphrase must contain at least 14 characters');const token=await getToken();note('Checking cloud folder…');const folder=await getFolder(token);let files=await listChildren(token,folder);const key=await prepareKey(token,folder,files,pass);
 const cloud=[];let errors=[];for(const f of files.filter(x=>/^event-[a-zA-Z0-9-]+\.enc\.json$/.test(x.name))){try{cloud.push(await decryptEvent(await downloadFile(token,f.id),key));}catch(e){errors.push(f.name+': '+e.message);}}
 if(errors.length)throw Error(`${errors.length} cloud file(s) could not be decrypted or validated. Wrong passphrase or damage? Sync stopped without uploading. Example: ${errors[0]}`);
 const local=load().map(validateEvent);const merged=mergeEvents(local,cloud);const pending=pendingEvents(merged,cloud);
 // Upload first; only commit merged local state when uploads have succeeded.
 for(const evt of pending){await putFile(token,folder,remoteName(evt),await encryptEvent(evt,key));}
 store(merged);note(`Sync complete: ${cloud.length} remote versions read, ${pending.length} encrypted versions uploaded, ${merged.filter(x=>!x.deleted).length} active local events. ${new Date().toLocaleString()}`);
 }catch(e){note('Sync stopped: '+e.message);}finally{busy=false;$('cloud-sync').disabled=false;$('cloud-pass').value='';}}
function inject(){const box=document.createElement('div');box.className='panel';box.innerHTML=`<h2>OneDrive encrypted sync — beta</h2><p class="note">Manual sync requires an HTTPS site or localhost and your own Microsoft Entra application registration. Cloud event contents use passphrase-derived AES-GCM encryption. <strong>Local browser records are still stored unencrypted.</strong> Back up records before your first sync. This is an experimental feature, not a validated medical record system.</p><div class="field"><label for="client-id">Microsoft application (client) ID</label><input id="client-id" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" autocomplete="off"></div><div class="field"><label for="cloud-pass">Cloud encryption passphrase (same on both devices; not your Microsoft password)</label><input id="cloud-pass" type="password" autocomplete="new-password" placeholder="14+ characters"></div><div class="actions"><button id="cloud-connect" type="button">Connect Microsoft account</button><button id="cloud-sync" type="button" class="secondary">Sync now</button></div><p class="small" id="cloud-message" aria-live="polite">Not connected</p><p class="small">The passphrase is not saved. Losing it makes encrypted cloud data unrecoverable. Concurrent edits to the same event currently use last-updated-wins; use JSON backups to recover historical values. Appending remote revisions can increase OneDrive storage use. Deleted records are marked, not physically erased from cloud version history.</p>`;
 $('settings').prepend(box);$('client-id').value=localStorage.getItem('health_ms_clientid')||'';
 $('cloud-connect').onclick=async()=>{try{note('Connecting…');await connect();}catch(e){note('Connection failed: '+e.message);}};
 $('cloud-sync').onclick=sync;
}
inject();
