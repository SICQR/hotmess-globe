import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const shopDomain = Deno.env.get('SHOPIFY_SHOP_DOMAIN');
    const accessToken = Deno.env.get('SHOPIFY_ACCESS_TOKEN');

    if (!shopDomain || !accessToken) {
      return Response.json({ 
        error: 'Shopify credentials not configured',
        details: 'Set SHOPIFY_SHOP_DOMAIN and SHOPIFY_ACCESS_TOKEN in environment variables'
      }, { status: 400 });
    }

    // Fetch products from Shopify
    const shopifyResponse = await fetch(
      `https://${shopDomain}/admin/api/2024-01/products.json?limit=250`,
      {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!shopifyResponse.ok) {
      throw new Error(`Shopify API error: ${shopifyResponse.statusText}`);
    }

    const { products } = await shopifyResponse.json();

    const importedProducts = [];
    const updatedProducts = [];

    for (const shopifyProduct of products) {
      const variant = shopifyProduct.variants[0];
      
      const productData = {
        name: shopifyProduct.title,
        description: shopifyProduct.body_html?.replace(/<[^>]*>/g, '') || '',
        price_xp: Math.round(parseFloat(variant.price) * 100), // Convert to XP
        price_gbp: parseFloat(variant.price),
        seller_email: 'shopify@hotmess.london', // Official shop identifier
        product_type: 'physical',
        category: shopifyProduct.product_type || 'general',
        tags: shopifyProduct.tags?.split(',').map(t => t.trim()) || [],
        image_urls: shopifyProduct.images.map(img => img.src),
        status: shopifyProduct.status === 'active' ? 'active' : 'draft',
        inventory_count: variant.inventory_quantity || 0,
        details: {
          shopify_id: shopifyProduct.id.toString(),
          shopify_variant_id: variant.id.toString(),
          sku: variant.sku,
          shopify_handle: shopifyProduct.handle,
        }
      };

      // Check if product already exists (by shopify_id)
      const existingProducts = await base44.asServiceRole.entities.Product.list();
      const existing = existingProducts.find(
        p => p.details?.shopify_id === shopifyProduct.id.toString()
      );

      if (existing) {
        await base44.asServiceRole.entities.Product.update(existing.id, productData);
        updatedProducts.push(existing.id);
      } else {
        const created = await base44.asServiceRole.entities.Product.create(productData);
        importedProducts.push(created.id);
      }
    }

    return Response.json({
      success: true,
      imported: importedProducts.length,
      updated: updatedProducts.length,
      total: products.length,
      imported_ids: importedProducts,
      updated_ids: updatedProducts
    });

  } catch (error) {
    console.error('Shopify import error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});