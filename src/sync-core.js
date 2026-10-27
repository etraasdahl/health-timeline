// Versioned, append-only encrypted events. Pure helpers separated for testing.
export const SCHEMA = 'health-timeline-encrypted-v2';
export const encoder = new TextEncoder();
export function bytesToB64(bytes){ return btoa(String.fromCharCode(...bytes)); }
export function b64ToBytes(value){ return Uint8Array.from(atob(value), x=>x.charCodeAt(0)); }
export function validateEvent(x){
 if(!x||typeof x!=='object'||typeof x.id!=='string'||! /^[a-zA-Z0-9-]{12,80}$/.test(x.id)|| !Number.isFinite(Date.parse(x.timestamp)) || typeof x.type!=='string'|| !Number.isFinite(Date.parse(x.updatedAt))) throw Error('Invalid event payload');
 return x;
}
export function remoteName(x){validateEvent(x); const stamp = Date.parse(x.updatedAt); return `event-${x.id}-${stamp}-${crypto.randomUUID()}.enc.json`;}
export function selectLatest(events){
 const map=new Map();
 for(const item of events){validateEvent(item); const old=map.get(item.id);
  if(!old || item.updatedAt>old.updatedAt || (item.updatedAt===old.updatedAt && JSON.stringify(item)>JSON.stringify(old))) map.set(item.id,item);
 }
 return [...map.values()];
}
export function mergeEvents(local,remote){return selectLatest([...local,...remote]);}
export function passphraseCheck(pass){if(typeof pass!=='string'||pass.length<14)throw Error('Choose an encryption passphrase of at least 14 characters.');}
export async function makeKey(pass,salt){passphraseCheck(pass); const base=await crypto.subtle.importKey('raw',encoder.encode(pass),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:310000,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);}
export async function encryptEvent(event,key){validateEvent(event); const iv=crypto.getRandomValues(new Uint8Array(12));const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,encoder.encode(JSON.stringify(event)));return JSON.stringify({schema:SCHEMA,iv:bytesToB64(iv),ciphertext:bytesToB64(new Uint8Array(ciphertext))});}
export async function decryptEvent(serialized,key){const x=JSON.parse(serialized);if(x.schema!==SCHEMA)throw Error('Unknown remote encryption schema');const plaintext=await crypto.subtle.decrypt({name:'AES-GCM',iv:b64ToBytes(x.iv)},key,b64ToBytes(x.ciphertext));return validateEvent(JSON.parse(new TextDecoder().decode(plaintext)));}
export function pendingEvents(local,remote){const keys=new Set(remote.map(x=>`${x.id}|${x.updatedAt}|${JSON.stringify(x)}`));return local.filter(x=>!keys.has(`${x.id}|${x.updatedAt}|${JSON.stringify(x)}`));}
