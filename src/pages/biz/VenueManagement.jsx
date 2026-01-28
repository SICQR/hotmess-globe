import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  MapPin, 
  Plus, 
  Edit2, 
  Trash2, 
  Clock,
  Users,
  Calendar,
  Image,
  CheckCircle2,
  Search,
  MoreVertical,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { supabase } from '@/components/utils/supabaseClient';
import { createPageUrl } from '../../utils';

export default function VenueManagement() {
  const [user, setUser] = useState(null);
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingVenue, setEditingVenue] = useState(null);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    city: '',
    country: '',
    latitude: '',
    longitude: '',
    capacity: '',
    phone: '',
    website: '',
    image_url: '',
    operating_hours: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);

        // Check if user has business account
        if (!currentUser.is_business && !currentUser.is_organizer) {
          navigate(createPageUrl('BusinessOnboarding'));
          return;
        }

        // Fetch venues
        const { data: venueData } = await supabase
          .from('venues')
          .select('*')
          .eq('owner_email', currentUser.email)
          .order('created_at', { ascending: false });

        if (venueData) {
          setVenues(venueData);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  const filteredVenues = venues.filter(venue =>
    venue.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    venue.city?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      address: '',
      city: '',
      country: '',
      latitude: '',
      longitude: '',
      capacity: '',
      phone: '',
      website: '',
      image_url: '',
      operating_hours: '',
    });
    setEditingVenue(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const openEditModal = (venue) => {
    setFormData({
      name: venue.name || '',
      description: venue.description || '',
      address: venue.address || '',
      city: venue.city || '',
      country: venue.country || '',
      latitude: venue.latitude?.toString() || '',
      longitude: venue.longitude?.toString() || '',
      capacity: venue.capacity?.toString() || '',
      phone: venue.phone || '',
      website: venue.website || '',
      image_url: venue.image_url || '',
      operating_hours: venue.operating_hours || '',
    });
    setEditingVenue(venue);
    setShowAddModal(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Please enter a venue name');
      return;
    }

    setSaving(true);
    try {
      const venueData = {
        ...formData,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        capacity: formData.capacity ? parseInt(formData.capacity) : null,
        owner_email: user.email,
        updated_at: new Date().toISOString(),
      };

      if (editingVenue) {
        // Update existing venue
        const { error } = await supabase
          .from('venues')
          .update(venueData)
          .eq('id', editingVenue.id);

        if (error) throw error;
        
        setVenues(prev => prev.map(v => 
          v.id === editingVenue.id ? { ...v, ...venueData } : v
        ));
        toast.success('Venue updated successfully');
      } else {
        // Create new venue
        venueData.created_at = new Date().toISOString();
        
        const { data, error } = await supabase
          .from('venues')
          .insert(venueData)
          .select()
          .single();

        if (error) throw error;
        
        setVenues(prev => [data, ...prev]);
        toast.success('Venue created successfully');
      }

      setShowAddModal(false);
      resetForm();
    } catch (error) {
      console.error('Failed to save venue:', error);
      toast.error('Failed to save venue');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (venue) => {
    if (!confirm(`Are you sure you want to delete "${venue.name}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('venues')
        .delete()
        .eq('id', venue.id);

      if (error) throw error;

      setVenues(prev => prev.filter(v => v.id !== venue.id));
      toast.success('Venue deleted successfully');
    } catch (error) {
      console.error('Failed to delete venue:', error);
      toast.error('Failed to delete venue');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-white/20 border-t-[#FF1493] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link 
            to={createPageUrl('BusinessDashboard')} 
            className="inline-flex items-center text-white/60 hover:text-white mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#00D9FF]/20 border border-[#00D9FF]/40 rounded-lg flex items-center justify-center">
                <MapPin className="w-6 h-6 text-[#00D9FF]" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight">
                  Venue Management
                </h1>
                <p className="text-white/60">Manage your venues and locations</p>
              </div>
            </div>

            <Button 
              onClick={openAddModal}
              className="bg-[#FF1493] hover:bg-[#FF1493]/90 text-black"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Venue
            </Button>
          </div>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search venues..."
              className="bg-white/5 border-white/10 pl-10"
            />
          </div>
        </motion.div>

        {/* Venues Grid */}
        {filteredVenues.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center py-16"
          >
            <MapPin className="w-16 h-16 mx-auto mb-4 text-white/20" />
            <h3 className="text-xl font-bold mb-2">No venues yet</h3>
            <p className="text-white/60 mb-6">
              Add your first venue to start creating events
            </p>
            <Button 
              onClick={openAddModal}
              className="bg-[#FF1493] hover:bg-[#FF1493]/90 text-black"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Venue
            </Button>
          </motion.div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredVenues.map((venue, idx) => (
              <motion.div
                key={venue.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + idx * 0.05 }}
                className="bg-white/5 border border-white/10 rounded-xl overflow-hidden group"
              >
                {/* Venue Image */}
                <div className="aspect-video bg-white/5 relative">
                  {venue.image_url ? (
                    <img 
                      src={venue.image_url} 
                      alt={venue.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Image className="w-12 h-12 text-white/20" />
                    </div>
                  )}
                  
                  {/* Actions Dropdown */}
                  <div className="absolute top-2 right-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="bg-black/50 hover:bg-black/70 text-white h-8 w-8 p-0"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-black border-white/20">
                        <DropdownMenuItem onClick={() => openEditModal(venue)}>
                          <Edit2 className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDelete(venue)}
                          className="text-red-500 focus:text-red-500"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Venue Info */}
                <div className="p-4">
                  <h3 className="font-bold text-lg mb-1">{venue.name}</h3>
                  <p className="text-sm text-white/60 flex items-center gap-1 mb-3">
                    <MapPin className="w-3 h-3" />
                    {venue.city}, {venue.country}
                  </p>

                  {venue.description && (
                    <p className="text-sm text-white/80 mb-3 line-clamp-2">
                      {venue.description}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2 text-xs">
                    {venue.capacity && (
                      <span className="px-2 py-1 bg-white/10 rounded">
                        <Users className="w-3 h-3 inline mr-1" />
                        {venue.capacity} capacity
                      </span>
                    )}
                    {venue.operating_hours && (
                      <span className="px-2 py-1 bg-white/10 rounded">
                        <Clock className="w-3 h-3 inline mr-1" />
                        Hours set
                      </span>
                    )}
                  </div>

                  {/* Quick Actions */}
                  <div className="mt-4 pt-4 border-t border-white/10 flex gap-2">
                    <Link 
                      to={`${createPageUrl('CreateBeacon')}?venue=${venue.id}`}
                      className="flex-1"
                    >
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full border-white/20"
                      >
                        <Calendar className="w-3 h-3 mr-1" />
                        Create Event
                      </Button>
                    </Link>
                    {venue.website && (
                      <a href={venue.website} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Add/Edit Venue Modal */}
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogContent className="bg-black border-2 border-white text-white max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-black uppercase">
                {editingVenue ? 'Edit Venue' : 'Add New Venue'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-white/60 uppercase mb-1 block">Venue Name *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter venue name"
                  className="bg-white/5 border-white/20"
                />
              </div>

              <div>
                <label className="text-sm text-white/60 uppercase mb-1 block">Description</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe your venue"
                  className="bg-white/5 border-white/20 min-h-[80px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-white/60 uppercase mb-1 block">City</label>
                  <Input
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="City"
                    className="bg-white/5 border-white/20"
                  />
                </div>
                <div>
                  <label className="text-sm text-white/60 uppercase mb-1 block">Country</label>
                  <Input
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    placeholder="Country"
                    className="bg-white/5 border-white/20"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-white/60 uppercase mb-1 block">Address</label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Full address"
                  className="bg-white/5 border-white/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-white/60 uppercase mb-1 block">Latitude</label>
                  <Input
                    type="number"
                    step="any"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    placeholder="e.g., 51.5074"
                    className="bg-white/5 border-white/20"
                  />
                </div>
                <div>
                  <label className="text-sm text-white/60 uppercase mb-1 block">Longitude</label>
                  <Input
                    type="number"
                    step="any"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    placeholder="e.g., -0.1278"
                    className="bg-white/5 border-white/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-white/60 uppercase mb-1 block">Capacity</label>
                  <Input
                    type="number"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                    placeholder="Max capacity"
                    className="bg-white/5 border-white/20"
                  />
                </div>
                <div>
                  <label className="text-sm text-white/60 uppercase mb-1 block">Phone</label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Contact phone"
                    className="bg-white/5 border-white/20"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-white/60 uppercase mb-1 block">Website</label>
                <Input
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://..."
                  className="bg-white/5 border-white/20"
                />
              </div>

              <div>
                <label className="text-sm text-white/60 uppercase mb-1 block">Image URL</label>
                <Input
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="https://..."
                  className="bg-white/5 border-white/20"
                />
              </div>

              <div>
                <label className="text-sm text-white/60 uppercase mb-1 block">Operating Hours</label>
                <Input
                  value={formData.operating_hours}
                  onChange={(e) => setFormData({ ...formData, operating_hours: e.target.value })}
                  placeholder="e.g., Mon-Fri 9am-5pm"
                  className="bg-white/5 border-white/20"
                />
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button
                variant="outline"
                onClick={() => setShowAddModal(false)}
                className="border-white/20"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-[#FF1493] hover:bg-[#FF1493]/90 text-black"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    {editingVenue ? 'Update Venue' : 'Create Venue'}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
