export function createUserProfileUrl(profile: { 
    username?: string; 
    handle?: string; 
    email?: string; 
    auth_user_id?: string; 
    authUserId?: string; 
    id?: string 
}) {
    // Prefer username for privacy - emails should not be exposed in URLs
    const username = profile?.username || profile?.handle;
    if (username) {
        return `/Profile?username=${encodeURIComponent(username)}`;
    }
    
    // Fallback to email for legacy profiles without username
    const email = profile?.email;
    if (email) {
        return `/Profile?email=${encodeURIComponent(email)}`;
    }
    
    // Last resort: use uid
    const uid = profile?.auth_user_id || profile?.authUserId || profile?.id;
    if (uid) {
        return `/Profile?uid=${encodeURIComponent(uid)}`;
    }
    
    return '/Profile';
}

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