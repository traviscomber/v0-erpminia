import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.development.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function setMinimumStock() {
  try {
    console.log('\n╔════════════════════════════════════════════════════════╗')
    console.log('║   Estableciendo stock mínimo para inventario (20 un.)  ║')
    console.log('╚════════════════════════════════════════════════════════╝\n')

    // 1. Get current inventory stats
    console.log('1. Analizando inventario actual...')
    const { data: allItems, error: fetchError } = await supabase
      .from('bodega_inventory')
      .select('id, sku, name, quantity, min_stock, max_stock')

    if (fetchError) {
      console.error('❌ Error fetching inventory:', fetchError.message)
      process.exit(1)
    }

    console.log(`   ✓ Total de productos: ${allItems.length}`)

    // 2. Analyze current min_stock distribution
    const belowMin = allItems.filter(item => item.min_stock < 20)
    const aboveMin = allItems.filter(item => item.min_stock >= 20)
    const lowStock = allItems.filter(item => item.quantity <= item.min_stock)

    console.log(`   ✓ Productos con min_stock < 20: ${belowMin.length}`)
    console.log(`   ✓ Productos con min_stock >= 20: ${aboveMin.length}`)
    console.log(`   ✓ Productos con stock bajo: ${lowStock.length}\n`)

    // 3. Update all items with min_stock < 20 to 20
    if (belowMin.length > 0) {
      console.log('2. Actualizando min_stock a 20...')
      
      const { error: updateError } = await supabase
        .from('bodega_inventory')
        .update({ min_stock: 20 })
        .lt('min_stock', 20)

      if (updateError) {
        console.error('❌ Error updating min_stock:', updateError.message)
        process.exit(1)
      }

      console.log(`   ✓ ${belowMin.length} productos actualizados\n`)
    }

    // 4. Get updated stats
    console.log('3. Verificando actualización...')
    const { data: updatedItems, error: verifyError } = await supabase
      .from('bodega_inventory')
      .select('id, sku, name, quantity, min_stock')

    if (verifyError) {
      console.error('❌ Error verifying:', verifyError.message)
      process.exit(1)
    }

    const nowLowStock = updatedItems.filter(item => item.quantity <= 20)
    const nowAboveMin = updatedItems.filter(item => item.min_stock >= 20)

    console.log(`   ✓ Todos los productos tienen min_stock >= 20: ${nowAboveMin.length}/${updatedItems.length}`)
    console.log(`   ✓ Productos con stock bajo (qty <= 20): ${nowLowStock.length}\n`)

    // 5. Show sample of low stock items
    if (nowLowStock.length > 0) {
      console.log('4. Productos con stock bajo (ACCIÓN REQUERIDA):\n')
      nowLowStock.slice(0, 10).forEach((item, idx) => {
        const status = item.quantity <= 10 ? '🔴 CRÍTICO' : '🟡 BAJO'
        console.log(`   ${idx + 1}. ${status} ${item.name}`)
        console.log(`      SKU: ${item.sku} | Stock: ${item.quantity} / Mínimo: ${item.min_stock}`)
      })
      
      if (nowLowStock.length > 10) {
        console.log(`\n   ... y ${nowLowStock.length - 10} más`)
      }
    }

    console.log('\n╔════════════════════════════════════════════════════════╗')
    console.log('║          ✅ Configuración completada                   ║')
    console.log('╚════════════════════════════════════════════════════════╝\n')

    console.log('RESUMEN:')
    console.log(`- Total de productos: ${updatedItems.length}`)
    console.log(`- Stock mínimo establecido: 20 unidades para todos`)
    console.log(`- Productos con stock bajo: ${nowLowStock.length}`)
    console.log(`- Próximo paso: Revisar productos críticos en sistema\n`)

  } catch (err) {
    console.error('❌ Error:', err.message)
    process.exit(1)
  }
}

setMinimumStock()
