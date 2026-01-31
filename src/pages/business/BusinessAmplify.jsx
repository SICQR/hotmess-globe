import { useState } from 'react';
import { useMyBusiness, useAmplification, useCreateSignal } from '../../hooks/useBusiness';

const BusinessAmplify = () => {
  const { business, isLoading: bizLoading } = useMyBusiness();
  const { startAmplification, isPending: ampPending } = useAmplification(business?.id);
  const { createSignal, isPending: sigPending } = useCreateSignal();
  const [form, setForm] = useState({ city: 'london', signal_type: 'event', starts_at: '', ends_at: '', budget: 100 });
  const [result, setResult] = useState(null);

  const submit = async () => {
    if (!business) {
      setResult('No business profile found');
      return;
    }
    const signal = await createSignal({
      businessId: business.id,
      signalType: form.signal_type,
      startsAt: form.starts_at,
      durationMinutes: 60,
      intensity: form.budget,
      cityId: form.city
    });
    setResult(signal ? 'Amplification scheduled!' : 'Failed');
  };

  if (bizLoading) return <div className="p-6 bg-black min-h-screen text-white">Loading...</div>;

  return (
    <div className="p-6 bg-black min-h-screen text-white">
      <h1 className="text-2xl font-bold mb-4">Schedule Amplification</h1>
      {!business && <p className="text-yellow-400 mb-4">You need a verified business to amplify. <a href="/biz/onboarding" className="underline">Get started</a></p>}
      <div className="max-w-md space-y-4">
        <select value={form.signal_type} onChange={e => setForm(f => ({...f, signal_type: e.target.value}))} className="w-full bg-gray-800 p-3 rounded">
          <option value="event">Event</option><option value="radio_premiere">Radio Premiere</option><option value="drop">Drop</option>
        </select>
        <select value={form.city} onChange={e => setForm(f => ({...f, city: e.target.value}))} className="w-full bg-gray-800 p-3 rounded">
          {['london','berlin','paris','tokyo','nyc','los_angeles'].map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input type="datetime-local" value={form.starts_at} onChange={e => setForm(f => ({...f, starts_at: e.target.value}))} className="w-full bg-gray-800 p-3 rounded" placeholder="Start"/>
        <input type="number" value={form.budget} onChange={e => setForm(f => ({...f, budget: parseInt(e.target.value)}))} className="w-full bg-gray-800 p-3 rounded" placeholder="Intensity (credits)"/>
        <button onClick={submit} disabled={sigPending || !business} className="w-full bg-pink-600 hover:bg-pink-700 p-3 rounded font-semibold disabled:opacity-50">{sigPending ? 'Scheduling...' : 'Schedule Amplification'}</button>
        {result && <p className={result.includes('!') ? 'text-green-400' : 'text-red-400'}>{result}</p>}
      </div>
    </div>
  );
};
export default BusinessAmplify;
