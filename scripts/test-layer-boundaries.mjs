import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { Linter } from 'eslint';

const inventory=JSON.parse(await readFile(new URL('../docs/non-social-audit-inventory.json',import.meta.url),'utf8'));
const project=resolve(fileURLToPath(new URL('../',import.meta.url)));
const forbidden={
 backend:['repository','storage','viewmodel','components','pages','contexts'],
 repository:['service','api','viewmodel','components','pages','contexts'],
 models:['backend','repository','service','api','storage','viewmodel','components','pages','contexts'],
 service:['backend','repository','storage','viewmodel','components','pages','contexts'],
 storage:['backend','repository','service','viewmodel','components','pages','contexts'],
 viewmodel:['backend','service','storage','api','components','pages','contexts'],
 pages:['backend','repository','service','storage','api'],
 components:['backend','repository','service','storage','api']
};

test('non-social layers preserve dependency boundaries and views do not fetch directly',async()=>{
 const linter=new Linter();let checked=0;
 for(const {file,scope} of inventory){
  if(scope!=='incluso')continue;
  const layer=file.split('/')[1];
  if(!forbidden[layer])continue;
  const source=await readFile(resolve(project,file),'utf8');
  const messages=linter.verify(source,[{files:['**/*.{js,jsx}'],languageOptions:{ecmaVersion:'latest',sourceType:'module',parserOptions:{ecmaFeatures:{jsx:true}}},plugins:{audit:{rules:{boundaries:{create:()=>({
   ImportDeclaration(node){
    const spec=node.source.value;
    if(!spec.startsWith('.')){
     if(['models','components','pages'].includes(layer))assert.ok(!spec.startsWith('firebase'),`${file}: direct Firebase access`);
     return;
    }
    const target=resolve(dirname(resolve(project,file)),spec).replaceAll('\\','/');
    const targetLayer=target.slice(project.replaceAll('\\','/').length+1).split('/')[1];
    assert.ok(!forbidden[layer].includes(targetLayer),`${file} imports ${spec}`);
   },
   CallExpression(node){
    if(['components','pages'].includes(layer))assert.ok(!(node.callee.type==='Identifier'&&node.callee.name==='fetch'),`${file}: direct fetch in view`);
   }
  })}}}},rules:{'audit/boundaries':'error'}}],{filename:file});
  assert.ok(!messages.some(m=>m.fatal),`${file}: parser failure`);
  checked++;
 }
 assert.ok(checked>50,'Audit inventory unexpectedly excludes most source files');
 console.log(`Checked dependency boundaries in ${checked} non-social files.`);
});
