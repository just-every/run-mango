import {createFileRoute} from '@tanstack/react-router';
import {loadArchive} from '@/core/features/archive/loader';
import {ArchivePage} from '@/core/features/archive/archive-page';
export const Route=createFileRoute('/archive/')({
 validateSearch:(search:Record<string,unknown>)=>({page:Math.max(0,Math.min(100000,Math.floor(Number(search.page)||0)))}),
 loaderDeps:({search})=>search,
 loader:({deps})=>loadArchive({data:{page:deps.page}}),
 head:()=>({meta:[{title:'Newsletter archive'},{name:'description',content:'Read past issues of our newsletter.'}],links:[{rel:'alternate',type:'application/rss+xml',title:'Newsletter archive',href:'/archive/feed.xml'}]}),
 component:()=>{const data=Route.useLoaderData();if(!('issues' in data))throw new Error('Invalid archive response');return <ArchivePage {...data}/>;},
});
