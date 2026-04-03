import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { product_id, quantity = 1 } = await req.json();

    if (!product_id) {
      return Response.json({ error: 'Missing product_id' }, { status: 400 });
    }

    // Get product
    const products = await base44.asServiceRole.entities.Product.filter({ id: product_id });
    if (products.length === 0) {
      return Response.json({ error: 'Product not found' }, { status: 404 });
    }

    const product = products[0];

    // Check if product has Sweat Coin price
    if (!product.price_sweat) {
      return Response.json({ error: 'Product not available for Sweat Coin purchase' }, { status: 400 });
    }

    const totalCost = product.price_sweat * quantity;

    // Check user balance
    const userBalance = user.sweat_coins || 0;
    if (userBalance < totalCost) {
      return Response.json({ 
        error: 'Insufficient Sweat Coins',
        required: totalCost,
        current: userBalance,
        shortage: totalCost - userBalance
      }, { status: 400 });
    }

    // Check inventory
    if (product.inventory_count < quantity) {
      return Response.json({ 
        error: 'Insufficient inventory',
        available: product.inventory_count
      }, { status: 400 });
    }

    // Deduct Sweat Coins
    const newBalance = userBalance - totalCost;
    await base44.asServiceRole.entities.User.update(user.id, {
      sweat_coins: newBalance
    });

    // Log transaction
    await base44.asServiceRole.entities.SweatCoin.create({
      user_email: user.email,
      amount: -totalCost,
      transaction_type: 'purchase',
      reference_id: product_id,
      reference_type: 'product',
      metadata: {
        product_name: product.name,
        quantity
      },
      balance_after: newBalance
    });

    // Create order
    const order = await base44.asServiceRole.entities.Order.create({
      buyer_email: user.email,
      seller_email: product.seller_email,
      product_id,
      total_xp: 0,
      total_gbp: 0,
      total_sweat: totalCost,
      status: 'pending',
      payment_method: 'sweat'
    });

    // Update inventory
    await base44.asServiceRole.entities.Product.update(product_id, {
      inventory_count: product.inventory_count - quantity,
      sales_count: (product.sales_count || 0) + 1
    });

    // Notify seller
    await base44.asServiceRole.entities.NotificationOutbox.create({
      user_email: product.seller_email,
      notification_type: 'sale',
      title: 'New Sweat Coin Sale',
      message: `${user.full_name} purchased ${quantity}x ${product.name} for ${totalCost} Sweat Coins`,
      metadata: {
        order_id: order.id,
        product_id,
        buyer_email: user.email
      }
    });

    return Response.json({
      success: true,
      order_id: order.id,
      sweat_spent: totalCost,
      new_balance: newBalance,
      product_name: product.name,
      quantity
    });

  } catch (error) {
    console.error('Sweat Coin purchase error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});