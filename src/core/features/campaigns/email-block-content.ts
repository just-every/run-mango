import {parseFragment,type DefaultTreeAdapterTypes as Tree} from 'parse5';
import {escapeBlock,type BlockKind} from './email-blocks';
const descendants=(node:Tree.ParentNode):Tree.Element[]=>node.childNodes.flatMap(child=>'tagName'in child?[child,...descendants(child)]:[]);
const text=(node:Tree.ChildNode):string=>'value'in node?node.value:'childNodes'in node?node.childNodes.map(text).join(''):'';
export type BlockFields={text:string;title:string;price:string;description:string;src:string;alt:string;width:string;height:string;href:string;label:string};
export function readBlockFields(html:string):BlockFields{
  const fragment=parseFragment(html),nodes=descendants(fragment),image=nodes.find(node=>node.tagName==='img'),anchor=nodes.find(node=>node.tagName==='a'),paragraphs=nodes.filter(node=>node.tagName==='p');
  const attr=(node:Tree.Element|undefined,name:string)=>node?.attrs.find(attr=>attr.name===name)?.value??'';
  return {text:fragment.childNodes.map(text).join(''),title:nodes.find(node=>node.tagName==='h3')?.childNodes.map(text).join('')??'',price:paragraphs.length>1?paragraphs[0].childNodes.map(text).join(''):'',description:paragraphs[paragraphs.length>1?1:0]?.childNodes.map(text).join('')??'',src:attr(image,'src'),alt:attr(image,'alt'),width:attr(image,'width'),height:attr(image,'height'),href:attr(anchor,'href'),label:anchor?.childNodes.map(text).join('')??''};
}
export function writeBlockFields(kind:BlockKind,fields:BlockFields){
  const e=escapeBlock,image=`<img src="${e(fields.src)}" width="${e(fields.width)}" height="${e(fields.height)}" alt="${e(fields.alt)}">`,button=`<a href="${e(fields.href)}">${e(fields.label)}</a>`;
  switch(kind){
    case 'image':return image;
    case 'button':return button;
    case 'header':return '<h1>'+e(fields.text).replaceAll('\n','<br>')+'</h1>';
    case 'footer':return '<h6 style="font-size:16px">'+e(fields.text).replaceAll('\n','<br>')+'</h6>';
    case 'product':return image+'<h3>'+e(fields.title)+'</h3><p>'+e(fields.price)+'</p><p>'+e(fields.description).replaceAll('\n','<br>')+'</p>'+button;
    case 'spacer':return '<br>';
    case 'divider':return '<hr>';
    case 'text':return '<p>'+e(fields.text).replaceAll('\n','<br>')+'</p>';
    case 'columns':throw new Error('Column content uses the column editor.');
  }
}
