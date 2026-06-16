# Cómo Subir Archivos XLS para Bodega e Inventario

## 📍 Ubicación en la App

**Ruta:** `/dashboard/bodega/documentos` → Tab "Importar Inventario"

## ✅ Pasos para Subir un Archivo

### 1. Navegar al módulo
- Ve a Dashboard → Bodega → Documentos
- Haz clic en la pestaña **"Importar Inventario"**

### 2. Preparar tu archivo
Tu archivo Excel/CSV debe tener estas columnas exactas:

| Columna | Descripción | Ejemplo |
|---------|-------------|---------|
| **SKU** | Código único del artículo | `ART-001`, `BN-2024-001` |
| **Nombre** | Descripción del artículo | `Tuberías de acero 2.5"` |
| **Cantidad** | Número de unidades | `150`, `2500` |
| **Ubicación** | Dónde está guardado en bodega | `A-12-3`, `Pasillo B` |
| **Proveedor** | Empresa proveedora | `Aceros Chile S.A.` |

### Ejemplo de datos correctos:

```
SKU,Nombre,Cantidad,Ubicación,Proveedor
ART-001,Tuberías Acero 2.5",150,A-12-3,Aceros Chile S.A.
ART-002,Conexiones Hidráulicas,2500,Pasillo B,Distribuidora Minera
ART-003,Repuestos Motores,45,C-05-1,Proveedora Industrial
ART-004,Correas Transportadoras,320,D-08-2,Equipos Mineros Chile
```

### 3. Formatos soportados
- ✅ **CSV** (.csv) - Recomendado
- ✅ **Excel** (.xls, .xlsx)

### 4. Subir el archivo

**Opción A - Arrastar:**
1. Haz clic en el área de carga
2. Arrastra tu archivo directamente
3. El archivo se cargará automáticamente

**Opción B - Seleccionar:**
1. Haz clic en el botón "Seleccionar archivo"
2. Elige tu archivo del explorador
3. Presiona "Abrir"

### 5. Confirmación
Una vez subido verás:
- ✅ Mensaje verde: "Archivo subido exitosamente"
- El nombre del archivo
- Ubicación: `bodega/importaciones/bodega-import-[timestamp]-[nombre].csv`

## 🗂️ Dónde se guardan los archivos

Los archivos se almacenan en **Supabase Storage**:
- **Ruta:** `documents/bodega-imports/`
- **Acceso:** Solo usuarios autenticados
- **Visibilidad:** Privada

## 📋 Ejemplo completo en Excel

### Crear en Excel:

1. Abre Microsoft Excel o Google Sheets
2. Crea estas columnas en la primera fila:
   - A1: `SKU`
   - B1: `Nombre`
   - C1: `Cantidad`
   - D1: `Ubicación`
   - E1: `Proveedor`

3. Agrega tus datos a partir de la fila 2:

| SKU | Nombre | Cantidad | Ubicación | Proveedor |
|-----|--------|----------|-----------|-----------|
| ART-001 | Tuberías Acero | 150 | A-12-3 | Aceros Chile |
| ART-002 | Conexiones | 2500 | Pasillo B | Distribuidora |
| ART-003 | Repuestos | 45 | C-05-1 | Proveedora |

4. Guarda como:
   - **Para Excel:** inventario-bodega.xlsx
   - **Para CSV:** inventario-bodega.csv (Archivo → Guardar como → Formato: CSV)

5. Sube el archivo usando la interfaz

## ⚠️ Reglas importantes

- **SKU debe ser único** - No puede haber duplicados
- **Cantidad debe ser un número** - Sin letras o símbolos
- **No dejes filas vacías** entre datos
- **No incluyas símbolos especiales** en los nombres
- **Respeta las mayúsculas/minúsculas** de los encabezados

## ❌ Problemas comunes

### Error: "Solo se aceptan archivos .csv, .xls y .xlsx"
- ✅ Solución: Asegúrate que el archivo tiene la extensión correcta
- Si guardaste en Excel, usa "Guardar como" y selecciona el formato

### El archivo no se carga
- ✅ Verifica tu conexión a internet
- Reintenta hacer clic en "Seleccionar archivo"
- Comprueba que el navegador permite subidas

### Los datos no aparecen
- ✅ Verifica que has completado todas las columnas requeridas
- Asegúrate que no hay espacios en blanco al inicio/final
- Revisa que la cantidad sea un número sin letras

## 🔍 Verificar que se subió correctamente

1. Después del mensaje de éxito, el archivo está en:
   - **Supabase Console** → Storage → documents → bodega-imports
   
2. Puedes:
   - ✅ Descargar el archivo nuevamente
   - ✅ Eliminar si cometiste un error
   - ✅ Usar para futuros procesamiento

## 💡 Próximos pasos

**Versiones futuras permitirán:**
- ✅ Procesamiento automático a base de datos
- ✅ Validación en tiempo real
- ✅ Reporte de importación
- ✅ Historial de cambios
- ✅ Integración con inventario en tiempo real

---

**Última actualización:** Junio 16, 2026
**Estado:** Disponible en bodega/documentos
