import { createServerFn } from '@tanstack/react-start';
import { notFound } from '@tanstack/react-router';
export const loadArchive = createServerFn({method:'GET'}).validator((data:{id?:string;page?:number})=>({id:typeof data.id==='string'?data.id:undefined,page:Number.isInteger(data.page)&&data.page!>=0&&data.page!<=100000?data.page!:0})).handler(async ({data})=>{
  const {requestApi}=await import('@/core/app/request-platform');
  const read=requestApi.getStore();if(!read)throw new Error('Missing request API.');
  const response=await read(data.id?`/archive/data/${encodeURIComponent(data.id)}`:`/archive/data?page=${data.page}`);
  if(response.status===404)throw notFound();
  if(!response.ok)throw new Error('The archive is temporarily unavailable.');
  return response.json() as Promise<import('./service').PublicIssue|{issues:Omit<import('./service').PublicIssue,'body'>[];page:number;hasMore:boolean}>;
});
