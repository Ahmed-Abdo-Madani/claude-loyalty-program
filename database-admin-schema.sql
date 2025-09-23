-- PLATFORM ADMIN DATABASE SCHEMA EXTENSIONS
-- Add admin functionality to the loyalty program platform

-- Platform Admins table
CREATE TABLE platform_admins (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin', -- 'super_admin', 'admin', 'support'
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'inactive', 'suspended'
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES platform_admins(id) ON DELETE SET NULL
);

-- Admin Sessions table for secure session management
CREATE TABLE admin_sessions (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER REFERENCES platform_admins(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Platform Settings table for global configuration
CREATE TABLE platform_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type VARCHAR(50) DEFAULT 'string', -- 'string', 'number', 'boolean', 'json'
    description TEXT,
    is_public BOOLEAN DEFAULT false, -- Whether setting is visible to businesses
    updated_by INTEGER REFERENCES platform_admins(id) ON DELETE SET NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Admin Actions Log for audit trail
CREATE TABLE admin_actions (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER REFERENCES platform_admins(id) ON DELETE SET NULL,
    action_type VARCHAR(100) NOT NULL, -- 'business_created', 'business_suspended', 'settings_updated', etc.
    target_type VARCHAR(50), -- 'business', 'admin', 'setting', 'system'
    target_id INTEGER, -- ID of the affected entity
    action_data JSONB, -- Additional action details
    ip_address INET,
    user_agent TEXT,
    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Business Status Updates (extend existing businesses table)
-- Add status column to existing businesses table
ALTER TABLE businesses
ADD COLUMN status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'active', 'suspended', 'banned', 'inactive'
ADD COLUMN approved_at TIMESTAMP,
ADD COLUMN approved_by INTEGER REFERENCES platform_admins(id) ON DELETE SET NULL,
ADD COLUMN suspension_reason TEXT,
ADD COLUMN suspension_date TIMESTAMP,
ADD COLUMN last_activity_at TIMESTAMP;

-- Business Metrics table for analytics
CREATE TABLE business_metrics (
    id SERIAL PRIMARY KEY,
    business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
    metric_date DATE NOT NULL,
    total_offers INTEGER DEFAULT 0,
    active_offers INTEGER DEFAULT 0,
    total_customers INTEGER DEFAULT 0,
    new_customers INTEGER DEFAULT 0,
    total_redemptions INTEGER DEFAULT 0,
    wallet_passes_generated INTEGER DEFAULT 0,
    revenue_estimate DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(business_id, metric_date)
);

-- Platform Analytics table for overall metrics
CREATE TABLE platform_analytics (
    id SERIAL PRIMARY KEY,
    analytics_date DATE NOT NULL UNIQUE,
    total_businesses INTEGER DEFAULT 0,
    active_businesses INTEGER DEFAULT 0,
    pending_businesses INTEGER DEFAULT 0,
    suspended_businesses INTEGER DEFAULT 0,
    total_offers INTEGER DEFAULT 0,
    total_customers INTEGER DEFAULT 0,
    total_redemptions INTEGER DEFAULT 0,
    apple_wallet_passes INTEGER DEFAULT 0,
    google_wallet_passes INTEGER DEFAULT 0,
    api_requests_count INTEGER DEFAULT 0,
    error_rate_percent DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Support Tickets table
CREATE TABLE support_tickets (
    id SERIAL PRIMARY KEY,
    business_id INTEGER REFERENCES businesses(id) ON DELETE SET NULL,
    assigned_admin_id INTEGER REFERENCES platform_admins(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'technical', 'billing', 'feature_request', 'bug_report'
    priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
    status VARCHAR(20) DEFAULT 'open', -- 'open', 'in_progress', 'resolved', 'closed'
    resolution_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_platform_admins_email ON platform_admins(email);
CREATE INDEX idx_platform_admins_role ON platform_admins(role);
CREATE INDEX idx_platform_admins_status ON platform_admins(status);

CREATE INDEX idx_admin_sessions_admin_id ON admin_sessions(admin_id);
CREATE INDEX idx_admin_sessions_token ON admin_sessions(session_token);
CREATE INDEX idx_admin_sessions_expires ON admin_sessions(expires_at);
CREATE INDEX idx_admin_sessions_active ON admin_sessions(is_active);

CREATE INDEX idx_platform_settings_key ON platform_settings(setting_key);
CREATE INDEX idx_platform_settings_public ON platform_settings(is_public);

CREATE INDEX idx_admin_actions_admin_id ON admin_actions(admin_id);
CREATE INDEX idx_admin_actions_type ON admin_actions(action_type);
CREATE INDEX idx_admin_actions_target ON admin_actions(target_type, target_id);
CREATE INDEX idx_admin_actions_date ON admin_actions(performed_at);

CREATE INDEX idx_businesses_status ON businesses(status);
CREATE INDEX idx_businesses_approved_by ON businesses(approved_by);
CREATE INDEX idx_businesses_last_activity ON businesses(last_activity_at);

CREATE INDEX idx_business_metrics_business_date ON business_metrics(business_id, metric_date);
CREATE INDEX idx_business_metrics_date ON business_metrics(metric_date);

CREATE INDEX idx_platform_analytics_date ON platform_analytics(analytics_date);

CREATE INDEX idx_support_tickets_business_id ON support_tickets(business_id);
CREATE INDEX idx_support_tickets_admin_id ON support_tickets(assigned_admin_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_priority ON support_tickets(priority);
CREATE INDEX idx_support_tickets_category ON support_tickets(category);

-- Triggers and Functions

-- Update admin sessions on login
CREATE OR REPLACE FUNCTION cleanup_expired_admin_sessions()
RETURNS TRIGGER AS $$
BEGIN
    -- Deactivate expired sessions
    UPDATE admin_sessions
    SET is_active = false
    WHERE expires_at < CURRENT_TIMESTAMP AND is_active = true;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cleanup_admin_sessions
    AFTER INSERT ON admin_sessions
    FOR EACH STATEMENT
    EXECUTE FUNCTION cleanup_expired_admin_sessions();

-- Auto-update business last_activity_at
CREATE OR REPLACE FUNCTION update_business_activity()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE businesses
    SET last_activity_at = CURRENT_TIMESTAMP
    WHERE id = NEW.business_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to relevant tables that indicate business activity
CREATE TRIGGER trigger_business_activity_offers
    AFTER INSERT OR UPDATE ON offers
    FOR EACH ROW
    EXECUTE FUNCTION update_business_activity();

CREATE TRIGGER trigger_business_activity_branches
    AFTER INSERT OR UPDATE ON branches
    FOR EACH ROW
    EXECUTE FUNCTION update_business_activity();

-- Function to automatically log admin actions
CREATE OR REPLACE FUNCTION log_business_status_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Log status changes
    IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
        INSERT INTO admin_actions (
            admin_id,
            action_type,
            target_type,
            target_id,
            action_data
        ) VALUES (
            NEW.approved_by,
            'business_status_changed',
            'business',
            NEW.id,
            jsonb_build_object(
                'old_status', OLD.status,
                'new_status', NEW.status,
                'business_name', NEW.business_name,
                'business_email', NEW.email
            )
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_business_status_changes
    AFTER UPDATE ON businesses
    FOR EACH ROW
    EXECUTE FUNCTION log_business_status_changes();

-- Views for admin dashboard

-- Business summary view
CREATE VIEW admin_business_summary AS
SELECT
    b.id,
    b.business_name,
    b.email,
    b.status,
    b.created_at,
    b.approved_at,
    b.last_activity_at,
    pa.full_name as approved_by_name,
    COUNT(DISTINCT br.id) as total_branches,
    COUNT(DISTINCT o.id) as total_offers,
    COUNT(DISTINCT CASE WHEN o.status = 'active' THEN o.id END) as active_offers,
    COUNT(DISTINCT cc.customer_id) as total_customers,
    COUNT(DISTINCT CASE WHEN cc.is_redeemed THEN cc.id END) as total_redemptions,
    MAX(o.updated_at) as last_offer_update
FROM businesses b
LEFT JOIN platform_admins pa ON b.approved_by = pa.id
LEFT JOIN branches br ON b.id = br.business_id
LEFT JOIN offers o ON b.id = o.business_id
LEFT JOIN customer_cards cc ON o.id = cc.offer_id
GROUP BY b.id, b.business_name, b.email, b.status, b.created_at, b.approved_at, b.last_activity_at, pa.full_name;

-- Platform overview view
CREATE VIEW admin_platform_overview AS
SELECT
    COUNT(DISTINCT CASE WHEN status = 'active' THEN id END) as active_businesses,
    COUNT(DISTINCT CASE WHEN status = 'pending' THEN id END) as pending_businesses,
    COUNT(DISTINCT CASE WHEN status = 'suspended' THEN id END) as suspended_businesses,
    COUNT(DISTINCT id) as total_businesses,
    (SELECT COUNT(*) FROM offers WHERE status = 'active') as total_active_offers,
    (SELECT COUNT(DISTINCT customer_id) FROM customer_cards) as total_customers,
    (SELECT COUNT(*) FROM customer_cards WHERE is_redeemed = true) as total_redemptions,
    (SELECT COUNT(*) FROM support_tickets WHERE status IN ('open', 'in_progress')) as open_tickets
FROM businesses;

-- Recent admin activities view
CREATE VIEW admin_recent_activities AS
SELECT
    aa.id,
    pa.full_name as admin_name,
    aa.action_type,
    aa.target_type,
    aa.target_id,
    aa.action_data,
    aa.performed_at,
    CASE
        WHEN aa.target_type = 'business' THEN b.business_name
        ELSE NULL
    END as target_name
FROM admin_actions aa
LEFT JOIN platform_admins pa ON aa.admin_id = pa.id
LEFT JOIN businesses b ON aa.target_type = 'business' AND aa.target_id = b.id
ORDER BY aa.performed_at DESC;

-- Insert default platform settings
INSERT INTO platform_settings (setting_key, setting_value, setting_type, description, is_public) VALUES
('platform_name', 'Loyalty Platform', 'string', 'Name of the platform', true),
('max_offers_per_business', '50', 'number', 'Maximum number of offers per business', false),
('auto_approve_businesses', 'false', 'boolean', 'Whether to auto-approve new business registrations', false),
('wallet_integration_enabled', 'true', 'boolean', 'Whether wallet integrations are enabled', true),
('support_email', 'support@loyaltyplatform.com', 'string', 'Support contact email', true),
('maintenance_mode', 'false', 'boolean', 'Platform maintenance mode', true),
('google_wallet_enabled', 'true', 'boolean', 'Google Wallet integration status', false),
('apple_wallet_enabled', 'true', 'boolean', 'Apple Wallet integration status', false);

-- Create the first super admin (password: admin123 - hashed)
-- Note: In production, use proper password hashing
INSERT INTO platform_admins (email, password_hash, full_name, role, status) VALUES
('admin@loyaltyplatform.com', '$2b$10$rKjVtVGxZHr7.yKTQl9Hqu7XxUzL8Tq2qcqHzN3lqQoQpKuGwN1Le', 'Platform Administrator', 'super_admin', 'active');

-- Insert sample platform analytics for last 30 days
INSERT INTO platform_analytics (analytics_date, total_businesses, active_businesses, pending_businesses)
SELECT
    CURRENT_DATE - INTERVAL '1 day' * generate_series(0, 29),
    1 + (random() * 10)::int,
    1 + (random() * 8)::int,
    (random() * 3)::int;