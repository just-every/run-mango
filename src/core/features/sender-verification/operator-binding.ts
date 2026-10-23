import {digest} from './identity';
/** Native login authority is excluded from product archives. */
export async function confirmingOperatorBinding(db:D1Database,email:string) {
  const operator=await db.prepare("SELECT id,version,created_at FROM oa_operators WHERE lower(email)=lower(?) AND status='active'").bind(email).first<{id:string;version:number;created_at:number}>();
  return operator?digest([operator.id,operator.version,operator.created_at]):null;
}
