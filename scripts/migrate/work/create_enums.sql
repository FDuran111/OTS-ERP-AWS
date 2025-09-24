
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'ChangeOrderStatus'
  ) THEN
    CREATE TYPE public."ChangeOrderStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
    RAISE NOTICE 'Created type: ChangeOrderStatus';
  ELSE
    RAISE NOTICE 'Type already exists: ChangeOrderStatus';
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'ChangeOrderStatus' 
    AND e.enumlabel = 'PENDING'
  ) THEN
    ALTER TYPE public."ChangeOrderStatus" ADD VALUE IF NOT EXISTS 'PENDING';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'ChangeOrderStatus' 
    AND e.enumlabel = 'APPROVED'
  ) THEN
    ALTER TYPE public."ChangeOrderStatus" ADD VALUE IF NOT EXISTS 'APPROVED';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'ChangeOrderStatus' 
    AND e.enumlabel = 'REJECTED'
  ) THEN
    ALTER TYPE public."ChangeOrderStatus" ADD VALUE IF NOT EXISTS 'REJECTED';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;


DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'InvoiceStatus'
  ) THEN
    CREATE TYPE public."InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED');
    RAISE NOTICE 'Created type: InvoiceStatus';
  ELSE
    RAISE NOTICE 'Type already exists: InvoiceStatus';
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'InvoiceStatus' 
    AND e.enumlabel = 'DRAFT'
  ) THEN
    ALTER TYPE public."InvoiceStatus" ADD VALUE IF NOT EXISTS 'DRAFT';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'InvoiceStatus' 
    AND e.enumlabel = 'SENT'
  ) THEN
    ALTER TYPE public."InvoiceStatus" ADD VALUE IF NOT EXISTS 'SENT';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'InvoiceStatus' 
    AND e.enumlabel = 'PAID'
  ) THEN
    ALTER TYPE public."InvoiceStatus" ADD VALUE IF NOT EXISTS 'PAID';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'InvoiceStatus' 
    AND e.enumlabel = 'OVERDUE'
  ) THEN
    ALTER TYPE public."InvoiceStatus" ADD VALUE IF NOT EXISTS 'OVERDUE';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'InvoiceStatus' 
    AND e.enumlabel = 'CANCELLED'
  ) THEN
    ALTER TYPE public."InvoiceStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;


DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'JobPhaseName'
  ) THEN
    CREATE TYPE public."JobPhaseName" AS ENUM ('UG', 'RI', 'FN');
    RAISE NOTICE 'Created type: JobPhaseName';
  ELSE
    RAISE NOTICE 'Type already exists: JobPhaseName';
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'JobPhaseName' 
    AND e.enumlabel = 'UG'
  ) THEN
    ALTER TYPE public."JobPhaseName" ADD VALUE IF NOT EXISTS 'UG';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'JobPhaseName' 
    AND e.enumlabel = 'RI'
  ) THEN
    ALTER TYPE public."JobPhaseName" ADD VALUE IF NOT EXISTS 'RI';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'JobPhaseName' 
    AND e.enumlabel = 'FN'
  ) THEN
    ALTER TYPE public."JobPhaseName" ADD VALUE IF NOT EXISTS 'FN';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;


DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'JobStatus'
  ) THEN
    CREATE TYPE public."JobStatus" AS ENUM ('ESTIMATE', 'SCHEDULED', 'DISPATCHED', 'IN_PROGRESS', 'COMPLETED', 'BILLED', 'CANCELLED');
    RAISE NOTICE 'Created type: JobStatus';
  ELSE
    RAISE NOTICE 'Type already exists: JobStatus';
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'JobStatus' 
    AND e.enumlabel = 'ESTIMATE'
  ) THEN
    ALTER TYPE public."JobStatus" ADD VALUE IF NOT EXISTS 'ESTIMATE';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'JobStatus' 
    AND e.enumlabel = 'SCHEDULED'
  ) THEN
    ALTER TYPE public."JobStatus" ADD VALUE IF NOT EXISTS 'SCHEDULED';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'JobStatus' 
    AND e.enumlabel = 'DISPATCHED'
  ) THEN
    ALTER TYPE public."JobStatus" ADD VALUE IF NOT EXISTS 'DISPATCHED';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'JobStatus' 
    AND e.enumlabel = 'IN_PROGRESS'
  ) THEN
    ALTER TYPE public."JobStatus" ADD VALUE IF NOT EXISTS 'IN_PROGRESS';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'JobStatus' 
    AND e.enumlabel = 'COMPLETED'
  ) THEN
    ALTER TYPE public."JobStatus" ADD VALUE IF NOT EXISTS 'COMPLETED';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'JobStatus' 
    AND e.enumlabel = 'BILLED'
  ) THEN
    ALTER TYPE public."JobStatus" ADD VALUE IF NOT EXISTS 'BILLED';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'JobStatus' 
    AND e.enumlabel = 'CANCELLED'
  ) THEN
    ALTER TYPE public."JobStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;


DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'JobType'
  ) THEN
    CREATE TYPE public."JobType" AS ENUM ('SERVICE_CALL', 'COMMERCIAL_PROJECT', 'INSTALLATION');
    RAISE NOTICE 'Created type: JobType';
  ELSE
    RAISE NOTICE 'Type already exists: JobType';
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'JobType' 
    AND e.enumlabel = 'SERVICE_CALL'
  ) THEN
    ALTER TYPE public."JobType" ADD VALUE IF NOT EXISTS 'SERVICE_CALL';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'JobType' 
    AND e.enumlabel = 'COMMERCIAL_PROJECT'
  ) THEN
    ALTER TYPE public."JobType" ADD VALUE IF NOT EXISTS 'COMMERCIAL_PROJECT';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'JobType' 
    AND e.enumlabel = 'INSTALLATION'
  ) THEN
    ALTER TYPE public."JobType" ADD VALUE IF NOT EXISTS 'INSTALLATION';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;


DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'LeadSource'
  ) THEN
    CREATE TYPE public."LeadSource" AS ENUM ('WEBSITE', 'REFERRAL', 'GOOGLE_ADS', 'FACEBOOK', 'YELLOW_PAGES', 'WORD_OF_MOUTH', 'REPEAT_CUSTOMER', 'OTHER');
    RAISE NOTICE 'Created type: LeadSource';
  ELSE
    RAISE NOTICE 'Type already exists: LeadSource';
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'LeadSource' 
    AND e.enumlabel = 'WEBSITE'
  ) THEN
    ALTER TYPE public."LeadSource" ADD VALUE IF NOT EXISTS 'WEBSITE';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'LeadSource' 
    AND e.enumlabel = 'REFERRAL'
  ) THEN
    ALTER TYPE public."LeadSource" ADD VALUE IF NOT EXISTS 'REFERRAL';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'LeadSource' 
    AND e.enumlabel = 'GOOGLE_ADS'
  ) THEN
    ALTER TYPE public."LeadSource" ADD VALUE IF NOT EXISTS 'GOOGLE_ADS';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'LeadSource' 
    AND e.enumlabel = 'FACEBOOK'
  ) THEN
    ALTER TYPE public."LeadSource" ADD VALUE IF NOT EXISTS 'FACEBOOK';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'LeadSource' 
    AND e.enumlabel = 'YELLOW_PAGES'
  ) THEN
    ALTER TYPE public."LeadSource" ADD VALUE IF NOT EXISTS 'YELLOW_PAGES';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'LeadSource' 
    AND e.enumlabel = 'WORD_OF_MOUTH'
  ) THEN
    ALTER TYPE public."LeadSource" ADD VALUE IF NOT EXISTS 'WORD_OF_MOUTH';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'LeadSource' 
    AND e.enumlabel = 'REPEAT_CUSTOMER'
  ) THEN
    ALTER TYPE public."LeadSource" ADD VALUE IF NOT EXISTS 'REPEAT_CUSTOMER';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'LeadSource' 
    AND e.enumlabel = 'OTHER'
  ) THEN
    ALTER TYPE public."LeadSource" ADD VALUE IF NOT EXISTS 'OTHER';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;


DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'LeadStatus'
  ) THEN
    CREATE TYPE public."LeadStatus" AS ENUM ('COLD_LEAD', 'WARM_LEAD', 'ESTIMATE_REQUESTED', 'ESTIMATE_SENT', 'ESTIMATE_APPROVED', 'JOB_SCHEDULED', 'JOB_IN_PROGRESS', 'JOB_COMPLETED', 'INVOICED', 'PAID', 'LOST', 'FOLLOW_UP_REQUIRED');
    RAISE NOTICE 'Created type: LeadStatus';
  ELSE
    RAISE NOTICE 'Type already exists: LeadStatus';
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'LeadStatus' 
    AND e.enumlabel = 'COLD_LEAD'
  ) THEN
    ALTER TYPE public."LeadStatus" ADD VALUE IF NOT EXISTS 'COLD_LEAD';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'LeadStatus' 
    AND e.enumlabel = 'WARM_LEAD'
  ) THEN
    ALTER TYPE public."LeadStatus" ADD VALUE IF NOT EXISTS 'WARM_LEAD';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'LeadStatus' 
    AND e.enumlabel = 'ESTIMATE_REQUESTED'
  ) THEN
    ALTER TYPE public."LeadStatus" ADD VALUE IF NOT EXISTS 'ESTIMATE_REQUESTED';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'LeadStatus' 
    AND e.enumlabel = 'ESTIMATE_SENT'
  ) THEN
    ALTER TYPE public."LeadStatus" ADD VALUE IF NOT EXISTS 'ESTIMATE_SENT';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'LeadStatus' 
    AND e.enumlabel = 'ESTIMATE_APPROVED'
  ) THEN
    ALTER TYPE public."LeadStatus" ADD VALUE IF NOT EXISTS 'ESTIMATE_APPROVED';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'LeadStatus' 
    AND e.enumlabel = 'JOB_SCHEDULED'
  ) THEN
    ALTER TYPE public."LeadStatus" ADD VALUE IF NOT EXISTS 'JOB_SCHEDULED';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'LeadStatus' 
    AND e.enumlabel = 'JOB_IN_PROGRESS'
  ) THEN
    ALTER TYPE public."LeadStatus" ADD VALUE IF NOT EXISTS 'JOB_IN_PROGRESS';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'LeadStatus' 
    AND e.enumlabel = 'JOB_COMPLETED'
  ) THEN
    ALTER TYPE public."LeadStatus" ADD VALUE IF NOT EXISTS 'JOB_COMPLETED';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'LeadStatus' 
    AND e.enumlabel = 'INVOICED'
  ) THEN
    ALTER TYPE public."LeadStatus" ADD VALUE IF NOT EXISTS 'INVOICED';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'LeadStatus' 
    AND e.enumlabel = 'PAID'
  ) THEN
    ALTER TYPE public."LeadStatus" ADD VALUE IF NOT EXISTS 'PAID';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'LeadStatus' 
    AND e.enumlabel = 'LOST'
  ) THEN
    ALTER TYPE public."LeadStatus" ADD VALUE IF NOT EXISTS 'LOST';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'LeadStatus' 
    AND e.enumlabel = 'FOLLOW_UP_REQUIRED'
  ) THEN
    ALTER TYPE public."LeadStatus" ADD VALUE IF NOT EXISTS 'FOLLOW_UP_REQUIRED';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;


DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'LocationType'
  ) THEN
    CREATE TYPE public."LocationType" AS ENUM ('WAREHOUSE', 'SHOP', 'TRUCK', 'OFFICE', 'SUPPLIER');
    RAISE NOTICE 'Created type: LocationType';
  ELSE
    RAISE NOTICE 'Type already exists: LocationType';
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'LocationType' 
    AND e.enumlabel = 'WAREHOUSE'
  ) THEN
    ALTER TYPE public."LocationType" ADD VALUE IF NOT EXISTS 'WAREHOUSE';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'LocationType' 
    AND e.enumlabel = 'SHOP'
  ) THEN
    ALTER TYPE public."LocationType" ADD VALUE IF NOT EXISTS 'SHOP';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'LocationType' 
    AND e.enumlabel = 'TRUCK'
  ) THEN
    ALTER TYPE public."LocationType" ADD VALUE IF NOT EXISTS 'TRUCK';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'LocationType' 
    AND e.enumlabel = 'OFFICE'
  ) THEN
    ALTER TYPE public."LocationType" ADD VALUE IF NOT EXISTS 'OFFICE';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'LocationType' 
    AND e.enumlabel = 'SUPPLIER'
  ) THEN
    ALTER TYPE public."LocationType" ADD VALUE IF NOT EXISTS 'SUPPLIER';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;


DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'PhaseStatus'
  ) THEN
    CREATE TYPE public."PhaseStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');
    RAISE NOTICE 'Created type: PhaseStatus';
  ELSE
    RAISE NOTICE 'Type already exists: PhaseStatus';
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'PhaseStatus' 
    AND e.enumlabel = 'NOT_STARTED'
  ) THEN
    ALTER TYPE public."PhaseStatus" ADD VALUE IF NOT EXISTS 'NOT_STARTED';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'PhaseStatus' 
    AND e.enumlabel = 'IN_PROGRESS'
  ) THEN
    ALTER TYPE public."PhaseStatus" ADD VALUE IF NOT EXISTS 'IN_PROGRESS';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'PhaseStatus' 
    AND e.enumlabel = 'COMPLETED'
  ) THEN
    ALTER TYPE public."PhaseStatus" ADD VALUE IF NOT EXISTS 'COMPLETED';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;


DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'UserRole'
  ) THEN
    CREATE TYPE public."UserRole" AS ENUM ('ADMIN', 'OFFICE', 'FIELD_CREW');
    RAISE NOTICE 'Created type: UserRole';
  ELSE
    RAISE NOTICE 'Type already exists: UserRole';
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'UserRole' 
    AND e.enumlabel = 'ADMIN'
  ) THEN
    ALTER TYPE public."UserRole" ADD VALUE IF NOT EXISTS 'ADMIN';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'UserRole' 
    AND e.enumlabel = 'OFFICE'
  ) THEN
    ALTER TYPE public."UserRole" ADD VALUE IF NOT EXISTS 'OFFICE';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'UserRole' 
    AND e.enumlabel = 'FIELD_CREW'
  ) THEN
    ALTER TYPE public."UserRole" ADD VALUE IF NOT EXISTS 'FIELD_CREW';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;


DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'break_type'
  ) THEN
    CREATE TYPE public."break_type" AS ENUM ('LUNCH', 'SHORT_BREAK', 'PERSONAL', 'MEETING', 'TRAVEL', 'OTHER');
    RAISE NOTICE 'Created type: break_type';
  ELSE
    RAISE NOTICE 'Type already exists: break_type';
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'break_type' 
    AND e.enumlabel = 'LUNCH'
  ) THEN
    ALTER TYPE public."break_type" ADD VALUE IF NOT EXISTS 'LUNCH';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'break_type' 
    AND e.enumlabel = 'SHORT_BREAK'
  ) THEN
    ALTER TYPE public."break_type" ADD VALUE IF NOT EXISTS 'SHORT_BREAK';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'break_type' 
    AND e.enumlabel = 'PERSONAL'
  ) THEN
    ALTER TYPE public."break_type" ADD VALUE IF NOT EXISTS 'PERSONAL';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'break_type' 
    AND e.enumlabel = 'MEETING'
  ) THEN
    ALTER TYPE public."break_type" ADD VALUE IF NOT EXISTS 'MEETING';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'break_type' 
    AND e.enumlabel = 'TRAVEL'
  ) THEN
    ALTER TYPE public."break_type" ADD VALUE IF NOT EXISTS 'TRAVEL';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'break_type' 
    AND e.enumlabel = 'OTHER'
  ) THEN
    ALTER TYPE public."break_type" ADD VALUE IF NOT EXISTS 'OTHER';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;


DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'service_call_status'
  ) THEN
    CREATE TYPE public."service_call_status" AS ENUM ('NEW', 'ASSIGNED', 'DISPATCHED', 'EN_ROUTE', 'ON_SITE', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'BILLED');
    RAISE NOTICE 'Created type: service_call_status';
  ELSE
    RAISE NOTICE 'Type already exists: service_call_status';
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'service_call_status' 
    AND e.enumlabel = 'NEW'
  ) THEN
    ALTER TYPE public."service_call_status" ADD VALUE IF NOT EXISTS 'NEW';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'service_call_status' 
    AND e.enumlabel = 'ASSIGNED'
  ) THEN
    ALTER TYPE public."service_call_status" ADD VALUE IF NOT EXISTS 'ASSIGNED';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'service_call_status' 
    AND e.enumlabel = 'DISPATCHED'
  ) THEN
    ALTER TYPE public."service_call_status" ADD VALUE IF NOT EXISTS 'DISPATCHED';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'service_call_status' 
    AND e.enumlabel = 'EN_ROUTE'
  ) THEN
    ALTER TYPE public."service_call_status" ADD VALUE IF NOT EXISTS 'EN_ROUTE';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'service_call_status' 
    AND e.enumlabel = 'ON_SITE'
  ) THEN
    ALTER TYPE public."service_call_status" ADD VALUE IF NOT EXISTS 'ON_SITE';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'service_call_status' 
    AND e.enumlabel = 'IN_PROGRESS'
  ) THEN
    ALTER TYPE public."service_call_status" ADD VALUE IF NOT EXISTS 'IN_PROGRESS';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'service_call_status' 
    AND e.enumlabel = 'COMPLETED'
  ) THEN
    ALTER TYPE public."service_call_status" ADD VALUE IF NOT EXISTS 'COMPLETED';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'service_call_status' 
    AND e.enumlabel = 'CANCELLED'
  ) THEN
    ALTER TYPE public."service_call_status" ADD VALUE IF NOT EXISTS 'CANCELLED';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'service_call_status' 
    AND e.enumlabel = 'BILLED'
  ) THEN
    ALTER TYPE public."service_call_status" ADD VALUE IF NOT EXISTS 'BILLED';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;


DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'service_call_type'
  ) THEN
    CREATE TYPE public."service_call_type" AS ENUM ('EMERGENCY', 'ROUTINE', 'SCHEDULED', 'CALLBACK', 'WARRANTY', 'MAINTENANCE');
    RAISE NOTICE 'Created type: service_call_type';
  ELSE
    RAISE NOTICE 'Type already exists: service_call_type';
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'service_call_type' 
    AND e.enumlabel = 'EMERGENCY'
  ) THEN
    ALTER TYPE public."service_call_type" ADD VALUE IF NOT EXISTS 'EMERGENCY';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'service_call_type' 
    AND e.enumlabel = 'ROUTINE'
  ) THEN
    ALTER TYPE public."service_call_type" ADD VALUE IF NOT EXISTS 'ROUTINE';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'service_call_type' 
    AND e.enumlabel = 'SCHEDULED'
  ) THEN
    ALTER TYPE public."service_call_type" ADD VALUE IF NOT EXISTS 'SCHEDULED';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'service_call_type' 
    AND e.enumlabel = 'CALLBACK'
  ) THEN
    ALTER TYPE public."service_call_type" ADD VALUE IF NOT EXISTS 'CALLBACK';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'service_call_type' 
    AND e.enumlabel = 'WARRANTY'
  ) THEN
    ALTER TYPE public."service_call_type" ADD VALUE IF NOT EXISTS 'WARRANTY';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'service_call_type' 
    AND e.enumlabel = 'MAINTENANCE'
  ) THEN
    ALTER TYPE public."service_call_type" ADD VALUE IF NOT EXISTS 'MAINTENANCE';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;


DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'service_priority'
  ) THEN
    CREATE TYPE public."service_priority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT', 'EMERGENCY');
    RAISE NOTICE 'Created type: service_priority';
  ELSE
    RAISE NOTICE 'Type already exists: service_priority';
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'service_priority' 
    AND e.enumlabel = 'LOW'
  ) THEN
    ALTER TYPE public."service_priority" ADD VALUE IF NOT EXISTS 'LOW';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'service_priority' 
    AND e.enumlabel = 'NORMAL'
  ) THEN
    ALTER TYPE public."service_priority" ADD VALUE IF NOT EXISTS 'NORMAL';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'service_priority' 
    AND e.enumlabel = 'HIGH'
  ) THEN
    ALTER TYPE public."service_priority" ADD VALUE IF NOT EXISTS 'HIGH';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'service_priority' 
    AND e.enumlabel = 'URGENT'
  ) THEN
    ALTER TYPE public."service_priority" ADD VALUE IF NOT EXISTS 'URGENT';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'service_priority' 
    AND e.enumlabel = 'EMERGENCY'
  ) THEN
    ALTER TYPE public."service_priority" ADD VALUE IF NOT EXISTS 'EMERGENCY';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;


DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'time_entry_status'
  ) THEN
    CREATE TYPE public."time_entry_status" AS ENUM ('ACTIVE', 'COMPLETED', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PAID');
    RAISE NOTICE 'Created type: time_entry_status';
  ELSE
    RAISE NOTICE 'Type already exists: time_entry_status';
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'time_entry_status' 
    AND e.enumlabel = 'ACTIVE'
  ) THEN
    ALTER TYPE public."time_entry_status" ADD VALUE IF NOT EXISTS 'ACTIVE';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'time_entry_status' 
    AND e.enumlabel = 'COMPLETED'
  ) THEN
    ALTER TYPE public."time_entry_status" ADD VALUE IF NOT EXISTS 'COMPLETED';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'time_entry_status' 
    AND e.enumlabel = 'SUBMITTED'
  ) THEN
    ALTER TYPE public."time_entry_status" ADD VALUE IF NOT EXISTS 'SUBMITTED';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'time_entry_status' 
    AND e.enumlabel = 'APPROVED'
  ) THEN
    ALTER TYPE public."time_entry_status" ADD VALUE IF NOT EXISTS 'APPROVED';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'time_entry_status' 
    AND e.enumlabel = 'REJECTED'
  ) THEN
    ALTER TYPE public."time_entry_status" ADD VALUE IF NOT EXISTS 'REJECTED';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'time_entry_status' 
    AND e.enumlabel = 'PAID'
  ) THEN
    ALTER TYPE public."time_entry_status" ADD VALUE IF NOT EXISTS 'PAID';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;


DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'user_role'
  ) THEN
    CREATE TYPE public."user_role" AS ENUM ('OWNER', 'ADMIN', 'OFFICE', 'TECHNICIAN', 'VIEWER', 'OWNER_ADMIN', 'FOREMAN', 'EMPLOYEE');
    RAISE NOTICE 'Created type: user_role';
  ELSE
    RAISE NOTICE 'Type already exists: user_role';
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'user_role' 
    AND e.enumlabel = 'OWNER'
  ) THEN
    ALTER TYPE public."user_role" ADD VALUE IF NOT EXISTS 'OWNER';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'user_role' 
    AND e.enumlabel = 'ADMIN'
  ) THEN
    ALTER TYPE public."user_role" ADD VALUE IF NOT EXISTS 'ADMIN';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'user_role' 
    AND e.enumlabel = 'OFFICE'
  ) THEN
    ALTER TYPE public."user_role" ADD VALUE IF NOT EXISTS 'OFFICE';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'user_role' 
    AND e.enumlabel = 'TECHNICIAN'
  ) THEN
    ALTER TYPE public."user_role" ADD VALUE IF NOT EXISTS 'TECHNICIAN';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'user_role' 
    AND e.enumlabel = 'VIEWER'
  ) THEN
    ALTER TYPE public."user_role" ADD VALUE IF NOT EXISTS 'VIEWER';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'user_role' 
    AND e.enumlabel = 'OWNER_ADMIN'
  ) THEN
    ALTER TYPE public."user_role" ADD VALUE IF NOT EXISTS 'OWNER_ADMIN';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'user_role' 
    AND e.enumlabel = 'FOREMAN'
  ) THEN
    ALTER TYPE public."user_role" ADD VALUE IF NOT EXISTS 'FOREMAN';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' 
    AND t.typname = 'user_role' 
    AND e.enumlabel = 'EMPLOYEE'
  ) THEN
    ALTER TYPE public."user_role" ADD VALUE IF NOT EXISTS 'EMPLOYEE';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

