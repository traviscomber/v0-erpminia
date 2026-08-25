import { type NextRequest } from 'next/server';

export type DashboardPeriod={month:string|null;start:string|null;end:string|null};

export function getDashboardPeriod(request:NextRequest):DashboardPeriod|null{
  const month=request.nextUrl.searchParams.get('month');
  if(!month)return {month:null,start:null,end:null};
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))return null;
  const [year,monthNumber]=month.split('-').map(Number);
  const nextMonth=monthNumber===12?`${year+1}-01`:`${year}-${String(monthNumber+1).padStart(2,'0')}`;
  return {month,start:`${month}-01`,end:`${nextMonth}-01`};
}

export function applyDatePeriod<T extends {gte:(column:string,value:string)=>T;lt:(column:string,value:string)=>T}>(query:T,period:DashboardPeriod,column:string):T{
  return period.start&&period.end?query.gte(column,period.start).lt(column,period.end):query;
}
