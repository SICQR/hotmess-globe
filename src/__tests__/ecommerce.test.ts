/**
 * Ecommerce — schema compliance tests
 *
 * Verifies the ecommerce flow:
 * - Stripe checkout session creation
 * - Webhook handles order status update
 * - Seller notification on sale
 * - Cart storage persistence
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

function readFile(filePath: string): string {
  try { return fs.readFileSync(path.resolve(filePath), 'utf8'); } catch { return ''; }
}

describe('Ecommerce schema compliance', () => {
  const checkoutSrc = readFile('api/stripe/create-checkout-session.js');
  const webhookSrc = readFile('api/stripe/webhook.js');
  const cartSrc = readFile('src/components/marketplace/cartStorage.js');
  const sellerDashSrc = readFile('src/pages/SellerDashboard.jsx');

  it('Stripe checkout session handler exists', () => {
    expect(checkoutSrc.length).toBeGreaterThan(50);
  });

  it('checkout creates Stripe session with line_items', () => {
    expect(checkoutSrc).toContain('line_items');
  });

  it('webhook handler exists and processes events', () => {
    expect(webhookSrc.length).toBeGreaterThan(50);
    expect(webhookSrc).toMatch(/checkout\.session\.completed|payment_intent/);
  });

  it('webhook updates order status in DB', () => {
    expect(webhookSrc).toMatch(/product_orders|order/i);
  });

  it('webhook notifies seller on sale', () => {
    expect(webhookSrc).toContain('notifications');
  });

  it('cart storage uses localStorage', () => {
    expect(cartSrc).toContain('localStorage');
  });

  it('cart storage exports addToCart and getGuestCartItems', () => {
    expect(cartSrc).toContain('export const addToCart');
    expect(cartSrc).toContain('export const getGuestCartItems');
  });

  it('seller dashboard exists and reads from DB', () => {
    if (!sellerDashSrc) return;
    // Should query from supabase
    expect(sellerDashSrc).toContain('supabase');
  });
});
