alter table public.production_material_movements
  add column if not exists client_name_raw text,
  add column if not exists movement_description_raw text,
  add column if not exists interior_mine_raw text,
  add column if not exists debt_status_raw text,
  add column if not exists material_classification text check (material_classification in ('process_mineral','sterile','ash','other','unclassified'));

alter table public.production_plant_shifts
  add column if not exists humidity_factor numeric,
  add column if not exists lot_number_raw text,
  add column if not exists blend_code_raw text;

alter table public.production_metallurgy_results
  add column if not exists dispatch_moisture numeric,
  add column if not exists dispatch_grade numeric,
  add column if not exists dispatched_quantity_raw numeric,
  add column if not exists dispatched_quantity_unit text;
