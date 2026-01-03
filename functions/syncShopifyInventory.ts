import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Allow both admin users and scheduled tasks (no user authentication)
    const isAuthenticated = await base44.auth.isAuthenticated();
    if (isAuthenticated) {
      const user = await base44.auth.me();
      if (user?.role !== 'admin') {
        return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      }
    }

    const shopDomain = Deno.env.get('SHOPIFY_SHOP_DOMAIN');
    const accessToken = Deno.env.get('SHOPIFY_ACCESS_TOKEN');

    if (!shopDomain || !accessToken) {
      return Response.json({ 
        error: 'Shopify credentials not configured' 
      }, { status: 400 });
    }

    // Get all products with Shopify IDs
    const allProducts = await base44.asServiceRole.entities.Product.list();
    const shopifyProducts = allProducts.filter(p => p.details?.shopify_id);

    const syncedProducts = [];
    const errors = [];

    for (const product of shopifyProducts) {
      try {
        const shopifyId = product.details.shopify_id;
        
        // Fetch product from Shopify
        const response = await fetch(
          `https://${shopDomain}/admin/api/2024-01/products/${shopifyId}.json`,
          {
            headers: {
              'X-Shopify-Access-Token': accessToken,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          errors.push({ product_id: product.id, error: `Shopify API error: ${response.statusText}` });
          continue;
        }

        const { product: shopifyProduct } = await response.json();
        const variant = shopifyProduct.variants.find(
          v => v.id.toString() === product.details.shopify_variant_id
        ) || shopifyProduct.variants[0];

        // Update inventory count and status
        const updates = {
          inventory_count: variant.inventory_quantity || 0,
          status: variant.inventory_quantity > 0 ? 'active' : 'sold_out',
          price_gbp: parseFloat(variant.price),
          price_xp: Math.round(parseFloat(variant.price) * 100),
        };

        await base44.asServiceRole.entities.Product.update(product.id, updates);
        syncedProducts.push({
          product_id: product.id,
          name: product.name,
          old_inventory: product.inventory_count,
          new_inventory: updates.inventory_count
        });

      } catch (error) {
        errors.push({ 
          product_id: product.id, 
          error: error.message 
        });
      }
    }

    return Response.json({
      success: true,
      synced: syncedProducts.length,
      errors: errors.length,
      timestamp: new Date().toISOString(),
      synced_products: syncedProducts,
      error_details: errors
    });

  } catch (error) {
    console.error('Inventory sync error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});