-- Migration 003: Fix journal entry balance validation trigger
-- Make the trigger fire at the end of the transaction instead of after each line
--
-- Problem: The current trigger fires after EACH line insert, causing failures
-- when inserting multi-line entries (first line makes entry unbalanced).
--
-- Solution: Convert to a CONSTRAINT trigger that's DEFERRABLE and INITIALLY DEFERRED
-- This delays validation until the transaction commits (after all lines are inserted).

-- Drop the existing triggers
DROP TRIGGER IF EXISTS trigger_validate_entry_balance_insert ON "JournalEntryLine";
DROP TRIGGER IF EXISTS trigger_validate_entry_balance_update ON "JournalEntryLine";

-- Recreate as CONSTRAINT triggers (DEFERRABLE INITIALLY DEFERRED)
-- These will only fire at transaction commit, not after each statement

CREATE CONSTRAINT TRIGGER trigger_validate_entry_balance_insert
  AFTER INSERT ON "JournalEntryLine"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION validate_journal_entry_balance();

CREATE CONSTRAINT TRIGGER trigger_validate_entry_balance_update
  AFTER UPDATE ON "JournalEntryLine"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION validate_journal_entry_balance();

-- Verification query (run manually after migration)
-- SELECT trigger_name, event_manipulation, action_timing
-- FROM information_schema.triggers
-- WHERE event_object_table = 'JournalEntryLine'
-- ORDER BY trigger_name;
