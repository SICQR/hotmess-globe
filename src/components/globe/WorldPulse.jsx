import { useWorldPulse } from '../../contexts/WorldPulseContext';

const PULSE_DESCRIPTIONS = {
  city_glow: 'heating up',
  heat_bloom: 'surging',
  wave: 'radio spike',
  heartbeat: 'alive',
  breath: 'waking',
  tremor: 'shaking'
};

const WorldPulse = () => {
  const { pulses } = useWorldPulse();
  const recentPulses = pulses.slice(0, 5);

  if (recentPulses.length === 0) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-80 z-40">
      <div className="bg-black/80 backdrop-blur-sm rounded-lg p-3 border border-gray-800">
        <h4 className="text-xs text-gray-500 uppercase mb-2">World Pulse</h4>
        <div className="space-y-2">
          {recentPulses.map(p => (
            <div key={p.id} className="flex items-center gap-2 text-sm animate-fade-in">
              <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse"></span>
              <span className="text-white">{p.city || 'World'}</span>
              <span className="text-gray-400">{PULSE_DESCRIPTIONS[p.type] || p.type}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
export default WorldPulse;
