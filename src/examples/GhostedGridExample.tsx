/**
 * GhostedGridExample — User discovery grid
 * 
 * Shows nearby users in a 2-column grid using atomic components.
 */

import { useState } from 'react';
import {
  Header,
  UserCard,
  UserGrid,
  SearchBar,
} from '@/components/ui/design-system';
import { AppNavBar } from '@/components/nav/AppNavBar';
import { useSheet } from '@/contexts/SheetContext';

const mockUsers = [
  { id: '1', username: 'AlexTravels', distance: '1.2 km', status: 'online' as const, avatarSrc: 'https://randomuser.me/api/portraits/men/75.jpg' },
  { id: '2', username: 'Tyme', distance: '2.8 km', status: 'online' as const, avatarSrc: 'https://randomuser.me/api/portraits/men/32.jpg' },
  { id: '3', username: 'BerlinBear', distance: '3.1 km', status: 'away' as const, avatarSrc: 'https://randomuser.me/api/portraits/men/45.jpg' },
  { id: '4', username: 'NightOwl', distance: '3.5 km', status: 'online' as const, avatarSrc: 'https://randomuser.me/api/portraits/men/22.jpg' },
  { id: '5', username: 'RAWLover', distance: '4.2 km', status: 'offline' as const, avatarSrc: 'https://randomuser.me/api/portraits/men/67.jpg' },
  { id: '6', username: 'ClubKing', distance: '5.0 km', status: 'online' as const, avatarSrc: 'https://randomuser.me/api/portraits/men/12.jpg' },
];

export default function GhostedGridExample() {
  const [search, setSearch] = useState('');
  const { openSheet } = useSheet();

  const filteredUsers = mockUsers.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-dark flex flex-col">
      {/* Header */}
      <Header title="Ghosted" onOptions={() => alert('Filters')} />

      {/* Location tag */}
      <div className="px-4 py-2 text-gold text-sm font-bold">
        London Right Now
      </div>

      {/* Search */}
      <SearchBar
        placeholder="Search nearby..."
        value={search}
        onChange={setSearch}
        className="mb-2"
      />

      {/* User grid */}
      <div className="flex-1 overflow-y-auto pb-20">
        <UserGrid>
          {filteredUsers.map(user => (
            <UserCard
              key={user.id}
              avatarSrc={user.avatarSrc}
              username={user.username}
              distance={user.distance}
              status={user.status}
              onTap={() => openSheet('profile', { email: user.id })}
            />
          ))}
        </UserGrid>
      </div>

      {/* Bottom nav */}
      <AppNavBar />
    </div>
  );
}
