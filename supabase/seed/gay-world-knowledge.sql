-- HOTMESS AI - Gay World Knowledge Seed Data
-- 
-- This seeds the gay_world_knowledge table with:
-- - London LGBT venues (50+)
-- - Terminology (100+ terms)
-- - Health resources
-- - Event types
-- - Cultural knowledge

-- ============================================
-- VENUES - London LGBT Scene
-- ============================================

-- VAUXHALL
INSERT INTO gay_world_knowledge (category, subcategory, title, content, location_city, location_area, metadata) VALUES
('venue', 'club', 'Fire', 'Legendary Vauxhall superclub with multiple rooms, mega sound system, and marathon sessions. Known for Orange Nation, Beyond, and A:M parties. Best for: circuit boys, techno lovers, long nights. Busiest: Saturday into Sunday.', 'London', 'Vauxhall', '{"address": "39 Parry Street, SW8 1RT", "type": "club", "nights": ["Orange", "Beyond", "A:M"], "price_range": "££", "vibe": ["circuit", "techno", "cruisy", "marathon"]}'),
('venue', 'club', 'Eagle London', 'Legendary leather/fetish bar and club. Multiple floors, rooftop terrace, regular fetish nights. Dress code enforced on fetish nights. Best for: leather community, bears, alternative crowd.', 'London', 'Vauxhall', '{"address": "349 Kennington Lane, SE11 5QY", "type": "bar_club", "nights": ["Horse Meat Disco", "Eagle events"], "price_range": "£", "vibe": ["leather", "fetish", "bears", "cruisy"]}'),
('venue', 'bar', 'Royal Vauxhall Tavern (RVT)', 'Historic LGBT venue since 1860s, Grade II listed. Cabaret, drag, live performances. Home to many iconic nights. Cultural landmark. Best for: drag fans, cabaret lovers, community events.', 'London', 'Vauxhall', '{"address": "372 Kennington Lane, SE11 5HY", "type": "bar_cabaret", "nights": ["Duckie", "various cabaret"], "price_range": "£", "vibe": ["historic", "cabaret", "drag", "community"]}'),
('venue', 'club', 'Union', 'Large Vauxhall club venue for circuit parties and special events. Multiple rooms, industrial vibe. Hosts various promoters. Best for: circuit events, big productions.', 'London', 'Vauxhall', '{"address": "66 Albert Embankment, SE11 7TP", "type": "club", "price_range": "££", "vibe": ["circuit", "events"]}'),

-- SOHO
('venue', 'bar', 'Comptons of Soho', 'Iconic Soho gay pub, established 1986. Two floors, street-facing windows perfect for people watching. Diverse crowd from after-work drinks to late night. Best for: classic gay bar experience, meeting friends.', 'London', 'Soho', '{"address": "51-53 Old Compton Street, W1D 6HN", "type": "bar", "price_range": "£", "vibe": ["classic", "diverse", "social"]}'),
('venue', 'bar', 'The Admiral Duncan', 'Historic Soho pub with important community significance (memorial to 1999 bombing). Friendly atmosphere, drag shows. Best for: supportive community vibe, drag entertainment.', 'London', 'Soho', '{"address": "54 Old Compton Street, W1D 4UD", "type": "bar", "price_range": "£", "vibe": ["historic", "friendly", "drag"]}'),
('venue', 'bar', 'The Yard', 'Popular courtyard bar in Soho. Great outdoor space for summer. Relaxed atmosphere, good for dates. Best for: daytime drinks, outdoor socializing.', 'London', 'Soho', '{"address": "57 Rupert Street, W1D 7PL", "type": "bar", "price_range": "£", "vibe": ["relaxed", "outdoor", "social"]}'),
('venue', 'bar', 'Village', 'Multi-floor Soho venue with different vibes on each level. Rooftop terrace, club nights downstairs. Best for: variety seekers, dancing, groups.', 'London', 'Soho', '{"address": "81 Wardour Street, W1D 6QD", "type": "bar_club", "price_range": "££", "vibe": ["variety", "dancing", "groups"]}'),
('venue', 'bar', 'Ku Bar', 'Popular Soho bar over multiple floors. Younger crowd, pop music, regular events. Good for starting the night. Best for: pre-drinks, pop music lovers, younger crowd.', 'London', 'Soho', '{"address": "30 Lisle Street, WC2H 7BA", "type": "bar", "price_range": "£", "vibe": ["young", "pop", "social"]}'),
('venue', 'bar', 'Freedom', 'Stylish Soho bar/restaurant. Good cocktails, cabaret performances. More upscale vibe. Best for: cocktails, dinner, cabaret shows.', 'London', 'Soho', '{"address": "60-66 Wardour Street, W1F 0TA", "type": "bar_restaurant", "price_range": "££", "vibe": ["upscale", "cocktails", "cabaret"]}'),

-- CHARING CROSS / WEST END
('venue', 'club', 'Heaven', 'Londons most famous gay club under Charing Cross arches. Multiple floors, huge capacity. Home of G-A-Y. Known for pop music, big names, tourist-friendly. Best for: pop music lovers, big nights out, first-timers.', 'London', 'Charing Cross', '{"address": "Villiers Street, WC2N 6NG", "type": "club", "nights": ["G-A-Y", "Porn Idol", "Heaven sessions"], "price_range": "£-££", "vibe": ["mainstream", "pop", "young", "tourist-friendly"]}'),
('venue', 'club', 'G-A-Y Late', 'Late night venue near Heaven. Open til late when other places close. Pop music, young crowd. Best for: after hours, continuing the night.', 'London', 'Soho', '{"address": "5 Goslett Yard, WC2H 0EA", "type": "club", "price_range": "£", "vibe": ["late", "pop", "young"]}'),

-- SHOREDITCH / EAST
('venue', 'bar', 'The Glory', 'Legendary East London LGBTQ+ venue. Performance space, club nights, art. John Sizzle founded. Alternative, arty crowd. Best for: performance art, alternative scene, creative crowd.', 'London', 'Dalston', '{"address": "281 Kingsland Road, E2 8AS", "type": "bar_performance", "nights": ["Lipsync1000", "various"], "price_range": "£", "vibe": ["alternative", "arty", "performance", "queer"]}'),
('venue', 'bar', 'Dalston Superstore', 'East London institution. Basement club, rooftop, day party vibes. Queer-focused, diverse. Best for: alternative scene, day parties, diverse crowd.', 'London', 'Dalston', '{"address": "117 Kingsland High Street, E8 2PB", "type": "bar_club", "price_range": "£-££", "vibe": ["alternative", "diverse", "queer", "day_parties"]}'),
('venue', 'bar', 'The Joiners Arms', 'Historic East London gay pub (now relocated/events). Known for cruisy vibe, community focus. Check current status. Best for: community events.', 'London', 'Hackney', '{"address": "Various/events", "type": "events", "vibe": ["historic", "community", "cruisy"]}'),

-- BRIXTON / SOUTH
('venue', 'bar', 'Two Brewers', 'South Londons longest-running gay pub in Clapham. Drag shows, cabaret, community events. Friendly, mixed crowd. Best for: drag shows, community vibe, South London locals.', 'London', 'Clapham', '{"address": "114 Clapham High Street, SW4 7UJ", "type": "bar", "nights": ["drag shows", "karaoke"], "price_range": "£", "vibe": ["friendly", "drag", "community"]}'),
('venue', 'bar', 'Kazbar', 'South London gay bar in Clapham. Relaxed vibe, local crowd. Best for: low-key nights, South London.', 'London', 'Clapham', '{"address": "50 Clapham High Street, SW4 7UL", "type": "bar", "price_range": "£", "vibe": ["local", "relaxed"]}'),

-- SAUNAS
('venue', 'sauna', 'Pleasuredrome', 'Londons largest gay sauna complex in Waterloo. Open 24/7. Multiple floors, facilities include steam, dry sauna, pool, private rooms, cinema, cafe. Best for: relaxation, socializing, cruising. Entry fee varies by time.', 'London', 'Waterloo', '{"address": "124 Cornwall Road, SE1 8XE", "type": "sauna", "hours": "24/7", "price_range": "£-££", "facilities": ["steam", "sauna", "pool", "private_rooms", "cinema"]}'),
('venue', 'sauna', 'Sweatbox', 'Popular Soho sauna right in the heart of gay London. Smaller, more intimate than Pleasuredrome. Convenient location. Best for: quick visit, central location.', 'London', 'Soho', '{"address": "1-2 Ramillies Street, W1F 7LN", "type": "sauna", "price_range": "£", "facilities": ["steam", "sauna", "private_rooms"]}'),
('venue', 'sauna', 'Sailor Sauna', 'Gay sauna in Limehouse, East London. More local feel, regular crowd. Best for: East London locals.', 'London', 'Limehouse', '{"address": "570-574 Commercial Road, E14 7JD", "type": "sauna", "price_range": "£", "facilities": ["steam", "sauna"]}')
ON CONFLICT DO NOTHING;

-- ============================================
-- TERMINOLOGY - Gay Scene Language
-- ============================================

-- TRIBES
INSERT INTO gay_world_knowledge (category, subcategory, title, content, metadata) VALUES
('terminology', 'tribes', 'Bear', 'A larger, often hairy gay man. Bears embrace body positivity and reject mainstream beauty standards. Bear culture has its own events, apps, and community. Related terms: cub, otter, wolf, chub.', '{"related": ["cub", "otter", "wolf", "chub", "muscle bear"]}'),
('terminology', 'tribes', 'Cub', 'A younger or smaller bear. Usually has some body hair, stockier build. Often paired with older bears (daddy bears). Term implies youth or smaller stature within bear community.', '{"related": ["bear", "otter", "daddy"]}'),
('terminology', 'tribes', 'Otter', 'A lean/slim gay man with body hair. Like a thinner bear. Typically has a swimmers build or lean physique while maintaining body hair.', '{"related": ["bear", "cub", "wolf"]}'),
('terminology', 'tribes', 'Wolf', 'A lean, muscular gay man with body hair. More predatory/assertive connotation than otter. Often has facial hair, rugged appearance.', '{"related": ["otter", "bear", "daddy"]}'),
('terminology', 'tribes', 'Twink', 'A young, slim gay man usually with little body hair. Typically early 20s or younger-looking. Sometimes used pejoratively but also reclaimed. Related: twunk.', '{"related": ["twunk", "jock"]}'),
('terminology', 'tribes', 'Twunk', 'A muscular twink. Combines youthful appearance of a twink with a more built physique. Portmanteau of twink + hunk.', '{"related": ["twink", "jock"]}'),
('terminology', 'tribes', 'Jock', 'An athletic, sporty gay man. Often into fitness, team sports. Can overlap with other types. May reference the preppy/athletic aesthetic.', '{"related": ["twunk", "muscle"]}'),
('terminology', 'tribes', 'Daddy', 'An older, often more dominant gay man. Can be any body type but implies maturity and experience. Often attracted to younger men. Sugar daddy = financial component.', '{"related": ["silver fox", "bear", "cub"]}'),
('terminology', 'tribes', 'Silver Fox', 'An attractive older man, usually with grey/silver hair. Distinguished, handsome with age. George Clooney type.', '{"related": ["daddy"]}'),
('terminology', 'tribes', 'Muscle', 'A very muscular/built gay man. Gym-focused, bodybuilder aesthetic. Includes muscle bears (hairy) and muscle twinks (smooth).', '{"related": ["jock", "gym bunny"]}'),
('terminology', 'tribes', 'Gym Bunny', 'Someone who spends excessive time at the gym, focused on appearance. Can be playful or slightly teasing term.', '{"related": ["muscle", "jock"]}'),
('terminology', 'tribes', 'Chub', 'A larger gay man, bigger than a bear. Body positive term within the community. Chub chasers = those attracted to larger men.', '{"related": ["bear", "chaser"]}'),

-- DATING/HOOKUP TERMS
('terminology', 'dating', 'Vers', 'Versatile - comfortable being both top and bottom during sex. Vers top = prefers topping but will bottom. Vers bottom = prefers bottoming but will top.', '{"related": ["top", "bottom", "side"]}'),
('terminology', 'dating', 'Top', 'The insertive partner during anal sex. Also can describe general dominant energy or preferences beyond just the physical act.', '{"related": ["vers", "bottom", "dom"]}'),
('terminology', 'dating', 'Bottom', 'The receptive partner during anal sex. Also can describe general receptive energy. Power bottoms are assertive/demanding bottoms.', '{"related": ["vers", "top", "power bottom"]}'),
('terminology', 'dating', 'Side', 'Someone who doesnt engage in penetrative anal sex. May enjoy oral, mutual masturbation, other activities. Valid and increasingly common.', '{"related": ["vers", "oral"]}'),
('terminology', 'dating', 'Masc', 'Masculine presenting. Often used in profiles to describe oneself or preferences. "Masc4masc" = masculine seeking masculine.', '{"related": ["fem", "masc4masc"]}'),
('terminology', 'dating', 'Fem', 'Feminine presenting. Can be gender expression, mannerisms, interests. Some use as self-identity, some as preference description.', '{"related": ["masc"]}'),
('terminology', 'dating', 'DL', 'Down Low - discreet, closeted, or wanting privacy about same-sex activities. May be partnered with women.', '{"related": ["discreet", "closeted"]}'),
('terminology', 'dating', 'NSA', 'No Strings Attached - casual encounter with no expectation of relationship or ongoing contact.', '{"related": ["hookup", "casual"]}'),
('terminology', 'dating', 'FWB', 'Friends With Benefits - ongoing casual sexual relationship with friendship component but not romantic partnership.', '{"related": ["NSA", "regular"]}'),
('terminology', 'dating', 'PnP', 'Party and Play - using drugs (usually meth/G) during sexual activity. Harm reduction resources important. Also: ChemSex.', '{"related": ["chemsex", "tina", "G"], "sensitive": true}'),
('terminology', 'dating', 'BB', 'Bareback - sex without condoms. In PrEP era, many who are on PrEP use this. Always discuss status openly.', '{"related": ["prep", "safe"], "sensitive": true}'),

-- SCENE TERMS
('terminology', 'scene', 'Circuit', 'Circuit party scene - large-scale gay dance events, often multi-day, music-focused. White Party, Winter Party, etc. Known for high production, EDM, often substance use.', '{"related": ["festival", "party"]}'),
('terminology', 'scene', 'Tea', 'Gossip, information, truth. "Spill the tea" = share gossip. "The tea is..." = the truth is. From Black/drag culture.', '{"related": ["shade", "read"]}'),
('terminology', 'scene', 'Kiki', 'A casual gathering, usually with friends, involving gossip and laughter. "Having a kiki" = hanging out, chatting, being social in a lighthearted way.', '{"related": ["tea"]}'),
('terminology', 'scene', 'Trade', 'Originally: a straight-appearing man who has sex with men. Now: an attractive, masculine man. Can also mean hookup. "Rough trade" = masculine, working-class aesthetic.', '{"related": ["masc", "DL"]}'),
('terminology', 'scene', 'Shade', 'Subtle insult or disrespect. "Throwing shade" = making indirect, often clever, negative comments. Reading is direct, shade is subtle.', '{"related": ["read", "tea"]}'),
('terminology', 'scene', 'Read', 'To call out someones flaws, often harshly but sometimes humorously. "Reading someone for filth" = thoroughly criticizing them. From ballroom/drag culture.', '{"related": ["shade"]}'),
('terminology', 'scene', 'Lewk', 'A distinctive outfit or appearance. "Serving a lewk" = presenting a memorable, styled look. From drag/ballroom culture.', '{"related": ["serve", "slay"]}'),
('terminology', 'scene', 'Slay', 'To do something exceptionally well, to impress. "She slayed" = she did amazing. General term of approval.', '{"related": ["werk", "serve"]}'),
('terminology', 'scene', 'Werk', 'Work - encouragement, approval. "Werk!" = keep going, youre doing great. Often used during performances.', '{"related": ["slay"]}'),

-- ROLES/KINK
('terminology', 'roles', 'Dom', 'Dominant - takes the leading/controlling role in BDSM or power exchange dynamics. Can be separate from top/bottom preference.', '{"related": ["sub", "switch", "BDSM"]}'),
('terminology', 'roles', 'Sub', 'Submissive - takes the following/receiving role in BDSM or power exchange dynamics. Can be separate from top/bottom preference.', '{"related": ["dom", "switch"]}'),
('terminology', 'roles', 'Switch', 'Someone who enjoys both dominant and submissive roles, depending on partner or mood. Flexible in power dynamics.', '{"related": ["dom", "sub"]}'),

-- SAFETY TERMS
('terminology', 'safety', 'PrEP', 'Pre-Exposure Prophylaxis - daily medication (Truvada/Descovy) taken by HIV-negative people to prevent HIV infection. 99% effective when taken consistently. Free on NHS UK. Not a substitute for STI testing.', '{"medical": true, "source": "NHS", "related": ["PEP", "U=U"]}'),
('terminology', 'safety', 'PEP', 'Post-Exposure Prophylaxis - emergency medication taken within 72 hours of potential HIV exposure. Available at A&E and sexual health clinics. Time-sensitive - sooner is better.', '{"medical": true, "source": "NHS", "related": ["PrEP"]}'),
('terminology', 'safety', 'U=U', 'Undetectable = Untransmittable. People living with HIV who have an undetectable viral load cannot transmit HIV sexually. Scientifically proven since 2016.', '{"medical": true, "source": "CDC/BHIVA", "related": ["HIV", "PrEP"]}'),
('terminology', 'safety', 'Cali Sober', 'California sober - abstaining from "hard" drugs and alcohol but still using cannabis. A harm reduction approach to sobriety.', '{"related": ["sober", "harm reduction"]}'),
('terminology', 'safety', 'Chem-free', 'Not using recreational drugs, especially in the context of sex/dating. Tag used on apps to indicate preference for substance-free encounters.', '{"related": ["sober", "PnP"]}'),
('terminology', 'safety', 'Sober', 'Not consuming alcohol or drugs. Sober curious = exploring or reducing substance use without full abstinence.', '{"related": ["cali sober", "chem-free"]}')
ON CONFLICT DO NOTHING;

-- ============================================
-- HEALTH RESOURCES
-- ============================================

INSERT INTO gay_world_knowledge (category, subcategory, title, content, location_city, metadata) VALUES
('health', 'sexual_health', '56 Dean Street', 'Leading London sexual health clinic in Soho. Walk-ins available, online booking. Services: STI testing, PrEP, PEP, HIV care. Dean.st for appointments. Very LGBT friendly.', 'London', '{"address": "56 Dean Street, W1D 6AQ", "phone": "020 3315 6699", "website": "dean.st", "services": ["STI testing", "PrEP", "PEP", "HIV care"]}'),
('health', 'sexual_health', 'CliniQ', 'Trans-inclusive sexual health clinic run by 56 Dean Street. Holistic approach to trans health and sexual wellbeing. Highly recommended for trans and non-binary people.', 'London', '{"website": "cliniq.org.uk", "services": ["trans health", "sexual health"]}'),
('health', 'sexual_health', 'Positive East', 'HIV support charity in East London. Support services, advocacy, community. For people living with or affected by HIV.', 'London', '{"website": "positiveeast.org.uk", "services": ["HIV support", "advocacy"]}'),
('health', 'sexual_health', 'Terrence Higgins Trust', 'UK leading HIV and sexual health charity. Helpline, testing, support. THT Direct: 0808 802 1221. Resources for all LGBT people.', 'London', '{"phone": "0808 802 1221", "website": "tht.org.uk", "services": ["HIV support", "testing", "information"]}'),

('health', 'mental_health', 'Switchboard LGBT+', 'LGBT+ helpline for support, information, and signposting. 0300 330 0630, 10am-10pm daily. Trained volunteers, confidential.', 'London', '{"phone": "0300 330 0630", "hours": "10am-10pm", "website": "switchboard.lgbt"}'),
('health', 'mental_health', 'MindOut', 'LGBTQ+ mental health charity. Peer support, counselling, advocacy. Online support and Brighton-based services.', 'London', '{"website": "mindout.org.uk", "services": ["peer support", "counselling"]}'),
('health', 'mental_health', 'London Friend', 'LGBT mental health and wellbeing charity. Counselling, support groups, Antidote (drug/alcohol support). Founded 1972.', 'London', '{"phone": "020 7833 1674", "website": "londonfriend.org.uk", "services": ["counselling", "support groups", "Antidote"]}'),

('health', 'crisis', 'Samaritans', '24/7 emotional support helpline. Call 116 123 (free) anytime. Not LGBT-specific but inclusive and trained. Also email jo@samaritans.org', 'London', '{"phone": "116 123", "hours": "24/7", "email": "jo@samaritans.org", "emergency": true}'),
('health', 'crisis', 'Galop', 'LGBT+ anti-violence charity. Support for hate crime, domestic abuse, sexual violence. National helpline: 0800 999 5428.', 'London', '{"phone": "0800 999 5428", "website": "galop.org.uk", "services": ["hate crime support", "domestic abuse", "sexual violence"]}'),

('health', 'harm_reduction', 'Antidote at London Friend', 'LGBT-specific drug and alcohol support. Part of London Friend. Group sessions, one-to-one support, info. Non-judgmental approach.', 'London', '{"phone": "020 7833 1674", "website": "londonfriend.org.uk/antidote", "services": ["drug support", "alcohol support"]}'),
('health', 'harm_reduction', 'The Loop', 'Drug checking service at festivals and events. Front-of-house drug testing and advice. Harm reduction focused.', 'London', '{"website": "wearetheloop.org", "services": ["drug checking", "harm reduction"]}'),
('health', 'harm_reduction', 'Release', 'National centre of expertise on drugs and drug law. Advice line for drug users and their families. Legal support too.', 'London', '{"phone": "020 7324 2989", "website": "release.org.uk", "services": ["drug advice", "legal support"]}')
ON CONFLICT DO NOTHING;

-- ============================================
-- EVENT TYPES
-- ============================================

INSERT INTO gay_world_knowledge (category, subcategory, title, content, metadata) VALUES
('event_type', 'party', 'Circuit Party', 'Large-scale gay dance events with top DJs, high production values, often themed. Think White Party, Winter Party, Masterbeat. Typically features EDM/house music, can be multi-day.', '{"music": ["EDM", "house", "vocal house"], "vibe": ["high energy", "production", "dancing"]}'),
('event_type', 'party', 'Bear Event', 'Events focused on the bear community (bears, cubs, otters, chasers). More relaxed vibe, body-positive, often includes socializing not just dancing. Bear Week, Bear Pride etc.', '{"music": ["varied"], "vibe": ["body positive", "community", "social"]}'),
('event_type', 'party', 'Fetish Night', 'Events with dress codes (leather, rubber, sports, uniforms). Eagle hosts many in London. Safe, consensual space for kink exploration. Usually must adhere to dress code.', '{"music": ["techno", "industrial"], "vibe": ["fetish", "cruisy", "dress code"], "venues": ["Eagle London"]}'),
('event_type', 'party', 'Day Party', 'Daytime LGBT events, often outdoors or with rooftop. Dalston Superstore, various summer parties. More casual vibe than night clubs.', '{"music": ["house", "disco"], "vibe": ["casual", "daytime", "social"]}'),
('event_type', 'party', 'Drag Show', 'Entertainment-focused events featuring drag performers. RVT, Two Brewers known for these. From cabaret to lip-sync battles. Tipping culture varies.', '{"vibe": ["entertainment", "cabaret", "fun"], "venues": ["RVT", "Two Brewers"]}'),
('event_type', 'pride', 'Pride', 'Pride celebrations - marches, festivals, parties. London Pride in July. Manchester, Brighton have major events. Political roots, now also celebration.', '{"vibe": ["celebration", "community", "political"], "when": "summer"}'),
('event_type', 'party', 'Horse Meat Disco', 'Legendary Sunday night party at Eagle London. Disco, funk, house. Mixed crowd, legendary DJs, community institution since 2003.', '{"music": ["disco", "funk", "house"], "vibe": ["legendary", "diverse", "dancing"], "venues": ["Eagle London"], "when": "Sundays"}'),
('event_type', 'party', 'XXL', 'Long-running bear and bigger men party. Various venues including Pulse. Celebrating larger bodies, inclusive dance event.', '{"music": ["house", "pop"], "vibe": ["bears", "body positive", "dancing"]}'),
('event_type', 'party', 'G-A-Y', 'Pop-focused gay night at Heaven. Pop stars often perform. Young crowd, mainstream music. Thursdays and Saturdays.', '{"music": ["pop"], "vibe": ["young", "mainstream", "performances"], "venues": ["Heaven"]}')
ON CONFLICT DO NOTHING;

-- ============================================
-- PLATFORM KNOWLEDGE (for RAG)
-- ============================================

INSERT INTO platform_knowledge (category, title, content, metadata) VALUES
('feature', 'Right Now', 'Auto-expiring availability status. Users can indicate theyre "right now" - available for meetups, dates, or socializing. Expires after set time (1-4 hours). Shows on Pulse map and in Social discovery. Great for spontaneous connections.', '{"page": "/social", "related": ["Pulse", "discovery"]}'),
('feature', 'Beacons', 'Location pins that appear on the Pulse map. Four types: People (users), Events (parties/gatherings), Market (product pickups), Care (safety resources). Each has different colors and interactions.', '{"page": "/pulse", "related": ["Right Now", "events"]}'),
('feature', 'XP System', 'Sweat coins earned through platform engagement. Complete profile: 100 XP. Attend event: 50 XP. Safety check-in: 5 XP. Daily login streak: 10 XP. Redeemable for perks like profile boosts, premium features.', '{"page": "/profile", "related": ["gamification", "rewards"]}'),
('feature', 'MESSMARKET', 'Community marketplace for buying/selling. Three tiers: 1) HOTMESS brands (RAW, HUNG, HIGH, HNH MESS), 2) Verified sellers, 3) Community sellers. 10% platform fee on community sales. Safe in-app transactions.', '{"page": "/market", "related": ["products", "sellers"]}'),
('feature', 'RAW CONVICT RADIO', '24/7 underground electronic music radio. Multiple shows, guest DJs, SMASH DADDYS releases. Listen in-app on Music page. Live shows and archived sets available.', '{"page": "/music", "related": ["SMASH DADDYS", "shows"]}'),
('feature', 'Safety Tools', 'Suite of safety features: Panic button (alerts trusted contacts with location), Fake call (simulates incoming call to exit situations), Safety check-ins (nudges after meetups), Aftercare resources (hydration reminders, support links).', '{"page": "/safety", "related": ["panic", "check-in"]}'),
('feature', 'Ghosted Discovery', 'Main people discovery grid in Social section. Shows profiles based on preferences, location, compatibility. GPS-enabled with distance badges. Swipe/like/message interface.', '{"page": "/social", "related": ["profiles", "matching"]}'),

('brand', 'RAW', 'Bold basics apparel line. "Unfiltered. Unapologetic." Hot Pink brand color. Essentials like tees, tanks, underwear with attitude.', '{"color": "#FF1493", "type": "clothing"}'),
('brand', 'HUNG', 'Luxury streetwear line. "Statement pieces. Maximum impact." Purple brand color. Premium quality, bold designs.', '{"color": "#B026FF", "type": "clothing"}'),
('brand', 'HIGH', 'Premium essentials line. "Elevated essentials." Cyan brand color. Quality everyday pieces with subtle branding.', '{"color": "#00D9FF", "type": "clothing"}'),
('brand', 'HNH MESS', 'Lube brand. "The only lube with real aftercare." QR code on packaging links to aftercare resources. Products include original, warming, silicone varieties.', '{"type": "wellness", "tagline": "The only lube with real aftercare."}'),
('brand', 'RAW CONVICT RECORDS', 'Underground music label. Releases electronic music, hosts radio station. SMASH DADDYS is flagship artist. Focus on techno, house, underground sounds.', '{"type": "music", "related": ["radio", "SMASH DADDYS"]}'),

('navigation', 'Home', 'Dashboard/launcher page. Modules for Tonight (events), Fresh Drops (new products), Social snapshot, Radio player. Starting point for daily use.', '{"path": "/", "alias": ["dashboard", "launcher"]}'),
('navigation', 'Pulse', 'Interactive map with multiple layers. Toggle between People, Events, Market, Care beacons. Shows whos nearby, whats happening, and where to get help.', '{"path": "/pulse", "alias": ["map"]}'),
('navigation', 'Events', 'Browse upcoming events, parties, club nights. Filter by date, type, venue. RSVP to mark attendance. Creates reminders.', '{"path": "/events", "alias": ["parties", "whats on"]}'),
('navigation', 'Market', 'MESSMARKET shopping. Browse products, manage cart, checkout. See seller profiles, reviews. Track orders.', '{"path": "/market", "alias": ["shop", "MESSMARKET"]}'),
('navigation', 'Social', 'Discovery and messaging hub. Ghosted grid for browsing profiles. Direct messages. Right Now status. Connection requests.', '{"path": "/social", "alias": ["discovery", "messages", "ghosted"]}'),
('navigation', 'Music', 'RAW CONVICT RADIO. Live stream, show schedule, archived sets. Track releases. SMASH DADDYS content.', '{"path": "/music", "alias": ["radio"]}')
ON CONFLICT DO NOTHING;

-- Log completion
DO $$ BEGIN RAISE NOTICE 'Gay world knowledge seed completed'; END $$;
