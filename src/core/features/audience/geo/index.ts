import coordinates from './zcta-2026.json' with {type:'json'};

// U.S. Census Bureau 2026 Gazetteer, ZIP Code Tabulation Areas (public geography).
// https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2026_Gazetteer/2026_Gaz_zcta_national.zip
// GEOID -> [INTPTLAT, INTPTLONG], preserving all source coordinate precision.
// These are representative points of Census areas, not individual addresses or
// an exhaustive USPS delivery-code directory. Unknown codes have no distance.
const points:Record<string,number[]>=coordinates;
export function hasZip(zip:string):boolean {return Object.hasOwn(points,zip);}

export function distanceBetweenZipsMiles(origin:string,destination:string):number|undefined {
  const a=points[origin],b=points[destination];
  if(!a||!b)return undefined;
  const radians=(degrees:number)=>degrees*Math.PI/180;
  const latitude=radians(b[0]-a[0]),longitude=radians(b[1]-a[1]);
  const haversine=Math.sin(latitude/2)**2+Math.cos(radians(a[0]))*Math.cos(radians(b[0]))*Math.sin(longitude/2)**2;
  return 3958.7613*2*Math.atan2(Math.sqrt(haversine),Math.sqrt(Math.max(0,1-haversine)));
}
