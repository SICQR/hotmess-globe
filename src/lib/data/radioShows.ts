/**
 * radioShows.ts — Single source of truth for HOTMESS Radio shows.
 *
 * Phil 2026-06-03 — extracted from RadioMode.tsx to keep show data
 * single-primitive (D53 §1.4). RadioMode + RadioShowPage + (eventually)
 * L2ScheduleSheet should all import from here so the schedule never
 * drifts between surfaces.
 *
 * Adding a show: append to RADIO_SHOWS. The id becomes the URL slug at
 * /music/shows/:id.
 */

export interface RadioShow {
  id: string;
  name: string;
  host: string;
  time: string;
  emoji: string;
  image?: string;
  description: string;
  blurb: string;
}

export const RADIO_SHOWS: RadioShow[] = [
  {
    id: 'wake',
    name: 'Wake the Mess',
    host: 'DJ Chaos',
    time: 'Mon–Fri 7–10am',
    emoji: '\u{1F305}',
    image: '/assets/shows/wake-the-mess.jpg',
    description: 'Start your morning with the hottest beats and queer wellness.',
    blurb: 'Coffee, chaos and community. Wake the Mess is London’s queer alarm clock—three hours of bangers, wellness segments and sponsored drops from coffee brands and skincare.',
  },
  {
    id: 'dial',
    name: 'Dial-a-Daddy / Dial-a-Darling',
    host: 'Papa Bear',
    time: 'Mon–Fri 3–5pm',
    emoji: '\u{1F4DE}',
    image: '/assets/shows/dial-a-daddy.jpg',
    description: 'Afternoon advice, confessions and community call-ins.',
    blurb: 'The original call-in show. Confessions, dating disasters and daddy advice. Listeners phone in anonymously; Papa Bear keeps it real. Sponsored by HNH MESS.',
  },
  {
    id: 'drive',
    name: 'Drive Time Mess',
    host: 'The Collective',
    time: 'Mon–Fri 5–7pm',
    emoji: '\u{1F697}',
    image: '/assets/shows/drive-time-mess.jpg',
    description: 'Rush hour bangers to get you home safe.',
    blurb: 'End-of-day energy for the commute. High tempo, pep talks and a “get home safe” QR for ride-share discounts. From boardrooms to bar boys.',
  },
  {
    id: 'nights',
    name: 'HOTMESS Nights',
    host: 'SMASH DADDYS',
    time: 'Fri–Sat 7–11pm',
    emoji: '\u{1F30C}',
    image: '/assets/shows/hotmess-nights.jpg',
    description: 'Weekend club sets, live DJs and pre-party energy.',
    blurb: 'The main event. SMASH DADDYS takes over with live club sets, guest DJs and a full “Live Now” glow bar on the app. Sponsored by clubs, DJs and drink brands.',
  },
  {
    id: 'hnh',
    name: 'Hand-in-Hand',
    host: 'HNH Collective',
    time: 'Sun 6–8pm',
    emoji: '\u{1F91D}',
    image: '/assets/shows/hand-in-hand.jpg',
    description: 'Sunday wind-down. Deep house, mental health check-ins and chill.',
    blurb: 'After the weekend, we regroup. Deep house, mental health check-ins, and gentle vibes with the HNH Collective. Partners: HNH MESS, Uber Eats and mental health allies.',
  },
];
