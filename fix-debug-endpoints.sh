#!/bin/bash

# Script to protect all debug endpoints with authentication
# Adds withDebugAuth wrapper to all debug API endpoints

DEBUG_DIR="frontend/src/pages/api/debug"
EXCLUDE_FILES=("flow-trace.ts" "mint-logs.ts")  # Already fixed

# Function to check if file is already protected
is_protected() {
    local file=$1
    grep -q "withDebugAuth" "$file"
}

# Function to protect a debug endpoint
protect_endpoint() {
    local file=$1
    local filename=$(basename "$file")
    
    echo "🔧 Protecting $filename..."
    
    # Add import if not present
    if ! grep -q "withDebugAuth" "$file"; then
        # Add import after existing imports
        sed -i "1i import { withDebugAuth } from '../../../lib/debugAuth';" "$file"
    fi
    
    # Find the export default line and modify it
    if grep -q "export default async function" "$file"; then
        # Pattern: export default async function handler(...)
        sed -i 's/export default async function handler(/async function handler(/' "$file"
        echo "" >> "$file"
        echo "// Export with debug authentication" >> "$file"
        echo "export default withDebugAuth(handler);" >> "$file"
    elif grep -q "export default function" "$file"; then
        # Pattern: export default function handler(...)
        sed -i 's/export default function handler(/function handler(/' "$file"
        echo "" >> "$file"
        echo "// Export with debug authentication" >> "$file"
        echo "export default withDebugAuth(handler);" >> "$file"
    elif grep -q "export default" "$file"; then
        # Other export default patterns
        local export_line=$(grep "export default" "$file")
        if [[ $export_line == *"function"* ]]; then
            # Replace export default with protected version
            sed -i 's/export default \(.*\)/const handler = \1;\nexport default withDebugAuth(handler);/' "$file"
        fi
    fi
    
    echo "✅ Protected $filename"
}

# Main execution
echo "🛡️ Starting debug endpoints protection..."
echo "Debug directory: $DEBUG_DIR"

# Check if debug directory exists
if [ ! -d "$DEBUG_DIR" ]; then
    echo "❌ Debug directory not found: $DEBUG_DIR"
    exit 1
fi

# Process all .ts files in debug directory
for file in "$DEBUG_DIR"/*.ts; do
    if [ -f "$file" ]; then
        filename=$(basename "$file")
        
        # Skip already processed files
        should_skip=false
        for exclude in "${EXCLUDE_FILES[@]}"; do
            if [ "$filename" = "$exclude" ]; then
                echo "⏭️  Skipping $filename (already protected)"
                should_skip=true
                break
            fi
        done
        
        if [ "$should_skip" = false ]; then
            if is_protected "$file"; then
                echo "✅ $filename already protected"
            else
                protect_endpoint "$file"
            fi
        fi
    fi
done

echo "🎉 Debug endpoints protection completed!"
echo ""
echo "📋 Summary:"
echo "- All debug endpoints now require authentication in production"
echo "- In development: always accessible"
echo "- In production: requires ADMIN_API_TOKEN or ENABLE_DEBUG_ENDPOINTS=false"
echo ""
echo "🔧 To test:"
echo "1. Set NODE_ENV=production"
echo "2. Set ADMIN_API_TOKEN=your_token"
echo "3. Set ENABLE_DEBUG_ENDPOINTS=true"
echo "4. Access debug endpoints with X-Admin-Token header"