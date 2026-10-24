import {parseFragment,serializeOuter,type DefaultTreeAdapterTypes as Tree} from 'parse5';
import {applyMobileSettings,mobileEnvelope,mobileClass,type MobileBlock} from './email-mobile';
export const blockKinds=['text','image','button','columns','spacer','divider','header','footer','product'] as const;
export type BlockKind=typeof blockKinds[number];
export type EditorBlock={id:string;html:string;mobile?:Omit<MobileBlock,'block'>};
export const escapeBlock=(value:string)=>value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const table=(content:string,padding=16)=>`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:${padding}px;text-align:left;background-color:#ffffff;color:#000000;font-size:16px">${content}</td></tr></table>`;
export function blockContent(kind:BlockKind):string{
  switch(kind){
    case 'image':return '<img src="https://example.test/garden.png" width="240" height="160" alt="Garden">';
    case 'button':return '<a href="https://example.test/garden">Explore the garden</a>';
    case 'header':return '<h1>Garden news</h1>';
    case 'footer':return '<h6 style="font-size:16px">Thank you for reading.</h6>';
    case 'product':return '<img src="https://example.test/garden.png" width="200" height="160" alt="Garden seeds"><h3>Garden seeds</h3><p>Product price</p><p>Product description</p><a href="https://example.test/garden">View product</a>';
    case 'spacer':return '<br>';
    case 'divider':return '<hr>';
    case 'columns':return columnsContent([blockContent('product'),blockContent('button')]);
    default:return '<p>Write your newsletter.</p>';
  }
}
export const columnsContent=(columns:string[])=>columns.map(content=>`<table role="presentation" align="left" width="${Math.floor(560/columns.length)}" cellpadding="0" cellspacing="0" border="0" style="width:${Math.floor(560/columns.length)}px;max-width:100%"><tr><td style="padding:8px;color:#000000;font-size:16px">${content}</td></tr></table>`).join('');
export const newEmailBlock=(kind:BlockKind):EditorBlock=>({id:crypto.randomUUID(),html:table(blockContent(kind)),...(kind==='columns'?{mobile:{orientation:'stack-columns' as const,contentCell:true as const}}:{})});
const descendants=(node:Tree.ParentNode):Tree.Element[]=>node.childNodes.flatMap(child=>'tagName'in child?[child,...descendants(child)]:[]);
export function readEmailBlocks(source:string):EditorBlock[]{
  const envelope=mobileEnvelope(source);if(envelope.issues.length)throw new Error(envelope.issues.join(' '));
  const parsed=parseFragment(envelope.body,{sourceCodeLocationInfo:true});let index=0;
  return parsed.childNodes.map(node=>{
    const at=node.sourceCodeLocation;
    let html=at?envelope.body.slice(at.startOffset,at.endOffset):serializeOuter(node);
    const setting='tagName'in node?envelope.settings.find(row=>row.block===index++):undefined;
    if(setting)html=html.replace(' class="'+mobileClass(setting.block)+'"','');
    const {block:_block,...mobile}=setting??{block:0};
    return {id:crypto.randomUUID(),html,...(setting?{mobile}:{})};
  });
}
export function writeEmailBlocks(blocks:EditorBlock[]){
  let index=0;const settings:MobileBlock[]=[];
  for(const block of blocks)if(parseFragment(block.html).childNodes.some(node=>'tagName'in node)){if(block.mobile)settings.push({...block.mobile,block:index});index++;}
  const html=blocks.map(block=>block.html).join('');return settings.length?applyMobileSettings(html,settings):html;
}
export function blockInfo(block:EditorBlock){
  const nodes=descendants(parseFragment(block.html)),cell=nodes.find(node=>node.tagName==='td');
  const content=cell?.childNodes.map(node=>serializeOuter(node)).join('')??block.html;
  const kind:BlockKind=/<table/.test(content)?'columns':/<h1\b/.test(content)?'header':/<h6\b/.test(content)?'footer':/<img\b/.test(content)?/<h3\b/.test(content)?'product':'image':/<a\b/.test(content)&&!/<p\b/.test(content)?'button':/<hr\b/.test(content)?'divider':/^<br\s*\/?>(?:\s*)$/.test(content)?'spacer':'text';
  const style=cell?.attrs.find(attr=>attr.name==='style')?.value??'';
  const values=Object.fromEntries(style.split(';').map(part=>part.split(':').map(value=>value.trim())).filter(part=>part.length===2));
  const columns=cell?.childNodes.filter((node):node is Tree.Element=>'tagName'in node&&node.tagName==='table').map(node=>{const td=descendants(node).find(child=>child.tagName==='td');return td?.childNodes.map(child=>serializeOuter(child)).join('')??'';})??[];
  return {kind,content,padding:Number.parseInt(values.padding??'0',10),alignment:values['text-align']??'left',background:values['background-color']??'#ffffff',columns};
}
export function patchBlock(block:EditorBlock,update:{content?:string;padding?:number;alignment?:string;background?:string}){
  const fragment=parseFragment(block.html),cell=descendants(fragment).find(node=>node.tagName==='td');
  if(!cell)return {...block,html:update.content??block.html};
  if(update.content!==undefined){const body=parseFragment(update.content);cell.childNodes=body.childNodes;for(const child of cell.childNodes)child.parentNode=cell;}
  const old=cell.attrs.find(attr=>attr.name==='style');
  const values=new Map((old?.value??'').split(';').map(part=>part.split(':').map(value=>value.trim())).filter((part):part is [string,string]=>part.length===2));
  if(update.padding!==undefined)values.set('padding',update.padding+'px');if(update.alignment)values.set('text-align',update.alignment);if(update.background)values.set('background-color',update.background);
  cell.attrs=cell.attrs.filter(attr=>attr.name!=='style');cell.attrs.push({name:'style',value:[...values].map(([name,value])=>name+':'+value).join(';')});
  return {...block,html:fragment.childNodes.map(node=>serializeOuter(node)).join('')};
}
