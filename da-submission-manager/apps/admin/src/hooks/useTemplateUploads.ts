import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export function useTemplateUploads(projectId: string) {
  return useQuery({
    queryKey: ['template_files', projectId],
    queryFn: () => api.templates.listFiles(projectId),
    enabled: Boolean(projectId),
  });
}
