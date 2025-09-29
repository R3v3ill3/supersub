# @da/ui - Shared UI Components

Centralized UI components and icons for the DA Submission Manager monorepo.

## Icons

### Usage
```typescript
import { UploadIcon, SuccessIcon, EditIcon } from '@da/ui/icons';

function MyComponent() {
  return (
    <div>
      <UploadIcon className="h-5 w-5" />
      <SuccessIcon className="h-4 w-4 text-green-500" />
      <EditIcon className="h-6 w-6" />
    </div>
  );
}
```

### Available Icons
- **Upload/Download**: UploadIcon, DownloadIcon, CloudUploadIcon
- **Actions**: AddIcon, EditIcon, DeleteIcon, ViewIcon, SettingsIcon
- **Status**: SuccessIcon, ErrorIcon, WarningIcon, InfoIcon, PendingIcon
- **Navigation**: RefreshIcon, ArrowLeftIcon, ChevronDownIcon
- **Documents**: DocumentIcon, FolderIcon, FormIcon, AttachmentIcon
- **Communication**: EmailIcon, MessageIcon, NotificationIcon
- **System**: ServerIcon, DatabaseIcon, NetworkIcon

### Solid Versions
For emphasis, use solid versions: SuccessIconSolid, ErrorIconSolid, etc.

## Benefits
- ✅ Consistent naming across all apps
- ✅ Version-agnostic (handles Heroicons updates)
- ✅ Semantic names (UploadIcon vs ArrowUpTrayIcon)
- ✅ TypeScript support
- ✅ Tree-shaking compatible

