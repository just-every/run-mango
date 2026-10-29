import type {Page,TestInfo,Locator} from '@playwright/test';
/** Assertions use the desktop journey. These captures document the changed state
 * at both widths. Capture document coordinates so sticky navigation cannot cover
 * a tall section, and let the browser finish the iframe's resize paint. */
export async function capturePropertyScreen(page:Page,info:TestInfo,name:string,region:Locator) {
  for(const width of [1440,390]){
    await page.setViewportSize({width,height:name==='money-preview'?1600:1000});
    if(name==='money-preview'){await region.scrollIntoViewIfNeeded();await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));await region.screenshot({path:info.outputPath(`custom-properties-${name}-${width}.png`)});continue;}
    await page.evaluate(async()=>{window.scrollTo(0,0);await document.fonts.ready;await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));});
    const bounds=await region.boundingBox();if(!bounds)throw new Error('Property proof region is not rendered.');
    await page.screenshot({path:info.outputPath(`custom-properties-${name}-${width}.png`),fullPage:true,clip:bounds});
  }
  await page.setViewportSize({width:1440,height:1000});
}
