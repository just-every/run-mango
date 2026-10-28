/** The verifier supplies a signed claim. Use Mango's production admission. */
export default async function initialize({request,origin,claim,displayName,returnTo}){
 return request(new URL(claim.path,origin).href,{method:'POST',redirect:'manual',headers:{Origin:origin,'CF-Connecting-IP':'192.0.2.41','Content-Type':'application/json'},body:JSON.stringify({token:claim.token,displayName,returnTo})});
}
