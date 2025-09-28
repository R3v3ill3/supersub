import { useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../lib/api';
import { getProjectPublicUrl } from '../lib/urls';

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const [message, setMessage] = useState('');

  const { data: projectResponse, isLoading } = useQuery({
    queryKey: ['project', id],
    enabled: Boolean(id),
    queryFn: async () => {
      if (!id) throw new Error('Missing project id');
      const response = await api.projects.getById(id);
      return response.data.project;
    },
  });

  const updateConfig = useMutation({
    mutationFn: async (payload: any) => {
      if (!id) throw new Error('Missing project id');
      return api.projects.updateActionNetworkConfig(id, payload);
    },
    onSuccess: () => setMessage('Action Network configuration updated'),
    onError: (error: any) => setMessage(error?.response?.data?.error || error.message),
  });

  const testSync = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error('Missing project id');
      return api.projects.testActionNetworkSync(id);
    },
    onSuccess: (response) => setMessage(`Test sync succeeded: ${response.data?.testPerson}`),
    onError: (error: any) => setMessage(error?.response?.data?.error || error.message),
  });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Project Details</h1>
      <p className="text-gray-600">Project ID: {id}</p>

      {projectResponse ? (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
            <span className="font-medium">Slug:</span>
            <code className="rounded bg-gray-100 px-2 py-1 text-xs font-mono text-gray-600">/{projectResponse.slug}</code>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium text-gray-700">Public link:</span>
            <a
              href={getProjectPublicUrl(projectResponse.slug)}
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 hover:underline break-all"
            >
              {getProjectPublicUrl(projectResponse.slug)}
            </a>
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(getProjectPublicUrl(projectResponse.slug))}
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              Copy link
            </button>
          </div>
        </div>
      ) : null}

      {message && (
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-md p-4">
          <p className="text-sm text-blue-800">{message}</p>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6">
        {projectResponse ? (
          <section className="bg-white shadow-sm rounded-lg p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium text-gray-900">Dual-track configuration</h2>
                <p className="text-sm text-gray-600">Control whether supporters can choose between comprehensive and follow-up submissions.</p>
              </div>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                  projectResponse.is_dual_track ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {projectResponse.is_dual_track ? 'Enabled' : 'Disabled'}
              </span>
            </div>

            <DualTrackSettings project={projectResponse} onStatus={(value) => setMessage(value)} />
          </section>
        ) : null}

        <section className="bg-white shadow-sm rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Action Network Integration</h2>

          {isLoading ? (
            <div className="text-gray-500">Loading configuration…</div>
          ) : (
            <form
              className="space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget as HTMLFormElement;
                const formData = new FormData(form);
                const payload = {
                  action_url: formData.get('action_url')?.toString() || undefined,
                  form_url: formData.get('form_url')?.toString() || undefined,
                  group_hrefs: formData.get('group_hrefs')?.toString()?.split('\n').filter(Boolean),
                  list_hrefs: formData.get('list_hrefs')?.toString()?.split('\n').filter(Boolean),
                  tag_hrefs: formData.get('tag_hrefs')?.toString()?.split('\n').filter(Boolean),
                };
                const testEmail = formData.get('test_submission_email')?.toString()?.trim();
                if (testEmail) {
                  await api.projects.update(projectResponse.id, { test_submission_email: testEmail });
                }
                updateConfig.mutate(payload);
              }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Action URL</label>
                  <input
                    name="action_url"
                    defaultValue={projectResponse?.action_network_config?.action_url || ''}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                    placeholder="https://actionnetwork.org/api/v2/forms/..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Testing Email Address</label>
                  <input
                    name="test_submission_email"
                    defaultValue={projectResponse?.test_submission_email || ''}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                    placeholder="Optional: override council email for tests"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Form URL</label>
                <input
                  name="form_url"
                  defaultValue={projectResponse?.action_network_config?.form_url || ''}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  placeholder="https://actionnetwork.org/forms/..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">List Hrefs</label>
                <textarea
                  name="list_hrefs"
                  defaultValue={(projectResponse?.action_network_config?.list_hrefs || []).join('\n')}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  rows={3}
                />
                <p className="mt-1 text-xs text-gray-500">One per line. Example: https://actionnetwork.org/api/v2/lists/{'{list_id}'}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Tag Hrefs</label>
                <textarea
                  name="tag_hrefs"
                  defaultValue={(projectResponse?.action_network_config?.tag_hrefs || []).join('\n')}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Group Hrefs</label>
                <textarea
                  name="group_hrefs"
                  defaultValue={(projectResponse?.action_network_config?.group_hrefs || []).join('\n')}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-3">
                <button
                  type="submit"
                  disabled={updateConfig.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md disabled:opacity-50"
                >
                  {updateConfig.isPending ? 'Saving…' : 'Save Configuration'}
                </button>
                <button
                  type="button"
                  onClick={() => testSync.mutate()}
                  disabled={testSync.isPending}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-md disabled:opacity-50"
                >
                  {testSync.isPending ? 'Testing…' : 'Send Test Sync'}
                </button>
              </div>
            </form>
          )}
        </section>

        <section className="bg-white shadow-sm rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-2">AI Tools</h2>
          <p className="text-gray-600 mb-4">Run AI-assisted analysis on project templates.</p>
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md"
            disabled={!id}
            onClick={async () => {
              if (!id) return;
              setMessage('');
              try {
                const res = await api.dev.extractGrounds(id);
                setMessage(`Extracted and upserted ${res.data?.count ?? 0} concerns.`);
              } catch (e: any) {
                setMessage(`Failed: ${e?.message || 'Unknown error'}`);
              }
            }}
          >
            Analyze Grounds Template
          </button>
        </section>
      </div>
    </div>
  );
}
