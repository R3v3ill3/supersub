import { useState, useEffect, type FormEvent, type CSSProperties } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type Project } from '../lib/api';

const pageStyle: CSSProperties = {
  padding: '32px',
  backgroundColor: '#f3f4f6',
  minHeight: '100%',
};

const cardStyle: CSSProperties = {
  maxWidth: '800px',
  margin: '0 auto',
  backgroundColor: 'white',
  borderRadius: '12px',
  padding: '32px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
};

const headerStyle: CSSProperties = {
  marginBottom: '24px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
};

const titleStyle: CSSProperties = {
  fontSize: '24px',
  fontWeight: '600',
  color: '#111827',
  margin: 0,
};

const fieldStyle: CSSProperties = {
  marginBottom: '20px',
};

const labelStyle: CSSProperties = {
  display: 'block',
  marginBottom: '6px',
  fontWeight: '500',
  fontSize: '14px',
  color: '#374151',
};

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  fontSize: '14px',
};

const textareaStyle: CSSProperties = {
  ...inputStyle,
  minHeight: '100px',
  resize: 'vertical',
};

const buttonGroupStyle: CSSProperties = {
  display: 'flex',
  gap: '12px',
  justifyContent: 'flex-end',
  marginTop: '32px',
};

const buttonStyle: CSSProperties = {
  padding: '10px 20px',
  borderRadius: '6px',
  fontSize: '14px',
  fontWeight: '500',
  border: 'none',
  cursor: 'pointer',
};

const primaryButtonStyle: CSSProperties = {
  ...buttonStyle,
  backgroundColor: '#2563eb',
  color: 'white',
};

const secondaryButtonStyle: CSSProperties = {
  ...buttonStyle,
  backgroundColor: '#e5e7eb',
  color: '#374151',
};

const checkboxStyle: CSSProperties = {
  marginRight: '8px',
};

export default function EditProject() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: projectResponse, isLoading, error } = useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      if (!id) throw new Error('Project ID is required');
      return api.projects.getById(id);
    },
    enabled: !!id,
  });

  const project = projectResponse?.data?.project as Project | undefined;

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    council_name: '',
    council_email: '',
    council_attention_of: '',
    from_name: '',
    from_email: '',
    subject_template: '',
    default_pathway: 'review' as 'direct' | 'review' | 'draft',
    enable_ai_generation: true,
    is_active: true,
    test_submission_email: '',
  });

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name || '',
        slug: project.slug || '',
        description: project.description || '',
        council_name: project.council_name || '',
        council_email: project.council_email || '',
        council_attention_of: project.council_attention_of || '',
        from_name: project.from_name || '',
        from_email: project.from_email || '',
        subject_template: project.subject_template || '',
        default_pathway: project.default_pathway || 'review',
        enable_ai_generation: project.enable_ai_generation ?? true,
        is_active: project.is_active ?? true,
        test_submission_email: project.test_submission_email || '',
      });
    }
  }, [project]);

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!id) throw new Error('Project ID is required');
      return api.projects.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      navigate('/projects');
    },
    onError: (error: any) => {
      alert(`Failed to update project: ${error.response?.data?.error || error.message}`);
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>Loading project...</div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <p style={{ color: '#dc2626' }}>Error loading project: {error?.message || 'Project not found'}</p>
          <Link to="/projects" style={{ color: '#2563eb' }}>Back to Projects</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={headerStyle}>
          <h1 style={titleStyle}>Edit Project</h1>
          <Link to="/projects" style={{ color: '#6b7280', fontSize: '14px', textDecoration: 'none' }}>
            ← Back
          </Link>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Project Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              style={inputStyle}
              required
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Slug *</label>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              style={inputStyle}
              required
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              style={textareaStyle}
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Council Name *</label>
            <input
              type="text"
              value={formData.council_name}
              onChange={(e) => setFormData({ ...formData, council_name: e.target.value })}
              style={inputStyle}
              required
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Council Email *</label>
            <input
              type="email"
              value={formData.council_email}
              onChange={(e) => setFormData({ ...formData, council_email: e.target.value })}
              style={inputStyle}
              required
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Council Attention Of</label>
            <input
              type="text"
              value={formData.council_attention_of}
              onChange={(e) => setFormData({ ...formData, council_attention_of: e.target.value })}
              style={inputStyle}
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>From Name</label>
            <input
              type="text"
              value={formData.from_name}
              onChange={(e) => setFormData({ ...formData, from_name: e.target.value })}
              style={inputStyle}
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>From Email</label>
            <input
              type="email"
              value={formData.from_email}
              onChange={(e) => setFormData({ ...formData, from_email: e.target.value })}
              style={inputStyle}
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Email Subject Template</label>
            <input
              type="text"
              value={formData.subject_template}
              onChange={(e) => setFormData({ ...formData, subject_template: e.target.value })}
              style={inputStyle}
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Default Pathway</label>
            <select
              value={formData.default_pathway}
              onChange={(e) => setFormData({ ...formData, default_pathway: e.target.value as any })}
              style={inputStyle}
            >
              <option value="direct">Direct</option>
              <option value="review">Review</option>
              <option value="draft">Draft</option>
            </select>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Test Submission Email</label>
            <input
              type="email"
              value={formData.test_submission_email}
              onChange={(e) => setFormData({ ...formData, test_submission_email: e.target.value })}
              style={inputStyle}
            />
          </div>

          <div style={fieldStyle}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formData.enable_ai_generation}
                onChange={(e) => setFormData({ ...formData, enable_ai_generation: e.target.checked })}
                style={checkboxStyle}
              />
              <span style={{ fontSize: '14px', color: '#374151' }}>Enable AI Generation</span>
            </label>
          </div>

          <div style={fieldStyle}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                style={checkboxStyle}
              />
              <span style={{ fontSize: '14px', color: '#374151' }}>Active</span>
            </label>
          </div>

          <div style={buttonGroupStyle}>
            <button
              type="button"
              onClick={() => navigate('/projects')}
              style={secondaryButtonStyle}
              disabled={updateMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={primaryButtonStyle}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}