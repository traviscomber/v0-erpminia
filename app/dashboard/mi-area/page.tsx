'use client';

import useSWR from 'swr';
import { StatePanel } from '@/components/ui/state-panel';
import { useAuth } from '@/hooks/use-auth';
import { PersonalPortalView, type PersonalPortalData } from '@/components/executive/personal-portal-view';

const fetcher=async(url:string):Promise<PersonalPortalData>=>{const r=await fetch(url,{credentials:'include',cache:'no-store'});const j=await r.json();if(!r.ok)throw new Error(j.error||'No fue posible cargar Mi portal');return j};

export default function MiAreaPage(){
  const {loading:authLoading}=useAuth();
  const endpoint=authLoading?null:'/api/mi-portal';
  const {data,error,isLoading}=useSWR<PersonalPortalData>(endpoint,fetcher,{revalidateOnFocus:false});

  if(authLoading||isLoading)return <StatePanel tone="loading" title="Cargando Mi portal" description="Leyendo la evidencia operacional y el historial comparable del área."/>;
  if(error)return <StatePanel tone="error" title="Portal no disponible" description={error.message}/>;
  if(!data)return null;

  return <PersonalPortalView data={data} eyebrow="Mi portal"/>;
}
