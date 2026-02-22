--
-- PostgreSQL database dump
--

\restrict t9r5yi6bdEZltuho1a0xppcBjxzj8EEUg096NK0qwlBEFjVRdsWtiv1hVdz9YcG

-- Dumped from database version 15.15
-- Dumped by pg_dump version 15.15

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: apple_pass_type_enum; Type: TYPE; Schema: public; Owner: loyalty_user
--

--
-- Name: enum_businesses_current_plan; Type: TYPE; Schema: public; Owner: loyalty_user
--

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_businesses_current_plan') THEN
        CREATE TYPE public.enum_businesses_current_plan AS ENUM (
            'free',
            'professional',
            'enterprise'
        );
    END IF;
END $$;


ALTER TYPE public.enum_businesses_current_plan OWNER TO loyalty_user;

--
-- Name: enum_businesses_subscription_status; Type: TYPE; Schema: public; Owner: loyalty_user
--

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_businesses_subscription_status') THEN
        CREATE TYPE public.enum_businesses_subscription_status AS ENUM (
            'trial',
            'active',
            'past_due',
            'cancelled',
            'expired'
        );
    END IF;
END $$;


ALTER TYPE public.enum_businesses_subscription_status OWNER TO loyalty_user;

--
-- Name: enum_customer_segments_calculation_status; Type: TYPE; Schema: public; Owner: loyalty_user
--

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_customer_segments_calculation_status') THEN
        CREATE TYPE public.enum_customer_segments_calculation_status AS ENUM (
            'pending',
            'calculating',
            'completed',
            'error'
        );
    END IF;
END $$;


ALTER TYPE public.enum_customer_segments_calculation_status OWNER TO loyalty_user;

--
-- Name: enum_customer_segments_gender; Type: TYPE; Schema: public; Owner: loyalty_user
--

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_customer_segments_gender') THEN
        CREATE TYPE public.enum_customer_segments_gender AS ENUM (
            'male',
            'female',
            'other',
            'any'
        );
    END IF;
END $$;


ALTER TYPE public.enum_customer_segments_gender OWNER TO loyalty_user;

--
-- Name: enum_customer_segments_loyalty_tier; Type: TYPE; Schema: public; Owner: loyalty_user
--

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_customer_segments_loyalty_tier') THEN
        CREATE TYPE public.enum_customer_segments_loyalty_tier AS ENUM (
            'new',
            'bronze',
            'silver',
            'gold',
            'platinum'
        );
    END IF;
END $$;


ALTER TYPE public.enum_customer_segments_loyalty_tier OWNER TO loyalty_user;

--
-- Name: enum_customer_segments_refresh_frequency; Type: TYPE; Schema: public; Owner: loyalty_user
--

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_customer_segments_refresh_frequency') THEN
        CREATE TYPE public.enum_customer_segments_refresh_frequency AS ENUM (
            'real_time',
            'hourly',
            'daily',
            'weekly',
            'manual'
        );
    END IF;
END $$;


ALTER TYPE public.enum_customer_segments_refresh_frequency OWNER TO loyalty_user;

--
-- Name: enum_customer_segments_type; Type: TYPE; Schema: public; Owner: loyalty_user
--

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_customer_segments_type') THEN
        CREATE TYPE public.enum_customer_segments_type AS ENUM (
            'static',
            'dynamic',
            'behavioral',
            'demographic',
            'engagement'
        );
    END IF;
END $$;


ALTER TYPE public.enum_customer_segments_type OWNER TO loyalty_user;

--
-- Name: enum_invoices_status; Type: TYPE; Schema: public; Owner: loyalty_user
--

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_invoices_status') THEN
        CREATE TYPE public.enum_invoices_status AS ENUM (
            'draft',
            'issued',
            'paid',
            'overdue',
            'cancelled'
        );
    END IF;
END $$;


ALTER TYPE public.enum_invoices_status OWNER TO loyalty_user;

--
-- Name: enum_notification_campaigns_ab_test_variant; Type: TYPE; Schema: public; Owner: loyalty_user
--

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_notification_campaigns_ab_test_variant') THEN
        CREATE TYPE public.enum_notification_campaigns_ab_test_variant AS ENUM (
            'A',
            'B'
        );
    END IF;
END $$;


ALTER TYPE public.enum_notification_campaigns_ab_test_variant OWNER TO loyalty_user;

--
-- Name: enum_notification_campaigns_status; Type: TYPE; Schema: public; Owner: loyalty_user
--

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_notification_campaigns_status') THEN
        CREATE TYPE public.enum_notification_campaigns_status AS ENUM (
            'draft',
            'active',
            'paused',
            'completed',
            'cancelled'
        );
    END IF;
END $$;


ALTER TYPE public.enum_notification_campaigns_status OWNER TO loyalty_user;

--
-- Name: enum_notification_campaigns_target_type; Type: TYPE; Schema: public; Owner: loyalty_user
--

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_notification_campaigns_target_type') THEN
        CREATE TYPE public.enum_notification_campaigns_target_type AS ENUM (
            'all_customers',
            'segment',
            'individual',
            'custom_filter'
        );
    END IF;
END $$;


ALTER TYPE public.enum_notification_campaigns_target_type OWNER TO loyalty_user;

--
-- Name: enum_notification_campaigns_trigger_type; Type: TYPE; Schema: public; Owner: loyalty_user
--

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_notification_campaigns_trigger_type') THEN
        CREATE TYPE public.enum_notification_campaigns_trigger_type AS ENUM (
            'birthday',
            'progress_milestone',
            'reward_completion',
            'inactivity',
            'new_customer',
            'custom'
        );
    END IF;
END $$;


ALTER TYPE public.enum_notification_campaigns_trigger_type OWNER TO loyalty_user;

--
-- Name: enum_notification_campaigns_type; Type: TYPE; Schema: public; Owner: loyalty_user
--

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_notification_campaigns_type') THEN
        CREATE TYPE public.enum_notification_campaigns_type AS ENUM (
            'manual',
            'automated',
            'scheduled'
        );
    END IF;
END $$;


ALTER TYPE public.enum_notification_campaigns_type OWNER TO loyalty_user;

--
-- Name: enum_offers_barcode_preference; Type: TYPE; Schema: public; Owner: loyalty_user
--

--
-- Name: enum_payments_payment_method; Type: TYPE; Schema: public; Owner: loyalty_user
--

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_payments_payment_method') THEN
        CREATE TYPE public.enum_payments_payment_method AS ENUM (
            'card',
            'apple_pay',
            'stc_pay'
        );
    END IF;
END $$;


ALTER TYPE public.enum_payments_payment_method OWNER TO loyalty_user;

--
-- Name: enum_payments_status; Type: TYPE; Schema: public; Owner: loyalty_user
--

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_payments_status') THEN
        CREATE TYPE public.enum_payments_status AS ENUM (
            'pending',
            'paid',
            'failed',
            'refunded',
            'cancelled'
        );
    END IF;
END $$;


ALTER TYPE public.enum_payments_status OWNER TO loyalty_user;

--
-- Name: enum_platform_admins_role; Type: TYPE; Schema: public; Owner: loyalty_user
--

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_platform_admins_role') THEN
        CREATE TYPE public.enum_platform_admins_role AS ENUM (
            'super_admin',
            'admin',
            'support'
        );
    END IF;
END $$;


ALTER TYPE public.enum_platform_admins_role OWNER TO loyalty_user;

--
-- Name: enum_platform_admins_status; Type: TYPE; Schema: public; Owner: loyalty_user
--

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_platform_admins_status') THEN
        CREATE TYPE public.enum_platform_admins_status AS ENUM (
            'active',
            'inactive',
            'suspended'
        );
    END IF;
END $$;


ALTER TYPE public.enum_platform_admins_status OWNER TO loyalty_user;

--
-- Name: enum_product_categories_status; Type: TYPE; Schema: public; Owner: loyalty_user
--

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_product_categories_status') THEN
        CREATE TYPE public.enum_product_categories_status AS ENUM (
            'active',
            'inactive'
        );
    END IF;
END $$;


ALTER TYPE public.enum_product_categories_status OWNER TO loyalty_user;

--
-- Name: enum_products_status; Type: TYPE; Schema: public; Owner: loyalty_user
--

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_products_status') THEN
        CREATE TYPE public.enum_products_status AS ENUM (
            'active',
            'inactive',
            'out_of_stock'
        );
    END IF;
END $$;


ALTER TYPE public.enum_products_status OWNER TO loyalty_user;

--
-- Name: enum_receipts_format; Type: TYPE; Schema: public; Owner: loyalty_user
--

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_receipts_format') THEN
        CREATE TYPE public.enum_receipts_format AS ENUM (
            'thermal',
            'a4',
            'digital'
        );
    END IF;
END $$;


ALTER TYPE public.enum_receipts_format OWNER TO loyalty_user;

--
-- Name: enum_sales_payment_method; Type: TYPE; Schema: public; Owner: loyalty_user
--

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_sales_payment_method') THEN
        CREATE TYPE public.enum_sales_payment_method AS ENUM (
            'cash',
            'card',
            'gift_offer',
            'mixed'
        );
    END IF;
END $$;


ALTER TYPE public.enum_sales_payment_method OWNER TO loyalty_user;

--
-- Name: enum_sales_status; Type: TYPE; Schema: public; Owner: loyalty_user
--

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_sales_status') THEN
        CREATE TYPE public.enum_sales_status AS ENUM (
            'completed',
            'cancelled',
            'refunded'
        );
    END IF;
END $$;


ALTER TYPE public.enum_sales_status OWNER TO loyalty_user;

--
-- Name: enum_subscriptions_plan_type; Type: TYPE; Schema: public; Owner: loyalty_user
--

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_subscriptions_plan_type') THEN
        CREATE TYPE public.enum_subscriptions_plan_type AS ENUM (
            'free',
            'professional',
            'enterprise'
        );
    END IF;
END $$;


ALTER TYPE public.enum_subscriptions_plan_type OWNER TO loyalty_user;

--
-- Name: enum_subscriptions_status; Type: TYPE; Schema: public; Owner: loyalty_user
--

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_subscriptions_status') THEN
        CREATE TYPE public.enum_subscriptions_status AS ENUM (
            'trial',
            'active',
            'past_due',
            'cancelled',
            'expired'
        );
    END IF;
END $$;


ALTER TYPE public.enum_subscriptions_status OWNER TO loyalty_user;

--
-- Name: ensure_main_branch(); Type: FUNCTION; Schema: public; Owner: loyalty_user
--

CREATE OR REPLACE FUNCTION public.ensure_main_branch() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.ensure_main_branch() OWNER TO loyalty_user;

--
-- Name: prevent_main_branch_deletion(); Type: FUNCTION; Schema: public; Owner: loyalty_user
--

CREATE OR REPLACE FUNCTION public.prevent_main_branch_deletion() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.prevent_main_branch_deletion() OWNER TO loyalty_user;

--
-- Name: update_branch_stats(); Type: FUNCTION; Schema: public; Owner: loyalty_user
--

CREATE OR REPLACE FUNCTION public.update_branch_stats() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.update_branch_stats() OWNER TO loyalty_user;

--
-- Name: update_offer_stats(); Type: FUNCTION; Schema: public; Owner: loyalty_user
--

CREATE OR REPLACE FUNCTION public.update_offer_stats() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.update_offer_stats() OWNER TO loyalty_user;

--
-- Name: update_offer_status(); Type: FUNCTION; Schema: public; Owner: loyalty_user
--

CREATE OR REPLACE FUNCTION public.update_offer_status() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.update_offer_status() OWNER TO loyalty_user;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: branches; Type: TABLE; Schema: public; Owner: loyalty_user
--

CREATE TABLE IF NOT EXISTS public.branches (
    id integer NOT NULL,
    business_id character varying(50),
    name character varying(255) NOT NULL,
    address text,
    city character varying(100),
    state character varying(50),
    zip_code character varying(20),
    phone character varying(20),
    email character varying(255),
    manager_name character varying(255),
    status character varying(20) DEFAULT 'inactive'::character varying,
    is_main boolean DEFAULT false,
    operating_hours jsonb DEFAULT '{"friday": "9:00 AM - 10:00 PM", "monday": "9:00 AM - 9:00 PM", "sunday": "10:00 AM - 8:00 PM", "tuesday": "9:00 AM - 9:00 PM", "saturday": "10:00 AM - 10:00 PM", "thursday": "9:00 AM - 9:00 PM", "wednesday": "9:00 AM - 9:00 PM"}'::jsonb,
    customers integer DEFAULT 0,
    monthly_revenue numeric(10,2) DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    public_id character varying(50),
    region character varying(100),
    district character varying(100),
    country character varying(100) DEFAULT 'Saudi Arabia'::character varying,
    location_id character varying(50),
    location_type character varying(50),
    location_hierarchy character varying(500),
    manager_pin character varying(255),
    manager_pin_enabled boolean DEFAULT false,
    manager_last_login timestamp with time zone,
    active_offers integer DEFAULT 0,
    latitude numeric(10,7),
    longitude numeric(10,7),
    pos_access_enabled boolean DEFAULT true,
    scanner_access_enabled boolean DEFAULT true
);


ALTER TABLE public.branches OWNER TO loyalty_user;

--
-- Name: businesses; Type: TABLE; Schema: public; Owner: loyalty_user
--

CREATE TABLE IF NOT EXISTS public.businesses (
    id integer NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    business_name character varying(255) NOT NULL,
    phone character varying(20),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    public_id character varying(50),
    current_plan public.enum_businesses_current_plan DEFAULT 'free'::public.enum_businesses_current_plan NOT NULL,
    subscription_status public.enum_businesses_subscription_status DEFAULT 'trial'::public.enum_businesses_subscription_status NOT NULL,
    trial_ends_at timestamp with time zone,
    subscription_started_at timestamp with time zone,
    business_name_ar character varying(255),
    business_type character varying(100),
    license_number character varying(50),
    description text,
    region character varying(100),
    city character varying(100),
    district character varying(100),
    address text,
    location_id character varying(50),
    location_hierarchy character varying(500),
    owner_name character varying(255),
    owner_name_ar character varying(255),
    owner_id character varying(20),
    owner_phone character varying(20),
    owner_email character varying(255),
    status character varying(20) DEFAULT 'pending'::character varying,
    suspension_reason text,
    suspension_date timestamp with time zone,
    approved_at timestamp with time zone,
    approved_by character varying(50),
    last_activity_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    total_branches integer DEFAULT 0,
    total_offers integer DEFAULT 0,
    active_offers integer DEFAULT 0,
    total_customers integer DEFAULT 0,
    total_redemptions integer DEFAULT 0,
    logo_filename character varying(255),
    logo_url character varying(500),
    logo_uploaded_at timestamp with time zone,
    logo_file_size integer,
    is_verified boolean DEFAULT false,
    profile_completion integer DEFAULT 0,
    location_type character varying(50)
);


ALTER TABLE public.businesses OWNER TO loyalty_user;

--
-- Name: offers; Type: TABLE; Schema: public; Owner: loyalty_user
--

DROP TABLE IF EXISTS public.offers CASCADE;
CREATE TABLE IF NOT EXISTS public.offers (
    id integer NOT NULL,
    business_id character varying(50),
    branch_id character varying(50),
    title character varying(255) NOT NULL,
    description text,
    type character varying(50) NOT NULL,
    stamps_required integer DEFAULT 10,
    reward_description text NOT NULL,
    qr_code_url character varying(500),
    status character varying(20) DEFAULT 'paused'::character varying,
    is_time_limited boolean DEFAULT false,
    start_date date,
    end_date date,
    customers integer DEFAULT 0,
    redeemed integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    public_id character varying(50),
    barcode_preference VARCHAR(20) DEFAULT 'PDF417' NOT NULL CHECK (barcode_preference IN ('QR_CODE', 'PDF417')),
    apple_pass_type VARCHAR(20) DEFAULT 'storeCard' NOT NULL CHECK (apple_pass_type IN ('storeCard', 'generic')),
    branch character varying(255) DEFAULT 'All Branches'::character varying,
    max_redemptions_per_customer integer,
    terms_conditions text,
    total_scans integer DEFAULT 0,
    conversion_rate numeric(5,2) DEFAULT 0,
    loyalty_tiers json
);


ALTER TABLE public.offers OWNER TO loyalty_user;


--
-- Name: wallet_passes; Type: TABLE; Schema: public; Owner: loyalty_user
--

CREATE TABLE IF NOT EXISTS public.wallet_passes (
    id SERIAL PRIMARY KEY,
    customer_id character varying(50) NOT NULL,
    progress_id integer NOT NULL,
    business_id character varying(50) NOT NULL,
    offer_id character varying(50) NOT NULL,
    wallet_type character varying(20) NOT NULL,
    wallet_serial character varying(100) UNIQUE,
    wallet_object_id character varying(200) UNIQUE,
    pass_status character varying(20) DEFAULT 'active'::character varying,
    device_info jsonb DEFAULT '{}'::jsonb,
    last_updated_at timestamp without time zone,
    notification_count integer DEFAULT 0,
    last_notification_date timestamp with time zone,
    notification_history jsonb DEFAULT '[]'::jsonb,
    authentication_token character varying(64) UNIQUE,
    last_updated_tag character varying(50),
    manifest_etag character varying(32),
    pass_data_json jsonb,
    scheduled_expiration_at timestamp with time zone,
    expiration_notified boolean DEFAULT false,
    deleted_at timestamp with time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT wallet_passes_pass_status_check CHECK (((pass_status)::text = ANY (ARRAY[('active'::character varying)::text, ('expired'::character varying)::text, ('revoked'::character varying)::text, ('deleted'::character varying)::text, ('completed'::character varying)::text]))),
    CONSTRAINT wallet_passes_wallet_type_check CHECK (((wallet_type)::text = ANY (ARRAY[('apple'::character varying)::text, ('google'::character varying)::text]))),
    CONSTRAINT unique_customer_offer_wallet UNIQUE (customer_id, offer_id, wallet_type)
);

ALTER TABLE public.wallet_passes OWNER TO loyalty_user;

--
-- Name: devices; Type: TABLE; Schema: public; Owner: loyalty_user
--

CREATE TABLE IF NOT EXISTS public.devices (
    id SERIAL PRIMARY KEY,
    device_library_identifier character varying(100) NOT NULL UNIQUE,
    push_token character varying(200) NOT NULL,
    device_info jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    last_seen_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.devices OWNER TO loyalty_user;

--
-- Name: device_registrations; Type: TABLE; Schema: public; Owner: loyalty_user
--

CREATE TABLE IF NOT EXISTS public.device_registrations (
    id SERIAL PRIMARY KEY,
    device_id integer NOT NULL,
    wallet_pass_id integer NOT NULL,
    registered_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    last_checked_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (device_id, wallet_pass_id)
);

ALTER TABLE public.device_registrations OWNER TO loyalty_user;

--
-- Name: COLUMN offers.barcode_preference; Type: COMMENT; Schema: public; Owner: loyalty_user
--

COMMENT ON COLUMN public.offers.barcode_preference IS 'Barcode format for wallet passes (QR_CODE or PDF417)';


--
-- Name: COLUMN offers.apple_pass_type; Type: COMMENT; Schema: public; Owner: loyalty_user
--

COMMENT ON COLUMN public.offers.apple_pass_type IS 'Apple Wallet pass style: storeCard (strip image) or generic (thumbnail image)';



--
-- Name: active_offers; Type: VIEW; Schema: public; Owner: loyalty_user
--

CREATE OR REPLACE VIEW public.active_offers AS
 SELECT o.id,
    o.business_id,
    o.branch_id,
    o.title,
    o.description,
    o.type,
    o.stamps_required,
    o.reward_description,
    o.qr_code_url,
    o.status,
    o.is_time_limited,
    o.start_date,
    o.end_date,
    o.customers,
    o.redeemed,
    o.created_at,
    o.updated_at,
    b.business_name,
    br.name AS branch_name,
        CASE
            WHEN ((o.is_time_limited = true) AND (o.end_date < CURRENT_DATE)) THEN 'expired'::character varying
            WHEN ((o.is_time_limited = true) AND (o.start_date > CURRENT_DATE)) THEN 'scheduled'::character varying
            ELSE o.status
        END AS computed_status
   FROM ((public.offers o
     JOIN public.businesses b ON (((o.business_id)::text = (b.public_id)::text)))
     LEFT JOIN public.branches br ON (((o.branch_id)::text = (br.public_id)::text)))
  WHERE ((o.status)::text <> 'deleted'::text);


ALTER TABLE public.active_offers OWNER TO loyalty_user;

--
-- Name: admin_sessions; Type: TABLE; Schema: public; Owner: loyalty_user
--

CREATE TABLE IF NOT EXISTS public.admin_sessions (
    id integer NOT NULL,
    admin_id integer NOT NULL,
    session_token character varying(255) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    ip_address inet,
    user_agent text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.admin_sessions OWNER TO loyalty_user;

--
-- Name: admin_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: loyalty_user
--

CREATE SEQUENCE IF NOT EXISTS public.admin_sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.admin_sessions_id_seq OWNER TO loyalty_user;

--
-- Name: admin_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: loyalty_user
--

ALTER SEQUENCE public.admin_sessions_id_seq OWNED BY public.admin_sessions.id;


--
-- Name: auto_engagement_configs; Type: TABLE; Schema: public; Owner: loyalty_user
--

CREATE TABLE IF NOT EXISTS public.auto_engagement_configs (
    id integer NOT NULL,
    config_id character varying(30) NOT NULL,
    business_id character varying(50) NOT NULL,
    enabled boolean DEFAULT false NOT NULL,
    inactivity_days integer DEFAULT 7 NOT NULL,
    message_template jsonb DEFAULT '{"body": "Come back and earn rewards with us!", "header": "We miss you!"}'::jsonb NOT NULL,
    channels jsonb DEFAULT '["wallet"]'::jsonb NOT NULL,
    last_run_at timestamp with time zone,
    last_run_status character varying(20),
    last_run_error text,
    total_customers_notified integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    CONSTRAINT check_inactivity_days CHECK (((inactivity_days >= 1) AND (inactivity_days <= 365))),
    CONSTRAINT check_last_run_status CHECK (((last_run_status IS NULL) OR ((last_run_status)::text = ANY (ARRAY[('success'::character varying)::text, ('failed'::character varying)::text, ('running'::character varying)::text]))))
);


ALTER TABLE public.auto_engagement_configs OWNER TO loyalty_user;

--
-- Name: TABLE auto_engagement_configs; Type: COMMENT; Schema: public; Owner: loyalty_user
--

COMMENT ON TABLE public.auto_engagement_configs IS 'Auto-engagement configuration for businesses. Used by AutoEngagementService to automatically notify inactive customers. One config per business.';


--
-- Name: COLUMN auto_engagement_configs.id; Type: COMMENT; Schema: public; Owner: loyalty_user
--

COMMENT ON COLUMN public.auto_engagement_configs.id IS 'Internal primary key';


--
-- Name: COLUMN auto_engagement_configs.config_id; Type: COMMENT; Schema: public; Owner: loyalty_user
--

COMMENT ON COLUMN public.auto_engagement_configs.config_id IS 'Secure public identifier (format: aec_[20chars])';


--
-- Name: COLUMN auto_engagement_configs.business_id; Type: COMMENT; Schema: public; Owner: loyalty_user
--

COMMENT ON COLUMN public.auto_engagement_configs.business_id IS 'Foreign key to businesses.public_id (one config per business)';


--
-- Name: COLUMN auto_engagement_configs.enabled; Type: COMMENT; Schema: public; Owner: loyalty_user
--

COMMENT ON COLUMN public.auto_engagement_configs.enabled IS 'Whether auto-engagement is active for this business';


--
-- Name: COLUMN auto_engagement_configs.inactivity_days; Type: COMMENT; Schema: public; Owner: loyalty_user
--

COMMENT ON COLUMN public.auto_engagement_configs.inactivity_days IS 'Days of customer inactivity before triggering re-engagement (1-365)';


--
-- Name: COLUMN auto_engagement_configs.message_template; Type: COMMENT; Schema: public; Owner: loyalty_user
--

COMMENT ON COLUMN public.auto_engagement_configs.message_template IS 'JSONB notification template with header and body fields (supports i18n)';


--
-- Name: COLUMN auto_engagement_configs.channels; Type: COMMENT; Schema: public; Owner: loyalty_user
--

COMMENT ON COLUMN public.auto_engagement_configs.channels IS 'JSONB array of notification channels (wallet, email, sms)';


--
-- Name: COLUMN auto_engagement_configs.last_run_at; Type: COMMENT; Schema: public; Owner: loyalty_user
--

COMMENT ON COLUMN public.auto_engagement_configs.last_run_at IS 'Timestamp of last auto-engagement execution by cron job';


--
-- Name: COLUMN auto_engagement_configs.last_run_status; Type: COMMENT; Schema: public; Owner: loyalty_user
--

COMMENT ON COLUMN public.auto_engagement_configs.last_run_status IS 'Status of last execution (success, failed, running)';


--
-- Name: COLUMN auto_engagement_configs.last_run_error; Type: COMMENT; Schema: public; Owner: loyalty_user
--

COMMENT ON COLUMN public.auto_engagement_configs.last_run_error IS 'Error message if last execution failed (for debugging)';


--
-- Name: COLUMN auto_engagement_configs.total_customers_notified; Type: COMMENT; Schema: public; Owner: loyalty_user
--

COMMENT ON COLUMN public.auto_engagement_configs.total_customers_notified IS 'Cumulative count of customers notified via auto-engagement';


--
-- Name: COLUMN auto_engagement_configs.created_at; Type: COMMENT; Schema: public; Owner: loyalty_user
--

COMMENT ON COLUMN public.auto_engagement_configs.created_at IS 'Record creation timestamp';


--
-- Name: COLUMN auto_engagement_configs.updated_at; Type: COMMENT; Schema: public; Owner: loyalty_user
--

COMMENT ON COLUMN public.auto_engagement_configs.updated_at IS 'Record last update timestamp';


--
-- Name: auto_engagement_configs_id_seq; Type: SEQUENCE; Schema: public; Owner: loyalty_user
--

CREATE SEQUENCE IF NOT EXISTS public.auto_engagement_configs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.auto_engagement_configs_id_seq OWNER TO loyalty_user;

--
-- Name: auto_engagement_configs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: loyalty_user
--

ALTER SEQUENCE public.auto_engagement_configs_id_seq OWNED BY public.auto_engagement_configs.id;


--
-- Name: branch_actions; Type: TABLE; Schema: public; Owner: loyalty_user
--

CREATE TABLE IF NOT EXISTS public.branch_actions (
    id integer NOT NULL,
    branch_id integer,
    business_id integer,
    action_type character varying(50) NOT NULL,
    action_data jsonb,
    performed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.branch_actions OWNER TO loyalty_user;

--
-- Name: branch_actions_id_seq; Type: SEQUENCE; Schema: public; Owner: loyalty_user
--

CREATE SEQUENCE IF NOT EXISTS public.branch_actions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.branch_actions_id_seq OWNER TO loyalty_user;

--
-- Name: branch_actions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: loyalty_user
--

ALTER SEQUENCE public.branch_actions_id_seq OWNED BY public.branch_actions.id;


-- Ensure branches has necessary columns before view creation
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS id SERIAL;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS is_main boolean DEFAULT false;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS pos_access_enabled boolean DEFAULT true;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS scanner_access_enabled boolean DEFAULT true;

--
-- Name: branch_offer_summary; Type: VIEW; Schema: public; Owner: loyalty_user
--

CREATE OR REPLACE VIEW public.branch_offer_summary AS
 SELECT b.public_id AS branch_id,
    b.name AS branch_name,
    o.public_id AS offer_id,
    o.title AS offer_title,
    o.status AS offer_status,
    o.customers AS offer_customers,
    o.redeemed AS offer_redeemed
   FROM (public.branches b
     LEFT JOIN public.offers o ON (((b.public_id)::text = (o.branch_id)::text)))
  WHERE ((b.status)::text = 'active'::text);


ALTER TABLE public.branch_offer_summary OWNER TO loyalty_user;

--
-- Name: branch_performance; Type: VIEW; Schema: public; Owner: loyalty_user
--

CREATE OR REPLACE VIEW public.branch_performance AS
 SELECT b.public_id AS id,
    b.name,
    b.status,
    b.city,
    b.region,
    b.is_main,
    b.customers,
    b.monthly_revenue,
    count(o.public_id) AS total_offers,
    count(
        CASE
            WHEN ((o.status)::text = 'active'::text) THEN 1
            ELSE NULL::integer
        END) AS active_offers,
    b.created_at
   FROM (public.branches b
     LEFT JOIN public.offers o ON (((b.public_id)::text = (o.branch_id)::text)))
  GROUP BY b.public_id, b.name, b.status, b.city, b.region, b.is_main, b.customers, b.monthly_revenue, b.created_at;


ALTER TABLE public.branch_performance OWNER TO loyalty_user;

--
-- Name: branches_id_seq; Type: SEQUENCE; Schema: public; Owner: loyalty_user
--

CREATE SEQUENCE IF NOT EXISTS public.branches_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.branches_id_seq OWNER TO loyalty_user;

--
-- Name: branches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: loyalty_user
--

ALTER SEQUENCE public.branches_id_seq OWNED BY public.branches.id;


--
-- Name: business_sessions; Type: TABLE; Schema: public; Owner: loyalty_user
--

CREATE TABLE IF NOT EXISTS public.business_sessions (
    id integer NOT NULL,
    business_id character varying(50) NOT NULL,
    session_token character varying(255) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    ip_address inet,
    user_agent text,
    is_active boolean DEFAULT true NOT NULL,
    last_used_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.business_sessions OWNER TO loyalty_user;

--
-- Name: COLUMN business_sessions.business_id; Type: COMMENT; Schema: public; Owner: loyalty_user
--

COMMENT ON COLUMN public.business_sessions.business_id IS 'Foreign key to businesses.public_id (secure ID format: biz_*)';


--
-- Name: COLUMN business_sessions.session_token; Type: COMMENT; Schema: public; Owner: loyalty_user
--

COMMENT ON COLUMN public.business_sessions.session_token IS 'Unique session identifier returned on login';


--
-- Name: COLUMN business_sessions.expires_at; Type: COMMENT; Schema: public; Owner: loyalty_user
--

COMMENT ON COLUMN public.business_sessions.expires_at IS 'Session expiration timestamp (typically 30 days from creation)';


--
-- Name: COLUMN business_sessions.ip_address; Type: COMMENT; Schema: public; Owner: loyalty_user
--

COMMENT ON COLUMN public.business_sessions.ip_address IS 'IP address of the client when session was created (audit trail)';


--
-- Name: COLUMN business_sessions.user_agent; Type: COMMENT; Schema: public; Owner: loyalty_user
--

COMMENT ON COLUMN public.business_sessions.user_agent IS 'User agent string of the client (audit trail)';


--
-- Name: COLUMN business_sessions.is_active; Type: COMMENT; Schema: public; Owner: loyalty_user
--

COMMENT ON COLUMN public.business_sessions.is_active IS 'Flag to revoke sessions without deleting records';


--
-- Name: COLUMN business_sessions.last_used_at; Type: COMMENT; Schema: public; Owner: loyalty_user
--

COMMENT ON COLUMN public.business_sessions.last_used_at IS 'Updated on each successful authentication to track activity';


--
-- Name: business_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: loyalty_user
--

CREATE SEQUENCE IF NOT EXISTS public.business_sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.business_sessions_id_seq OWNER TO loyalty_user;

--
-- Name: business_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: loyalty_user
--

ALTER SEQUENCE public.business_sessions_id_seq OWNED BY public.business_sessions.id;


--
-- Name: businesses_id_seq; Type: SEQUENCE; Schema: public; Owner: loyalty_user
--

CREATE SEQUENCE IF NOT EXISTS public.businesses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.businesses_id_seq OWNER TO loyalty_user;

--
-- Name: businesses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: loyalty_user
--

ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS id SERIAL;
ALTER SEQUENCE public.businesses_id_seq OWNED BY public.businesses.id;


--
-- Name: counters; Type: TABLE; Schema: public; Owner: loyalty_user
--

CREATE TABLE IF NOT EXISTS public.counters (
    id integer NOT NULL,
    counter_type character varying(50) NOT NULL,
    year integer NOT NULL,
    business_id character varying(50),
    branch_id character varying(50),
    last_value integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.counters OWNER TO loyalty_user;

--
-- Name: COLUMN counters.counter_type; Type: COMMENT; Schema: public; Owner: loyalty_user
--

COMMENT ON COLUMN public.counters.counter_type IS 'Type of counter (e.g., sale_number, receipt_number)';


--
-- Name: COLUMN counters.year; Type: COMMENT; Schema: public; Owner: loyalty_user
--

COMMENT ON COLUMN public.counters.year IS 'Year for the counter sequence';


--
-- Name: COLUMN counters.business_id; Type: COMMENT; Schema: public; Owner: loyalty_user
--

COMMENT ON COLUMN public.counters.business_id IS 'Optional business ID for business-specific counters';


--
-- Name: COLUMN counters.branch_id; Type: COMMENT; Schema: public; Owner: loyalty_user
--

COMMENT ON COLUMN public.counters.branch_id IS 'Optional branch ID for branch-specific counters';


--
-- Name: COLUMN counters.last_value; Type: COMMENT; Schema: public; Owner: loyalty_user
--

COMMENT ON COLUMN public.counters.last_value IS 'Last used counter value';


--
-- Name: counters_id_seq; Type: SEQUENCE; Schema: public; Owner: loyalty_user
--

CREATE SEQUENCE IF NOT EXISTS public.counters_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.counters_id_seq OWNER TO loyalty_user;

--
-- Name: counters_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: loyalty_user
--

ALTER SEQUENCE public.counters_id_seq OWNED BY public.counters.id;


--
-- Name: customer_cards; Type: TABLE; Schema: public; Owner: loyalty_user
--

CREATE TABLE IF NOT EXISTS public.customer_cards (
    id integer NOT NULL,
    customer_id integer,
    offer_id integer,
    stamps_earned integer DEFAULT 0,
    is_redeemed boolean DEFAULT false,
    wallet_pass_id character varying(255),
    redeemed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.customer_cards OWNER TO loyalty_user;

--
-- Name: customer_cards_id_seq; Type: SEQUENCE; Schema: public; Owner: loyalty_user
--

CREATE SEQUENCE IF NOT EXISTS public.customer_cards_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.customer_cards_id_seq OWNER TO loyalty_user;

--
-- Name: customer_cards_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: loyalty_user
--

ALTER SEQUENCE public.customer_cards_id_seq OWNED BY public.customer_cards.id;


--
-- Name: customer_progress; Type: TABLE; Schema: public; Owner: loyalty_user
--

CREATE TABLE IF NOT EXISTS public.customer_progress (
    id integer NOT NULL,
    customer_id character varying(50) NOT NULL,
    offer_id character varying(50) NOT NULL,
    business_id character varying(50) NOT NULL,
    current_stamps integer DEFAULT 0,
    max_stamps integer NOT NULL,
    is_completed boolean DEFAULT false,
    completed_at timestamp with time zone,
    rewards_claimed integer DEFAULT 0,
    reward_fulfilled_at timestamp with time zone,
    fulfilled_by_branch character varying(50),
    fulfillment_notes text,
    last_scan_date timestamp with time zone,
    wallet_pass_serial character varying(100),
    customer_name character varying(255),
    customer_phone character varying(20),
    customer_email character varying(255),
    total_scans integer DEFAULT 0,
    first_scan_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    secure_customer_id character varying(50)
);


ALTER TABLE public.customer_progress OWNER TO loyalty_user;

--
-- Name: customer_progress_id_seq; Type: SEQUENCE; Schema: public; Owner: loyalty_user
--

CREATE SEQUENCE IF NOT EXISTS public.customer_progress_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.customer_progress_id_seq OWNER TO loyalty_user;

--
-- Name: customer_progress_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: loyalty_user
--

ALTER SEQUENCE public.customer_progress_id_seq OWNED BY public.customer_progress.id;


--
-- Name: customer_segments; Type: TABLE; Schema: public; Owner: loyalty_user
--

CREATE TABLE IF NOT EXISTS public.customer_segments (
    id integer NOT NULL,
    segment_id character varying(50) NOT NULL,
    business_id character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    type public.enum_customer_segments_type DEFAULT 'dynamic'::public.enum_customer_segments_type,
    is_predefined boolean DEFAULT false,
    auto_update boolean DEFAULT true,
    criteria json DEFAULT '{}'::json NOT NULL,
    age_range json,
    gender public.enum_customer_segments_gender DEFAULT 'any'::public.enum_customer_segments_gender,
    location_criteria json,
    visit_frequency json,
    spending_range json,
    last_activity_days integer,
    engagement_score_range json,
    loyalty_tier public.enum_customer_segments_loyalty_tier,
    communication_preferences json,
    lifecycle_stages json,
    customer_status json,
    signup_date_range json,
    birthday_month integer,
    offer_preferences json,
    device_types json,
    tags_filter json,
    customer_count integer DEFAULT 0,
    last_calculated_at timestamp with time zone,
    calculation_status public.enum_customer_segments_calculation_status DEFAULT 'pending'::public.enum_customer_segments_calculation_status,
    campaign_usage_count integer DEFAULT 0,
    avg_engagement_rate numeric(5,2) DEFAULT 0,
    avg_conversion_rate numeric(5,2) DEFAULT 0,
    growth_rate numeric(5,2) DEFAULT 0,
    churn_rate numeric(5,2) DEFAULT 0,
    last_notification_sent_at timestamp with time zone,
    refresh_frequency public.enum_customer_segments_refresh_frequency DEFAULT 'daily'::public.enum_customer_segments_refresh_frequency,
    exclude_unsubscribed boolean DEFAULT true,
    exclude_inactive boolean DEFAULT false,
    created_by character varying(50),
    is_active boolean DEFAULT true,
    tags json DEFAULT '[]'::json,
    notes text,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.customer_segments OWNER TO loyalty_user;

--
-- Name: customer_segments_id_seq; Type: SEQUENCE; Schema: public; Owner: loyalty_user
--

CREATE SEQUENCE IF NOT EXISTS public.customer_segments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.customer_segments_id_seq OWNER TO loyalty_user;

--
-- Name: customer_segments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: loyalty_user
--

ALTER SEQUENCE public.customer_segments_id_seq OWNED BY public.customer_segments.id;


--
-- Name: customers; Type: TABLE; Schema: public; Owner: loyalty_user
--

CREATE TABLE IF NOT EXISTS public.customers (
    id integer NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    phone character varying(20),
    date_of_birth date,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    customer_id character varying(50),
    business_id character varying(50),
    email character varying(255),
    gender character varying(20) DEFAULT 'male'::character varying,
    status character varying(20) DEFAULT 'new'::character varying,
    lifecycle_stage character varying(50) DEFAULT 'prospect'::character varying,
    total_visits integer DEFAULT 0,
    total_stamps_earned integer DEFAULT 0,
    total_rewards_claimed integer DEFAULT 0,
    total_lifetime_value numeric(10,2) DEFAULT 0,
    average_days_between_visits integer DEFAULT 0,
    first_visit_date timestamp with time zone,
    last_activity_date timestamp with time zone,
    last_scan_date timestamp with time zone,
    gdpr_consent_date timestamp with time zone,
    preferences json DEFAULT '{}'::json,
    preferred_language character varying(10) DEFAULT 'en'::character varying,
    timezone character varying(50) DEFAULT 'Asia/Riyadh'::character varying,
    tags json DEFAULT '[]'::json,
    custom_fields json DEFAULT '{}'::json,
    notes text,
    referral_code character varying(50),
    acquisition_source character varying(50) DEFAULT 'organic'::character varying,
    consent_marketing boolean DEFAULT false,
    consent_data_processing boolean DEFAULT true,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.customers OWNER TO loyalty_user;

--
-- Name: customers_id_seq; Type: SEQUENCE; Schema: public; Owner: loyalty_user
--

CREATE SEQUENCE IF NOT EXISTS public.customers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.customers_id_seq OWNER TO loyalty_user;

--
-- Name: customers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: loyalty_user
--

ALTER SEQUENCE public.customers_id_seq OWNED BY public.customers.id;


--
-- Name: invoices; Type: TABLE; Schema: public; Owner: loyalty_user
--

CREATE TABLE IF NOT EXISTS public.invoices (
    id integer NOT NULL,
    invoice_number character varying(50) NOT NULL,
    business_id character varying(50) NOT NULL,
    payment_id character varying(50),
    subscription_id character varying(50),
    amount numeric(10,2) NOT NULL,
    tax_amount numeric(10,2) DEFAULT 0 NOT NULL,
    total_amount numeric(10,2) NOT NULL,
    currency character varying(3) DEFAULT 'SAR'::character varying NOT NULL,
    issued_date timestamp with time zone NOT NULL,
    due_date timestamp with time zone NOT NULL,
    paid_date timestamp with time zone,
    status public.enum_invoices_status DEFAULT 'draft'::public.enum_invoices_status NOT NULL,
    invoice_data json,
    pdf_url character varying(500),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.invoices OWNER TO loyalty_user;

--
-- Name: invoices_id_seq; Type: SEQUENCE; Schema: public; Owner: loyalty_user
--

CREATE SEQUENCE IF NOT EXISTS public.invoices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.invoices_id_seq OWNER TO loyalty_user;

--
-- Name: invoices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: loyalty_user
--

ALTER SEQUENCE public.invoices_id_seq OWNED BY public.invoices.id;


--
-- Name: notification_campaigns; Type: TABLE; Schema: public; Owner: loyalty_user
--

CREATE TABLE IF NOT EXISTS public.notification_campaigns (
    id integer NOT NULL,
    campaign_id character varying(50) NOT NULL,
    business_id character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    type public.enum_notification_campaigns_type DEFAULT 'manual'::public.enum_notification_campaigns_type,
    campaign_type character varying(50),
    channels json DEFAULT '["email"]'::json,
    status public.enum_notification_campaigns_status DEFAULT 'draft'::public.enum_notification_campaigns_status,
    target_type public.enum_notification_campaigns_target_type DEFAULT 'all_customers'::public.enum_notification_campaigns_target_type,
    target_segment_id character varying(50),
    target_customer_ids json,
    target_criteria json,
    linked_offer_id character varying(50),
    message_template json DEFAULT '{}'::json,
    personalization_fields json,
    send_immediately boolean DEFAULT true,
    scheduled_at timestamp with time zone,
    timezone character varying(50) DEFAULT 'Asia/Riyadh'::character varying,
    trigger_type public.enum_notification_campaigns_trigger_type,
    trigger_conditions json,
    is_ab_test boolean DEFAULT false,
    ab_test_split integer,
    ab_test_variant public.enum_notification_campaigns_ab_test_variant,
    ab_test_parent_id character varying(50),
    total_recipients integer DEFAULT 0,
    total_sent integer DEFAULT 0,
    total_delivered integer DEFAULT 0,
    total_opened integer DEFAULT 0,
    total_clicked integer DEFAULT 0,
    total_converted integer DEFAULT 0,
    total_failed integer DEFAULT 0,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    budget_limit numeric(10,2),
    cost_per_message numeric(6,4),
    total_cost numeric(10,2),
    frequency_cap json,
    unsubscribe_handling boolean DEFAULT true,
    created_by character varying(50),
    tags json,
    notes text,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    CONSTRAINT check_campaign_type CHECK (((campaign_type)::text = ANY (ARRAY[('lifecycle'::character varying)::text, ('promotional'::character varying)::text, ('transactional'::character varying)::text, ('new_offer_announcement'::character varying)::text, ('custom_promotion'::character varying)::text, ('seasonal_campaign'::character varying)::text])))
);


ALTER TABLE public.notification_campaigns OWNER TO loyalty_user;

--
-- Name: notification_campaigns_id_seq; Type: SEQUENCE; Schema: public; Owner: loyalty_user
--

CREATE SEQUENCE IF NOT EXISTS public.notification_campaigns_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.notification_campaigns_id_seq OWNER TO loyalty_user;

--
-- Name: notification_campaigns_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: loyalty_user
--

ALTER SEQUENCE public.notification_campaigns_id_seq OWNED BY public.notification_campaigns.id;


--
-- Name: offer_actions; Type: TABLE; Schema: public; Owner: loyalty_user
--

CREATE TABLE IF NOT EXISTS public.offer_actions (
    id integer NOT NULL,
    offer_id integer,
    business_id integer,
    action_type character varying(50) NOT NULL,
    action_data jsonb,
    performed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.offer_actions OWNER TO loyalty_user;

--
-- Name: offer_actions_id_seq; Type: SEQUENCE; Schema: public; Owner: loyalty_user
--

CREATE SEQUENCE IF NOT EXISTS public.offer_actions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.offer_actions_id_seq OWNER TO loyalty_user;

--
-- Name: offer_actions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: loyalty_user
--

ALTER SEQUENCE public.offer_actions_id_seq OWNED BY public.offer_actions.id;


--
-- Name: offers_id_seq; Type: SEQUENCE; Schema: public; Owner: loyalty_user
--

CREATE SEQUENCE IF NOT EXISTS public.offers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.offers_id_seq OWNER TO loyalty_user;

--
-- Name: offers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: loyalty_user
--

ALTER SEQUENCE public.offers_id_seq OWNED BY public.offers.id;


--
-- Name: payments; Type: TABLE; Schema: public; Owner: loyalty_user
--

CREATE TABLE IF NOT EXISTS public.payments (
    public_id character varying(50) NOT NULL,
    business_id character varying(50) NOT NULL,
    subscription_id character varying(50),
    moyasar_payment_id character varying(255),
    amount numeric(10,2) NOT NULL,
    currency character varying(3) DEFAULT 'SAR'::character varying NOT NULL,
    status public.enum_payments_status DEFAULT 'pending'::public.enum_payments_status NOT NULL,
    payment_method public.enum_payments_payment_method,
    payment_date timestamp with time zone,
    failure_reason text,
    refund_amount numeric(10,2),
    refunded_at timestamp with time zone,
    metadata json,
    retry_count integer DEFAULT 0 NOT NULL,
    last_retry_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.payments OWNER TO loyalty_user;

--
-- Name: platform_admins; Type: TABLE; Schema: public; Owner: loyalty_user
--

CREATE TABLE IF NOT EXISTS public.platform_admins (
    id integer NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    full_name character varying(255) NOT NULL,
    role public.enum_platform_admins_role DEFAULT 'admin'::public.enum_platform_admins_role,
    status public.enum_platform_admins_status DEFAULT 'active'::public.enum_platform_admins_status,
    last_login_at timestamp with time zone,
    created_by integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.platform_admins OWNER TO loyalty_user;

--
-- Name: platform_admins_id_seq; Type: SEQUENCE; Schema: public; Owner: loyalty_user
--

CREATE SEQUENCE IF NOT EXISTS public.platform_admins_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.platform_admins_id_seq OWNER TO loyalty_user;

--
-- Name: platform_admins_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: loyalty_user
--

ALTER SEQUENCE public.platform_admins_id_seq OWNED BY public.platform_admins.id;


--
-- Name: product_categories; Type: TABLE; Schema: public; Owner: loyalty_user
--

CREATE TABLE IF NOT EXISTS public.product_categories (
    public_id character varying(50) NOT NULL,
    business_id character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    name_ar character varying(255),
    description text,
    display_order integer DEFAULT 0 NOT NULL,
    status public.enum_product_categories_status DEFAULT 'active'::public.enum_product_categories_status NOT NULL,
    product_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.product_categories OWNER TO loyalty_user;

--
-- Name: products; Type: TABLE; Schema: public; Owner: loyalty_user
--

CREATE TABLE IF NOT EXISTS public.products (
    public_id character varying(50) NOT NULL,
    business_id character varying(50) NOT NULL,
    branch_id character varying(50),
    category_id character varying(50),
    name character varying(255) NOT NULL,
    name_ar character varying(255),
    description text,
    sku character varying(100),
    price numeric(10,2) NOT NULL,
    cost numeric(10,2),
    tax_rate numeric(5,2) DEFAULT 15 NOT NULL,
    tax_included boolean DEFAULT false NOT NULL,
    status public.enum_products_status DEFAULT 'active'::public.enum_products_status NOT NULL,
    image_url character varying(500),
    display_order integer DEFAULT 0 NOT NULL,
    total_sold integer DEFAULT 0 NOT NULL,
    total_revenue numeric(10,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.products OWNER TO loyalty_user;

--
-- Name: receipts; Type: TABLE; Schema: public; Owner: loyalty_user
--

CREATE TABLE IF NOT EXISTS public.receipts (
    id integer NOT NULL,
    sale_id character varying(50) NOT NULL,
    receipt_number character varying(50) NOT NULL,
    format public.enum_receipts_format NOT NULL,
    content_json json NOT NULL,
    printed_at timestamp with time zone,
    emailed_at timestamp with time zone,
    email_recipient character varying(255),
    print_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.receipts OWNER TO loyalty_user;

--
-- Name: receipts_id_seq; Type: SEQUENCE; Schema: public; Owner: loyalty_user
--

CREATE SEQUENCE IF NOT EXISTS public.receipts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.receipts_id_seq OWNER TO loyalty_user;

--
-- Name: receipts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: loyalty_user
--

ALTER SEQUENCE public.receipts_id_seq OWNED BY public.receipts.id;


--
-- Name: sale_items; Type: TABLE; Schema: public; Owner: loyalty_user
--

CREATE TABLE IF NOT EXISTS public.sale_items (
    id integer NOT NULL,
    sale_id character varying(50) NOT NULL,
    product_id character varying(50) NOT NULL,
    product_name character varying(255) NOT NULL,
    product_sku character varying(100),
    quantity integer NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    tax_rate numeric(5,2) NOT NULL,
    tax_amount numeric(10,2) NOT NULL,
    subtotal numeric(10,2) NOT NULL,
    total numeric(10,2) NOT NULL,
    discount_amount numeric(10,2) DEFAULT 0 NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.sale_items OWNER TO loyalty_user;

--
-- Name: sale_items_id_seq; Type: SEQUENCE; Schema: public; Owner: loyalty_user
--

CREATE SEQUENCE IF NOT EXISTS public.sale_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.sale_items_id_seq OWNER TO loyalty_user;

--
-- Name: sale_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: loyalty_user
--

ALTER SEQUENCE public.sale_items_id_seq OWNED BY public.sale_items.id;


--
-- Name: sales; Type: TABLE; Schema: public; Owner: loyalty_user
--

CREATE TABLE IF NOT EXISTS public.sales (
    public_id character varying(50) NOT NULL,
    sale_number character varying(50) NOT NULL,
    business_id character varying(50) NOT NULL,
    branch_id character varying(50) NOT NULL,
    customer_id character varying(50),
    subtotal numeric(10,2) NOT NULL,
    tax_amount numeric(10,2) NOT NULL,
    discount_amount numeric(10,2) DEFAULT 0 NOT NULL,
    total_amount numeric(10,2) NOT NULL,
    payment_method public.enum_sales_payment_method NOT NULL,
    payment_details json,
    status public.enum_sales_status DEFAULT 'completed'::public.enum_sales_status NOT NULL,
    sale_date timestamp with time zone DEFAULT now() NOT NULL,
    notes text,
    loyalty_discount_amount numeric(10,2) DEFAULT 0 NOT NULL,
    loyalty_redeemed boolean DEFAULT false NOT NULL,
    created_by_manager character varying(255),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.sales OWNER TO loyalty_user;

--
-- Name: schema_migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: loyalty_user
--

CREATE SEQUENCE IF NOT EXISTS public.schema_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.schema_migrations_id_seq OWNER TO loyalty_user;

--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: loyalty_user
--

CREATE TABLE IF NOT EXISTS public.subscriptions (
    public_id character varying(50) NOT NULL,
    business_id character varying(50) NOT NULL,
    plan_type public.enum_subscriptions_plan_type DEFAULT 'free'::public.enum_subscriptions_plan_type NOT NULL,
    status public.enum_subscriptions_status DEFAULT 'trial'::public.enum_subscriptions_status NOT NULL,
    trial_end_date timestamp with time zone,
    billing_cycle_start timestamp with time zone,
    next_billing_date timestamp with time zone,
    amount numeric(10,2) DEFAULT 0 NOT NULL,
    currency character varying(3) DEFAULT 'SAR'::character varying NOT NULL,
    moyasar_token character varying(255),
    payment_method_last4 character varying(4),
    payment_method_brand character varying(50),
    cancelled_at timestamp with time zone,
    cancellation_reason text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    grace_period_end timestamp with time zone,
    lemon_squeezy_subscription_id character varying(255),
    lemon_squeezy_customer_id character varying(255),
    lemon_squeezy_variant_id character varying(255),
    lemon_squeezy_status character varying(50)
);


ALTER TABLE public.subscriptions OWNER TO loyalty_user;

--
-- Name: COLUMN subscriptions.grace_period_end; Type: COMMENT; Schema: public; Owner: loyalty_user
--

COMMENT ON COLUMN public.subscriptions.grace_period_end IS 'End date of grace period after payment failures';


--
-- Name: COLUMN subscriptions.lemon_squeezy_subscription_id; Type: COMMENT; Schema: public; Owner: loyalty_user
--

COMMENT ON COLUMN public.subscriptions.lemon_squeezy_subscription_id IS 'Subscription ID from Lemon Squeezy';


--
-- Name: COLUMN subscriptions.lemon_squeezy_customer_id; Type: COMMENT; Schema: public; Owner: loyalty_user
--

COMMENT ON COLUMN public.subscriptions.lemon_squeezy_customer_id IS 'Customer ID from Lemon Squeezy';


--
-- Name: COLUMN subscriptions.lemon_squeezy_variant_id; Type: COMMENT; Schema: public; Owner: loyalty_user
--

COMMENT ON COLUMN public.subscriptions.lemon_squeezy_variant_id IS 'Variant ID representing the plan';


--
-- Name: COLUMN subscriptions.lemon_squeezy_status; Type: COMMENT; Schema: public; Owner: loyalty_user
--

COMMENT ON COLUMN public.subscriptions.lemon_squeezy_status IS 'Raw status from Lemon Squeezy';


--
-- Name: wallet_passes; Type: TABLE; Schema: public; Owner: loyalty_user
--

CREATE TABLE IF NOT EXISTS public.wallet_passes (
    id integer NOT NULL,
    customer_id character varying(50) NOT NULL,
    progress_id integer NOT NULL,
    business_id character varying(50) NOT NULL,
    offer_id character varying(50) NOT NULL,
    wallet_type character varying(20) NOT NULL,
    wallet_serial character varying(100),
    wallet_object_id character varying(200),
    pass_status character varying(20) DEFAULT 'active'::character varying,
    device_info jsonb DEFAULT '{}'::jsonb,
    last_updated_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT wallet_passes_pass_status_check CHECK (((pass_status)::text = ANY (ARRAY[('active'::character varying)::text, ('expired'::character varying)::text, ('revoked'::character varying)::text, ('deleted'::character varying)::text]))),
    CONSTRAINT wallet_passes_wallet_type_check CHECK (((wallet_type)::text = ANY (ARRAY[('apple'::character varying)::text, ('google'::character varying)::text])))
);


ALTER TABLE public.wallet_passes OWNER TO loyalty_user;

--
-- Name: wallet_passes_id_seq; Type: SEQUENCE; Schema: public; Owner: loyalty_user
--

CREATE SEQUENCE IF NOT EXISTS public.wallet_passes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.wallet_passes_id_seq OWNER TO loyalty_user;

--
-- Name: wallet_passes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: loyalty_user
--

ALTER SEQUENCE public.wallet_passes_id_seq OWNED BY public.wallet_passes.id;


--
-- Name: webhook_logs; Type: TABLE; Schema: public; Owner: loyalty_user
--

CREATE TABLE IF NOT EXISTS public.webhook_logs (
    public_id character varying(50) NOT NULL,
    webhook_event_id character varying(255) NOT NULL,
    event_type character varying(50) NOT NULL,
    payment_id character varying(50),
    moyasar_payment_id character varying(255),
    status character varying(20) DEFAULT 'received'::character varying NOT NULL,
    payload jsonb NOT NULL,
    signature text,
    signature_verified boolean DEFAULT false NOT NULL,
    processing_error text,
    processed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT webhook_logs_event_type_check CHECK (((event_type)::text = ANY (ARRAY[('payment.paid'::character varying)::text, ('payment.failed'::character varying)::text, ('payment.refunded'::character varying)::text, ('payment.authorized'::character varying)::text, ('payment.captured'::character varying)::text, ('other'::character varying)::text]))),
    CONSTRAINT webhook_logs_status_check CHECK (((status)::text = ANY (ARRAY[('received'::character varying)::text, ('processed'::character varying)::text, ('failed'::character varying)::text, ('duplicate'::character varying)::text])))
);


ALTER TABLE public.webhook_logs OWNER TO loyalty_user;

--
-- Name: COLUMN webhook_logs.webhook_event_id; Type: COMMENT; Schema: public; Owner: loyalty_user
--

COMMENT ON COLUMN public.webhook_logs.webhook_event_id IS 'Moyasar event ID for idempotency checks';


--
-- Name: COLUMN webhook_logs.event_type; Type: COMMENT; Schema: public; Owner: loyalty_user
--

COMMENT ON COLUMN public.webhook_logs.event_type IS 'Type of webhook event received';


--
-- Name: COLUMN webhook_logs.payment_id; Type: COMMENT; Schema: public; Owner: loyalty_user
--

COMMENT ON COLUMN public.webhook_logs.payment_id IS 'Associated payment record (if applicable)';


--
-- Name: COLUMN webhook_logs.moyasar_payment_id; Type: COMMENT; Schema: public; Owner: loyalty_user
--

COMMENT ON COLUMN public.webhook_logs.moyasar_payment_id IS 'Moyasar payment ID from webhook payload';


--
-- Name: COLUMN webhook_logs.status; Type: COMMENT; Schema: public; Owner: loyalty_user
--

COMMENT ON COLUMN public.webhook_logs.status IS 'Processing status of webhook';


--
-- Name: COLUMN webhook_logs.payload; Type: COMMENT; Schema: public; Owner: loyalty_user
--

COMMENT ON COLUMN public.webhook_logs.payload IS 'Full webhook payload from Moyasar';


--
-- Name: COLUMN webhook_logs.signature; Type: COMMENT; Schema: public; Owner: loyalty_user
--

COMMENT ON COLUMN public.webhook_logs.signature IS 'HMAC signature from webhook headers';


--
-- Name: COLUMN webhook_logs.signature_verified; Type: COMMENT; Schema: public; Owner: loyalty_user
--

COMMENT ON COLUMN public.webhook_logs.signature_verified IS 'Whether signature verification passed';


--
-- Name: COLUMN webhook_logs.processing_error; Type: COMMENT; Schema: public; Owner: loyalty_user
--

COMMENT ON COLUMN public.webhook_logs.processing_error IS 'Error message if processing failed';


--
-- Name: COLUMN webhook_logs.processed_at; Type: COMMENT; Schema: public; Owner: loyalty_user
--

COMMENT ON COLUMN public.webhook_logs.processed_at IS 'Timestamp when webhook was successfully processed';


--
-- Name: admin_sessions id; Type: DEFAULT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.admin_sessions ALTER COLUMN id SET DEFAULT nextval('public.admin_sessions_id_seq'::regclass);


--
-- Name: auto_engagement_configs id; Type: DEFAULT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.auto_engagement_configs ALTER COLUMN id SET DEFAULT nextval('public.auto_engagement_configs_id_seq'::regclass);


--
-- Name: branch_actions id; Type: DEFAULT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.branch_actions ALTER COLUMN id SET DEFAULT nextval('public.branch_actions_id_seq'::regclass);


--
-- Name: branches id; Type: DEFAULT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.branches ALTER COLUMN id SET DEFAULT nextval('public.branches_id_seq'::regclass);


--
-- Name: business_sessions id; Type: DEFAULT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.business_sessions ALTER COLUMN id SET DEFAULT nextval('public.business_sessions_id_seq'::regclass);


--
-- Name: businesses id; Type: DEFAULT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.businesses ALTER COLUMN id SET DEFAULT nextval('public.businesses_id_seq'::regclass);


--
-- Name: counters id; Type: DEFAULT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.counters ALTER COLUMN id SET DEFAULT nextval('public.counters_id_seq'::regclass);


--
-- Name: customer_cards id; Type: DEFAULT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.customer_cards ALTER COLUMN id SET DEFAULT nextval('public.customer_cards_id_seq'::regclass);


--
-- Name: customer_progress id; Type: DEFAULT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.customer_progress ALTER COLUMN id SET DEFAULT nextval('public.customer_progress_id_seq'::regclass);


--
-- Name: customer_segments id; Type: DEFAULT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.customer_segments ALTER COLUMN id SET DEFAULT nextval('public.customer_segments_id_seq'::regclass);


--
-- Name: customers id; Type: DEFAULT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.customers ALTER COLUMN id SET DEFAULT nextval('public.customers_id_seq'::regclass);


--
-- Name: invoices id; Type: DEFAULT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.invoices ALTER COLUMN id SET DEFAULT nextval('public.invoices_id_seq'::regclass);


--
-- Name: notification_campaigns id; Type: DEFAULT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.notification_campaigns ALTER COLUMN id SET DEFAULT nextval('public.notification_campaigns_id_seq'::regclass);


--
-- Name: offer_actions id; Type: DEFAULT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.offer_actions ALTER COLUMN id SET DEFAULT nextval('public.offer_actions_id_seq'::regclass);


--
-- Name: offers id; Type: DEFAULT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.offers ALTER COLUMN id SET DEFAULT nextval('public.offers_id_seq'::regclass);


--
-- Name: platform_admins id; Type: DEFAULT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.platform_admins ALTER COLUMN id SET DEFAULT nextval('public.platform_admins_id_seq'::regclass);


--
-- Name: receipts id; Type: DEFAULT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.receipts ALTER COLUMN id SET DEFAULT nextval('public.receipts_id_seq'::regclass);


--
-- Name: sale_items id; Type: DEFAULT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.sale_items ALTER COLUMN id SET DEFAULT nextval('public.sale_items_id_seq'::regclass);


--
-- Name: wallet_passes id; Type: DEFAULT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.wallet_passes ALTER COLUMN id SET DEFAULT nextval('public.wallet_passes_id_seq'::regclass);


--
-- Name: admin_sessions admin_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.admin_sessions
    ADD CONSTRAINT admin_sessions_pkey PRIMARY KEY (id);


--
-- Name: admin_sessions admin_sessions_session_token_key; Type: CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.admin_sessions
    ADD CONSTRAINT admin_sessions_session_token_key UNIQUE (session_token);


--
-- Name: auto_engagement_configs auto_engagement_configs_business_id_key; Type: CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.auto_engagement_configs
    ADD CONSTRAINT auto_engagement_configs_business_id_key UNIQUE (business_id);


--
-- Name: auto_engagement_configs auto_engagement_configs_config_id_key; Type: CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.auto_engagement_configs
    ADD CONSTRAINT auto_engagement_configs_config_id_key UNIQUE (config_id);


--
-- Name: auto_engagement_configs auto_engagement_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.auto_engagement_configs
    ADD CONSTRAINT auto_engagement_configs_pkey PRIMARY KEY (id);


--
-- Name: branch_actions branch_actions_pkey; Type: CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.branch_actions
    ADD CONSTRAINT branch_actions_pkey PRIMARY KEY (id);


--
-- Name: branches branches_pkey; Type: CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT branches_pkey PRIMARY KEY (id);


--
-- Name: branches branches_public_id_key; Type: CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT branches_public_id_key UNIQUE (public_id);


--
-- Name: business_sessions business_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.business_sessions
    ADD CONSTRAINT business_sessions_pkey PRIMARY KEY (id);


--
-- Name: business_sessions business_sessions_session_token_key; Type: CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.business_sessions
    ADD CONSTRAINT business_sessions_session_token_key UNIQUE (session_token);


--
-- Name: businesses businesses_email_key; Type: CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.businesses
    ADD CONSTRAINT businesses_email_key UNIQUE (email);


--
-- Name: businesses businesses_pkey; Type: CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.businesses
    ADD CONSTRAINT businesses_pkey PRIMARY KEY (id);


--
-- Name: businesses businesses_public_id_key; Type: CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.businesses
    ADD CONSTRAINT businesses_public_id_key UNIQUE (public_id);


--
-- Name: counters counters_pkey; Type: CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.counters
    ADD CONSTRAINT counters_pkey PRIMARY KEY (id);


--
-- Name: customer_cards customer_cards_customer_id_offer_id_key; Type: CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.customer_cards
    ADD CONSTRAINT customer_cards_customer_id_offer_id_key UNIQUE (customer_id, offer_id);


--
-- Name: customer_cards customer_cards_pkey; Type: CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.customer_cards
    ADD CONSTRAINT customer_cards_pkey PRIMARY KEY (id);


--
-- Name: customer_progress customer_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.customer_progress
    ADD CONSTRAINT customer_progress_pkey PRIMARY KEY (id);


--
-- Name: customer_progress customer_progress_wallet_pass_serial_key; Type: CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.customer_progress
    ADD CONSTRAINT customer_progress_wallet_pass_serial_key UNIQUE (wallet_pass_serial);


--
-- Name: customer_segments customer_segments_pkey; Type: CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.customer_segments
    ADD CONSTRAINT customer_segments_pkey PRIMARY KEY (id);


--
-- Name: customer_segments customer_segments_segment_id_key; Type: CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.customer_segments
    ADD CONSTRAINT customer_segments_segment_id_key UNIQUE (segment_id);


--
-- Name: customers customers_customer_id_key; Type: CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_customer_id_key UNIQUE (customer_id);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_invoice_number_key; Type: CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_invoice_number_key UNIQUE (invoice_number);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: notification_campaigns notification_campaigns_campaign_id_key; Type: CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.notification_campaigns
    ADD CONSTRAINT notification_campaigns_campaign_id_key UNIQUE (campaign_id);


--
-- Name: notification_campaigns notification_campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.notification_campaigns
    ADD CONSTRAINT notification_campaigns_pkey PRIMARY KEY (id);


--
-- Name: offer_actions offer_actions_pkey; Type: CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.offer_actions
    ADD CONSTRAINT offer_actions_pkey PRIMARY KEY (id);


--
-- Name: offers offers_pkey; Type: CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.offers
    ADD CONSTRAINT offers_pkey PRIMARY KEY (id);


--
-- Name: offers offers_public_id_key; Type: CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.offers
    ADD CONSTRAINT offers_public_id_key UNIQUE (public_id);


--
-- Name: payments payments_moyasar_payment_id_key; Type: CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_moyasar_payment_id_key UNIQUE (moyasar_payment_id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (public_id);


--
-- Name: platform_admins platform_admins_email_key; Type: CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.platform_admins
    ADD CONSTRAINT platform_admins_email_key UNIQUE (email);


--
-- Name: platform_admins platform_admins_pkey; Type: CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.platform_admins
    ADD CONSTRAINT platform_admins_pkey PRIMARY KEY (id);


--
-- Name: product_categories product_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.product_categories
    ADD CONSTRAINT product_categories_pkey PRIMARY KEY (public_id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (public_id);


--
-- Name: receipts receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_pkey PRIMARY KEY (id);


--
-- Name: receipts receipts_receipt_number_key; Type: CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_receipt_number_key UNIQUE (receipt_number);


--
-- Name: receipts receipts_sale_id_key; Type: CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_sale_id_key UNIQUE (sale_id);


--
-- Name: sale_items sale_items_pkey; Type: CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT sale_items_pkey PRIMARY KEY (id);


--
-- Name: sales sales_pkey; Type: CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_pkey PRIMARY KEY (public_id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (public_id);


--
-- Name: sales unique_business_sale_number; Type: CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT unique_business_sale_number UNIQUE (business_id, sale_number);


--
-- Name: wallet_passes unique_customer_offer_wallet; Type: CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.wallet_passes
    ADD CONSTRAINT unique_customer_offer_wallet UNIQUE (customer_id, offer_id, wallet_type);


--
-- Name: wallet_passes wallet_passes_pkey; Type: CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.wallet_passes
    ADD CONSTRAINT wallet_passes_pkey PRIMARY KEY (id);


--
-- Name: wallet_passes wallet_passes_wallet_object_id_key; Type: CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.wallet_passes
    ADD CONSTRAINT wallet_passes_wallet_object_id_key UNIQUE (wallet_object_id);


--
-- Name: wallet_passes wallet_passes_wallet_serial_key; Type: CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.wallet_passes
    ADD CONSTRAINT wallet_passes_wallet_serial_key UNIQUE (wallet_serial);


--
-- Name: webhook_logs webhook_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.webhook_logs
    ADD CONSTRAINT webhook_logs_pkey PRIMARY KEY (public_id);


--
-- Name: webhook_logs webhook_logs_webhook_event_id_key; Type: CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.webhook_logs
    ADD CONSTRAINT webhook_logs_webhook_event_id_key UNIQUE (webhook_event_id);


--
-- Name: business_sale_date_idx; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX business_sale_date_idx ON public.sales USING btree (business_id, sale_date);


--
-- Name: customer_progress_business_id; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX customer_progress_business_id ON public.customer_progress USING btree (business_id);


--
-- Name: customer_progress_is_completed; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX customer_progress_is_completed ON public.customer_progress USING btree (is_completed);


--
-- Name: customer_progress_offer_id; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX customer_progress_offer_id ON public.customer_progress USING btree (offer_id);


--
-- Name: customer_progress_secure_customer_id; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX customer_progress_secure_customer_id ON public.customer_progress USING btree (secure_customer_id);


--
-- Name: idx_admin_sessions_admin_id; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX idx_admin_sessions_admin_id ON public.admin_sessions USING btree (admin_id);


--
-- Name: idx_admin_sessions_expires_at; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX idx_admin_sessions_expires_at ON public.admin_sessions USING btree (expires_at);


--
-- Name: idx_admin_sessions_is_active; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX idx_admin_sessions_is_active ON public.admin_sessions USING btree (is_active);


--
-- Name: idx_admin_sessions_token; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX idx_admin_sessions_token ON public.admin_sessions USING btree (session_token);


--
-- Name: idx_auto_engagement_business_id; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE UNIQUE INDEX idx_auto_engagement_business_id ON public.auto_engagement_configs USING btree (business_id);


--
-- Name: idx_auto_engagement_config_id; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE UNIQUE INDEX idx_auto_engagement_config_id ON public.auto_engagement_configs USING btree (config_id);


--
-- Name: idx_auto_engagement_enabled; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX idx_auto_engagement_enabled ON public.auto_engagement_configs USING btree (enabled) WHERE (enabled = true);


--
-- Name: idx_auto_engagement_last_run; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX idx_auto_engagement_last_run ON public.auto_engagement_configs USING btree (last_run_at);


--
-- Name: idx_branch_actions_branch_id; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX idx_branch_actions_branch_id ON public.branch_actions USING btree (branch_id);


--
-- Name: idx_branch_actions_business_id; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX idx_branch_actions_business_id ON public.branch_actions USING btree (business_id);


--
-- Name: idx_branch_actions_type; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX idx_branch_actions_type ON public.branch_actions USING btree (action_type);


--
-- Name: idx_branches_business_id; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX idx_branches_business_id ON public.branches USING btree (business_id);


--
-- Name: idx_branches_city; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX idx_branches_city ON public.branches USING btree (city);


--
-- Name: idx_branches_is_main; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX idx_branches_is_main ON public.branches USING btree (is_main);


--
-- Name: idx_branches_public_id; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE UNIQUE INDEX idx_branches_public_id ON public.branches USING btree (public_id);


--
-- Name: idx_branches_status; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX idx_branches_status ON public.branches USING btree (status);


--
-- Name: idx_business_sessions_active; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX idx_business_sessions_active ON public.business_sessions USING btree (is_active);


--
-- Name: idx_business_sessions_business_id; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX idx_business_sessions_business_id ON public.business_sessions USING btree (business_id);


--
-- Name: idx_business_sessions_expires_at; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX idx_business_sessions_expires_at ON public.business_sessions USING btree (expires_at);


--
-- Name: idx_business_sessions_token; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX idx_business_sessions_token ON public.business_sessions USING btree (session_token);


--
-- Name: idx_business_sessions_validation; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX idx_business_sessions_validation ON public.business_sessions USING btree (session_token, business_id, is_active) WHERE (is_active = true);


--
-- Name: idx_businesses_plan_status; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX idx_businesses_plan_status ON public.businesses USING btree (current_plan, subscription_status);


--
-- Name: idx_businesses_public_id; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE UNIQUE INDEX idx_businesses_public_id ON public.businesses USING btree (public_id);


--
-- Name: idx_businesses_subscription_status; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX idx_businesses_subscription_status ON public.businesses USING btree (subscription_status);


--
-- Name: idx_businesses_trial_ends_at; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX idx_businesses_trial_ends_at ON public.businesses USING btree (trial_ends_at);


--
-- Name: idx_counters_type; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX idx_counters_type ON public.counters USING btree (counter_type);


--
-- Name: idx_counters_unique; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE UNIQUE INDEX idx_counters_unique ON public.counters USING btree (counter_type, year, business_id, branch_id);


--
-- Name: idx_customer_cards_customer_id; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX idx_customer_cards_customer_id ON public.customer_cards USING btree (customer_id);


--
-- Name: idx_customer_cards_lookup; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX idx_customer_cards_lookup ON public.customer_cards USING btree (customer_id, offer_id);


--
-- Name: idx_customer_cards_offer_id; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX idx_customer_cards_offer_id ON public.customer_cards USING btree (offer_id);


--
-- Name: idx_customer_segments_business_id; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX idx_customer_segments_business_id ON public.customer_segments USING btree (business_id);


--
-- Name: idx_customer_segments_last_notification; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX idx_customer_segments_last_notification ON public.customer_segments USING btree (last_notification_sent_at) WHERE (last_notification_sent_at IS NOT NULL);


--
-- Name: idx_customer_segments_segment_id; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE UNIQUE INDEX idx_customer_segments_segment_id ON public.customer_segments USING btree (segment_id);


--
-- Name: idx_customers_created_at; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX idx_customers_created_at ON public.customers USING btree (created_at);


--
-- Name: idx_customers_customer_id; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE UNIQUE INDEX idx_customers_customer_id ON public.customers USING btree (customer_id);


--
-- Name: idx_invoices_business_id; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX idx_invoices_business_id ON public.invoices USING btree (business_id);


--
-- Name: idx_invoices_due_date; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX idx_invoices_due_date ON public.invoices USING btree (due_date);


--
-- Name: idx_invoices_invoice_number; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX idx_invoices_invoice_number ON public.invoices USING btree (invoice_number);


--
-- Name: idx_invoices_issued_date; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX idx_invoices_issued_date ON public.invoices USING btree (issued_date);


--
-- Name: idx_invoices_payment_id; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX idx_invoices_payment_id ON public.invoices USING btree (payment_id);


--
-- Name: idx_invoices_status; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX idx_invoices_status ON public.invoices USING btree (status);


--
-- Name: idx_invoices_subscription_id; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX idx_invoices_subscription_id ON public.invoices USING btree (subscription_id);


--
-- Name: idx_notification_campaigns_business_id; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX idx_notification_campaigns_business_id ON public.notification_campaigns USING btree (business_id);


--
-- Name: idx_notification_campaigns_campaign_id; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE UNIQUE INDEX idx_notification_campaigns_campaign_id ON public.notification_campaigns USING btree (campaign_id);


--
-- Name: idx_notification_campaigns_campaign_type; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX idx_notification_campaigns_campaign_type ON public.notification_campaigns USING btree (campaign_type) WHERE (campaign_type IS NOT NULL);


--
-- Name: idx_notification_campaigns_linked_offer; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX idx_notification_campaigns_linked_offer ON public.notification_campaigns USING btree (linked_offer_id) WHERE (linked_offer_id IS NOT NULL);


--
-- Name: idx_offer_actions_offer_id; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX idx_offer_actions_offer_id ON public.offer_actions USING btree (offer_id);


--
-- Name: idx_offers_active_time; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX idx_offers_active_time ON public.offers USING btree (status, start_date, end_date) WHERE ((status)::text = 'active'::text);


--
-- Name: idx_offers_branch_id; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX idx_offers_branch_id ON public.offers USING btree (branch_id);


--
-- Name: idx_offers_business_id; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX idx_offers_business_id ON public.offers USING btree (business_id);


--
-- Name: idx_offers_business_status; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX idx_offers_business_status ON public.offers USING btree (business_id, status);


--
-- Name: idx_offers_public_id; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE UNIQUE INDEX idx_offers_public_id ON public.offers USING btree (public_id);


--
-- Name: idx_offers_status; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX idx_offers_status ON public.offers USING btree (status);


--
-- Name: idx_offers_time_limited; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX idx_offers_time_limited ON public.offers USING btree (is_time_limited, start_date, end_date);


--
-- Name: idx_payments_business_id; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX idx_payments_business_id ON public.payments USING btree (business_id);


--
-- Name: idx_payments_business_payment_date; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX idx_payments_business_payment_date ON public.payments USING btree (business_id, payment_date);


--
-- Name: idx_payments_moyasar_payment_id; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX idx_payments_moyasar_payment_id ON public.payments USING btree (moyasar_payment_id);


--
-- Name: idx_payments_payment_date; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX idx_payments_payment_date ON public.payments USING btree (payment_date);


--
-- Name: idx_payments_status; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX idx_payments_status ON public.payments USING btree (status);


--
-- Name: idx_payments_subscription_id; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX idx_payments_subscription_id ON public.payments USING btree (subscription_id);


--
-- Name: idx_platform_admins_email; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX idx_platform_admins_email ON public.platform_admins USING btree (email);


--
-- Name: idx_platform_admins_status; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX idx_platform_admins_status ON public.platform_admins USING btree (status);


--
-- Name: idx_subscriptions_business_id; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX idx_subscriptions_business_id ON public.subscriptions USING btree (business_id);


--
-- Name: idx_subscriptions_next_billing_date; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX idx_subscriptions_next_billing_date ON public.subscriptions USING btree (next_billing_date);


--
-- Name: idx_subscriptions_status; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX idx_subscriptions_status ON public.subscriptions USING btree (status);


--
-- Name: idx_subscriptions_trial_end_date; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX idx_subscriptions_trial_end_date ON public.subscriptions USING btree (trial_end_date);


--
-- Name: idx_wallet_passes_business; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX idx_wallet_passes_business ON public.wallet_passes USING btree (business_id);


--
-- Name: idx_wallet_passes_customer; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX idx_wallet_passes_customer ON public.wallet_passes USING btree (customer_id);


--
-- Name: idx_wallet_passes_progress; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX idx_wallet_passes_progress ON public.wallet_passes USING btree (progress_id);


--
-- Name: idx_wallet_passes_status; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX idx_wallet_passes_status ON public.wallet_passes USING btree (pass_status);


--
-- Name: idx_wallet_passes_wallet_type; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX idx_wallet_passes_wallet_type ON public.wallet_passes USING btree (wallet_type);


--
-- Name: product_categories_business_id; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX product_categories_business_id ON public.product_categories USING btree (business_id);


--
-- Name: product_categories_display_order; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX product_categories_display_order ON public.product_categories USING btree (display_order);


--
-- Name: product_categories_status; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX product_categories_status ON public.product_categories USING btree (status);


--
-- Name: products_branch_id; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX products_branch_id ON public.products USING btree (branch_id);


--
-- Name: products_business_id; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX products_business_id ON public.products USING btree (business_id);


--
-- Name: products_category_id; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX products_category_id ON public.products USING btree (category_id);


--
-- Name: products_sku; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX products_sku ON public.products USING btree (sku);


--
-- Name: products_status; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX products_status ON public.products USING btree (status);


--
-- Name: receipts_printed_at; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX receipts_printed_at ON public.receipts USING btree (printed_at);


--
-- Name: receipts_receipt_number; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX receipts_receipt_number ON public.receipts USING btree (receipt_number);


--
-- Name: receipts_sale_id; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX receipts_sale_id ON public.receipts USING btree (sale_id);


--
-- Name: sale_items_product_id; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX sale_items_product_id ON public.sale_items USING btree (product_id);


--
-- Name: sale_items_sale_id; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX sale_items_sale_id ON public.sale_items USING btree (sale_id);


--
-- Name: sale_product_idx; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX sale_product_idx ON public.sale_items USING btree (sale_id, product_id);


--
-- Name: sales_branch_id; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX sales_branch_id ON public.sales USING btree (branch_id);


--
-- Name: sales_business_id; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX sales_business_id ON public.sales USING btree (business_id);


--
-- Name: sales_customer_id; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX sales_customer_id ON public.sales USING btree (customer_id);


--
-- Name: sales_payment_method; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX sales_payment_method ON public.sales USING btree (payment_method);


--
-- Name: sales_sale_date; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX sales_sale_date ON public.sales USING btree (sale_date);


--
-- Name: sales_status; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX sales_status ON public.sales USING btree (status);


--
-- Name: unique_business_sku; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE UNIQUE INDEX unique_business_sku ON public.products USING btree (business_id, sku) WHERE (sku IS NOT NULL);


--
-- Name: unique_customer_offer_progress; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE UNIQUE INDEX unique_customer_offer_progress ON public.customer_progress USING btree (customer_id, offer_id);


--
-- Name: webhook_logs_created_at_idx; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX webhook_logs_created_at_idx ON public.webhook_logs USING btree (created_at);


--
-- Name: webhook_logs_event_id_idx; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE UNIQUE INDEX webhook_logs_event_id_idx ON public.webhook_logs USING btree (webhook_event_id);


--
-- Name: webhook_logs_event_type_idx; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX webhook_logs_event_type_idx ON public.webhook_logs USING btree (event_type);


--
-- Name: webhook_logs_moyasar_payment_id_idx; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX webhook_logs_moyasar_payment_id_idx ON public.webhook_logs USING btree (moyasar_payment_id);


--
-- Name: webhook_logs_payment_id_idx; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX webhook_logs_payment_id_idx ON public.webhook_logs USING btree (payment_id);


--
-- Name: webhook_logs_status_idx; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX webhook_logs_status_idx ON public.webhook_logs USING btree (status);


--
-- Name: branches trigger_ensure_main_branch; Type: TRIGGER; Schema: public; Owner: loyalty_user
--

CREATE TRIGGER trigger_ensure_main_branch BEFORE INSERT OR UPDATE ON public.branches FOR EACH ROW EXECUTE FUNCTION public.ensure_main_branch();


--
-- Name: branches trigger_prevent_main_branch_deletion; Type: TRIGGER; Schema: public; Owner: loyalty_user
--

CREATE TRIGGER trigger_prevent_main_branch_deletion BEFORE DELETE ON public.branches FOR EACH ROW EXECUTE FUNCTION public.prevent_main_branch_deletion();


--
-- Name: customer_cards trigger_update_branch_stats; Type: TRIGGER; Schema: public; Owner: loyalty_user
--

CREATE TRIGGER trigger_update_branch_stats AFTER INSERT OR DELETE ON public.customer_cards FOR EACH ROW EXECUTE FUNCTION public.update_branch_stats();


--
-- Name: customer_cards trigger_update_offer_stats; Type: TRIGGER; Schema: public; Owner: loyalty_user
--

CREATE TRIGGER trigger_update_offer_stats AFTER INSERT OR DELETE OR UPDATE ON public.customer_cards FOR EACH ROW EXECUTE FUNCTION public.update_offer_stats();


--
-- Name: offers trigger_update_offer_status; Type: TRIGGER; Schema: public; Owner: loyalty_user
--

CREATE TRIGGER trigger_update_offer_status BEFORE INSERT OR UPDATE ON public.offers FOR EACH ROW EXECUTE FUNCTION public.update_offer_status();


--
-- Name: admin_sessions admin_sessions_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.admin_sessions
    ADD CONSTRAINT admin_sessions_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.platform_admins(id) ON DELETE CASCADE;


--
-- Name: branch_actions branch_actions_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.branch_actions
    ADD CONSTRAINT branch_actions_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


--
-- Name: branch_actions branch_actions_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.branch_actions
    ADD CONSTRAINT branch_actions_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: branches branches_business_id_public_fk; Type: FK CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT branches_business_id_public_fk FOREIGN KEY (business_id) REFERENCES public.businesses(public_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: business_sessions business_sessions_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.business_sessions
    ADD CONSTRAINT business_sessions_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(public_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: customer_cards customer_cards_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.customer_cards
    ADD CONSTRAINT customer_cards_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: customer_cards customer_cards_offer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.customer_cards
    ADD CONSTRAINT customer_cards_offer_id_fkey FOREIGN KEY (offer_id) REFERENCES public.offers(id) ON DELETE CASCADE;


--
-- Name: customer_progress customer_progress_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.customer_progress
    ADD CONSTRAINT customer_progress_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(public_id) ON DELETE CASCADE;


--
-- Name: customer_progress customer_progress_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.customer_progress
    ADD CONSTRAINT customer_progress_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id) ON DELETE CASCADE;


--
-- Name: customer_progress customer_progress_fulfilled_by_branch_fkey; Type: FK CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.customer_progress
    ADD CONSTRAINT customer_progress_fulfilled_by_branch_fkey FOREIGN KEY (fulfilled_by_branch) REFERENCES public.branches(public_id);


--
-- Name: customer_progress customer_progress_offer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.customer_progress
    ADD CONSTRAINT customer_progress_offer_id_fkey FOREIGN KEY (offer_id) REFERENCES public.offers(public_id) ON DELETE CASCADE;


--
-- Name: customers customers_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(public_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: auto_engagement_configs fk_auto_engagement_business; Type: FK CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.auto_engagement_configs
    ADD CONSTRAINT fk_auto_engagement_business FOREIGN KEY (business_id) REFERENCES public.businesses(public_id) ON DELETE CASCADE;


--
-- Name: notification_campaigns fk_notification_campaigns_offer; Type: FK CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.notification_campaigns
    ADD CONSTRAINT fk_notification_campaigns_offer FOREIGN KEY (linked_offer_id) REFERENCES public.offers(public_id) ON DELETE SET NULL;


--
-- Name: wallet_passes fk_wallet_passes_business; Type: FK CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.wallet_passes
    ADD CONSTRAINT fk_wallet_passes_business FOREIGN KEY (business_id) REFERENCES public.businesses(public_id) ON DELETE CASCADE;


--
-- Name: wallet_passes fk_wallet_passes_customer; Type: FK CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.wallet_passes
    ADD CONSTRAINT fk_wallet_passes_customer FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id) ON DELETE CASCADE;


--
-- Name: wallet_passes fk_wallet_passes_offer; Type: FK CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.wallet_passes
    ADD CONSTRAINT fk_wallet_passes_offer FOREIGN KEY (offer_id) REFERENCES public.offers(public_id) ON DELETE CASCADE;


--
-- Name: wallet_passes fk_wallet_passes_progress; Type: FK CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.wallet_passes
    ADD CONSTRAINT fk_wallet_passes_progress FOREIGN KEY (progress_id) REFERENCES public.customer_progress(id) ON DELETE CASCADE;


--
-- Name: webhook_logs fk_webhook_logs_payment; Type: FK CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.webhook_logs
    ADD CONSTRAINT fk_webhook_logs_payment FOREIGN KEY (payment_id) REFERENCES public.payments(public_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: invoices invoices_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(public_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: invoices invoices_payment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(public_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: invoices invoices_subscription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(public_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: offer_actions offer_actions_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.offer_actions
    ADD CONSTRAINT offer_actions_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: offer_actions offer_actions_offer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.offer_actions
    ADD CONSTRAINT offer_actions_offer_id_fkey FOREIGN KEY (offer_id) REFERENCES public.offers(id) ON DELETE CASCADE;


--
-- Name: offers offers_business_id_public_fk; Type: FK CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.offers
    ADD CONSTRAINT offers_business_id_public_fk FOREIGN KEY (business_id) REFERENCES public.businesses(public_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: payments payments_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(public_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: payments payments_subscription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(public_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: platform_admins platform_admins_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.platform_admins
    ADD CONSTRAINT platform_admins_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.platform_admins(id);


--
-- Name: product_categories product_categories_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.product_categories
    ADD CONSTRAINT product_categories_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(public_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: products products_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(public_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: products products_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(public_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: products products_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.product_categories(public_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: receipts receipts_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales(public_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: sale_items sale_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT sale_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(public_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sale_items sale_items_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT sale_items_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales(public_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: sales sales_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(public_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: sales sales_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(public_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: sales sales_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: subscriptions subscriptions_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(public_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: webhook_logs webhook_logs_payment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.webhook_logs
    ADD CONSTRAINT webhook_logs_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(public_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict t9r5yi6bdEZltuho1a0xppcBjxzj8EEUg096NK0qwlBEFjVRdsWtiv1hVdz9YcG


--
-- Name: offer_card_designs; Type: TABLE; Schema: public; Owner: loyalty_user
--

CREATE TABLE public.offer_card_designs (
    id SERIAL PRIMARY KEY,
    offer_id VARCHAR(50) NOT NULL,
    business_id VARCHAR(50) NOT NULL,
    logo_url VARCHAR(500),
    logo_google_url VARCHAR(500),
    logo_apple_url VARCHAR(500),
    hero_image_url VARCHAR(500),
    background_color VARCHAR(7) DEFAULT '#3B82F6' NOT NULL,
    foreground_color VARCHAR(7) DEFAULT '#FFFFFF' NOT NULL,
    label_color VARCHAR(7) DEFAULT '#E0F2FE' NOT NULL,
    stamp_icon VARCHAR(10) DEFAULT '⭐',
    stamp_display_type VARCHAR(10) DEFAULT 'icon' CHECK (stamp_display_type IN ('icon', 'logo')),
    progress_display_style VARCHAR(20) DEFAULT 'bar',
    field_labels JSONB DEFAULT '{}',
    google_wallet_config JSONB DEFAULT '{}',
    apple_wallet_config JSONB DEFAULT '{}',
    template_id VARCHAR(50),
    is_custom BOOLEAN DEFAULT false,
    version INTEGER DEFAULT 1,
    contrast_score DECIMAL(4,2),
    validation_status VARCHAR(20) DEFAULT 'pending',
    validation_errors JSONB DEFAULT '[]',
    logo_file_size INTEGER,
    hero_file_size INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_applied_at TIMESTAMP,
    CONSTRAINT offer_card_designs_progress_display_style_check CHECK (progress_display_style IN ('bar', 'grid', 'circular')),
    CONSTRAINT offer_card_designs_validation_status_check CHECK (validation_status IN ('valid', 'warning', 'error', 'pending')),
    CONSTRAINT unique_offer_design UNIQUE (offer_id)
);


ALTER TABLE public.offer_card_designs OWNER TO loyalty_user;

--
-- Name: idx_offer_card_designs_business; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX idx_offer_card_designs_business ON public.offer_card_designs USING btree (business_id);


--
-- Name: idx_offer_card_designs_template; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX idx_offer_card_designs_template ON public.offer_card_designs USING btree (template_id);


--
-- Name: idx_offer_card_designs_validation; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX idx_offer_card_designs_validation ON public.offer_card_designs USING btree (validation_status);


--
-- Name: idx_offer_card_designs_created; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX idx_offer_card_designs_created ON public.offer_card_designs USING btree (created_at DESC);


--
-- Name: offer_card_designs fk_offer_card_designs_business; Type: FK CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.offer_card_designs
    ADD CONSTRAINT fk_offer_card_designs_business FOREIGN KEY (business_id) REFERENCES public.businesses(public_id) ON DELETE CASCADE;


--
-- Name: offer_card_designs fk_offer_card_designs_offer; Type: FK CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.offer_card_designs
    ADD CONSTRAINT fk_offer_card_designs_offer FOREIGN KEY (offer_id) REFERENCES public.offers(public_id) ON DELETE CASCADE;


--
-- Name: product_categories; Type: TABLE; Schema: public; Owner: loyalty_user
--

CREATE TABLE public.product_categories (
    public_id VARCHAR(50) PRIMARY KEY,
    business_id VARCHAR(50) NOT NULL REFERENCES public.businesses(public_id) ON DELETE CASCADE ON UPDATE CASCADE,
    name VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255),
    description TEXT,
    display_order INTEGER DEFAULT 0 NOT NULL,
    status VARCHAR(20) DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'inactive')),
    product_count INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

ALTER TABLE public.product_categories OWNER TO loyalty_user;

CREATE INDEX idx_product_categories_business ON public.product_categories(business_id);
CREATE INDEX idx_product_categories_status ON public.product_categories(status);
CREATE INDEX idx_product_categories_order ON public.product_categories(display_order);


--
-- Name: products; Type: TABLE; Schema: public; Owner: loyalty_user
--

CREATE TABLE public.products (
    public_id VARCHAR(50) PRIMARY KEY,
    business_id VARCHAR(50) NOT NULL REFERENCES public.businesses(public_id) ON DELETE CASCADE ON UPDATE CASCADE,
    branch_id VARCHAR(50) REFERENCES public.branches(public_id) ON DELETE SET NULL ON UPDATE CASCADE,
    category_id VARCHAR(50) REFERENCES public.product_categories(public_id) ON DELETE SET NULL ON UPDATE CASCADE,
    name VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255),
    description TEXT,
    sku VARCHAR(100),
    price DECIMAL(10, 2) NOT NULL,
    cost DECIMAL(10, 2),
    tax_rate DECIMAL(5, 2) DEFAULT 15.00 NOT NULL,
    tax_included BOOLEAN DEFAULT false NOT NULL,
    status VARCHAR(20) DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'inactive', 'out_of_stock')),
    image_url VARCHAR(500),
    display_order INTEGER DEFAULT 0 NOT NULL,
    total_sold INTEGER DEFAULT 0 NOT NULL,
    total_revenue DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

ALTER TABLE public.products OWNER TO loyalty_user;

CREATE INDEX idx_products_business ON public.products(business_id);
CREATE INDEX idx_products_branch ON public.products(branch_id);
CREATE INDEX idx_products_category ON public.products(category_id);
CREATE INDEX idx_products_status ON public.products(status);
CREATE INDEX idx_products_sku ON public.products(sku);
CREATE UNIQUE INDEX unique_business_sku ON public.products (business_id, sku) WHERE sku IS NOT NULL;


--
-- Name: sales; Type: TABLE; Schema: public; Owner: loyalty_user
--

CREATE TABLE public.sales (
    public_id VARCHAR(50) PRIMARY KEY,
    sale_number VARCHAR(50) NOT NULL,
    business_id VARCHAR(50) NOT NULL REFERENCES public.businesses(public_id) ON DELETE CASCADE ON UPDATE CASCADE,
    branch_id VARCHAR(50) NOT NULL REFERENCES public.branches(public_id) ON DELETE CASCADE ON UPDATE CASCADE,
    customer_id VARCHAR(50) REFERENCES public.customers(customer_id) ON DELETE SET NULL ON UPDATE CASCADE,
    subtotal DECIMAL(10, 2) NOT NULL,
    tax_amount DECIMAL(10, 2) NOT NULL,
    discount_amount DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('cash', 'card', 'gift_offer', 'mixed')),
    payment_details JSONB,
    status VARCHAR(20) DEFAULT 'completed' NOT NULL CHECK (status IN ('completed', 'cancelled', 'refunded')),
    sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    notes TEXT,
    loyalty_discount_amount DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
    loyalty_redeemed BOOLEAN DEFAULT false NOT NULL,
    created_by_manager VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT unique_business_sale_number UNIQUE (business_id, sale_number)
);

ALTER TABLE public.sales OWNER TO loyalty_user;

CREATE INDEX idx_sales_business ON public.sales(business_id);
CREATE INDEX idx_sales_branch ON public.sales(branch_id);
CREATE INDEX idx_sales_customer ON public.sales(customer_id);
CREATE INDEX idx_sales_date ON public.sales(sale_date);
CREATE INDEX idx_sales_status ON public.sales(status);
CREATE INDEX idx_sales_payment ON public.sales(payment_method);
CREATE INDEX idx_sales_number ON public.sales(sale_number);
CREATE INDEX business_sale_date_idx ON public.sales(business_id, sale_date);


--
-- Name: sale_items; Type: TABLE; Schema: public; Owner: loyalty_user
--

CREATE TABLE public.sale_items (
    id SERIAL PRIMARY KEY,
    sale_id VARCHAR(50) NOT NULL REFERENCES public.sales(public_id) ON DELETE CASCADE ON UPDATE CASCADE,
    product_id VARCHAR(50) NOT NULL REFERENCES public.products(public_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    product_name VARCHAR(255) NOT NULL,
    product_sku VARCHAR(100),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    tax_rate DECIMAL(5, 2) NOT NULL,
    tax_amount DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    total DECIMAL(10, 2) NOT NULL,
    discount_amount DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

ALTER TABLE public.sale_items OWNER TO loyalty_user;

CREATE INDEX idx_sale_items_sale ON public.sale_items(sale_id);
CREATE INDEX idx_sale_items_product ON public.sale_items(product_id);
CREATE INDEX sale_product_idx ON public.sale_items(sale_id, product_id);


--
-- Name: receipts; Type: TABLE; Schema: public; Owner: loyalty_user
--

CREATE TABLE public.receipts (
    id SERIAL PRIMARY KEY,
    sale_id VARCHAR(50) NOT NULL UNIQUE REFERENCES public.sales(public_id) ON DELETE CASCADE ON UPDATE CASCADE,
    receipt_number VARCHAR(50) NOT NULL UNIQUE,
    format VARCHAR(20) NOT NULL CHECK (format IN ('thermal', 'a4', 'digital')),
    content_json JSONB NOT NULL,
    printed_at TIMESTAMP,
    emailed_at TIMESTAMP,
    email_recipient VARCHAR(255),
    print_count INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

ALTER TABLE public.receipts OWNER TO loyalty_user;

CREATE INDEX idx_receipts_sale ON public.receipts(sale_id);
CREATE INDEX idx_receipts_number ON public.receipts(receipt_number);
CREATE INDEX idx_receipts_printed ON public.receipts(printed_at);


--
-- Name: wallet_passes_indexes; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX idx_wallet_passes_customer ON public.wallet_passes(customer_id);
CREATE INDEX idx_wallet_passes_progress ON public.wallet_passes(progress_id);
CREATE INDEX idx_wallet_passes_business ON public.wallet_passes(business_id);
CREATE INDEX idx_wallet_passes_wallet_type ON public.wallet_passes(wallet_type);
CREATE INDEX idx_wallet_passes_status ON public.wallet_passes(pass_status);
CREATE INDEX idx_wallet_passes_auth_token ON public.wallet_passes(authentication_token);
CREATE INDEX idx_wallet_passes_updated_tag ON public.wallet_passes(last_updated_tag);

--
-- Name: devices_indexes; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX idx_devices_library_id ON public.devices(device_library_identifier);
CREATE INDEX idx_devices_push_token ON public.devices(push_token);

--
-- Name: device_registrations_indexes; Type: INDEX; Schema: public; Owner: loyalty_user
--

CREATE INDEX idx_device_registrations_device ON public.device_registrations(device_id);
CREATE INDEX idx_device_registrations_wallet_pass ON public.device_registrations(wallet_pass_id);


--
-- Name: wallet_passes_fks; Type: FK CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.wallet_passes
    ADD CONSTRAINT fk_wallet_passes_customer FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id) ON DELETE CASCADE;

ALTER TABLE ONLY public.wallet_passes
    ADD CONSTRAINT fk_wallet_passes_progress FOREIGN KEY (progress_id) REFERENCES public.customer_progress(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.wallet_passes
    ADD CONSTRAINT fk_wallet_passes_business FOREIGN KEY (business_id) REFERENCES public.businesses(public_id) ON DELETE CASCADE;

ALTER TABLE ONLY public.wallet_passes
    ADD CONSTRAINT fk_wallet_passes_offer FOREIGN KEY (offer_id) REFERENCES public.offers(public_id) ON DELETE CASCADE;


--
-- Name: device_registrations_fks; Type: FK CONSTRAINT; Schema: public; Owner: loyalty_user
--

ALTER TABLE ONLY public.device_registrations
    ADD CONSTRAINT fk_device_registrations_device FOREIGN KEY (device_id) REFERENCES public.devices(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.device_registrations
    ADD CONSTRAINT fk_device_registrations_wallet_pass FOREIGN KEY (wallet_pass_id) REFERENCES public.wallet_passes(id) ON DELETE CASCADE;

