import {ToolRefusal,type ResourceContext,type ToolContext} from '@/vendor/base/agent-door/index.ts';
import {hasPermission,requiredPermission,type Capability} from '../auth/permissions';
import {productAuthority} from '../auth/product-roles';
import type {NativeToolSpec} from './catalogue';

export function toolPermission(spec:NativeToolSpec,args:Record<string,unknown>={}):Capability {
 if(spec.path==='native:flow-enroll')return 'flow.activate';
 const special:Record<string,Capability>={checks:'campaign.read',sender:'campaign.read',design:'draft.write',access:'operators.manage',imports:'audience.import',witness:'activity.read',dispatch:'campaign.send',prepare:'campaign.send',recipients:'report.read',asset:'draft.write','draft-update':'draft.write','design-advance':'draft.write','source-advance':'integration.manage','report-dispatch':'settings.manage'};
 if(spec.path.startsWith('native:'))return special[spec.path.slice(7)]??'unclassified';
 // Placeholders are identifiers here, never caller-selected routes.
 const path=spec.path.replace(/\{\w+\}/g,'native-record');
 return requiredPermission(spec.method,path);
}
export async function currentAuthority(ctx:Pick<ToolContext,'db'|'person'>,capability:Capability) {
 const native=await ctx.db.prepare("SELECT id FROM oa_operators WHERE id=? AND status='active'").bind(ctx.person.id).first();
 const authority=native?await productAuthority(ctx.db,ctx.person.id):null;
 if(!authority||!hasPermission(authority.role,capability))throw new ToolRefusal('not_found');
 return authority;
}
