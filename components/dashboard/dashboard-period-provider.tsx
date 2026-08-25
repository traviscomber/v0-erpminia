'use client';

import { createContext, useContext, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CalendarDays, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type DashboardPeriodValue = { month:string|null; query:string; setMonth:(month:string|null)=>void };
const DashboardPeriodContext=createContext<DashboardPeriodValue>({month:null,query:'',setMonth:()=>undefined});

export function DashboardPeriodProvider({children}:{children:React.ReactNode}){
  const router=useRouter(); const pathname=usePathname(); const searchParams=useSearchParams();
  const raw=searchParams.get('month');
  const month=raw&&/^\d{4}-(0[1-9]|1[0-2])$/.test(raw)?raw:null;
  const setMonth=(next:string|null)=>{const params=new URLSearchParams(searchParams.toString());if(next)params.set('month',next);else params.delete('month');const query=params.toString();router.replace(query?`${pathname}?${query}`:pathname,{scroll:false});};
  const value=useMemo(()=>({month,query:month?`month=${month}`:'',setMonth}),[month]);
  return <DashboardPeriodContext.Provider value={value}>
    <div className="border-b border-border/60 bg-background px-4 py-2.5 md:px-6 xl:px-8">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm"><CalendarDays className="h-4 w-4 text-muted-foreground"/><span className="font-medium">Período global</span><span className="text-muted-foreground">{month?new Intl.DateTimeFormat('es-CL',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(`${month}-01T12:00:00Z`)):'Todo el histórico'}</span></div>
        <div className="flex items-center gap-2"><Input aria-label="Filtrar dashboard por mes" type="month" value={month||''} onChange={(event)=>setMonth(event.target.value||null)} className="h-8 w-[155px]"/>{month?<Button variant="ghost" size="sm" onClick={()=>setMonth(null)}><X className="h-4 w-4"/>Todo</Button>:null}</div>
      </div>
    </div>
    {children}
  </DashboardPeriodContext.Provider>;
}

export function useDashboardPeriod(){return useContext(DashboardPeriodContext);}
export function periodUrl(path:string,month:string|null){return month?`${path}${path.includes('?')?'&':'?'}month=${month}`:path;}
