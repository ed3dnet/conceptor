-- Indexes for common queries and foreign key performance
CREATE INDEX idx_units_parent ON units(parent_unit_id);
CREATE INDEX idx_unit_permissions_unit ON unit_permissions(unit_id);
CREATE INDEX idx_unit_permissions_target ON unit_permissions(target_unit_id);
CREATE INDEX idx_unit_permissions_dates ON unit_permissions(start_date, end_date);

CREATE INDEX idx_capability_permissions_unit ON capability_permissions(unit_id);
CREATE INDEX idx_capability_permissions_target ON capability_permissions(target_capability_id);
CREATE INDEX idx_capability_permissions_dates ON capability_permissions(start_date, end_date);

CREATE INDEX idx_initiative_permissions_unit ON initiative_permissions(unit_id);
CREATE INDEX idx_initiative_permissions_target ON initiative_permissions(target_initiative_id);
CREATE INDEX idx_initiative_permissions_dates ON initiative_permissions(start_date, end_date);

CREATE INDEX idx_global_permissions_unit ON global_permissions(unit_id);
CREATE INDEX idx_global_permissions_dates ON global_permissions(start_date, end_date);

CREATE INDEX idx_unit_assignments_unit ON unit_assignments(unit_id);
CREATE INDEX idx_unit_assignments_employee ON unit_assignments(employee_id);
CREATE INDEX idx_unit_assignments_dates ON unit_assignments(start_date, end_date);

CREATE INDEX idx_unit_capabilities_unit ON unit_capabilities(unit_id);
CREATE INDEX idx_unit_capabilities_capability ON unit_capabilities(capability_id);
CREATE INDEX idx_unit_capabilities_dates ON unit_capabilities(start_date, end_date);

CREATE INDEX idx_initiative_capabilities_initiative ON initiative_capabilities(initiative_id);
CREATE INDEX idx_initiative_capabilities_capability ON initiative_capabilities(capability_id);
CREATE INDEX idx_initiative_capabilities_unit ON initiative_capabilities(unit_id);
CREATE INDEX idx_initiative_capabilities_dates ON initiative_capabilities(start_date, end_date);

CREATE INDEX idx_unit_information_source ON unit_information(source_unit_id);
CREATE INDEX idx_unit_information_target ON unit_information(target_unit_id);
CREATE INDEX idx_unit_information_type ON unit_information(type);
CREATE INDEX idx_unit_information_relevance ON unit_information(relevance_score);
CREATE INDEX idx_unit_information_collected ON unit_information(collected_at);

-- Materialized views for current state queries
CREATE MATERIALIZED VIEW current_unit_assignments AS
SELECT 
    ua.unit_id,
    ua.employee_id,
    u.name AS unit_name,
    e.name AS employee_name,
    ua.start_date
FROM unit_assignments ua
JOIN units u ON ua.unit_id = u.id
JOIN employees e ON ua.employee_id = e.id
WHERE ua.end_date IS NULL;

CREATE MATERIALIZED VIEW current_unit_capabilities AS
SELECT 
    uc.unit_id,
    uc.capability_id,
    u.name AS unit_name,
    c.name AS capability_name,
    uc.is_formal,
    uc.start_date
FROM unit_capabilities uc
JOIN units u ON uc.unit_id = u.id
JOIN capabilities c ON uc.capability_id = c.id
WHERE uc.end_date IS NULL;

CREATE MATERIALIZED VIEW current_initiative_capabilities AS
SELECT 
    ic.initiative_id,
    ic.capability_id,
    ic.unit_id,
    i.name AS initiative_name,
    c.name AS capability_name,
    u.name AS unit_name,
    ic.start_date
FROM initiative_capabilities ic
JOIN initiatives i ON ic.initiative_id = i.id
JOIN capabilities c ON ic.capability_id = c.id
JOIN units u ON ic.unit_id = u.id
WHERE ic.end_date IS NULL;

CREATE MATERIALIZED VIEW current_permissions AS
SELECT 
    'unit' as permission_type,
    up.unit_id,
    u.name AS unit_name,
    up.target_unit_id AS target_id,
    tu.name AS target_name,
    up.permission_type::text AS permission,
    up.start_date
FROM unit_permissions up
JOIN units u ON up.unit_id = u.id
JOIN units tu ON up.target_unit_id = tu.id
WHERE up.end_date IS NULL

UNION ALL

SELECT 
    'capability' as permission_type,
    cp.unit_id,
    u.name AS unit_name,
    cp.target_capability_id AS target_id,
    c.name AS target_name,
    cp.permission_type::text AS permission,
    cp.start_date
FROM capability_permissions cp
JOIN units u ON cp.unit_id = u.id
JOIN capabilities c ON cp.target_capability_id = c.id
WHERE cp.end_date IS NULL

UNION ALL

SELECT 
    'initiative' as permission_type,
    ip.unit_id,
    u.name AS unit_name,
    ip.target_initiative_id AS target_id,
    i.name AS target_name,
    ip.permission_type::text AS permission,
    ip.start_date
FROM initiative_permissions ip
JOIN units u ON ip.unit_id = u.id
JOIN initiatives i ON ip.target_initiative_id = i.id
WHERE ip.end_date IS NULL

UNION ALL

SELECT 
    'global' as permission_type,
    gp.unit_id,
    u.name AS unit_name,
    NULL AS target_id,
    NULL AS target_name,
    gp.permission_type::text AS permission,
    gp.start_date
FROM global_permissions gp
JOIN units u ON gp.unit_id = u.id
WHERE gp.end_date IS NULL;

-- Refresh concurrently for all materialized views
CREATE UNIQUE INDEX idx_current_unit_assignments_pk ON current_unit_assignments(unit_id, employee_id);
CREATE UNIQUE INDEX idx_current_unit_capabilities_pk ON current_unit_capabilities(unit_id, capability_id);
CREATE UNIQUE INDEX idx_current_initiative_capabilities_pk ON current_initiative_capabilities(initiative_id, capability_id, unit_id);
CREATE UNIQUE INDEX idx_current_permissions_pk ON current_permissions(permission_type, unit_id, COALESCE(target_id::text, ''), permission);
CREATE TYPE information_type AS ENUM ('boolean', 'gradient', 'text');

-- Information about units
CREATE TABLE unit_information (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_unit_id UUID NOT NULL REFERENCES units(id),
    target_unit_id UUID NOT NULL REFERENCES units(id),
    type information_type NOT NULL,
    -- The actual response data (only one should be non-null based on type)
    boolean_response BOOLEAN,
    gradient_response FLOAT,
    text_response TEXT,
    -- Audio source if text was transcribed
    audio_source_bucket TEXT,
    audio_source_key TEXT,
    transcription_metadata JSONB,
    -- Relevance tracking
    collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    relevance_score FLOAT NOT NULL DEFAULT 1.0,
    manually_invalidated BOOLEAN NOT NULL DEFAULT false,
    -- Revision tracking (null if this is the first version)
    previous_version_id UUID REFERENCES unit_information(id),
    -- Standard timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Ensure only one response type is provided
    CONSTRAINT valid_response_type CHECK (
        CASE type
            WHEN 'boolean' THEN 
                (boolean_response IS NOT NULL AND gradient_response IS NULL AND text_response IS NULL)
            WHEN 'gradient' THEN 
                (boolean_response IS NULL AND gradient_response IS NOT NULL AND text_response IS NULL)
            WHEN 'text' THEN 
                (boolean_response IS NULL AND gradient_response IS NULL AND text_response IS NOT NULL)
        END
    ),
    -- Audio source requires both bucket and key if present
    CONSTRAINT valid_audio_source CHECK (
        (type != 'text' AND audio_source_bucket IS NULL AND audio_source_key IS NULL AND transcription_metadata IS NULL) OR
        (type = 'text' AND (
            (audio_source_bucket IS NULL AND audio_source_key IS NULL) OR
            (audio_source_bucket IS NOT NULL AND audio_source_key IS NOT NULL)
        ))
    )
);
CREATE TYPE unit_permission_type AS ENUM (
    'manage_reports',
    'assign_work',
    'approve_time_off',
    'manage_unit',
    'view_reports'
);

CREATE TYPE capability_permission_type AS ENUM (
    'view',
    'edit',
    'assign',
    'approve',
    'delete'
);

CREATE TYPE initiative_permission_type AS ENUM (
    'view',
    'edit',
    'manage_resources',
    'approve_changes',
    'close'
);

CREATE TYPE global_permission_type AS ENUM (
    'admin',
    'audit',
    'create_units',
    'create_initiatives',
    'create_capabilities'
);

-- Permission tables
CREATE TABLE unit_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID NOT NULL REFERENCES units(id),
    target_unit_id UUID NOT NULL REFERENCES units(id),
    permission_type unit_permission_type NOT NULL,
    start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_dates CHECK (
        (end_date IS NULL) OR (end_date > start_date)
    )
);

CREATE TABLE capability_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID NOT NULL REFERENCES units(id),
    target_capability_id UUID NOT NULL REFERENCES capabilities(id),
    permission_type capability_permission_type NOT NULL,
    start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_dates CHECK (
        (end_date IS NULL) OR (end_date > start_date)
    )
);

CREATE TABLE initiative_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID NOT NULL REFERENCES units(id),
    target_initiative_id UUID NOT NULL REFERENCES initiatives(id),
    permission_type initiative_permission_type NOT NULL,
    start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_dates CHECK (
        (end_date IS NULL) OR (end_date > start_date)
    )
);

CREATE TABLE global_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID NOT NULL REFERENCES units(id),
    permission_type global_permission_type NOT NULL,
    start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_dates CHECK (
        (end_date IS NULL) OR (end_date > start_date)
    )
);

-- View for all permissions
CREATE VIEW all_permissions AS
    SELECT 
        id,
        unit_id,
        'unit' as target_type,
        target_unit_id::text as target_id,
        permission_type::text as permission_type,
        start_date,
        end_date
    FROM unit_permissions
    UNION ALL
    SELECT 
        id,
        unit_id,
        'capability' as target_type,
        target_capability_id::text as target_id,
        permission_type::text as permission_type,
        start_date,
        end_date
    FROM capability_permissions
    UNION ALL
    SELECT 
        id,
        unit_id,
        'initiative' as target_type,
        target_initiative_id::text as target_id,
        permission_type::text as permission_type,
        start_date,
        end_date
    FROM initiative_permissions
    UNION ALL
    SELECT 
        id,
        unit_id,
        'global' as target_type,
        NULL as target_id,
        permission_type::text as permission_type,
        start_date,
        end_date
    FROM global_permissions;

-- Core entities
CREATE TABLE units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type unit_type NOT NULL,
    parent_unit_id UUID REFERENCES units(id),
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_parent CHECK (parent_unit_id != id)
);

CREATE TABLE unit_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID NOT NULL REFERENCES units(id),
    target_unit_id UUID NOT NULL REFERENCES units(id),
    permission_type unit_permission_type NOT NULL,
    start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_dates CHECK (
        (end_date IS NULL) OR (end_date > start_date)
    )
);

CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE unit_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID NOT NULL REFERENCES units(id),
    employee_id UUID NOT NULL REFERENCES employees(id),
    start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_dates CHECK (
        (end_date IS NULL) OR (end_date > start_date)
    )
);

CREATE TABLE capabilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE unit_capabilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID NOT NULL REFERENCES units(id),
    capability_id UUID NOT NULL REFERENCES capabilities(id),
    is_formal BOOLEAN NOT NULL DEFAULT false,
    start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_dates CHECK (
        (end_date IS NULL) OR (end_date > start_date)
    )
);

CREATE TABLE initiatives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_dates CHECK (
        (end_date IS NULL) OR (end_date > start_date)
    )
);

CREATE TABLE initiative_capabilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    initiative_id UUID NOT NULL REFERENCES initiatives(id),
    capability_id UUID NOT NULL REFERENCES capabilities(id),
    unit_id UUID NOT NULL REFERENCES units(id),
    start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_dates CHECK (
        (end_date IS NULL) OR (end_date > start_date)
    )
);

CREATE TABLE unit_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID NOT NULL REFERENCES units(id),
    key TEXT NOT NULL,
    value TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_unit_tag UNIQUE (unit_id, key)
);

CREATE TABLE capability_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    capability_id UUID NOT NULL REFERENCES capabilities(id),
    key TEXT NOT NULL,
    value TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_capability_tag UNIQUE (capability_id, key)
);

CREATE TABLE initiative_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    initiative_id UUID NOT NULL REFERENCES initiatives(id),
    key TEXT NOT NULL,
    value TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_initiative_tag UNIQUE (initiative_id, key)
);

CREATE TABLE employee_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id),
    key TEXT NOT NULL,
    value TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_employee_tag UNIQUE (employee_id, key)
);