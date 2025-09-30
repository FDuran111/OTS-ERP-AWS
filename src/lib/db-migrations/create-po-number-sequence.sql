-- Create sequence for thread-safe PO number generation

CREATE SEQUENCE IF NOT EXISTS po_number_seq START 1;

-- Initialize from existing data
SELECT setval('po_number_seq', 
  GREATEST(1,
    COALESCE(
      (SELECT MAX(CAST(SUBSTRING("poNumber" FROM '[0-9]+$') AS INTEGER)) 
       FROM "PurchaseOrder" 
       WHERE "poNumber" ~ '^PO-[0-9]+$'),
      0
    )
  )
);

-- Create function to generate PO numbers
CREATE OR REPLACE FUNCTION generate_po_number()
RETURNS VARCHAR AS $$
DECLARE
  next_number INTEGER;
  po_number VARCHAR;
BEGIN
  next_number := nextval('po_number_seq');
  po_number := 'PO-' || LPAD(next_number::TEXT, 6, '0');
  RETURN po_number;
END;
$$ LANGUAGE plpgsql;
