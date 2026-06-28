-- Create gis_locations table
CREATE TABLE IF NOT EXISTS gis_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL CHECK (type IN ('Main Office', 'Learning Center', 'Classroom', 'Volunteer', 'Risk Area')),
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    teacher VARCHAR(255),
    capacity INTEGER DEFAULT 0,
    contact VARCHAR(50),
    photo_url TEXT,
    status VARCHAR(50) DEFAULT 'Healthy' CHECK (status IN ('Healthy', 'Warning', 'Critical')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable Row Level Security (RLS)
ALTER TABLE gis_locations ENABLE ROW LEVEL SECURITY;

-- Create Policy to allow read access to all users (anonymous and authenticated)
CREATE POLICY "Allow public read access" ON gis_locations
    FOR SELECT USING (true);

-- Create Policy to allow write access (insert/update/delete) for all users
CREATE POLICY "Allow write access for all" ON gis_locations
    FOR ALL USING (true) WITH CHECK (true);

-- Create trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_gis_locations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_gis_locations_updated_at
    BEFORE UPDATE ON gis_locations
    FOR EACH ROW
    EXECUTE FUNCTION update_gis_locations_updated_at();

-- Enable Supabase Realtime on gis_locations table
alter publication supabase_realtime add table gis_locations;
