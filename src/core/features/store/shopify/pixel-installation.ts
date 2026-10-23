import type {createShopifyAdmin} from '@/core/platform/adapters/shopify/admin';
import {object,text} from '@/core/platform/adapters/shopify/values';

function pixelSettings(value:unknown) {
  if (typeof value !== 'string') return object(value,'pixel settings');
  try {return object(JSON.parse(value),'pixel settings');}
  catch {throw new Error('Shopify pixel settings could not be read.');}
}

/** App-scoped pixel authority. An existing pixel for another installation is
 * refused rather than silently repointed to this deployment. */
export async function ensureInstallationPixel(admin:ReturnType<typeof createShopifyAdmin>, current:unknown, channel:string, proxyPath:string) {
  const expected=JSON.stringify({channel,proxyPath});
  if (current) {
    const pixel=object(current),settings=pixelSettings(pixel.settings);
    if(settings.channel!==channel||settings.proxyPath!==proxyPath)throw new Error('The Shopify pixel belongs to different channel settings. Review the app installation before reconnecting.');
    return text(pixel.id,'pixel ID');
  }
  const data=await admin.query('mutation MangoCreatePixel($pixel:WebPixelInput!){webPixelCreate(webPixel:$pixel){webPixel{id settings}userErrors{field message}}}',{pixel:{settings:expected}});
  const result=object(data.webPixelCreate);
  if(!Array.isArray(result.userErrors)||result.userErrors.length)throw new Error('Shopify refused pixel activation. Review the pixel permissions.');
  const pixel=object(result.webPixel),settings=pixelSettings(pixel.settings);
  if(settings.channel!==channel||settings.proxyPath!==proxyPath)throw new Error('Shopify did not confirm the installed pixel settings.');
  return text(pixel.id,'pixel ID');
}
