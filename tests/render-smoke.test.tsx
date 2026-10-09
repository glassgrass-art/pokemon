import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {LanguageProvider} from '../src/context/LanguageContext';
import AccountShell from '../src/components/AccountShell';
import {TrainerProfileModal} from '../src/components/TrainerProfileModal';
import {EMPTY_PROFILE,setStorageOwner} from '../src/utils/storage';
test('empty visitor renders the trading entry and editable profile without fabricated trades',()=>{
  globalThis.localStorage={getItem:()=>null,setItem:()=>{}} as unknown as Storage;
  setStorageOwner();
  const page=renderToStaticMarkup(<LanguageProvider><AccountShell/></LanguageProvider>);
  assert.match(page,/记录卡牌/);assert.match(page,/登录发布挂单/);
  assert.doesNotMatch(page,/Ash Ketchum|prop-sample-01|Red\)/);
  const profile=renderToStaticMarkup(<LanguageProvider><TrainerProfileModal profile={EMPTY_PROFILE} onClose={()=>{}} onSave={async()=>true}/></LanguageProvider>);
  assert.match(profile,/id="profile-friend-code"/);
});
