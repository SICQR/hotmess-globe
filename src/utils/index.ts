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

export function getAuthUserId(user: any): string | null {
    if (!user || typeof user !== 'object') return null;

    const candidates = [
        user.auth_user_id,
        user.authUserId,
        user.auth_userId,
        user.authUserID,
        user.uid,
    ];

    for (const value of candidates) {
        if (typeof value !== 'string') continue;
        const trimmed = value.trim();
        if (trimmed) return trimmed;
    }

    return null;
}

export function createUserProfileUrl(user: any, fallbackPath: string = '/social?tab=discover') {
    const uid = getAuthUserId(user);
    if (uid) return `/social/u/${encodeURIComponent(uid)}`;
    return fallbackPath;
}

export function createUserProfileUrlByEmail(
    email: string | null | undefined,
    allUsers: any[] | null | undefined,
    fallbackPath: string = '/social?tab=discover'
) {
    const normalized = String(email || '').trim().toLowerCase();
    if (!normalized) return fallbackPath;
    const users = Array.isArray(allUsers) ? allUsers : [];
    const match = users.find((u) => String(u?.email || '').trim().toLowerCase() === normalized);
    return createUserProfileUrl(match, fallbackPath);
}

export function createMessageComposeUrl(user: any, fallbackPath: string = '/social/inbox') {
    const uid = getAuthUserId(user);
    if (uid) return `/social/inbox?to_uid=${encodeURIComponent(uid)}`;
    return fallbackPath;
}

export function createMessageComposeUrlByEmail(
    email: string | null | undefined,
    allUsers: any[] | null | undefined,
    fallbackPath: string = '/social/inbox'
) {
    const normalized = String(email || '').trim().toLowerCase();
    if (!normalized) return fallbackPath;
    const users = Array.isArray(allUsers) ? allUsers : [];
    const match = users.find((u) => String(u?.email || '').trim().toLowerCase() === normalized);
    return createMessageComposeUrl(match, fallbackPath);
}