import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeEvents,pendingEvents,encryptEvent,decryptEvent,makeKey,remoteName,validateEvent} from '../src/sync-core.js';
const a={id:'00000000-0000-4000-8000-000000000001',timestamp:'2026-10-26T08:00:00.000Z',updatedAt:'2026-10-26T08:01:00.000Z',type:'Glucose',glucose:105};
test('merges latest event versions and preserves tombstones',()=>{const deleted={...a,deleted:true,updatedAt:'2026-10-26T09:00:00.000Z'};const result=mergeEvents([deleted],[a]);assert.equal(result.length,1);assert.equal(result[0].deleted,true);assert.equal(pendingEvents(result,[a]).length,1);});
test('encrypts and decrypts event with passphrase',async()=>{const salt=crypto.getRandomValues(new Uint8Array(16));const k=await makeKey('correct horse battery staple',salt);const s=await encryptEvent(a,k);assert.deepEqual(await decryptEvent(s,k),a);assert.rejects(decryptEvent(s,await makeKey('another strong passphrase',salt)));});
test('rejects damaged and malformed records',()=>{assert.throws(()=>validateEvent({id:'bad',timestamp:'x'}));assert.match(remoteName(a),/^event-/);});
