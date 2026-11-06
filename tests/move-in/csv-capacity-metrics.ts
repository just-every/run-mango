import {execFile} from 'node:child_process';

/** Measure only this journey's native descendants; arguments and environment
 * values never enter the sample or its receipt. */
export function capacityMemory(){
  let treePeakRssKiB=0,workerPeakRssKiB=0,busy=false;
  const sample=()=>{
    if(busy)return;busy=true;
    execFile('ps',['-eo','pid=,ppid=,rss=,comm='],(error,stdout)=>{
      busy=false;if(error)return;
      const rows=stdout.trim().split('\n').map(line=>line.trim().split(/\s+/)).map(([pid,parent,rss,command])=>({pid:Number(pid),parent:Number(parent),rss:Number(rss),command}));
      const own=new Set([process.pid]);
      for(let changed=true;changed;){changed=false;for(const row of rows)if(own.has(row.parent)&&!own.has(row.pid)){own.add(row.pid);changed=true;}}
      const descendants=rows.filter(row=>own.has(row.pid)&&row.pid!==process.pid);
      treePeakRssKiB=Math.max(treePeakRssKiB,descendants.reduce((sum,row)=>sum+row.rss,0));
      workerPeakRssKiB=Math.max(workerPeakRssKiB,...descendants.filter(row=>row.command==='workerd').map(row=>row.rss),0);
    });
  };
  const timer=setInterval(sample,500);sample();
  return {read:()=>({treePeakRssKiB,workerPeakRssKiB,driverPeakRssKiB:process.resourceUsage().maxRSS}),close:()=>clearInterval(timer)};
}
