import { useState } from 'react';
import { useCreatorProfile, useCreatorProducts, CREATOR_TYPES, PRODUCT_KINDS } from '../../hooks/useCreator';

const CreatorDashboard = () => {
  const { profile, loading, createProfile } = useCreatorProfile();
  const { products, createProduct, loading: productsLoading } = useCreatorProducts(profile?.id);
  const [newType, setNewType] = useState('dj');
  const [newCity, setNewCity] = useState('london');
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [productForm, setProductForm] = useState({ kind: 'radio_show', title: '', description: '', price: 0 });

  if (loading) return <div className="p-6 bg-black min-h-screen text-white">Loading...</div>;

  if (!profile) {
    return (
      <div className="p-6 bg-black min-h-screen text-white">
        <h1 className="text-2xl font-bold mb-4">Become a Creator</h1>
        <div className="max-w-md space-y-4">
          <select value={newType} onChange={e => setNewType(e.target.value)} className="w-full bg-gray-800 p-3 rounded">
            {CREATOR_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={newCity} onChange={e => setNewCity(e.target.value)} className="w-full bg-gray-800 p-3 rounded">
            {['london','berlin','paris','tokyo','nyc','los_angeles'].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={() => createProfile(newType, newCity)} className="w-full bg-pink-600 hover:bg-pink-700 p-3 rounded font-semibold">Create Profile</button>
        </div>
      </div>
    );
  }

  const handleCreateProduct = async () => {
    await createProduct(productForm);
    setShowNewProduct(false);
    setProductForm({ kind: 'radio_show', title: '', description: '', price: 0 });
  };

  return (
    <div className="p-6 bg-black min-h-screen text-white">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">{profile.type.toUpperCase()}</h1>
          <p className="text-gray-400">{profile.city} • {profile.verified ? '✓ Verified' : 'Unverified'}</p>
        </div>
        <span className="text-2xl">🎧</span>
      </div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Products ({products.length})</h2>
        <button onClick={() => setShowNewProduct(!showNewProduct)} className="bg-pink-600 hover:bg-pink-700 px-4 py-2 rounded">+ New Product</button>
      </div>
      {showNewProduct && (
        <div className="bg-gray-900 p-4 rounded-lg mb-4 space-y-3">
          <select value={productForm.kind} onChange={e => setProductForm(f => ({...f, kind: e.target.value}))} className="w-full bg-gray-800 p-2 rounded">
            {PRODUCT_KINDS.map(k => <option key={k} value={k}>{k.replace('_', ' ')}</option>)}
          </select>
          <input value={productForm.title} onChange={e => setProductForm(f => ({...f, title: e.target.value}))} placeholder="Title" className="w-full bg-gray-800 p-2 rounded"/>
          <input type="number" value={productForm.price} onChange={e => setProductForm(f => ({...f, price: parseFloat(e.target.value)}))} placeholder="Price" className="w-full bg-gray-800 p-2 rounded"/>
          <button onClick={handleCreateProduct} className="w-full bg-green-600 hover:bg-green-700 p-2 rounded">Create</button>
        </div>
      )}
      <div className="space-y-2">
        {products.map(p => (
          <div key={p.id} className="bg-gray-900 p-4 rounded-lg flex justify-between items-center">
            <div><p className="font-semibold">{p.title}</p><p className="text-sm text-gray-400">{p.kind}</p></div>
            <p className="text-pink-500 font-bold">£{p.price}</p>
          </div>
        ))}
        {products.length === 0 && <p className="text-gray-500">No products yet. Create one!</p>}
      </div>
    </div>
  );
};
export default CreatorDashboard;
