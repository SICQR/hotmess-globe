/**
 * EmergencyContactCircle - Emergency contact management
 * 
 * Add trusted contacts who can be notified in emergencies
 * Supports location sharing, check-in alerts, panic alerts
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Plus, X, Phone, MapPin, Clock, Shield,
  AlertTriangle, Check, Edit2, Trash2, Send
} from 'lucide-react';
import { LuxModal } from '../lux/LuxModal';

const MAX_CONTACTS = 5;

export function EmergencyContactCircle({
  contacts = [],
  onAddContact,
  onRemoveContact,
  onUpdateContact,
  onSendAlert,
  className = '',
}) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);

  return (
    <div className={`${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-[#E62020]" />
          <h3 className="font-bold tracking-wider">EMERGENCY CONTACTS</h3>
        </div>
        <span className="text-xs text-white/40 font-mono">
          {contacts.length}/{MAX_CONTACTS}
        </span>
      </div>

      {/* Contact List */}
      <div className="space-y-2 mb-4">
        {contacts.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-white/20">
            <Users className="w-10 h-10 mx-auto text-white/20 mb-2" />
            <p className="text-sm text-white/40">No emergency contacts added</p>
            <p className="text-xs text-white/30 mt-1">
              Add trusted people who can help in emergencies
            </p>
          </div>
        ) : (
          contacts.map((contact) => (
            <ContactCard
              key={contact.id}
              contact={contact}
              onEdit={() => setSelectedContact(contact)}
              onRemove={() => onRemoveContact?.(contact.id)}
              onSendAlert={() => onSendAlert?.(contact)}
            />
          ))
        )}
      </div>

      {/* Add Button */}
      {contacts.length < MAX_CONTACTS && (
        <button
          onClick={() => setShowAddModal(true)}
          className="w-full py-3 border-2 border-dashed border-white/20 
                     flex items-center justify-center gap-2 text-white/60
                     hover:border-[#E62020] hover:text-[#E62020] transition-all"
        >
          <Plus className="w-5 h-5" />
          <span className="text-sm font-bold tracking-wider">ADD CONTACT</span>
        </button>
      )}

      {/* Add/Edit Modal */}
      <AddContactModal
        isOpen={showAddModal || !!selectedContact}
        onClose={() => {
          setShowAddModal(false);
          setSelectedContact(null);
        }}
        contact={selectedContact}
        onSave={(data) => {
          if (selectedContact) {
            onUpdateContact?.(selectedContact.id, data);
          } else {
            onAddContact?.(data);
          }
          setShowAddModal(false);
          setSelectedContact(null);
        }}
      />
    </div>
  );
}

function ContactCard({ contact, onEdit, onRemove, onSendAlert }) {
  const [showActions, setShowActions] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-black/50 border border-white/20 p-3 hover:border-white/40 transition-colors"
    >
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="w-10 h-10 bg-[#E62020]/20 border border-[#E62020]/50 
                        flex items-center justify-center text-[#E62020] font-bold">
          {contact.name?.charAt(0)?.toUpperCase() || '?'}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm truncate">{contact.name}</div>
          <div className="text-xs text-white/40 flex items-center gap-2">
            <Phone className="w-3 h-3" />
            <span>{contact.phone}</span>
          </div>
        </div>

        {/* Permissions */}
        <div className="flex gap-1">
          {contact.canReceiveLocation && (
            <div className="w-6 h-6 border border-green-500/50 bg-green-500/10 
                           flex items-center justify-center" title="Can see location">
              <MapPin className="w-3 h-3 text-green-500" />
            </div>
          )}
          {contact.canReceiveCheckin && (
            <div className="w-6 h-6 border border-blue-500/50 bg-blue-500/10 
                           flex items-center justify-center" title="Receives check-ins">
              <Clock className="w-3 h-3 text-blue-500" />
            </div>
          )}
        </div>

        {/* Actions Toggle */}
        <button
          onClick={() => setShowActions(!showActions)}
          className="w-8 h-8 flex items-center justify-center text-white/40 
                     hover:text-white hover:bg-white/5 transition-colors"
        >
          <motion.div animate={{ rotate: showActions ? 45 : 0 }}>
            <Plus className="w-5 h-5" />
          </motion.div>
        </button>
      </div>

      {/* Expanded Actions */}
      <AnimatePresence>
        {showActions && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-3 mt-3 border-t border-white/10 flex gap-2">
              <button
                onClick={onEdit}
                className="flex-1 py-2 border border-white/20 text-xs font-bold tracking-wider
                           hover:border-white/40 transition-colors flex items-center justify-center gap-1"
              >
                <Edit2 className="w-3 h-3" />
                EDIT
              </button>
              <button
                onClick={onSendAlert}
                className="flex-1 py-2 bg-[#E62020] text-white text-xs font-bold tracking-wider
                           hover:bg-[#ff2424] transition-colors flex items-center justify-center gap-1"
              >
                <Send className="w-3 h-3" />
                ALERT
              </button>
              <button
                onClick={onRemove}
                className="py-2 px-3 border border-red-500/50 text-red-500 text-xs font-bold
                           hover:bg-red-500/10 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function AddContactModal({ isOpen, onClose, contact, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    relationship: '',
    canReceiveLocation: true,
    canReceiveCheckin: true,
    canReceivePanic: true,
  });

  useEffect(() => {
    if (contact) {
      setFormData({
        name: contact.name || '',
        phone: contact.phone || '',
        relationship: contact.relationship || '',
        canReceiveLocation: contact.canReceiveLocation ?? true,
        canReceiveCheckin: contact.canReceiveCheckin ?? true,
        canReceivePanic: contact.canReceivePanic ?? true,
      });
    } else {
      setFormData({
        name: '',
        phone: '',
        relationship: '',
        canReceiveLocation: true,
        canReceiveCheckin: true,
        canReceivePanic: true,
      });
    }
  }, [contact, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) return;
    onSave(formData);
  };

  return (
    <LuxModal
      isOpen={isOpen}
      onClose={onClose}
      title={contact ? 'Edit Contact' : 'Add Emergency Contact'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div>
          <label className="block text-xs text-white/60 mb-2 font-mono">NAME</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Contact name"
            className="w-full bg-black border-2 border-white/20 p-3 text-white
                       focus:border-[#E62020] focus:outline-none transition-colors"
            required
          />
        </div>

        {/* Phone */}
        <div>
          <label className="block text-xs text-white/60 mb-2 font-mono">PHONE NUMBER</label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            placeholder="+1 (555) 000-0000"
            className="w-full bg-black border-2 border-white/20 p-3 text-white
                       focus:border-[#E62020] focus:outline-none transition-colors"
            required
          />
        </div>

        {/* Relationship */}
        <div>
          <label className="block text-xs text-white/60 mb-2 font-mono">RELATIONSHIP (OPTIONAL)</label>
          <select
            value={formData.relationship}
            onChange={(e) => setFormData(prev => ({ ...prev, relationship: e.target.value }))}
            className="w-full bg-black border-2 border-white/20 p-3 text-white
                       focus:border-[#E62020] focus:outline-none transition-colors"
          >
            <option value="">Select...</option>
            <option value="friend">Friend</option>
            <option value="family">Family</option>
            <option value="partner">Partner</option>
            <option value="roommate">Roommate</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* Permissions */}
        <div className="pt-3 border-t border-white/10">
          <label className="block text-xs text-white/60 mb-3 font-mono">PERMISSIONS</label>
          <div className="space-y-2">
            <PermissionToggle
              icon={MapPin}
              label="Can receive my location"
              description="Share your live location during meetups"
              checked={formData.canReceiveLocation}
              onChange={(v) => setFormData(prev => ({ ...prev, canReceiveLocation: v }))}
            />
            <PermissionToggle
              icon={Clock}
              label="Receives check-in alerts"
              description="Notified if you miss a safety check-in"
              checked={formData.canReceiveCheckin}
              onChange={(v) => setFormData(prev => ({ ...prev, canReceiveCheckin: v }))}
            />
            <PermissionToggle
              icon={AlertTriangle}
              label="Receives panic alerts"
              description="Immediately notified when panic button pressed"
              checked={formData.canReceivePanic}
              onChange={(v) => setFormData(prev => ({ ...prev, canReceivePanic: v }))}
              highlight
            />
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="w-full bg-[#E62020] text-white py-4 font-bold tracking-wider
                     hover:bg-[#ff2424] transition-all flex items-center justify-center gap-2"
          style={{ boxShadow: '0 0 20px rgba(230, 32, 32, 0.4)' }}
        >
          <Check className="w-5 h-5" />
          {contact ? 'SAVE CHANGES' : 'ADD CONTACT'}
        </button>
      </form>
    </LuxModal>
  );
}

function PermissionToggle({ icon: Icon, label, description, checked, onChange, highlight }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`
        w-full p-3 border flex items-start gap-3 text-left transition-all
        ${checked 
          ? highlight 
            ? 'border-[#E62020] bg-[#E62020]/10' 
            : 'border-green-500/50 bg-green-500/10'
          : 'border-white/20 hover:border-white/40'
        }
      `}
    >
      <div className={`
        w-8 h-8 flex items-center justify-center border flex-shrink-0
        ${checked 
          ? highlight 
            ? 'border-[#E62020] bg-[#E62020]/20' 
            : 'border-green-500 bg-green-500/20'
          : 'border-white/20'
        }
      `}>
        {checked ? (
          <Check className={`w-4 h-4 ${highlight ? 'text-[#E62020]' : 'text-green-500'}`} />
        ) : (
          <Icon className="w-4 h-4 text-white/40" />
        )}
      </div>
      <div>
        <div className="font-bold text-sm">{label}</div>
        <div className="text-xs text-white/40">{description}</div>
      </div>
    </button>
  );
}

export default EmergencyContactCircle;
