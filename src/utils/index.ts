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
        OnboardingGate: '/onboarding/consent',
        Onboarding: '/onboarding/preferences',
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

type ProfileLike = {
    auth_user_id?: string;
    authUserId?: string;
    email?: string;
    id?: string;
};

export function createUserProfileUrl(profile: ProfileLike, fallbackBaseProfileUrl?: string) {
    const rawUid =
        (profile && typeof profile === 'object' ? (profile as any).auth_user_id : null) ||
        (profile && typeof profile === 'object' ? (profile as any).authUserId : null);

    if (rawUid && String(rawUid).trim()) {
        return `/social/u/${encodeURIComponent(String(rawUid).trim())}`;
    }

    const rawEmail = profile && typeof profile === 'object' ? (profile as any).email : null;
    if (rawEmail && String(rawEmail).trim()) {
        const base =
            typeof fallbackBaseProfileUrl === 'string' && fallbackBaseProfileUrl.trim()
                ? fallbackBaseProfileUrl.trim()
                : createPageUrl('Profile');
        const joiner = base.includes('?') ? '&' : '?';
        return `${base}${joiner}email=${encodeURIComponent(String(rawEmail).trim())}`;
    }

    return createPageUrl('Social');
}