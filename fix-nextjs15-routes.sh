#!/bin/bash

# Script to fix all remaining Next.js 15 route parameter issues

echo "Fixing Next.js 15 route parameter types..."

# List of files to fix (found from analysis)
FILES=(
  "src/app/api/purchase-orders/[id]/items/route.ts"
  "src/app/api/purchase-orders/[id]/route.ts"
  "src/app/api/time-tracking/breaks/[id]/route.ts"
  "src/app/api/service-calls/[id]/status/route.ts"
  "src/app/api/service-calls/[id]/route.ts"
  "src/app/api/jobs/[id]/costs/route.ts"
  "src/app/api/labor-rates/[id]/route.ts"
  "src/app/api/materials/reservations/[id]/route.ts"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "Processing $file..."
    
    # Fix parameter type declarations
    sed -i.bak 's/{ params }: { params: { id: string } }/{ params }: { params: Promise<{ id: string }> }/g' "$file"
    sed -i.bak 's/{ params }: { params: { rateId: string } }/{ params }: { params: Promise<{ rateId: string }> }/g' "$file"
    sed -i.bak 's/{ params }: { params: { id: string; rateId: string } }/{ params }: { params: Promise<{ id: string; rateId: string }> }/g' "$file"
    
    # Add resolvedParams await at start of functions (this is a simple approach)
    # Note: This requires manual verification for each function
    
    rm "$file.bak" 2>/dev/null || true
    echo "Updated $file"
  else
    echo "File not found: $file"
  fi
done

echo "Fixed parameter types. Manual review needed for params.id -> resolvedParams.id replacements."
echo "Run: git diff to see changes"