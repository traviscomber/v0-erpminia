export type MineEvidenceMine = {
  id:string;
  code?:string|null;
  name:string;
  status?:string|null;
};

export type MineEvidenceHole = {
  id:string;
  mine_source_id:string|null;
  collar_easting:number|null;
  collar_northing:number|null;
  azimuth_deg:number|null;
  dip_deg:number|null;
  geological_purpose?:string|null;
};

export type MineEvidenceSample = {
  mine_source_id:string|null;
  drill_hole_id:string|null;
};

export type MineEvidenceReadinessRow = {
  id:string;
  code:string|null;
  name:string;
  status:string|null;
  holes:number;
  located:number;
  oriented:number;
  purpose:number;
  linkedSamples:number;
  locatedPct:number;
  orientedPct:number;
  purposePct:number;
  readiness:number;
  attentionRank:number;
  primaryGap:'collar'|'orientation'|'purpose'|'none';
};

function pct(done:number,total:number){
  return total>0?Math.round((done/total)*100):0;
}

export function buildMineEvidenceReadiness(
  mines:MineEvidenceMine[],
  holes:MineEvidenceHole[],
  samples:MineEvidenceSample[],
):MineEvidenceReadinessRow[]{
  return mines.map((mine):MineEvidenceReadinessRow=>{
    const mineHoles=holes.filter((hole)=>hole.mine_source_id===mine.id);
    const holeIds=new Set(mineHoles.map((hole)=>hole.id));
    const located=mineHoles.filter((hole)=>hole.collar_easting!=null&&hole.collar_northing!=null).length;
    const oriented=mineHoles.filter((hole)=>hole.azimuth_deg!=null&&hole.dip_deg!=null).length;
    const purpose=mineHoles.filter((hole)=>String(hole.geological_purpose||'').trim().length>0).length;
    const linkedSamples=samples.filter((sample)=>sample.mine_source_id===mine.id||(sample.drill_hole_id?holeIds.has(sample.drill_hole_id):false)).length;
    const locatedPct=pct(located,mineHoles.length);
    const orientedPct=pct(oriented,mineHoles.length);
    const purposePct=pct(purpose,mineHoles.length);
    const readiness=mineHoles.length?Math.round((locatedPct+orientedPct+purposePct)/3):0;
    const gaps:Array<{key:MineEvidenceReadinessRow['primaryGap'];value:number}>=[
      {key:'collar',value:locatedPct},
      {key:'orientation',value:orientedPct},
      {key:'purpose',value:purposePct},
    ].sort((a,b)=>a.value-b.value);
    const primaryGap:MineEvidenceReadinessRow['primaryGap']=mineHoles.length&&gaps[0].value<100?gaps[0].key:'none';
    const attentionRank=(100-readiness)*1000+mineHoles.length*10+Math.min(linkedSamples,9);
    return {
      id:mine.id,
      code:mine.code||null,
      name:mine.name,
      status:mine.status||null,
      holes:mineHoles.length,
      located,
      oriented,
      purpose,
      linkedSamples,
      locatedPct,
      orientedPct,
      purposePct,
      readiness,
      attentionRank,
      primaryGap,
    };
  }).filter((row)=>row.holes>0||row.linkedSamples>0)
    .sort((a,b)=>b.attentionRank-a.attentionRank||a.name.localeCompare(b.name,'es'));
}
