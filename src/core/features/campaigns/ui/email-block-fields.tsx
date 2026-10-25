import {SocialLinksFields,ProductGridFields} from './email-promo-fields';
import {InsertImage} from '@/core/features/campaign-assets/ui/insert-image';
import {readBlockFields,writeBlockFields,type BlockFields} from '../email-block-content';
import type {BlockKind} from '../email-blocks';
export function EmailBlockFields({kind,html,busy,onChange}:{kind:BlockKind;html:string;busy:boolean;onChange:(html:string)=>void}){
  if(kind==='social-links')return <SocialLinksFields html={html} busy={busy} onChange={onChange}/>;
  if(kind==='product-grid')return <ProductGridFields html={html} busy={busy} onChange={onChange}/>;
  const fields=readBlockFields(html),change=(patch:Partial<BlockFields>)=>onChange(writeBlockFields(kind,{...fields,...patch}));
  if(kind==='divider'||kind==='spacer')return <p>{kind==='divider'?'A divider separates sections.':'A spacer leaves room between sections.'} Adjust its padding below.</p>;
  return <fieldset><legend>Block content</legend>
    {['text','header','footer'].includes(kind)?<label>Block text<textarea aria-label="Block text" disabled={busy} value={fields.text} onChange={e=>change({text:e.target.value})}/></label>:null}
    {kind==='product'?<><label>Product name<input disabled={busy} value={fields.title} onChange={e=>change({title:e.target.value})}/></label><label>Product price<input disabled={busy} value={fields.price} onChange={e=>change({price:e.target.value})}/></label><label>Product description<textarea aria-label="Product description" disabled={busy} value={fields.description} onChange={e=>change({description:e.target.value})}/></label></>:null}
    {kind==='image'||kind==='product'?<><InsertImage disabled={busy} onInsert={image=>{const selected=readBlockFields(image);change({src:selected.src,alt:selected.alt,width:selected.width,height:selected.height});}}/><label>Image URL<input type="url" disabled={busy} value={fields.src} onChange={e=>change({src:e.target.value})}/></label><label>Image description<input disabled={busy} value={fields.alt} onChange={e=>change({alt:e.target.value})}/></label><label>Image width<input type="number" min={2} max={4096} disabled={busy} value={fields.width} onChange={e=>change({width:e.target.value})}/></label><label>Image height<input type="number" min={2} max={4096} disabled={busy} value={fields.height} onChange={e=>change({height:e.target.value})}/></label></>:null}
    {kind==='button'||kind==='product'?<><label>Button text<input disabled={busy} value={fields.label} onChange={e=>change({label:e.target.value})}/></label><label>Button destination<input type="url" disabled={busy} value={fields.href} onChange={e=>change({href:e.target.value})}/></label></>:null}
  </fieldset>;
}
