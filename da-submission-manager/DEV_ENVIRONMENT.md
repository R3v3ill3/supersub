# Development Environment Guide

## Starting Development Servers

### Recommended: Individual Terminals (Most Stable)
```bash
# Terminal 1 - API Server
cd apps/api
pnpm dev

# Terminal 2 - Admin Dashboard  
cd apps/admin
pnpm dev

# Terminal 3 - Public Web App
cd apps/web
pnpm dev
```

### Alternative: Concurrent Mode
```bash
# Root directory - runs all apps
pnpm dev
```

## Troubleshooting Common Issues

### Import/Export Errors (SyntaxError: does not provide an export named 'X')
**Cause**: Vite dependency caching conflicts
**Solution**:
```bash
pnpm clean:cache
# Restart affected dev server
```

### Heroicons Import Errors
**Cause**: Icon name changes between Heroicons versions
**Quick Check**:
```bash
pnpm check:imports
```
**Solution**: Use correct Heroicons v2 names or shared icon library

### Complete Environment Reset
**Use when multiple issues occur**:
```bash
pnpm fix:deps
```

### Port Conflicts
**Default Ports**:
- API: http://localhost:3001
- Admin: http://localhost:5173  
- Web: http://localhost:5174

**Fix**: Kill processes or use different ports in vite.config.ts

## Best Practices

1. **Start API first** - Other apps depend on it
2. **Use individual terminals** for better error isolation
3. **Clear cache regularly** when making dependency changes
4. **Check console for errors** in each app before proceeding
5. **Restart dev servers** after major changes

## Icon Import Guidelines

### ❌ Don't Do This
```typescript
import { SomeIcon } from '@heroicons/react/24/outline';
```

### ✅ Do This Instead  
```typescript
// Use exact icon names from Heroicons v2 documentation
import { ArrowUpTrayIcon } from '@heroicons/react/24/outline';
```

### Common Icon Name Changes (v1 → v2)
- `UploadIcon` → `ArrowUpTrayIcon`
- `DownloadIcon` → `ArrowDownTrayIcon`  
- `RefreshIcon` → `ArrowPathIcon`
- `ExternalLinkIcon` → `ArrowTopRightOnSquareIcon`

Check [Heroicons documentation](https://heroicons.com) for current names.


