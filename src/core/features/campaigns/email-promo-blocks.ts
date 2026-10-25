import {parseFragment,serializeOuter,type DefaultTreeAdapterTypes as Tree} from 'parse5';
import {escapeHtml} from './email-html-policy';
import {socialNetworks} from '@/core/shared/social-networks';
import {columnsContent} from './email-blocks';
const nodes=(node:Tree.ParentNode):Tree.Element[]=>node.childNodes.flatMap(child=>'tagName'in child?[child,...nodes(child)]:[]);
const attr=(node:Tree.Element,name:string)=>node.attrs.find(a=>a.name===name)?.value??'';
export type SocialLink={network:number;path:string;src:string;alt:string};
export function readSocialLinks(html:string):SocialLink[]{
  return nodes(parseFragment(html)).filter(n=>n.tagName==='a').flatMap(anchor=>{
    try{const url=new URL(attr(anchor,'href')),network=socialNetworks.findIndex(n=>n.host===url.hostname),image=nodes(anchor).find(n=>n.tagName==='img');
      return network<0||!image?[]:[{network,path:(url.pathname+url.search+url.hash).replace(/^\//,''),src:attr(image,'src'),alt:attr(image,'alt')}];
    }catch{return [];}
  });
}
export function socialLinksContent(links:SocialLink[]){
  return '<p>'+links.map(link=>{const network=socialNetworks[link.network];if(!network)throw new Error('Choose a supported social network.');
    const url=new URL('/'+link.path.replace(/^\/+/,''),'https://'+network.host);
    return `<a href="${escapeHtml(url.href)}"><img src="${escapeHtml(link.src)}" width="32" height="32" alt="${escapeHtml(link.alt)}"> ${network.name}</a>`;
  }).join(' ')+'</p>';
}
export function productGridContent(products:string[]){
  if(products.length!==6)throw new Error('A product grid has six products.');
  return [products.slice(0,3),products.slice(3)].map(row=>'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td>'+columnsContent(row)+'</td></tr></table>').join('');
}
export function readGridProducts(html:string){
  return nodes(parseFragment(html)).filter(n=>n.tagName==='table'&&attr(n,'align')==='left').map(table=>{
    const cell=nodes(table).find(n=>n.tagName==='td');return cell?.childNodes.map(n=>serializeOuter(n)).join('')??'';
  });
}
