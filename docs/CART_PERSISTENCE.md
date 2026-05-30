# Shopping Cart Persistence Implementation

## Overview
The HOTMESS Globe application implements robust shopping cart persistence using localStorage, ensuring users never lose their cart items on page refresh or browser close.

## Implementation Status: ✅ Complete

Both cart systems are fully implemented and tested:
- **Shopify Cart**: Headless Shopify storefront integration
- **P2P Marketplace Cart**: Creator-to-creator marketplace

## How It Works

### Shopify Cart (`ShopCartContext.jsx`)

The Shopify cart persists the cart ID to localStorage, allowing the cart to be recovered across sessions.

**Storage Key**: `shopify_cart_id_v1`

**Flow**:
1. User adds item to cart
2. Cart is created via Shopify Storefront API
3. Cart ID is saved to localStorage
4. On page refresh: Cart ID is read from localStorage and cart data is fetched from Shopify

**Features**:
- ✅ Automatic cart creation on first item add
- ✅ Cart ID persisted immediately after creation
- ✅ Cart restored automatically on page load
- ✅ Expired carts (404 errors) automatically cleared
- ✅ Graceful handling of localStorage errors

### P2P Marketplace Cart (`cartStorage.js`)

The P2P cart uses a hybrid approach with localStorage for guest users and Supabase database for authenticated users.

**Storage Key**: `hotmess_guest_cart_v1`

**Flow**:

**For Guest Users**:
1. User adds items to cart
2. Cart items stored in localStorage as JSON array
3. On page refresh: Cart items restored from localStorage

**For Authenticated Users**:
1. User adds items to cart
2. Cart items stored in Supabase database
3. If DB is unavailable: Falls back to localStorage

**Guest → Authenticated Flow**:
1. Guest adds items to cart (stored in localStorage)
2. User logs in
3. Guest cart automatically merges with user's database cart
4. Quantities accumulated for matching items
5. Guest cart cleared from localStorage after successful merge

**Features**:
- ✅ Variant support (different sizes/colors handled separately)
- ✅ Quantity accumulation on merge
- ✅ 30-minute item reservations
- ✅ Automatic cart merging on login
- ✅ Fallback to localStorage if DB unavailable

## Data Structures

### Shopify Cart (localStorage)
```javascript
// Key: shopify_cart_id_v1
// Value: "gid://shopify/Cart/abc123..."
```

### P2P Cart (localStorage)
```javascript
// Key: hotmess_guest_cart_v1
// Value: JSON array
[
  {
    "product_id": "product-123",
    "quantity": 2,
    "shopify_variant_id": "variant-small",
    "variant_title": "Small",
    "reserved_until": "2026-02-14T13:30:00.000Z"
  },
  {
    "product_id": "product-456",
    "quantity": 1,
    "reserved_until": "2026-02-14T13:30:00.000Z"
  }
]
```

## Test Coverage

### ✅ 29 Cart-Specific Tests (All Passing)

**ShopCartContext** (10 tests):
- Cart initialization and persistence
- Cart restoration from localStorage
- Page refresh persistence
- Error handling (404, localStorage failures)
- Cart clearing

**cartStorage** (19 tests):
- Guest cart persistence
- Cart operations (add, update, remove)
- Authentication flow
- Cart merging with quantity accumulation
- Variant support
- Edge cases (duplicates, corrupted data, etc.)

### Running Tests

```bash
# Run all cart tests
npm test -- ShopCartContext.test.jsx cartStorage.test.js

# Run all tests
npm run test:run
```

## Usage Examples

### Using Shopify Cart

```jsx
import { useShopCart } from '@/features/shop/cart/ShopCartContext';

function ProductPage() {
  const { addItem, cart, isLoading } = useShopCart();
  
  const handleAddToCart = async () => {
    await addItem({ 
      variantId: 'gid://shopify/ProductVariant/123',
      quantity: 1 
    });
    // Cart ID automatically persisted to localStorage
  };
  
  // Cart automatically restored on page load
  const itemCount = cart?.lines?.edges?.length || 0;
  
  return (
    <button onClick={handleAddToCart} disabled={isLoading}>
      Add to Cart ({itemCount} items)
    </button>
  );
}
```

### Using P2P Cart

```jsx
import { addToCart, getGuestCartItems, mergeGuestCartToUser } from '@/components/marketplace/cartStorage';

function MarketplaceProduct({ productId }) {
  const handleAddToCart = async () => {
    await addToCart({
      productId: productId,
      quantity: 1,
      variantId: 'variant-medium',
      variantTitle: 'Medium',
      currentUser: null // or pass authenticated user
    });
    // Automatically persisted to localStorage (guest) or DB (authenticated)
  };
  
  return <button onClick={handleAddToCart}>Add to Cart</button>;
}

// On login, merge guest cart
async function handleLogin(user) {
  await mergeGuestCartToUser({ currentUser: user });
  // Guest cart items now in user's DB cart, localStorage cleared
}
```

## Error Handling

Both cart implementations handle errors gracefully:

### localStorage Failures
- **Symptom**: Browser storage quota exceeded or disabled
- **Behavior**: Operations continue silently, no cart persistence
- **User Impact**: Cart lost on refresh (degrades gracefully)

### Expired Carts (404)
- **Symptom**: Shopify cart no longer exists
- **Behavior**: Cart ID automatically cleared from localStorage
- **User Impact**: Fresh cart created on next add

### Database Unavailable
- **Symptom**: Supabase connection issues
- **Behavior**: P2P cart falls back to localStorage
- **User Impact**: Cart works normally, will merge to DB when connection restored

## Browser Compatibility

Cart persistence works in all modern browsers that support:
- ✅ localStorage API (IE8+, all modern browsers)
- ✅ JSON.parse/stringify
- ✅ Fetch API (for Shopify integration)

## Security Considerations

### Data Stored
- **Shopify**: Only cart ID (no sensitive data)
- **P2P**: Product IDs and quantities (no payment info)
- **Never stored**: Payment methods, credit cards, personal info

### Privacy
- localStorage is domain-specific (not shared across sites)
- Guest cart automatically cleared after successful merge
- Users can clear carts manually via app UI

## Performance

- **localStorage reads**: ~1ms (synchronous)
- **localStorage writes**: ~1-5ms (synchronous)
- **Shopify cart hydration**: ~100-300ms (API call)
- **DB cart operations**: ~50-200ms (network dependent)

## Troubleshooting

### Cart Not Persisting
1. Check browser localStorage is enabled
2. Check storage quota not exceeded
3. Check for JavaScript errors in console
4. Verify `ShopCartProvider` wraps app in `App.jsx`

### Guest Cart Not Merging
1. Verify `mergeGuestCartToUser()` called after login
2. Check Supabase connection
3. Verify cart_items table exists
4. Check browser console for errors

### Items Disappearing
1. Check reservation timeout (30 minutes for P2P)
2. Verify localStorage not cleared by browser
3. Check for 404 errors (expired Shopify cart)

## References

- **Implementation**: 
  - `/src/features/shop/cart/ShopCartContext.jsx`
  - `/src/components/marketplace/cartStorage.js`
  
- **Tests**: 
  - `/src/features/shop/cart/ShopCartContext.test.jsx`
  - `/src/components/marketplace/cartStorage.test.js`
  
- **Usage**: 
  - `/src/App.jsx` (ShopCartProvider wrapper)
  - `/src/pages/ShopProduct.jsx` (Shopify cart usage)
  - `/src/pages/Marketplace.jsx` (P2P cart usage)

## Issue Resolution

This implementation resolves **Issue #105**:
- ✅ Cart data persists to localStorage
- ✅ Cart survives page refresh
- ✅ Cart survives browser close/reopen
- ✅ Comprehensive test coverage
- ✅ Error handling and graceful degradation

---

**Last Updated**: 2026-02-14  
**Status**: ✅ Production Ready  
**Test Coverage**: 29 tests, all passing
