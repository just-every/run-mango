import type {Page,TestInfo,Locator} from '@playwright/test';
/** Assertions use the desktop journey. These two captures document the same
 * changed state at the desktop and phone widths without duplicating the test. */
export async function capturePropertyScreen(page:Page,info:TestInfo,name:string,region:Locator) {
  for(const width of [1440,390]){
    await page.setViewportSize({width,height:1000});
    await region.screenshot({path:info.outputPath(`custom-properties-${name}-${width}.png`)});
  }
  await page.setViewportSize({width:1440,height:1000});
}
