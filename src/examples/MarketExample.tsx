/**
 * MarketExample — Product marketplace
 * 
 * Shows RAW/HUNG/HIGH categories with product cards.
 */

import { useState } from 'react';
import {
  Header,
  CategoryTabs,
  ProductCard,
  BottomSheet,
  Button,
} from '@/components/ui/design-system';
import { AppNavBar } from '@/components/nav/AppNavBar';

const mockProducts = {
  RAW: [
    { id: '1', brand: 'RAW', title: 'Fire Leather Harness', price: '£185', stock: 'LIMITED STOCK', image: 'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=200' },
    { id: '2', brand: 'RAW', title: 'Studded Collar', price: '£95', stock: 'IN STOCK', image: 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=200' },
  ],
  HUNG: [
    { id: '3', brand: 'HUNG', title: 'Mesh Tank', price: '£65', stock: 'IN STOCK', image: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=200' },
  ],
  HIGH: [
    { id: '4', brand: 'HIGH', title: 'Glow Bracelet', price: '£25', stock: 'SOLD OUT', image: 'https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=200' },
  ],
};

export default function MarketExample() {
  const [activeTab, setActiveTab] = useState('RAW');
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);

  const products = mockProducts[activeTab as keyof typeof mockProducts] || [];

  function handleBuy(title: string) {
    setSelectedProduct(title);
    setPurchaseOpen(true);
  }

  return (
    <div className="min-h-screen bg-dark flex flex-col">
      {/* Header */}
      <Header title="MARKET" onOptions={() => alert('Add product')} />

      {/* Category tabs */}
      <CategoryTabs
        tabs={['RAW', 'HUNG', 'HIGH']}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        className="py-3"
      />

      {/* Products */}
      <div className="flex-1 overflow-y-auto px-4 pb-20 space-y-4">
        {products.map(product => (
          <ProductCard
            key={product.id}
            image={product.image}
            brand={product.brand}
            title={product.title}
            price={product.price}
            stock={product.stock}
            onBuy={() => handleBuy(product.title)}
            onDetails={() => alert(`Details: ${product.title}`)}
          />
        ))}
      </div>

      {/* Purchase confirmation sheet */}
      <BottomSheet
        isOpen={purchaseOpen}
        onClose={() => setPurchaseOpen(false)}
        title="Purchase Complete!"
      >
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="w-16 h-16 rounded-full bg-gold flex items-center justify-center">
            <svg className="w-8 h-8 text-dark" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
            </svg>
          </div>
          <p className="text-light text-center">
            Your order for <span className="text-gold font-bold">{selectedProduct}</span> is confirmed.
          </p>
          <Button variant="primary" onClick={() => setPurchaseOpen(false)}>
            Back to Market
          </Button>
        </div>
      </BottomSheet>

      {/* Bottom nav */}
      <AppNavBar />
    </div>
  );
}
