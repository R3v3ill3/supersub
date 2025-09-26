import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { PlusIcon, EyeIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { api } from '../lib/api';
import type { Project } from '../lib/api';
import { getProjectPublicUrl } from '../lib/urls';

export default function Projects() {
  const [copiedProjectId, setCopiedProjectId] = useState<string | null>(null);
  const { data: projectsResponse, isLoading, error } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await api.projects.getAll();
      return response.data;
    },
  });

  const projects: Project[] = projectsResponse?.projects || [];

  const handleCopyLink = async (projectId: string, link: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(link);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = link;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedProjectId(projectId);
      window.setTimeout(() => setCopiedProjectId((current) => (current === projectId ? null : current)), 2000);
    } catch (copyError) {
      console.error('Failed to copy link', copyError);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <h3 className="text-sm font-medium text-red-800">Error loading projects</h3>
          <p className="text-sm text-red-600 mt-1">
            {error instanceof Error ? error.message : 'Failed to load projects'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-600">Manage your DA submission projects</p>
        </div>
        <Link
          to="/projects/new"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          New Project
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto h-12 w-12 text-gray-400">
            <svg
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                vectorEffect="non-scaling-stroke"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No projects</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating your first project.
          </p>
          <div className="mt-6">
            <Link
              to="/projects/new"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              <PlusIcon className="h-4 w-4 mr-2 inline" />
              New Project
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {projects.map((project) => (
              <li key={project.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center">
                        <h3 className="text-lg font-medium text-gray-900 truncate">
                          {project.name}
                        </h3>
                        <span
                          className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            project.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {project.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                        <code className="rounded bg-gray-100 px-2 py-1 text-xs font-mono text-gray-600">
                          /{project.slug}
                        </code>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {project.description || 'No description'}
                      </p>
                      <div className="mt-2 flex items-center text-sm text-gray-500">
                        <span>Council: {project.council_name}</span>
                        <span className="mx-2">•</span>
                        <span>Submissions: {project.submission_counts?.total || 0}</span>
                        <span className="mx-2">•</span>
                        <span className="capitalize">Default: {project.default_pathway}</span>
                        {project.test_submission_email && (
                          <>
                            <span className="mx-2">•</span>
                            <span className="text-xs text-purple-600">Test email: {project.test_submission_email}</span>
                          </>
                        )}
                        {project.action_network_config?.action_url && (
                          <>
                            <span className="mx-2">•</span>
                            <span className="text-xs text-blue-600">Action Network linked</span>
                          </>
                        )}
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                        <span className="text-gray-600">Public link:</span>
                        <a
                          href={getProjectPublicUrl(project.slug)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline break-all"
                        >
                          {getProjectPublicUrl(project.slug)}
                        </a>
                        <button
                          type="button"
                          onClick={() => handleCopyLink(project.id, getProjectPublicUrl(project.slug))}
                          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                        >
                          {copiedProjectId === project.id ? 'Copied!' : 'Copy link'}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <Link
                        to={`/projects/${project.id}`}
                        className="text-blue-600 hover:text-blue-800 p-2 rounded-full hover:bg-blue-50"
                        title="View project"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </Link>
                      <Link
                        to={`/projects/${project.id}/edit`}
                        className="text-gray-600 hover:text-gray-800 p-2 rounded-full hover:bg-gray-50"
                        title="Edit project"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </Link>
                      <button
                        className="text-red-600 hover:text-red-800 p-2 rounded-full hover:bg-red-50"
                        title="Delete project"
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this project?')) {
                            // Handle delete
                            console.log('Delete project', project.id);
                          }
                        }}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
