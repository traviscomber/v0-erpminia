'use client';

import useSWR from 'swr';
import { StatePanel } from '@/components/ui/state-panel';
import { useAuth } from '@/hooks/use-auth';
import { PersonalPortalView, type PersonalPortalData } from '@/components/executive/personal-portal-view';

const fetcher=async(url:string):Promise<PersonalPortalData>=>{const r=await fetch(url,{credentials:'include',cache:'no-store'});const j=await r.json();if(!r.ok)throw new Error(j.error||'No fue posible cargar Mi portal');return j};

function endpointForCargo(cargo?:string|null){
  const normalized=String(cargo||'').trim().toUpperCase();
  if(normalized==='JEFE BODEGA')return'/api/mi-area/bodega';
  if(normalized==='JEFE ADM.')return'/api/mi-area/administracion';
  if(normalized==='JEFE GEÓLOGIA')return'/api/mi-area/geologia';
  if(normalized==='JEFE SONDAJE')return'/api/mi-area/sondaje';
  if(normalized==='JEFE DEPARTAMENTO DE MANTENCIÓN')return'/api/mi-area/mantencion-departamento';
  if(normalized==='JEFE DE EQUIPOS MINEROS')return'/api/mi-area/mantencion-tecnica';
  if(normalized==='JEFE DE CAMIONETAS')return'/api/mi-area/mantencion-tecnica';
  return'/api/mi-area';
}

export default function MiAreaPage(){
  const {user,loading:authLoading}=useAuth();
  const endpoint=authLoading?null:endpointForCargo(user?.cargo);
  const {data,error,isLoading}=useSWR<PersonalPortalData>(endpoint,fetcher,{revalidateOnFocus:false});

  if(authLoading||isLoading)return <StatePanel tone="loading" title="Cargando Mi portal" description="Leyendo la evidencia operacional del área."/>;
  if(error)return <StatePanel tone="error" title="Portal no disponible" description={error.message}/>;
  if(!data)return null;

  return <PersonalPortalView data={data} eyebrow="Mi portal"/>;
}
