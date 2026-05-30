-- T-08: Seed 30 London test profiles with photos + presence
-- Fixed UUIDs (20000000-...) to be idempotent and distinguishable from real users
-- Emails use seed-NN@hotmessldn.com (passes ghost filter)

DO $$
DECLARE
  names TEXT[] := ARRAY[
    'Asha','Bex','Cal','Dani','Eli','Fern','Grey','Harper',
    'Indie','Jules','Kit','Lux','Max','Nico','Ollie','Penn',
    'Quinn','Rio','Sky','Tao','Uma','Vex','Wren','Xan',
    'Yara','Zion','Arlo','Bliss','Cruz','Dusk'
  ];
  usernames TEXT[] := ARRAY[
    'asha.ldn','bex.raw','cal.vibes','dani.night','eli.mess','fern.gold','grey.zone','harper.hm',
    'indie.raw','jules.ldn','kit.mess','lux.gold','max.raw','nico.hm','ollie.ldn','penn.vibes',
    'quinn.mess','rio.gold','sky.ldn','tao.raw','uma.vibes','vex.night','wren.hm','xan.mess',
    'yara.ldn','zion.raw','arlo.gold','bliss.hm','cruz.vibes','dusk.mess'
  ];
  bios TEXT[] := ARRAY[
    'South London creative','East end vibes','Shoreditch by night','Brixton born','Hackney regular',
    'Peckham local','Camden soul','Dalston nights','Soho wanderer','Notting Hill',
    'Battersea living','Clapham scene','Bermondsey walks','Angel regular','Islington based',
    'Hoxton resident','Bethnal Green','Stratford local','Greenwich native','Lewisham born',
    'Deptford creative','Whitechapel nights','Mile End vibes','Bow local','Vauxhall scene',
    'Elephant & Castle','Kennington life','Oval regular','Stockwell local','Brixton Hill'
  ];
  intents TEXT[] := ARRAY['hookup','hang','explore'];
  i INT;
  uid UUID;
  em TEXT;
  n TEXT;
  un TEXT;
  bio TEXT;
BEGIN
  FOR i IN 1..30 LOOP
    uid := ('20000000-0000-0000-0000-' || LPAD(i::text, 12, '0'))::uuid;
    em  := 'seed-' || LPAD(i::text, 2, '0') || '@hotmessldn.com';
    n   := names[i];
    un  := usernames[i];
    bio := bios[i];

    -- auth.users
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, confirmation_sent_at, last_sign_in_at,
      raw_app_meta_data, raw_user_meta_data,
      is_super_admin, created_at, updated_at,
      phone, phone_confirmed_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated',
      em, crypt('SeedUser2026!', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('display_name', n),
      FALSE, NOW() - (random() * interval '30 days'), NOW(), NULL, NULL, '', '', '', ''
    ) ON CONFLICT (id) DO NOTHING;

    -- auth.identities
    INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (uid, em, uid,
      jsonb_build_object('sub', uid::text, 'email', em),
      'email', NOW(), NOW(), NOW())
    ON CONFLICT (provider, provider_id) DO NOTHING;

    -- profiles
    INSERT INTO public.profiles (
      id, email, display_name, username, bio,
      is_visible, community_attested_at, onboarding_completed,
      looking_for, age, gender
    ) VALUES (
      uid, em, n, un, bio,
      true, NOW(), true,
      ARRAY[intents[1 + (i % 3)]],
      20 + (i % 15),
      CASE WHEN i % 3 = 0 THEN 'non-binary' WHEN i % 2 = 0 THEN 'woman' ELSE 'man' END
    ) ON CONFLICT (id) DO UPDATE SET
      display_name = EXCLUDED.display_name,
      username = EXCLUDED.username,
      bio = EXCLUDED.bio,
      is_visible = true,
      community_attested_at = COALESCE(profiles.community_attested_at, NOW()),
      onboarding_completed = true;

    -- user_presence (online within last 30 min)
    INSERT INTO public.user_presence (
      user_id, status, last_seen_at
    ) VALUES (
      uid, 'online', NOW() - (random() * interval '25 minutes')
    ) ON CONFLICT (user_id) DO UPDATE SET
      status = 'online',
      last_seen_at = EXCLUDED.last_seen_at;

    -- profile_photos (Dicebear placeholder avatar)
    INSERT INTO public.profile_photos (
      profile_id, url, position, moderation_status
    ) VALUES (
      uid,
      'https://api.dicebear.com/7.x/shapes/svg?seed=' || un,
      0, 'approved'
    ) ON CONFLICT DO NOTHING;

  END LOOP;
END $$;
