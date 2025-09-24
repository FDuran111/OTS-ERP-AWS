#!/bin/bash

echo "=== Monitoring Supabase Password Propagation ==="
echo "Testing connection every 30 seconds..."
echo "Press Ctrl+C to stop"
echo ""

count=0
while true; do
    count=$((count + 1))
    echo -n "Attempt $count [$(date '+%H:%M:%S')]: "
    
    # Test connection
    if PGPASSWORD="Ortmeier789OTS" psql \
        -h aws-0-us-east-1.pooler.supabase.com \
        -p 6543 \
        -U postgres.xudcmdliqyarbfdqufbq \
        -d postgres \
        -c "SELECT 'SUCCESS!' as status, version();" 2>&1 | grep -q "SUCCESS"; then
        
        echo "✅ CONNECTION SUCCESSFUL!"
        echo ""
        echo "Password has propagated! Running full test..."
        
        PGPASSWORD="Ortmeier789OTS" psql \
            -h aws-0-us-east-1.pooler.supabase.com \
            -p 6543 \
            -U postgres.xudcmdliqyarbfdqufbq \
            -d postgres \
            -c "SELECT version(), current_database(), current_user, 
                (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public') as table_count;"
        
        echo ""
        echo "Connection string that works:"
        echo "postgresql://postgres.xudcmdliqyarbfdqufbq:Ortmeier789OTS@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require"
        break
    else
        echo "❌ Still failing (Tenant or user not found)"
    fi
    
    if [ $count -ge 20 ]; then
        echo ""
        echo "Tested for 10 minutes without success."
        echo "The password might not be correct, or there may be another issue."
        echo "Please verify in Supabase dashboard that you reset the DATABASE password."
        break
    fi
    
    sleep 30
done