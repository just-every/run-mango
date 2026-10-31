/** Hold marketing until the screen is ready, then hold again after a matching acceptance. */
export function marketingAdmission() {
  type Gate={matches:(to:string)=>boolean;state:'waiting'|'running'|'paused'|'released';started:Promise<void>;resumed:Promise<void>;start:()=>void;release:()=>void};
  let gate:Gate|undefined;
  return {
    create(matches:(to:string)=>boolean) {
      if(gate)throw new Error('Marketing admission is already armed.');
      let begin!:()=>void,resume!:()=>void;
      const started=new Promise<void>(resolve=>{begin=resolve;});
      const resumed=new Promise<void>(resolve=>{resume=resolve;});
      const current:Gate={matches,state:'waiting',started,resumed,
        start:()=>{if(current.state==='waiting'){current.state='running';begin();}},
        release:()=>{
          current.state='released';
          if(gate===current)gate=undefined;
          begin();resume();
        }};
      gate=current;
      return {start:current.start,release:current.release};
    },
    async admit() {
      const current=gate;
      if(!current)return;
      await current.started;
      if(current.state==='paused')await current.resumed;
    },
    accepted(to:string) {if(gate?.state==='running'&&gate.matches(to))gate.state='paused';},
    release() {gate?.release();},
  };
}
