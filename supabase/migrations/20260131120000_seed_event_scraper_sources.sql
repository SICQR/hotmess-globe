-- Seed initial event scraper sources for UK LGBT venues
-- These are example sources - replace with real data feeds when available

INSERT INTO public.event_scraper_sources (city, source_name, source_url, source_type, enabled, extract_rules) 
VALUES 
    -- London sources
    ('London', 'Heaven London', 'https://heavennightclub-london.com/events.json', 'json_feed', false, '{"events_path": "events"}'),
    ('London', 'G-A-Y', 'https://g-a-y.co.uk/events.json', 'json_feed', false, '{"events_path": "events"}'),
    ('London', 'The Glory', 'https://theglory.co/events.json', 'json_feed', false, '{"events_path": "events"}'),
    ('London', 'Royal Vauxhall Tavern', 'https://vauxhalltavern.com/events.json', 'json_feed', false, '{"events_path": "events"}'),
    
    -- Manchester sources
    ('Manchester', 'Canal Street Events', 'https://canalstreet.co.uk/events.json', 'json_feed', false, '{"events_path": "events"}'),
    ('Manchester', 'Cruz 101', 'https://cruz101.com/events.json', 'json_feed', false, '{"events_path": "events"}'),
    
    -- Brighton sources  
    ('Brighton', 'Brighton Pride', 'https://brighton-pride.org/events.json', 'json_feed', false, '{"events_path": "events"}'),
    
    -- OpenAI fallback (enabled by default)
    ('*', 'OpenAI Research', 'openai://research', 'api', true, '{"model": "gpt-4o", "cities": ["London", "Manchester", "Brighton", "Birmingham", "Edinburgh"]}')
ON CONFLICT (city, source_url) DO NOTHING;

-- Note: Set enabled=true for sources once you have real JSON feeds
-- The OpenAI research source uses the configured OPENAI_API_KEY to find real events
