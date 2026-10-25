import {parseFragment,serializeOuter,type DefaultTreeAdapterTypes as Tree} from 'parse5';
import {escapeHtml} from './email-html-policy';
import {socialNetworks} from '@/core/shared/social-networks';
import {columnsContent} from './email-blocks';
const nodes=(node:Tree.ParentNode):Tree.Element[]=>node.childNodes.flatMap(child=>'tagName'in child?[child,...nodes(child)]:[]);
const attr=(node:Tree.Element,name:string)=>node.attrs.find(a=>a.name===name)?.value??'';
export type SocialLink={network:number;path:string;src:string;alt:string};
export function readSocialLinks(html:string):SocialLink[]{
  return nodes(parseFragment(html)).filter(n=>n.tagName==='a').flatMap(anchor=>{
    try{const url=new URL(attr(anchor,'href')),network=socialNetworks.findIndex(n=>n.host===url.hostname),image=nodes(anchor).find(n=>n.tagName==='img')??(anchor.parentNode?nodes(anchor.parentNode).find(n=>n.tagName==='img'):undefined);
      return network<0||!image?[]:[{network,path:(url.pathname+url.search+url.hash).replace(/^\//,''),src:attr(image,'src'),alt:attr(image,'alt')}];
    }catch{return [];}
  });
}
export function socialLinksContent(links:SocialLink[]){
  return links.map(link=>{const network=socialNetworks[link.network];if(!network)throw new Error('Choose a supported social network.');
    const url=new URL('/'+link.path.replace(/^\/+/,''),'https://'+network.host);
    return `<p><img src="${escapeHtml(link.src)}" width="32" height="32" alt="${escapeHtml(link.alt)}"> <a href="${escapeHtml(url.href)}">${network.name}</a></p>`;
  }).join('');
}
export function productGridContent(products:string[]){
  if(products.length!==6)throw new Error('A product grid has six products.');
  const fluid=products.map(product=>{const fragment=parseFragment(product);for(const image of nodes(fragment).filter(node=>node.tagName==='img')){
    const declarations=new Map(attr(image,'style').split(';').filter(Boolean).map(part=>{const [name,...value]=part.split(':');return [name.trim(),value.join(':').trim()];}));
    declarations.set('max-width','100%');declarations.set('height','auto');image.attrs=image.attrs.filter(a=>a.name!=='style');image.attrs.push({name:'style',value:[...declarations].map(([name,value])=>name+':'+value).join(';')});
  }return fragment.childNodes.map(node=>serializeOuter(node)).join('');});
  return [fluid.slice(0,3),fluid.slice(3)].map(row=>'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td>'+columnsContent(row)+'</td></tr></table>').join('');
}
export function readGridProducts(html:string){
  return nodes(parseFragment(html)).filter(n=>n.tagName==='table'&&attr(n,'align')==='left').map(table=>{
    const cell=nodes(table).find(n=>n.tagName==='td');return cell?.childNodes.map(n=>serializeOuter(n)).join('')??'';
  });
}
