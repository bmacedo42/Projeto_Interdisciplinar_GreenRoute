
-- GREENROUTE - SCRIPT COMPLETO DA BASE DE DADOS


CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        email,
        name
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(
            NEW.raw_user_meta_data ->> 'name',
            ''
        )
    );

    RETURN NEW;
END;
$$;

-- TABELA: profiles
CREATE TABLE public.profiles (
    id UUID NOT NULL,
    email TEXT NOT NULL,
    name TEXT NULL,
    avatar_url TEXT NULL,
    bio TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    role TEXT DEFAULT 'user',
    CONSTRAINT profiles_pkey PRIMARY KEY (id),
    CONSTRAINT profiles_email_key UNIQUE (email),
    CONSTRAINT profiles_id_fkey
        FOREIGN KEY (id)
        REFERENCES auth.users(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_profiles_email ON public.profiles(email);

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- TABELA: favorites
CREATE TABLE public.favorites (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    origin TEXT NOT NULL,
    destination TEXT NOT NULL,
    transport TEXT NOT NULL,
    notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    destination_lat NUMERIC(10,7) NULL,
    destination_lng NUMERIC(10,7) NULL,
    CONSTRAINT favorites_pkey PRIMARY KEY (id),
    CONSTRAINT favorites_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES profiles(id)
        ON DELETE CASCADE
);

CREATE UNIQUE INDEX unique_favorite_route
ON public.favorites (user_id, origin, destination, transport);

CREATE INDEX idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX idx_favorites_created_at ON public.favorites(created_at DESC);

CREATE TRIGGER update_favorites_updated_at
BEFORE UPDATE ON favorites
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- TABELA: search_history
CREATE TABLE public.search_history (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    origin TEXT NOT NULL,
    destination TEXT NOT NULL,
    transport TEXT NOT NULL,
    distance NUMERIC(10,2) NULL,
    time_minutes INTEGER NULL,
    co2_emissions NUMERIC(10,3) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT search_history_pkey PRIMARY KEY (id),
    CONSTRAINT search_history_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES profiles(id)
        ON DELETE CASCADE,
    CONSTRAINT search_history_distance_check CHECK (distance IS NULL OR distance >= 0),
    CONSTRAINT search_history_time_minutes_check CHECK (time_minutes IS NULL OR time_minutes >= 0),
    CONSTRAINT search_history_co2_emissions_check CHECK (co2_emissions IS NULL OR co2_emissions >= 0)
);

CREATE INDEX idx_search_history_user_id ON public.search_history(user_id);
CREATE INDEX idx_search_history_created_at ON public.search_history(created_at DESC);

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION handle_new_user();
