import {createFileRoute} from '@tanstack/react-router';
import {loadArchive} from '@/core/features/archive/loader';
import {IssuePage} from '@/core/features/archive/archive-page';
export const Route=createFileRoute('/archive/$id')({
 loader:({params})=>loadArchive({data:{id:params.id}}),
 head:({loaderData})=>{if(!loaderData||!('body' in loaderData))return {};return {meta:[{title:loaderData.title},{name:'description',content:loaderData.description},{property:'og:title',content:loaderData.title},{property:'og:description',content:loaderData.description},{property:'og:type',content:'article'}]};},
 component:()=>{const issue=Route.useLoaderData();if(!('body' in issue))throw new Error('Invalid newsletter response');return <IssuePage issue={issue}/>;},
});
