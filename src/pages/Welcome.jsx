import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const STEPS = ['intro', 'city', 'modes', 'safety', 'done'];
const CITIES = ['london', 'berlin', 'paris', 'tokyo', 'nyc', 'los_angeles', 'san_francisco', 'sydney'];
const MODES = [
  { id: 'explore', name: 'Explore', desc: 'Discover the scene' },
  { id: 'now', name: 'Now', desc: 'Connect tonight' },
  { id: 'radio', name: 'Radio', desc: 'Live sets & culture' },
  { id: 'market', name: 'Market', desc: 'Buy, sell, trade' }
];

const Welcome = () => {
  const [step, setStep] = useState(0);
  const [city, setCity] = useState('');
  const [selectedModes, setSelectedModes] = useState(['explore']);
  const navigate = useNavigate();

  const next = () => {
    if (step === STEPS.length - 1) {
      localStorage.setItem('hotmess_onboarded', 'true');
      localStorage.setItem('hotmess_city', city);
      localStorage.setItem('hotmess_modes', JSON.stringify(selectedModes));
      navigate('/');
    } else {
      setStep(s => s + 1);
    }
  };

  const toggleMode = (id) => setSelectedModes(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
      {step === 0 && (
        <div className="text-center max-w-md">
          <h1 className="text-4xl font-bold mb-4">This is <span className="text-pink-500">HOTMESS</span>.</h1>
          <p className="text-lg text-gray-300 mb-8">A living world of nights, radio, connection, and commerce.</p>
          <button onClick={next} className="bg-pink-600 hover:bg-pink-700 px-8 py-3 rounded-full font-semibold">Enter</button>
        </div>
      )}
      {step === 1 && (
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold mb-4">Choose your city</h2>
          <p className="text-gray-400 mb-6">City-only location. No GPS tracking.</p>
          <div className="grid grid-cols-2 gap-2 mb-6">
            {CITIES.map(c => (
              <button key={c} onClick={() => setCity(c)} className={`p-3 rounded ${city === c ? 'bg-pink-600' : 'bg-gray-800 hover:bg-gray-700'}`}>{c}</button>
            ))}
          </div>
          <button onClick={next} disabled={!city} className="bg-pink-600 hover:bg-pink-700 px-8 py-3 rounded-full font-semibold disabled:opacity-50">Next</button>
        </div>
      )}
      {step === 2 && (
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold mb-4">What's your vibe?</h2>
          <div className="space-y-3 mb-6">
            {MODES.map(m => (
              <button key={m.id} onClick={() => toggleMode(m.id)} className={`w-full p-4 rounded text-left ${selectedModes.includes(m.id) ? 'bg-pink-600' : 'bg-gray-800 hover:bg-gray-700'}`}>
                <p className="font-semibold">{m.name}</p><p className="text-sm text-gray-300">{m.desc}</p>
              </button>
            ))}
          </div>
          <button onClick={next} className="bg-pink-600 hover:bg-pink-700 px-8 py-3 rounded-full font-semibold">Next</button>
        </div>
      )}
      {step === 3 && (
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold mb-4">We keep you safe</h2>
          <p className="text-gray-300 mb-8">We use aggregated city signals. No tracking. No exposure. Just vibes.</p>
          <button onClick={next} className="bg-pink-600 hover:bg-pink-700 px-8 py-3 rounded-full font-semibold">Got it</button>
        </div>
      )}
      {step === 4 && (
        <div className="text-center max-w-md">
          <h1 className="text-4xl font-bold mb-4">Welcome to the <span className="text-pink-500">mess</span>.</h1>
          <button onClick={next} className="bg-pink-600 hover:bg-pink-700 px-8 py-3 rounded-full font-semibold">Let's go</button>
        </div>
      )}
    </div>
  );
};
export default Welcome;
