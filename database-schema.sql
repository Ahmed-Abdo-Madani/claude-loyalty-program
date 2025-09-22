-- LOYALTY PROGRAM PLATFORM - DATABASE SCHEMA
-- Updated schema with enhanced offer controls and time limits

-- Businesses table
CREATE TABLE businesses (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    business_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enhanced Branches table
CREATE TABLE branches (
    id SERIAL PRIMARY KEY,
    business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,

    -- Address Information
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(50) NOT NULL,
    zip_code VARCHAR(20) NOT NULL,

    -- Contact Information
    phone VARCHAR(20),
    email VARCHAR(255),
    manager VARCHAR(255),

    -- Status and Hierarchy
    status VARCHAR(20) DEFAULT 'inactive', -- 'active', 'inactive', 'maintenance'
    is_main BOOLEAN DEFAULT false,

    -- Operating Hours (JSON format)
    operating_hours JSONB DEFAULT '{
        "monday": "9:00 AM - 9:00 PM",
        "tuesday": "9:00 AM - 9:00 PM",
        "wednesday": "9:00 AM - 9:00 PM",
        "thursday": "9:00 AM - 9:00 PM",
        "friday": "9:00 AM - 10:00 PM",
        "saturday": "10:00 AM - 10:00 PM",
        "sunday": "10:00 AM - 8:00 PM"
    }',

    -- Performance Tracking
    total_customers INTEGER DEFAULT 0,
    monthly_revenue DECIMAL(10,2) DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enhanced Offers table with new features
CREATE TABLE offers (
    id SERIAL PRIMARY KEY,
    business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
    branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    offer_type VARCHAR(50) NOT NULL, -- 'stamps', 'points', 'discount'
    stamps_required INTEGER DEFAULT 10,
    reward_description TEXT NOT NULL,
    qr_code_url VARCHAR(500),

    -- Enhanced Status Control
    status VARCHAR(20) DEFAULT 'paused', -- 'active', 'paused', 'scheduled', 'expired'

    -- Time Limits Feature
    is_time_limited BOOLEAN DEFAULT false,
    start_date DATE,
    end_date DATE,

    -- Performance Tracking
    total_customers INTEGER DEFAULT 0,
    total_redeemed INTEGER DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customers table
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    whatsapp VARCHAR(20),
    birthday DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customer Cards (tracks progress)
CREATE TABLE customer_cards (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    offer_id INTEGER REFERENCES offers(id) ON DELETE CASCADE,
    stamps_earned INTEGER DEFAULT 0,
    is_redeemed BOOLEAN DEFAULT false,
    wallet_pass_id VARCHAR(255), -- For Apple/Google Wallet
    redeemed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(customer_id, offer_id)
);

-- Offer Actions Log (for audit trail)
CREATE TABLE offer_actions (
    id SERIAL PRIMARY KEY,
    offer_id INTEGER REFERENCES offers(id) ON DELETE CASCADE,
    business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL, -- 'created', 'paused', 'resumed', 'deleted', 'modified'
    action_data JSONB, -- Store action details
    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_offers_business_id ON offers(business_id);
CREATE INDEX idx_offers_status ON offers(status);
CREATE INDEX idx_offers_time_limited ON offers(is_time_limited, start_date, end_date);
CREATE INDEX idx_customer_cards_customer_id ON customer_cards(customer_id);
CREATE INDEX idx_customer_cards_offer_id ON customer_cards(offer_id);
CREATE INDEX idx_customers_created_at ON customers(created_at);
CREATE INDEX idx_offer_actions_offer_id ON offer_actions(offer_id);

-- Branch-specific indexes
CREATE INDEX idx_branches_business_id ON branches(business_id);
CREATE INDEX idx_branches_status ON branches(status);
CREATE INDEX idx_branches_city ON branches(city);
CREATE INDEX idx_branches_is_main ON branches(is_main);
CREATE INDEX idx_offers_branch_id ON offers(branch_id);

-- Composite indexes for common queries
CREATE INDEX idx_offers_business_status ON offers(business_id, status);
CREATE INDEX idx_customer_cards_lookup ON customer_cards(customer_id, offer_id);
CREATE INDEX idx_offers_active_time ON offers(status, start_date, end_date) WHERE status = 'active';

-- Triggers for automatic offer status updates based on time
CREATE OR REPLACE FUNCTION update_offer_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Automatically set status to 'expired' if end_date has passed
    IF NEW.is_time_limited = true AND NEW.end_date < CURRENT_DATE AND NEW.status != 'expired' THEN
        NEW.status = 'expired';
    END IF;

    -- Automatically set status to 'active' if start_date has arrived and status is 'scheduled'
    IF NEW.is_time_limited = true AND NEW.start_date <= CURRENT_DATE AND NEW.status = 'scheduled' THEN
        NEW.status = 'active';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_offer_status
    BEFORE INSERT OR UPDATE ON offers
    FOR EACH ROW
    EXECUTE FUNCTION update_offer_status();

-- Function to update offer statistics
CREATE OR REPLACE FUNCTION update_offer_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- New customer joined
        UPDATE offers
        SET total_customers = total_customers + 1
        WHERE id = NEW.offer_id;

    ELSIF TG_OP = 'UPDATE' AND OLD.is_redeemed = false AND NEW.is_redeemed = true THEN
        -- Customer redeemed reward
        UPDATE offers
        SET total_redeemed = total_redeemed + 1
        WHERE id = NEW.offer_id;

    ELSIF TG_OP = 'DELETE' THEN
        -- Customer removed (cleanup)
        UPDATE offers
        SET total_customers = total_customers - 1
        WHERE id = OLD.offer_id;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_offer_stats
    AFTER INSERT OR UPDATE OR DELETE ON customer_cards
    FOR EACH ROW
    EXECUTE FUNCTION update_offer_stats();

-- Views for common queries
CREATE VIEW active_offers AS
SELECT
    o.*,
    b.business_name,
    br.name as branch_name,
    CASE
        WHEN o.is_time_limited = true AND o.end_date < CURRENT_DATE THEN 'expired'
        WHEN o.is_time_limited = true AND o.start_date > CURRENT_DATE THEN 'scheduled'
        ELSE o.status
    END as computed_status
FROM offers o
JOIN businesses b ON o.business_id = b.id
LEFT JOIN branches br ON o.branch_id = br.id
WHERE o.status != 'deleted';

CREATE VIEW offer_performance AS
SELECT
    o.id,
    o.title,
    o.total_customers,
    o.total_redeemed,
    CASE
        WHEN o.total_customers > 0 THEN ROUND((o.total_redeemed::FLOAT / o.total_customers) * 100, 2)
        ELSE 0
    END as redemption_rate_percent,
    o.created_at
FROM offers o
WHERE o.status != 'deleted';

-- Branch management views
CREATE VIEW branch_performance AS
SELECT
    b.id,
    b.name,
    b.status,
    b.city,
    b.state,
    b.is_main,
    b.total_customers,
    b.monthly_revenue,
    COUNT(o.id) as total_offers,
    COUNT(CASE WHEN o.status = 'active' THEN 1 END) as active_offers,
    b.created_at
FROM branches b
LEFT JOIN offers o ON b.id = o.branch_id
GROUP BY b.id, b.name, b.status, b.city, b.state, b.is_main, b.total_customers, b.monthly_revenue, b.created_at;

CREATE VIEW branch_offer_summary AS
SELECT
    b.id as branch_id,
    b.name as branch_name,
    o.id as offer_id,
    o.title as offer_title,
    o.status as offer_status,
    o.total_customers as offer_customers,
    o.total_redeemed as offer_redeemed
FROM branches b
LEFT JOIN offers o ON b.id = o.branch_id
WHERE b.status = 'active'
ORDER BY b.name, o.title;

-- Triggers for branch management
CREATE OR REPLACE FUNCTION update_branch_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.branch_id IS NOT NULL THEN
        -- Customer joined offer at specific branch
        UPDATE branches
        SET total_customers = total_customers + 1
        WHERE id = NEW.branch_id;

    ELSIF TG_OP = 'DELETE' AND OLD.branch_id IS NOT NULL THEN
        -- Customer removed from branch
        UPDATE branches
        SET total_customers = total_customers - 1
        WHERE id = OLD.branch_id;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Only apply to customer_cards that have branch-specific offers
CREATE TRIGGER trigger_update_branch_stats
    AFTER INSERT OR DELETE ON customer_cards
    FOR EACH ROW
    EXECUTE FUNCTION update_branch_stats();

-- Function to prevent deletion of main branch
CREATE OR REPLACE FUNCTION prevent_main_branch_deletion()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.is_main = true THEN
        RAISE EXCEPTION 'Cannot delete the main branch. Please designate another branch as main first.';
    END IF;

    -- Prevent deletion if branch has active offers
    IF EXISTS (SELECT 1 FROM offers WHERE branch_id = OLD.id AND status = 'active') THEN
        RAISE EXCEPTION 'Cannot delete branch with active offers. Please pause or reassign offers first.';
    END IF;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_main_branch_deletion
    BEFORE DELETE ON branches
    FOR EACH ROW
    EXECUTE FUNCTION prevent_main_branch_deletion();

-- Function to ensure at least one main branch exists
CREATE OR REPLACE FUNCTION ensure_main_branch()
RETURNS TRIGGER AS $$
BEGIN
    -- If setting is_main to false, ensure another main branch exists
    IF TG_OP = 'UPDATE' AND OLD.is_main = true AND NEW.is_main = false THEN
        IF NOT EXISTS (
            SELECT 1 FROM branches
            WHERE business_id = NEW.business_id
            AND is_main = true
            AND id != NEW.id
        ) THEN
            RAISE EXCEPTION 'At least one branch must be designated as main.';
        END IF;
    END IF;

    -- If setting is_main to true, set all other branches to false
    IF NEW.is_main = true THEN
        UPDATE branches
        SET is_main = false
        WHERE business_id = NEW.business_id AND id != NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ensure_main_branch
    BEFORE INSERT OR UPDATE ON branches
    FOR EACH ROW
    EXECUTE FUNCTION ensure_main_branch();

-- Branch actions log table
CREATE TABLE branch_actions (
    id SERIAL PRIMARY KEY,
    branch_id INTEGER REFERENCES branches(id) ON DELETE CASCADE,
    business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL, -- 'created', 'activated', 'deactivated', 'modified', 'deleted'
    action_data JSONB, -- Store action details
    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_branch_actions_branch_id ON branch_actions(branch_id);
CREATE INDEX idx_branch_actions_business_id ON branch_actions(business_id);
CREATE INDEX idx_branch_actions_type ON branch_actions(action_type);