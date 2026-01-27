export function createPageUrl(pageName: string) {
    if (!pageName) return '/';
    if (pageName.startsWith('/')) return pageName;

    const routeMap: Record<string, string> = {
        Home: '/',
        Pulse: '/pulse',
        Globe: '/pulse',
        Events: '/events',
        Marketplace: '/market',
        OrderHistory: '/orders',
        Connect: '/social',
        Messages: '/social/inbox',
        Social: '/social',
        Music: '/music',
        Radio: '/music/live',
        RadioSchedule: '/music/schedule',
        Hnhmess: '/hnhmess',
        More: '/more',

        AgeGate: '/age',
        Safety: '/safety',
        Calendar: '/calendar',
        Scan: '/scan',
        Leaderboard: '/leaderboard',
        Community: '/community',
        Bookmarks: '/saved',

        Beacons: '/more/beacons',
        CreateBeacon: '/more/beacons/new',
    };

    const [base, query] = pageName.split('?');
    const basePath = routeMap[base] ?? '/' + base.replace(/ /g, '-');
    return query ? `${basePath}?${query}` : basePath;
}

export function createUserProfileUrl(profile: any): string {
    // For now, return a hash/anchor that won't navigate away
    // This allows the onOpenProfile handler to take over
    // In the future, this could be a route like `/profile/${profile.id}` or `/user/${profile.email}`
    if (profile?.id) {
        return `#profile-${profile.id}`;
    }
    if (profile?.email) {
        return `#profile-${encodeURIComponent(profile.email)}`;
    }
    return '#profile';
}