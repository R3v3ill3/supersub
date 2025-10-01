import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, type UseQueryResult } from '@tanstack/react-query';
import {
  RefreshIcon,
  SuccessIcon,
  WarningIcon,
  CloudUploadIcon,
  ShareIcon,
} from '@da/ui/icons';
import { api } from '../lib/api';
import type { TemplateAnalysisPreview, TemplateValidation } from '../lib/api';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useTemplateUploads } from '../hooks/useTemplateUploads';

export type TemplateSelectorValue = {
  templateType: 'cover' | 'grounds' | 'google_doc';
  templateId?: string;
};

export interface TemplateSelectorProps {
  templateType: TemplateSelectorValue['templateType'];
  selectedTemplateId?: string;
  projectId: string | null;
  onTemplateSelected: (templateId?: string) => void;
  showUpload?: boolean;
  showPreview?: boolean;
  showAnalysis?: boolean;
  deprecated?: boolean;
  className?: string;
  allowUrlImport?: boolean;
}

interface TemplateFileSummary {
  id: string;
  template_type: string;
  active_version_id?: string;
  versions?: TemplateVersionSummary[];
  updated_at: string;
}

interface TemplateVersionSummary {
  id: string;
  template_file_id: string;
  version_label?: string;
  storage_path: string;
  mimetype: string;
  original_filename: string;
  merge_fields?: Array<{ placeholder: string; canonical_field?: string }>;
  created_at?: string;
}

const mergeFieldList = (mergeFields?: Array<{ placeholder: string; canonical_field?: string }>) => {
  if (!mergeFields?.length) return null;
  return mergeFields
    .map((field) => field.canonical_field || field.placeholder)
    .filter(Boolean)
    .join(', ');
};

export function TemplateSelector({
  templateType,
  selectedTemplateId,
  projectId,
  onTemplateSelected,
  showUpload = true,
  showPreview = true,
  showAnalysis = false,
  deprecated = false,
  className,
  allowUrlImport = true,
}: TemplateSelectorProps) {
  const [importUrl, setImportUrl] = useState('');
  const [localPreviewId, setLocalPreviewId] = useState<string | undefined>(selectedTemplateId);
  const uploads = useTemplateUploads(projectId ?? '');

  useEffect(() => {
    setLocalPreviewId(selectedTemplateId);
  }, [selectedTemplateId]);

  const relevantFiles = useMemo(() => {
    const files = (uploads.versions as TemplateFileSummary[] | undefined) || [];
    return files
      .filter((file) => file.template_type === mapTemplateType(templateType))
      .flatMap((file) =>
        (file.versions || []).map((version) => ({
          ...version,
          isActive: version.id === file.active_version_id,
        }))
      );
  }, [uploads.versions, templateType]);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!projectId) {
        throw new Error('Select a project before uploading templates');
      }
      const formData = new FormData();
      formData.append('projectId', projectId);
      formData.append('templateType', mapTemplateType(templateType));
      formData.append('file', file);
      formData.append('version', `v${new Date().toISOString().split('T')[0]}`);
      return api.templates.upload(formData);
    },
    onSuccess: () => {
      uploads.invalidate?.();
    },
  });

  const importMutation = useMutation({
    mutationFn: async (url: string) => {
      const googleDocId = extractGoogleDocId(url);
      if (!googleDocId) {
        throw new Error('Unable to parse Google Doc ID');
      }
      onTemplateSelected(googleDocId);
      return googleDocId;
    },
    onSuccess: () => {
      setImportUrl('');
    },
  });

  const previewQuery = useTemplatePreview(localPreviewId, showPreview);
  const validationQuery = useTemplateValidation(localPreviewId, showPreview);
  const analysisMutation = useTemplateAnalysis({
    templateId: localPreviewId,
    projectId,
    enabled: showAnalysis,
  });

  const handleFileInput = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      uploadMutation.mutate(file);
    },
    [uploadMutation]
  );

  const handleSelectTemplate = useCallback(
    (templateId?: string) => {
      setLocalPreviewId(templateId);
      onTemplateSelected(templateId);
    },
    [onTemplateSelected]
  );

  return (
    <div className={cn('space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm', className)}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-900">{formatTemplateType(templateType)} Template</p>
          <p className="text-xs text-gray-500">
            {selectedTemplateId ? `Selected ID: ${selectedTemplateId}` : 'No template linked yet'}
          </p>
        </div>
        {deprecated ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
            <WarningIcon className="h-4 w-4" />
            Deprecated
          </span>
        ) : null}
      </div>

      <VersionList
        isLoading={uploads.isLoading}
        versions={relevantFiles}
        selectedTemplateId={selectedTemplateId}
        onSelect={handleSelectTemplate}
      />

      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {showUpload ? (
            <label
              className={cn(
                'inline-flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-600 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700',
                !projectId && 'cursor-not-allowed opacity-60'
              )}
            >
              <CloudUploadIcon className="h-4 w-4" />
              <span>
                {uploadMutation.isPending
                  ? 'Uploading…'
                  : projectId
                    ? 'Upload New Version'
                    : 'Select project to upload'}
              </span>
              <input
                type="file"
                accept=".doc,.docx,.pdf,.txt"
                className="hidden"
                onChange={handleFileInput}
                disabled={!projectId || uploadMutation.isPending}
              />
            </label>
          ) : null}
        </div>

        {allowUrlImport ? (
          <div className="flex items-center gap-2">
            <Input
              type="url"
              value={importUrl}
              placeholder="Paste Google Doc URL to link"
              onChange={(event) => setImportUrl(event.target.value)}
            />
            <Button
              type="button"
              size="sm"
              onClick={() => importMutation.mutate(importUrl)}
              disabled={!importUrl || importMutation.isPending}
              className="gap-1.5"
            >
              <ShareIcon className={importMutation.isPending ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} />
              {importMutation.isPending ? 'Linking…' : 'Link'}
            </Button>
          </div>
        ) : null}

        {importMutation.isError ? (
          <InlineBanner variant="error" message={(importMutation.error as Error)?.message || 'Failed to link template'} />
        ) : null}
      </div>

      {showPreview ? (
        <TemplatePreviewPanel
          templateId={localPreviewId}
          previewQueryState={previewQuery}
          validationState={validationQuery}
        />
      ) : null}

      {showAnalysis && localPreviewId && /^[A-Za-z0-9_-]{20,}$/.test(localPreviewId) && !localPreviewId.includes('/') ? (
        <div className="space-y-3 rounded-lg border border-blue-100 bg-blue-50 p-3">
          <div className="flex items-center gap-2">
            <RefreshIcon className="h-4 w-4 text-blue-500" />
            <p className="text-sm font-medium text-blue-900">AI Analysis</p>
          </div>
          <p className="text-xs text-blue-800">
            Analyze this template to extract concerns and generate survey suggestions.
          </p>
          <Button
            type="button"
            size="sm"
            onClick={() => analysisMutation.mutate()}
            disabled={analysisMutation.isPending}
            className="gap-1.5"
          >
            <RefreshIcon className={analysisMutation.isPending ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} />
            {analysisMutation.isPending ? 'Analyzing…' : 'Analyze Template'}
          </Button>
          {analysisMutation.isError ? (
            <InlineBanner variant="error" message={(analysisMutation.error as Error)?.message || 'Analysis failed'} />
          ) : null}
          {analysisMutation.isSuccess ? (
            <InlineBanner variant="success" message="Analysis complete. Review results in Template Analysis." />
          ) : null}
        </div>
      ) : showAnalysis && localPreviewId ? (
        <div className="space-y-3 rounded-lg border border-amber-100 bg-amber-50 p-3">
          <div className="flex items-center gap-2">
            <WarningIcon className="h-4 w-4 text-amber-500" />
            <p className="text-sm font-medium text-amber-900">AI Analysis Not Available</p>
          </div>
          <p className="text-xs text-amber-800">
            AI analysis only works with Google Doc templates. For uploaded files, merge fields are automatically detected during upload.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function VersionList({
  versions,
  selectedTemplateId,
  onSelect,
  isLoading,
}: {
  versions: Array<TemplateVersionSummary & { isActive?: boolean }>;
  selectedTemplateId?: string;
  onSelect: (templateId?: string) => void;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-xs text-gray-600">
        Loading template versions…
      </div>
    );
  }

  if (!versions || versions.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-xs text-gray-600">
        No uploaded versions yet. Upload a template to create the first version.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {versions.map((version) => (
        <button
          key={version.id}
          type="button"
          onClick={() => onSelect(version.storage_path)}
          className={cn(
            'flex w-full flex-col items-start rounded-md border px-3 py-2 text-left text-sm transition hover:border-blue-400',
            selectedTemplateId === version.storage_path
              ? 'border-blue-500 bg-blue-50 text-blue-800'
              : 'border-gray-200 bg-white text-gray-700'
          )}
        >
          <div className="flex w-full items-center justify-between">
            <span className="font-medium text-gray-900">{version.original_filename}</span>
            {version.isActive ? (
              <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-700">Active</span>
            ) : null}
          </div>
          <span className="text-xs text-gray-500">
            Version {version.version_label || 'latest'}
          </span>
          {mergeFieldList(version.merge_fields) ? (
            <span className="mt-1 text-xs text-gray-400">Fields: {mergeFieldList(version.merge_fields)}</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

function TemplatePreviewPanel({
  templateId,
  previewQueryState,
  validationState,
}: {
  templateId?: string;
  previewQueryState: UseQueryResult<TemplateAnalysisPreview | null>;
  validationState: UseQueryResult<TemplateValidation | null>;
}) {
  if (!templateId) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-xs text-gray-600">
        Select or link a template to view its preview and validation.
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
        <SuccessIcon className="h-4 w-4 text-green-500" />
        Preview & Validation
      </div>

      {validationState.isLoading ? (
        <InlineBanner variant="info" message="Validating template…" />
      ) : validationState.isError ? (
        <InlineBanner variant="error" message={(validationState.error as Error)?.message || 'Validation failed'} />
      ) : validationState.data ? (
        <ValidationSummary validation={validationState.data} />
      ) : null}

      {previewQueryState.isLoading ? (
        <InlineBanner variant="info" message="Loading preview…" />
      ) : previewQueryState.isError ? (
        <InlineBanner variant="error" message={(previewQueryState.error as Error)?.message || 'Preview failed'} />
      ) : previewQueryState.data ? (
        <DocumentPreview preview={previewQueryState.data} />
      ) : null}
    </div>
  );
}

function ValidationSummary({ validation }: { validation: TemplateValidation }) {
  return (
    <div className="space-y-2 rounded-md bg-white p-3 text-sm shadow-inner">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
        {validation.isValid ? (
          <SuccessIcon className="h-4 w-4 text-green-500" />
        ) : (
          <WarningIcon className="h-4 w-4 text-amber-500" />
        )}
        Validation Status: {validation.isValid ? 'Valid' : 'Issues found'}
      </div>
      <p className="text-xs text-gray-500">Word Count: {validation.wordCount ?? 'Unknown'}</p>
      {validation.issues && validation.issues.length > 0 ? (
        <ul className="list-disc space-y-1 pl-5 text-xs text-amber-600">
          {validation.issues.map((issue: string, index: number) => (
            <li key={index}>{issue}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function DocumentPreview({ preview }: { preview: TemplateAnalysisPreview | null }) {
  if (!preview) return null;

  const concerns = preview?.preview?.extractedConcerns || [];
  const summary = preview?.preview?.documentSummary;
  const metadata = preview?.preview?.analysisMetadata;

  return (
    <div className="space-y-3 rounded-md bg-white p-3 text-sm shadow-inner">
      {summary ? (
        <div>
          <p className="text-xs font-semibold uppercase text-gray-500">Summary</p>
          <p className="text-sm text-gray-700">{summary}</p>
        </div>
      ) : null}

      {metadata ? (
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
          <div>Concerns: {metadata.totalConcerns}</div>
          <div>Length: {metadata.documentLength} chars</div>
          <div>Model: {metadata.analysisModel}</div>
          <div>Analyzed: {new Date(metadata.analysisTimestamp).toLocaleString()}</div>
        </div>
      ) : null}

      {concerns.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase text-gray-500">Detected Concerns</p>
          <ul className="space-y-1 text-xs text-gray-700">
            {concerns.slice(0, 5).map((concern: any) => (
              <li key={concern.key} className="rounded border border-gray-200 bg-gray-50 p-2">
                <p className="font-medium text-gray-900">{concern.label}</p>
                <p className="text-gray-600">{concern.body}</p>
              </li>
            ))}
          </ul>
          {concerns.length > 5 ? (
            <p className="text-xs text-gray-500">+{concerns.length - 5} more concerns found</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function InlineBanner({ variant, message }: { variant: 'error' | 'success' | 'info'; message: string }) {
  const styles: Record<'error' | 'success' | 'info', string> = {
    error: 'border border-rose-200 bg-rose-50 text-rose-700',
    success: 'border border-green-200 bg-green-50 text-green-700',
    info: 'border border-blue-200 bg-blue-50 text-blue-700',
  };

  return <div className={cn('rounded-md px-3 py-2 text-xs', styles[variant])}>{message}</div>;
}

function formatTemplateType(templateType: TemplateSelectorValue['templateType']) {
  switch (templateType) {
    case 'cover':
      return 'Cover';
    case 'grounds':
      return 'Grounds';
    case 'google_doc':
      return 'Legacy';
    default:
      return templateType;
  }
}

function extractGoogleDocId(url: string): string | undefined {
  try {
    const trimmed = url.trim();
    if (!trimmed) return undefined;
    const directIdMatch = trimmed.match(/^[A-Za-z0-9-_]{20,}$/);
    if (directIdMatch) {
      return directIdMatch[0];
    }
    const docsUrlMatch = trimmed.match(/docs.google.com\/document\/d\/([A-Za-z0-9-_]+)/);
    if (docsUrlMatch) {
      return docsUrlMatch[1];
    }
    const openUrlMatch = trimmed.match(/[?&]id=([A-Za-z0-9-_]+)/);
    if (openUrlMatch) {
      return openUrlMatch[1];
    }
    return undefined;
  } catch {
    return undefined;
  }
}


function useTemplatePreview(templateId?: string, enabled?: boolean): UseQueryResult<TemplateAnalysisPreview | null> {
  return useQuery({
    queryKey: ['template-preview', templateId],
    queryFn: async () => {
      if (!templateId) return null;
      const response = await api.templates.preview(templateId);
      return response.data?.data ?? null;
    },
    enabled: Boolean(enabled && templateId),
    staleTime: 60_000,
  });
}

function useTemplateValidation(templateId?: string, enabled?: boolean): UseQueryResult<TemplateValidation | null> {
  return useQuery({
    queryKey: ['template-validation', templateId],
    queryFn: async () => {
      if (!templateId) return null;
      const response = await api.templates.validate(templateId);
      return response.data?.data ?? null;
    },
    enabled: Boolean(enabled && templateId),
    staleTime: 60_000,
  });
}

function useTemplateAnalysis({
  templateId,
  projectId,
  enabled,
}: {
  templateId?: string;
  projectId: string | null;
  enabled?: boolean;
}) {
  return useMutation({
    mutationFn: async () => {
      if (!enabled) {
        throw new Error('Analysis disabled for this selector');
      }
      if (!templateId) {
        throw new Error('Select a template before analyzing');
      }
      // Check if templateId is a Google Doc ID (alphanumeric string, typically 40+ chars)
      // vs a storage path (contains / or file extension)
      const isGoogleDocId = /^[A-Za-z0-9_-]{20,}$/.test(templateId) && !templateId.includes('/');
      if (!isGoogleDocId) {
        throw new Error('AI Analysis only works with Google Doc templates. For uploaded templates, the merge fields are already detected during upload.');
      }
      return api.templates.analyze({
        googleDocId: templateId,
        projectId: projectId ?? undefined,
        version: 'v1',
      });
    },
  });
}

function mapTemplateType(type: TemplateSelectorValue['templateType']) {
  switch (type) {
    case 'cover':
      return 'council_email';
    case 'grounds':
      return 'grounds';
    case 'google_doc':
      return 'submission_format';
    default:
      return 'grounds';
  }
}
