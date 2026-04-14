-- =====================================================
-- Gestor Privado de Eventos y Asistencia
-- Supabase SQL Schema v1.0
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. EVENTS
-- =====================================================
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL CHECK (type IN ('charla', 'taller')),
    title TEXT NOT NULL,
    subtitle TEXT,
    description_short TEXT NOT NULL,
    description_extended TEXT,
    event_date DATE NOT NULL,
    start_time TIME NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 120,
    coordinator TEXT NOT NULL DEFAULT 'Leandro Velasques',
    organizer TEXT,
    agenda JSONB DEFAULT '[]'::jsonb,
    banner_url TEXT,
    registration_mode TEXT NOT NULL DEFAULT 'both' CHECK (registration_mode IN ('manual', 'self', 'both')),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'in_progress', 'completed', 'cancelled')),
    max_capacity INTEGER,
    private_link_token TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
    attendance_link_token TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_events_slug ON events(slug);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_private_token ON events(private_link_token);

-- =====================================================
-- 2. EVENT SESSIONS (for multi-session events, future)
-- =====================================================
CREATE TABLE IF NOT EXISTS event_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    session_number INTEGER NOT NULL DEFAULT 1,
    session_date DATE NOT NULL,
    start_time TIME NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 120,
    location TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_event ON event_sessions(event_id);

-- =====================================================
-- 3. PARTICIPANTS
-- =====================================================
CREATE TABLE IF NOT EXISTS participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_participants_updated_at
    BEFORE UPDATE ON participants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Partial unique on email (only where email is not null)
CREATE UNIQUE INDEX IF NOT EXISTS idx_participants_email ON participants(email) WHERE email IS NOT NULL;

-- =====================================================
-- 4. REGISTRATIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    source TEXT NOT NULL CHECK (source IN ('manual', 'self_registration')),
    status TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'confirmed', 'cancelled')),
    registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    confirmation_sent BOOLEAN NOT NULL DEFAULT FALSE,
    unique_token TEXT NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prevent duplicate registrations
CREATE UNIQUE INDEX IF NOT EXISTS idx_registrations_event_participant 
    ON registrations(event_id, participant_id);
CREATE INDEX IF NOT EXISTS idx_registrations_event ON registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_registrations_token ON registrations(unique_token);

-- =====================================================
-- 5. ATTENDANCE
-- =====================================================
CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
    session_id UUID REFERENCES event_sessions(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late')),
    marked_by TEXT NOT NULL DEFAULT 'admin' CHECK (marked_by IN ('admin', 'self', 'n8n')),
    marked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_unique 
    ON attendance(registration_id, session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_registration ON attendance(registration_id);

-- =====================================================
-- 6. CERTIFICATES
-- =====================================================
CREATE TABLE IF NOT EXISTS certificates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'sent', 'failed')),
    file_url TEXT,
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_certificates_registration 
    ON certificates(registration_id);

-- =====================================================
-- 7. EVENT MATERIALS (future v1.1)
-- =====================================================
CREATE TABLE IF NOT EXISTS event_materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('pdf', 'link', 'presentation', 'image', 'other')),
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_materials_event ON event_materials(event_id);

-- =====================================================
-- 8. EVENT REPORTS (minutes/minuta)
-- =====================================================
CREATE TABLE IF NOT EXISTS event_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    summary TEXT NOT NULL,
    photo_url TEXT,
    recipients TEXT NOT NULL DEFAULT 'attendees' CHECK (recipients IN ('attendees', 'all')),
    sent BOOLEAN NOT NULL DEFAULT FALSE,
    sent_at TIMESTAMPTZ,
    sent_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_event ON event_reports(event_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_reports ENABLE ROW LEVEL SECURITY;

-- Admin policies (authenticated users = admin)
CREATE POLICY "Admin full access events" ON events 
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Admin full access sessions" ON event_sessions 
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Admin full access participants" ON participants 
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Admin full access registrations" ON registrations 
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Admin full access attendance" ON attendance 
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Admin full access certificates" ON certificates 
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Admin full access materials" ON event_materials 
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Admin full access reports" ON event_reports 
    FOR ALL USING (auth.role() = 'authenticated');

-- Public policies for self-registration
CREATE POLICY "Public read published events" ON events
    FOR SELECT USING (status IN ('published', 'in_progress', 'completed'));

CREATE POLICY "Public read participants for self" ON participants
    FOR SELECT USING (true);  -- Limited by app logic

CREATE POLICY "Public insert registrations" ON registrations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM events 
            WHERE id = event_id 
            AND status = 'published'
            AND registration_mode IN ('self', 'both')
        )
    );

CREATE POLICY "Public insert participants" ON participants
    FOR INSERT WITH CHECK (true);  -- Anyone can create a participant on registration

CREATE POLICY "Public insert attendance (self)" ON attendance
    FOR INSERT WITH CHECK (marked_by = 'self');

-- =====================================================
-- VIEWS (helper views for dashboard stats)
-- =====================================================
CREATE OR REPLACE VIEW event_stats AS
SELECT 
    e.id AS event_id,
    e.title,
    e.status,
    e.event_date,
    COUNT(DISTINCT r.id) FILTER (WHERE r.status != 'cancelled') AS total_registered,
    COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'confirmed') AS confirmed,
    COUNT(DISTINCT a.id) FILTER (WHERE a.status IN ('present', 'late')) AS present,
    COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'absent') AS absent,
    COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'sent') AS certificates_sent,
    COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'pending') AS certificates_pending
FROM events e
LEFT JOIN registrations r ON r.event_id = e.id
LEFT JOIN attendance a ON a.registration_id = r.id
LEFT JOIN certificates c ON c.registration_id = r.id
GROUP BY e.id, e.title, e.status, e.event_date;
