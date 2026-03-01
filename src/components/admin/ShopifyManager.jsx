import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { auth } from '@/components/utils/supabaseClient';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Download, RefreshCw, CheckCircle, AlertCircle, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';

async function postWithAuth(url) {
  const { data } = await auth.getSession();
  const token = data?.session?.access_token;
  if (!token) throw new Error('Not authenticated');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error || payload?.details || 'Request failed');
  }

  return payload;
}

export default function ShopifyManager() {
  const [lastImport, setLastImport] = useState(null);
  const [lastSync, setLastSync] = useState(null);

  const { data: shopifyProducts = [] } = useQuery({
    queryKey: ['shopify-products'],
    queryFn: async () => {
      // Only show currently-active official Shopify items (avoid historic draft/archived imports)
      return base44.entities.Product.filter(
        { seller_email: 'shopify@hotmess.london', status: 'active' },
        '-created_date'
      );
    }
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      return postWithAuth('/api/shopify/import');
    },
    onSuccess: (data) => {
      setLastImport(data);
      toast.success(`Imported ${data.imported} new products, updated ${data.updated} existing products`);
    },
    onError: (error) => {
      toast.error('Import failed: ' + error.message);
    }
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      return postWithAuth('/api/shopify/sync');
    },
    onSuccess: (data) => {
      setLastSync(data);
      if (data.errors > 0) {
        toast.warning(`Synced ${data.synced} products with ${data.errors} errors`);
      } else {
        toast.success(`Successfully synced ${data.synced} products`);
      }
    },
    onError: (error) => {
      toast.error('Sync failed: ' + error.message);
    }
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black uppercase mb-2">Shopify Integration</h2>
        <p className="text-white/60">Import and sync products from your Shopify store</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white/5 border-white/10 p-6">
          <div className="flex items-center gap-3 mb-2">
            <ShoppingBag className="w-5 h-5 text-[#39FF14]" />
            <span className="text-sm text-white/60 uppercase">Shopify Products</span>
          </div>
          <div className="text-3xl font-black">{shopifyProducts.length}</div>
        </Card>

        <Card className="bg-white/5 border-white/10 p-6">
          <div className="flex items-center gap-3 mb-2">
            <Download className="w-5 h-5 text-[#00D9FF]" />
            <span className="text-sm text-white/60 uppercase">Last Import</span>
          </div>
          <div className="text-sm">
            {lastImport ? (
              <>
                <div className="font-bold text-[#39FF14]">
                  +{lastImport.imported} new, ~{lastImport.updated} updated
                </div>
              </>
            ) : (
              <span className="text-white/40">Never</span>
            )}
          </div>
        </Card>

        <Card className="bg-white/5 border-white/10 p-6">
          <div className="flex items-center gap-3 mb-2">
            <RefreshCw className="w-5 h-5 text-[#C8962C]" />
            <span className="text-sm text-white/60 uppercase">Last Sync</span>
          </div>
          <div className="text-sm">
            {lastSync ? (
              <>
                <div className="font-bold text-[#39FF14]">
                  {lastSync.synced} synced
                </div>
                {lastSync.errors > 0 && (
                  <div className="text-xs text-red-400">{lastSync.errors} errors</div>
                )}
              </>
            ) : (
              <span className="text-white/40">Never</span>
            )}
          </div>
        </Card>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-white/5 border-white/10 p-6">
          <h3 className="font-black uppercase mb-2 flex items-center gap-2">
            <Download className="w-5 h-5 text-[#00D9FF]" />
            Import Products
          </h3>
          <p className="text-sm text-white/60 mb-4">
            Fetch all products from Shopify and add them to the marketplace. Existing products will be updated.
          </p>
          <Button
            onClick={() => importMutation.mutate()}
            disabled={importMutation.isPending}
            className="w-full bg-[#00D9FF] hover:bg-[#00D9FF]/90 text-black font-black"
          >
            {importMutation.isPending ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Import Now
              </>
            )}
          </Button>
        </Card>

        <Card className="bg-white/5 border-white/10 p-6">
          <h3 className="font-black uppercase mb-2 flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-[#C8962C]" />
            Sync Inventory
          </h3>
          <p className="text-sm text-white/60 mb-4">
            Update inventory counts and prices for all Shopify products. Runs automatically every hour.
          </p>
          <Button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="w-full bg-[#C8962C] hover:bg-[#C8962C]/90 text-white font-black"
          >
            {syncMutation.isPending ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Sync Now
              </>
            )}
          </Button>
        </Card>
      </div>

      {/* Recent Sync Results */}
      {lastSync && lastSync.synced_products && lastSync.synced_products.length > 0 && (
        <Card className="bg-white/5 border-white/10 p-6">
          <h3 className="font-black uppercase mb-4">Recent Sync Results</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {lastSync.synced_products.map((product, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm border-b border-white/5 pb-2">
                <span className="text-white/80">{product.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-white/40">
                    {product.old_inventory} → {product.new_inventory}
                  </span>
                  {product.old_inventory !== product.new_inventory && (
                    <CheckCircle className="w-4 h-4 text-[#39FF14]" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Errors */}
      {lastSync && lastSync.error_details && lastSync.error_details.length > 0 && (
        <Card className="bg-red-500/10 border-red-500/30 p-6">
          <h3 className="font-black uppercase mb-4 text-red-400 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Sync Errors
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {lastSync.error_details.map((error, idx) => (
              <div key={idx} className="text-sm text-red-400">
                Product {error.product_id}: {error.error}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
