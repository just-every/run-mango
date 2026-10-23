export const clientSource=String.raw`/** No storage, automatic tracking or retries. In websites use a same-origin
 * server proxy that holds the scoped key; never publish a long-lived key. */
export function createMangoClient({baseUrl,token,transport=fetch}) {
  const root=new URL(baseUrl);
  if(!['http:','https:'].includes(root.protocol)||root.username||root.password)throw new Error('invalid_mango_url');
  async function request(path,method='GET',body) {
    const response=await transport(root.href.replace(/\/$/,'')+path,{
      method,headers:{...(token?{Authorization:'Bearer '+token} : {}),...(body===undefined?{}:{'Content-Type':'application/json'})},
      ...(body===undefined?{}:{body:JSON.stringify(body)}),credentials:'omit',redirect:'error',
    });
    const value=await response.json();
    if(!response.ok){const error=new Error(value.error??'mango_request_failed');error.status=response.status;error.retryAfter=response.headers.get('Retry-After');throw error;}
    return value;
  }
  return {
    identify:input=>request('/contacts','PUT',input),
    profiles:query=>request('/contacts?'+new URLSearchParams(query)),
    memberships:contactId=>request('/contacts/'+encodeURIComponent(contactId)+'/segments'),
    segments:()=>request('/segments'),
    track:input=>request('/events','POST',input),
    changes:query=>request('/events?'+new URLSearchParams(query)),
    suppress:input=>request('/suppressions','POST',input),
  };
}
`;
