-- Confirmed canonical production package received 2026-08-22.
-- Source identity is locked by filename + SHA-256; duplicate uploads collapse to the same source hash.

alter table public.production_import_batches
  drop constraint if exists production_import_batches_motil_source_allowlist_check;

alter table public.production_import_batches
  add constraint production_import_batches_motil_source_allowlist_check check (
    (source_file='TM - 2019.xlsx' and source_file_sha256='43ff4fbc3dc85d349641aa054932b410daff1fdab57cb39addf9dab9d11f0b32') or
    (source_file='TM - 2020.xlsx' and source_file_sha256='0c0f716c2d3aa1bd1c156cb3058a47f014b79a756352a228105eb2e30b476452') or
    (source_file='TM - 2021.xlsx' and source_file_sha256='8fc92e17d020b755b0db20667ffd41e161e74408127d7fb438ea0d409ea47139') or
    (source_file='TM - 2022.xlsx' and source_file_sha256='6c0312cf30e3e0252641eb2bc18a6ac571f8403459f82f4cebe45290249d0010') or
    (source_file='TM-2023.xlsx' and source_file_sha256='a88c87e088a91160bbe78164c9324e6aa8f59cc8ca8a1e9d6f22c0ae757429c9') or
    (source_file='TM-2024 actualizado.xlsx' and source_file_sha256='fd51c112e23a30ea4c614073f7ceaaf88d6e6de50337d02a6bca35772aaa7aa9') or
    (source_file='TM 2025 actualizado (31-12-2025).xlsx' and source_file_sha256='2129860d6ce77469289d95f76fded63f5dbf2212e0deaecc4ed243c5fc237ff4') or
    (source_file='TM 2026 actualizado (06-08-2026).xlsx' and source_file_sha256='dbc1b28a68f0faa269fca43dfc127823ef3d1f4155274a152cad7a3c166f6b00') or
    (source_file='LEY.xlsx' and source_file_sha256='9235bc3b4b379bc131187cf2b255ce5584f64623c3b5d14c75630a9a2ddf8618') or
    (source_file='LEYES.xlsx' and source_file_sha256='dc7d5a35a55bb117ae8bb4e512d3c2be99b87b3ea981ec0fc43ba2f764043a3f') or
    (source_file='ESTADISTICAS DE PRODUCCION 31 DE JULIO 2026.xlsx' and source_file_sha256='7f8fd25a3c17935ad8de62324e7b25df61f9b4067e8a6c843b074d260ce7b941') or
    (source_file='Informe mensual Mina Peumo mes Julio 2026.xlsx' and source_file_sha256='17e69b147e89660210d27de1a977ea81bf0656d2239aef85e0dc0b43851e755d') or
    (source_file='Informe mensual Mina Don Jaime mes Julio 2026.xlsx' and source_file_sha256='97b142e1fcc50b9eadf23d3ba26a4d2bbb8732050cef4551613a6fc4a37b6af0') or
    (source_file='Reporte_Sondajes_I_A.xlsx' and source_file_sha256='890a02364b1b41c9724458c40e46964190255d34c9f7ca8b9e9985d53bb1ad50') or
    (source_file='Mantención Sondajes - copia.xlsx' and source_file_sha256='6ecaa6cd63e8acc04d91a87e606681af8e6dfe02c2c14673d137fed4d87b6613') or
    (source_file='LEY (1).xlsx' and source_file_sha256='befb1d0e09da8b79c50dc8ce6bda25735f2b7d5c4a67f343630dde3a25ebd40a') or
    (source_file='PROGRAMA DE PRODUCCION AGOSTO 2026.pdf' and source_file_sha256='4745e45f0840ec788f332ce7ac92ea3b060f563ed605a6601d7c857946676db7')
  );

alter table public.production_import_batches
  drop constraint if exists production_import_batches_source_type_check;

alter table public.production_import_batches
  add constraint production_import_batches_source_type_check check (
    source_type in ('tm','ley','leyes','manual','other','drilling','maintenance','mine_report','statistics','plan')
  );
