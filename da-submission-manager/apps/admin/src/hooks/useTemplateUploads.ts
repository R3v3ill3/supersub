import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export function useTemplateUploads(projectId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['template_files', projectId],
    queryFn: async () => {
      const response = await api.templates.listFiles(projectId);
      return response.data?.data ?? [];
    },
    enabled: Boolean(projectId),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['template_files', projectId] });
  };

  const activateMutation = useMutation({
    mutationFn: ({ fileId, versionId }: { fileId: string; versionId: string }) =>
      api.templates.activateVersion(fileId, versionId),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: ({ fileId, versionId }: { fileId: string; versionId: string }) =>
      api.templates.deleteVersion(fileId, versionId),
    onSuccess: invalidate,
  });

  return {
    ...query,
    versions: query.data,
    activateVersion: activateMutation.mutateAsync,
    deletingVersion: deleteMutation.isPending,
    activatePending: activateMutation.isPending,
    deleteVersion: deleteMutation.mutateAsync,
  };
}
