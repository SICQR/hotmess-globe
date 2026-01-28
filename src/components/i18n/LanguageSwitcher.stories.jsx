import { LanguageSwitcher, CompactLanguageSwitcher } from './LanguageSwitcher';

export default {
  title: 'i18n/LanguageSwitcher',
  component: LanguageSwitcher,
  parameters: {
    layout: 'centered',
  },
};

// Default dropdown
export const Default = () => (
  <div className="p-8">
    <LanguageSwitcher />
  </div>
);

// Dropdown variant (explicit)
export const Dropdown = () => (
  <div className="p-8">
    <h3 className="text-white text-sm mb-4 font-medium">Dropdown Style</h3>
    <LanguageSwitcher variant="dropdown" />
  </div>
);

// Button group variant
export const ButtonGroup = () => (
  <div className="p-8">
    <h3 className="text-white text-sm mb-4 font-medium">Button Group Style</h3>
    <LanguageSwitcher variant="buttons" />
  </div>
);

// Flags only variant
export const FlagsOnly = () => (
  <div className="p-8">
    <h3 className="text-white text-sm mb-4 font-medium">Flags Only</h3>
    <LanguageSwitcher variant="flags" />
  </div>
);

// Compact version for navbar
export const Compact = () => (
  <div className="p-8 bg-white/5 rounded-lg">
    <h3 className="text-white text-sm mb-4 font-medium">Compact (for navbar)</h3>
    <CompactLanguageSwitcher />
  </div>
);

// Without labels
export const WithoutLabels = () => (
  <div className="p-8 space-y-4">
    <div>
      <h3 className="text-white text-sm mb-2 font-medium">Dropdown without label</h3>
      <LanguageSwitcher variant="dropdown" showLabel={false} />
    </div>
    <div>
      <h3 className="text-white text-sm mb-2 font-medium">Buttons without label</h3>
      <LanguageSwitcher variant="buttons" showLabel={false} />
    </div>
  </div>
);

// Without flags
export const WithoutFlags = () => (
  <div className="p-8 space-y-4">
    <div>
      <h3 className="text-white text-sm mb-2 font-medium">Dropdown without flags</h3>
      <LanguageSwitcher variant="dropdown" showFlag={false} />
    </div>
    <div>
      <h3 className="text-white text-sm mb-2 font-medium">Buttons without flags</h3>
      <LanguageSwitcher variant="buttons" showFlag={false} />
    </div>
  </div>
);

// In a settings context
export const InSettingsContext = () => (
  <div className="p-8 bg-white/5 border border-white/10 rounded-xl max-w-md">
    <div className="flex items-center gap-3 mb-6">
      <span className="text-[#FFEB3B]">🌐</span>
      <h2 className="text-xl font-bold text-white uppercase tracking-wider">Language</h2>
    </div>
    <div className="flex items-center justify-between">
      <div>
        <p className="font-semibold text-white">Display Language</p>
        <p className="text-sm text-white/60">Choose your preferred language</p>
      </div>
      <LanguageSwitcher 
        variant="dropdown"
        className="bg-black border-white/20"
      />
    </div>
  </div>
);

// All variants comparison
export const AllVariants = () => (
  <div className="p-8 space-y-8">
    <div>
      <h3 className="text-white text-sm mb-4 font-medium">Dropdown (default)</h3>
      <LanguageSwitcher variant="dropdown" />
    </div>
    <div>
      <h3 className="text-white text-sm mb-4 font-medium">Button Group</h3>
      <LanguageSwitcher variant="buttons" />
    </div>
    <div>
      <h3 className="text-white text-sm mb-4 font-medium">Flags Only</h3>
      <LanguageSwitcher variant="flags" />
    </div>
    <div>
      <h3 className="text-white text-sm mb-4 font-medium">Compact</h3>
      <div className="bg-white/5 p-2 rounded-lg inline-block">
        <CompactLanguageSwitcher />
      </div>
    </div>
  </div>
);
