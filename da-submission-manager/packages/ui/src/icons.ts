// Centralized icon exports with consistent, stable naming
// This handles Heroicons version changes and provides semantic names

// === UPLOAD/DOWNLOAD ===
export {
  ArrowUpTrayIcon as UploadIcon,
  ArrowDownTrayIcon as DownloadIcon,
  CloudArrowUpIcon as CloudUploadIcon,
  CloudArrowDownIcon as CloudDownloadIcon,
} from '@heroicons/react/24/outline';

// === NAVIGATION ===
export {
  ArrowPathIcon as RefreshIcon,
  ArrowPathIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon as SearchIcon,
  MagnifyingGlassIcon,
  FunnelIcon as FilterIcon,
  FunnelIcon,
  HomeIcon,
  Bars3Icon as MenuIcon,
  Bars3Icon,
} from '@heroicons/react/24/outline';

// === ACTIONS ===
export {
  PlusIcon as AddIcon,
  PlusIcon,
  PencilIcon as EditIcon,
  PencilIcon,
  TrashIcon as DeleteIcon,
  TrashIcon,
  EyeIcon as ViewIcon,
  EyeIcon,
  EyeSlashIcon as HideIcon,
  Cog6ToothIcon as SettingsIcon,
  Cog6ToothIcon as ConfigIcon,
  XMarkIcon as CloseIcon,
  XMarkIcon,
  ArrowUpOnSquareIcon as ShareIcon,
  ArrowUpOnSquareIcon,
  BoltIcon as LightningIcon,
  BoltIcon,
} from '@heroicons/react/24/outline';

// === STATUS ===  
export {
  CheckCircleIcon as SuccessIcon,
  CheckCircleIcon,
  XCircleIcon as ErrorIcon,
  XCircleIcon,
  ExclamationTriangleIcon as WarningIcon,
  ExclamationTriangleIcon,
  ExclamationCircleIcon as AlertIcon,
  ExclamationCircleIcon,
  InformationCircleIcon as InfoIcon,
  ClockIcon as PendingIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

// === COMMUNICATION ===
export {
  EnvelopeIcon as EmailIcon,
  EnvelopeIcon,
  ChatBubbleLeftRightIcon as MessageIcon,
  BellIcon as NotificationIcon,
  PhoneIcon,
} from '@heroicons/react/24/outline';

// === DOCUMENTS ===
export {
  DocumentTextIcon as DocumentIcon,
  DocumentTextIcon,
  FolderIcon,
  FolderPlusIcon as FolderAddIcon,
  FolderPlusIcon,
  ArchiveBoxIcon,
  ClipboardDocumentListIcon as FormIcon,
  ClipboardDocumentListIcon,
  PaperClipIcon as AttachmentIcon,
} from '@heroicons/react/24/outline';

// === USER/ADMIN ===
export {
  UserIcon,
  UserGroupIcon as UsersIcon,
  ShieldCheckIcon as AdminIcon,
  KeyIcon as AuthIcon,
  LockClosedIcon as SecureIcon,
} from '@heroicons/react/24/outline';

// === SYSTEM ===
export {
  ServerIcon,
  CpuChipIcon as ProcessorIcon,
  CircleStackIcon as DatabaseIcon,
  SignalIcon as NetworkIcon,
  ExclamationTriangleIcon as SystemWarningIcon,
  HeartIcon,
  BeakerIcon as LabIcon,
  BeakerIcon,
} from '@heroicons/react/24/outline';

// === DATA & ANALYTICS ===
export {
  CalendarIcon,
  ChartBarIcon as AnalyticsIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon as TrendUpIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon as TrendDownIcon,
  ArrowTrendingDownIcon,
  MapPinIcon as LocationIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline';

// === SOLID VERSIONS (for emphasis) ===
export {
  CheckCircleIcon as SuccessIconSolid,
  XCircleIcon as ErrorIconSolid,
  ExclamationTriangleIcon as WarningIconSolid,
  InformationCircleIcon as InfoIconSolid,
} from '@heroicons/react/24/solid';

// === SOLID STATUS ICONS ===
export {
  CheckCircleIcon as SuccessMarkerIcon,
  XCircleIcon as ErrorMarkerIcon,
} from '@heroicons/react/20/solid';

// Common icon component props type
export interface IconProps {
  className?: string;
  'aria-hidden'?: boolean;
}

// Re-export common Heroicons types
export type { SVGProps } from 'react';
