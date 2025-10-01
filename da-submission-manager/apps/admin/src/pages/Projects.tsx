import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useState, type CSSProperties } from 'react';
import { AddIcon, ViewIcon, EditIcon, DeleteIcon } from '@da/ui/icons';
import { api } from '../lib/api';
import type { Project } from '../lib/api';
import { getProjectPublicUrl } from '../lib/urls';

// Inline styles to avoid Tailwind dependency
const pageStyle: CSSProperties = {
  padding: '24px',
};

const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '24px',
};

const titleStyle: CSSProperties = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#111827',
  margin: 0,
};

const subtitleStyle: CSSProperties = {
  color: '#6b7280',
  marginTop: '4px',
};

const buttonStyle: CSSProperties = {
  backgroundColor: '#2563eb',
  color: 'white',
  padding: '8px 16px',
  borderRadius: '6px',
  fontSize: '14px',
  fontWeight: '500',
  display: 'flex',
  alignItems: 'center',
  textDecoration: 'none',
  border: 'none',
  cursor: 'pointer',
};

const iconStyle: CSSProperties = {
  width: '16px',
  height: '16px',
  marginRight: '8px',
};

const smallIconStyle: CSSProperties = {
  width: '16px',
  height: '16px',
};

const emptyStateStyle: CSSProperties = {
  textAlign: 'center',
  padding: '48px 0',
};

const emptyIconStyle: CSSProperties = {
  width: '48px',
  height: '48px',
  color: '#9ca3af',
  margin: '0 auto 16px',
};

const projectListStyle: CSSProperties = {
  backgroundColor: 'white',
  borderRadius: '8px',
  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  overflow: 'hidden',
};

const projectItemStyle: CSSProperties = {
  padding: '16px 24px',
  borderBottom: '1px solid #e5e7eb',
};

const projectHeaderStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
};

const projectTitleStyle: CSSProperties = {
  fontSize: '18px',
  fontWeight: '500',
  color: '#111827',
  margin: 0,
};

const statusBadgeStyle = (isActive: boolean): CSSProperties => ({
  marginLeft: '8px',
  display: 'inline-flex',
  alignItems: 'center',
  padding: '2px 10px',
  borderRadius: '9999px',
  fontSize: '12px',
  fontWeight: '500',
  backgroundColor: isActive ? '#dcfce7' : '#f3f4f6',
  color: isActive ? '#166534' : '#374151',
});

const slugStyle: CSSProperties = {
  backgroundColor: '#f3f4f6',
  padding: '4px 8px',
  borderRadius: '4px',
  fontSize: '12px',
  fontFamily: 'monospace',
  color: '#6b7280',
  marginLeft: '8px',
};

const descriptionStyle: CSSProperties = {
  fontSize: '14px',
  color: '#6b7280',
  margin: '4px 0 8px 0',
};

const metaStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  fontSize: '14px',
  color: '#6b7280',
  marginBottom: '12px',
};

const linkStyle: CSSProperties = {
  color: '#2563eb',
  textDecoration: 'none',
  wordBreak: 'break-all',
};

const copyButtonStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '4px 8px',
  fontSize: '12px',
  fontWeight: '500',
  color: '#374151',
  backgroundColor: 'white',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  cursor: 'pointer',
  marginLeft: '8px',
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  marginLeft: '16px',
};

const actionButtonStyle = (color: string): CSSProperties => ({
  color,
  padding: '8px',
  borderRadius: '50%',
  border: 'none',
  backgroundColor: 'transparent',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  textDecoration: 'none',
});

export default function Projects() {
  const [copiedProjectId, setCopiedProjectId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: projectsResponse, isLoading, error } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await api.projects.list({ include_inactive: true });
      return response.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (projectId: string) => api.projects.delete(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (error: any) => {
      alert(`Failed to delete project: ${error.response?.data?.error || error.message}`);
    },
  });

  const projects: Project[] = projectsResponse?.projects || [];

  const handleDelete = async (projectId: string, projectName: string) => {
    if (confirm(`Are you sure you want to delete "${projectName}"?`)) {
      deleteMutation.mutate(projectId);
    }
  };

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
      <div style={pageStyle}>
        <div style={{ padding: '48px 0', textAlign: 'center', color: '#6b7280' }}>
          Loading projects...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={pageStyle}>
        <div style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '6px',
          padding: '16px'
        }}>
          <h3 style={{ fontSize: '14px', fontWeight: '500', color: '#991b1b', margin: 0 }}>
            Error loading projects
          </h3>
          <p style={{ fontSize: '14px', color: '#dc2626', marginTop: '4px', margin: 0 }}>
            {error instanceof Error ? error.message : 'Failed to load projects'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <div>
          <h1 style={titleStyle}>Projects</h1>
          <p style={subtitleStyle}>Manage your DA submission projects</p>
        </div>
        <Link to="/projects/new" style={buttonStyle}>
          <AddIcon style={iconStyle} />
          New Project
        </Link>
      </div>

      {projects.length === 0 ? (
        <div style={emptyStateStyle}>
          <div style={emptyIconStyle}>
            <AddIcon className="h-12 w-12 text-gray-400" />
          </div>
          <h3 style={{ marginTop: '8px', fontSize: '14px', fontWeight: '500', color: '#111827' }}>
            No projects
          </h3>
          <p style={{ marginTop: '4px', fontSize: '14px', color: '#6b7280' }}>
            Get started by creating your first project.
          </p>
          <div style={{ marginTop: '24px' }}>
            <Link to="/projects/new" style={buttonStyle}>
              <AddIcon style={iconStyle} />
              New Project
            </Link>
          </div>
        </div>
      ) : (
        <div style={projectListStyle}>
          {projects.map((project, index) => (
            <div key={project.id} style={{
              ...projectItemStyle,
              borderBottom: index === projects.length - 1 ? 'none' : '1px solid #e5e7eb'
            }}>
              <div style={projectHeaderStyle}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <h3 style={projectTitleStyle}>
                        {project.name}
                      </h3>
                      <span style={statusBadgeStyle(project.is_active)}>
                        {project.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <code style={slugStyle}>
                      /{project.slug}
                    </code>
                  </div>
                  <p style={descriptionStyle}>
                    {project.description || 'No description'}
                  </p>
                  <div style={metaStyle}>
                    <span>Council: {project.council_name}</span>
                    <span style={{ margin: '0 8px' }}>•</span>
                    <span>Submissions: {project.submission_counts?.total || 0}</span>
                    <span style={{ margin: '0 8px' }}>•</span>
                    <span style={{ textTransform: 'capitalize' }}>Default: {project.default_pathway}</span>
                    {project.test_submission_email && (
                      <>
                        <span style={{ margin: '0 8px' }}>•</span>
                        <span style={{ fontSize: '12px', color: '#7c3aed' }}>Test email: {project.test_submission_email}</span>
                      </>
                    )}
                    {project.action_network_config?.action_url && (
                      <>
                        <span style={{ margin: '0 8px' }}>•</span>
                        <span style={{ fontSize: '12px', color: '#2563eb' }}>Action Network linked</span>
                      </>
                    )}
                  </div>
                  <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                    <span style={{ color: '#6b7280' }}>Public link:</span>
                    <a
                      href={getProjectPublicUrl(project.slug)}
                      target="_blank"
                      rel="noreferrer"
                      style={linkStyle}
                    >
                      {getProjectPublicUrl(project.slug)}
                    </a>
                    <button
                      type="button"
                      onClick={() => handleCopyLink(project.id, getProjectPublicUrl(project.slug))}
                      style={copyButtonStyle}
                    >
                      {copiedProjectId === project.id ? 'Copied!' : 'Copy link'}
                    </button>
                  </div>
                </div>
                <div style={actionsStyle}>
                  <Link
                    to={`/projects/${project.id}`}
                    style={actionButtonStyle('#2563eb')}
                    title="View project"
                  >
                    <ViewIcon style={smallIconStyle} />
                  </Link>
                  <Link
                    to={`/projects/${project.id}/edit`}
                    style={actionButtonStyle('#6b7280')}
                    title="Edit project"
                  >
                    <EditIcon style={smallIconStyle} />
                  </Link>
                  <button
                    style={actionButtonStyle('#dc2626')}
                    title="Delete project"
                    onClick={() => handleDelete(project.id, project.name)}
                    disabled={deleteMutation.isPending}
                  >
                    <DeleteIcon style={smallIconStyle} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
