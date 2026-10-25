import {CatalogPicker} from './catalog-picker';
import {catalogBlocks} from '../catalog-blocks';
import {useState,useRef,useEffect} from 'react';
import {socialNetworks} from '@/core/shared/social-networks';
import {uploadCampaignImage} from '@/core/features/campaign-assets/ui/upload';
import {readSocialLinks,socialLinksContent,readGridProducts,productGridContent,type SocialLink} from '../email-promo-blocks';
import {EmailBlockFields} from './email-block-fields';

async function networkIcon(name:string){
  const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;
  const context=canvas.getContext('2d');if(!context)throw new Error('The icon could not be drawn.');
  context.fillStyle='#000000';context.fillRect(0,0,64,64);context.fillStyle='#ffffff';context.font='bold 40px Arial';context.textAlign='center';context.textBaseline='middle';context.fillText(name.slice(0,1),32,34);
  const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('The icon could not be drawn.')),'image/png'));
  return uploadCampaignImage(blob,'social-'+name.toLowerCase()+'.png');
}
export function SocialLinksFields({html,busy,onChange}:{html:string;busy:boolean;onChange:(html:string)=>void}){
  const links=readSocialLinks(html),[working,setWorking]=useState(false),[error,setError]=useState('');
  const change=(index:number,patch:Partial<SocialLink>)=>onChange(socialLinksContent(links.map((link,i)=>i===index?{...link,...patch}:link)));
  const latest=useRef({html,onChange}),alive=useRef(true);latest.current={html,onChange};
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
  const storeIcon=async(index:number)=>{
    const source=html,link=links[index];setWorking(true);setError('');
    try{const asset=await networkIcon(socialNetworks[link.network].name);
      if(!alive.current)return;
      if(latest.current.html!==source)throw new Error('The block changed while its icon was stored. Choose the icon again.');
      latest.current.onChange(socialLinksContent(links.map((value,i)=>i===index?{...value,src:asset.url}:value)));
    }catch(cause){if(alive.current)setError(cause instanceof Error?cause.message:'The icon could not be stored.');}
    finally{if(alive.current)setWorking(false);}
  };

  return <fieldset disabled={busy||working}><legend>Social links</legend>
    {links.map((link,index)=><fieldset key={index}><legend>Social link {index+1}</legend>
      <label>Social network<select value={link.network} onChange={e=>{const network=Number(e.target.value);change(index,{network,src:'',alt:socialNetworks[network].name});}}>{socialNetworks.map((network,i)=><option key={network.host} value={i}>{network.name}</option>)}</select></label>
      <label>Profile path<input value={link.path} onChange={e=>change(index,{path:e.target.value})}/></label>
      <label>Icon description<input value={link.alt} onChange={e=>change(index,{alt:e.target.value})}/></label>
      <div className="detail-actions"><button type="button" className="secondary-action" onClick={()=>void storeIcon(index)}>Use network icon</button>
      <button type="button" className="secondary-action" disabled={links.length===1} onClick={()=>onChange(socialLinksContent(links.filter((_,i)=>i!==index)))}>Remove social link {index+1}</button></div>
      <p>{link.src?'Icon stored on this deployment.':'Choose Use network icon to store an icon on this deployment.'}</p>
    </fieldset>)}
    <button type="button" className="secondary-action" disabled={links.length>=socialNetworks.length} onClick={()=>onChange(socialLinksContent([...links,{network:0,path:'',src:'',alt:socialNetworks[0].name}]))}>Add social link</button>
    {working?<p role="status">Storing network icon…</p>:null}{error?<p role="alert">{error}</p>:null}
  </fieldset>;
}
export function ProductGridFields({html,busy,onChange}:{html:string;busy:boolean;onChange:(html:string)=>void}){
  const products=readGridProducts(html),[selected,setSelected]=useState(0);
  if(catalogBlocks(html).length)return <CatalogPicker kind="product-grid" html={html} busy={busy} onChange={onChange}/>;
  return <fieldset><legend>Product grid</legend><label>Selected product<select value={selected} disabled={busy} onChange={e=>setSelected(Number(e.target.value))}>{products.map((_,index)=><option key={index} value={index}>Product {index+1}</option>)}</select></label>
    <EmailBlockFields kind="product" allowCatalog={false} html={products[selected]??''} busy={busy} onChange={content=>onChange(productGridContent(products.map((product,index)=>index===selected?content:product)))}/>
    <CatalogPicker kind="product-grid" html={html} busy={busy} onChange={onChange}/>
  </fieldset>;
}
