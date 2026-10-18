import {useLoaderData} from '@tanstack/react-router';
import type {ReactNode} from 'react';
import {hasPermission,type Capability} from '../permissions';

export function usePermissions() {
  const {role}=useLoaderData({from:'/app'});
  return {role,can:(capability:Capability)=>hasPermission(role,capability)};
}

export function Can({permission,children}:{permission:Capability;children:ReactNode}) {
  const {can}=usePermissions();
  return can(permission)?children:null;
}
