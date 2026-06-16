import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { barcode } = await request.json()

    if (!barcode || typeof barcode !== 'string' || barcode.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Barcode is required' },
        { status: 400 }
      )
    }

    const cleanBarcode = barcode.trim()

    const response = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(cleanBarcode)}.json`,
      {
        headers: {
          'User-Agent': 'CalorieAI/1.0 (nutrition-tracker-app)',
        },
        signal: AbortSignal.timeout(10000),
      }
    )

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch product data from Open Food Facts' },
        { status: 502 }
      )
    }

    const data = await response.json()

    if (data.status === 0 || !data.product) {
      return NextResponse.json(
        { success: false, error: 'Product not found in Open Food Facts database' },
        { status: 404 }
      )
    }

    const product = data.product
    const nutrients = product.nutriments || {}

    const result = {
      name: product.product_name || product.product_name_en || 'Unknown Product',
      brand: product.brands || null,
      servingSize: product.serving_size || '100g',
      calories: parseFloat(nutrients['energy-kcal_100g']) || parseFloat(nutrients['energy-kcal']) || 0,
      protein: parseFloat(nutrients['proteins_100g']) || 0,
      carbs: parseFloat(nutrients['carbohydrates_100g']) || 0,
      fat: parseFloat(nutrients['fat_100g']) || 0,
      fiber: parseFloat(nutrients['fiber_100g']) || 0,
      sodium: parseFloat(nutrients['sodium_100g']) || 0,
      image: product.image_front_small_url || product.image_front_url || product.image_url || null,
      barcode: cleanBarcode,
      source: 'barcode',
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
