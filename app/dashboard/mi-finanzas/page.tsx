'use client';

import useSWR from 'swr';
import { StatePanel } from '@/components/ui/state-panel';
import { PersonalPortalView, type PersonalPortalData } from '@/components/executive/personal-portal-view';

const fetcher=async(url:string):Promise<PersonalPortalData>=>{const r=await fetch(url,{credentials:'include',cache:'no-store'});const j=await r.json();if(!r.ok)throw new Error(j.error||'No fue posible cargar Mi finanzas');return j};

export default function MiFinanzasPage(){
  const {data,error,isLoading}=useSWR<PersonalPortalData>('/api/mi-finanzas-historico',fetcher,{revalidateOnFocus:false});
  if(isLoading)return <StatePanel tone="loading" title="Cargando Mi finanzas" description="Leyendo la evidencia financiera canónica y su historial comparable."/>;
  if(error)return <StatePanel tone="error" title="Vista no disponible" description={error.message}/>;
  if(!data)return null;
  return <PersonalPortalView data={data} eyebrow="Gerencia de Finanzas" description={`Vista personal para ${data.user.name||'Gerencia de Finanzas'}, enfocada en compromisos, reconocimiento, cobertura y excepciones. Los KPI describen el dominio financiero y no una evaluación personal.`}/>;
}
