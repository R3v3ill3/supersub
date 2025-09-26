import { useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode, type CSSProperties } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import type { ActionNetworkItem, CreateProjectData } from '../lib/api';

const pageStyle: CSSProperties = {
  padding: '32px',
  backgroundColor: '#f3f4f6',
  minHeight: '100%',
  display: 'flex',
  justifyContent: 'center',
};

const contentStyle: CSSProperties = {
  width: '100%',
  maxWidth: '1080px',
};

const headerStyle: CSSProperties = {
  marginBottom: '32px',
};

const titleStyle: CSSProperties = {
  fontSize: '32px',
  fontWeight: 700,
  color: '#111827',
  margin: 0,
};

const subtitleStyle: CSSProperties = {
  color: '#4b5563',
  marginTop: '8px',
  fontSize: '16px',
};

const sectionStyle: CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: '16px',
  boxShadow: '0 18px 40px rgba(15, 23, 42, 0.08)',
  border: '1px solid #e5e7eb',
  padding: '32px',
  display: 'flex',
  flexDirection: 'column',
  gap: '24px',
};

const sectionHeaderStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const sectionTitleStyle: CSSProperties = {
  fontSize: '20px',
  fontWeight: 600,
  color: '#111827',
  margin: 0,
};

const sectionDescriptionStyle: CSSProperties = {
  color: '#6b7280',
  fontSize: '14px',
  margin: 0,
  lineHeight: 1.5,
};

const twoColumnGridStyle: CSSProperties = {
  display: 'grid',
  gap: '24px',
  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
};

const fieldStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const labelStyle: CSSProperties = {
  fontSize: '14px',
  fontWeight: 600,
  color: '#1f2937',
};

const requiredBadgeStyle: CSSProperties = {
  color: '#ef4444',
  marginLeft: '4px',
};

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  borderRadius: '12px',
  border: '1px solid #d1d5db',
  backgroundColor: '#ffffff',
  fontSize: '14px',
  color: '#111827',
  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
  outline: 'none',
};

const monospaceInputStyle: CSSProperties = {
  ...inputStyle,
  fontFamily: "'JetBrains Mono', 'Fira Code', 'SFMono-Regular', monospace",
  fontSize: '15px',
};

const textareaStyle: CSSProperties = {
  ...inputStyle,
  minHeight: '140px',
  resize: 'vertical',
  lineHeight: 1.5,
};

const helpTextStyle: CSSProperties = {
  fontSize: '13px',
  color: '#6b7280',
  lineHeight: 1.6,
  margin: 0,
};

const toggleRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '18px 20px',
  borderRadius: '12px',
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
};

const checkboxStyle: CSSProperties = {
  width: '18px',
  height: '18px',
  accentColor: '#2563eb',
};

const actionsRowStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '16px',
  marginTop: '32px',
};

const secondaryButtonStyle: CSSProperties = {
  padding: '12px 22px',
  borderRadius: '12px',
  border: '1px solid #d1d5db',
  backgroundColor: '#ffffff',
  color: '#1f2937',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
};

const primaryButtonStyle: CSSProperties = {
  padding: '12px 22px',
  borderRadius: '12px',
  border: 'none',
  background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
  boxShadow: '0 14px 35px rgba(37, 99, 235, 0.25)',
};

const primaryButtonDisabledStyle: CSSProperties = {
  ...primaryButtonStyle,
  opacity: 0.7,
  cursor: 'not-allowed',
  boxShadow: 'none',
};

const statusContainerStyle = (variant: 'success' | 'error'): CSSProperties => ({
  marginTop: '28px',
  padding: '22px',
  borderRadius: '12px',
  border: `1px solid ${variant === 'success' ? '#bbf7d0' : '#fecaca'}`,
  backgroundColor: variant === 'success' ? '#f0fdf4' : '#fef2f2',
  boxShadow: '0 12px 24px rgba(15, 23, 42, 0.08)',
});

const statusTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: '16px',
  fontWeight: 600,
};

const statusBodyStyle: CSSProperties = {
  marginTop: '8px',
  fontSize: '14px',
  lineHeight: 1.5,
};

const previewContainerStyle: CSSProperties = {
  marginTop: '10px',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const previewLabelStyle: CSSProperties = {
  fontSize: '12px',
  fontWeight: 600,
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
};

const previewValueStyle: CSSProperties = {
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '10px',
  padding: '12px 16px',
  fontFamily: "'JetBrains Mono', 'Fira Code', 'SFMono-Regular', monospace",
  fontSize: '13px',
  color: '#111827',
  overflowX: 'auto',
  whiteSpace: 'nowrap',
};

const prefixBadgeStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  backgroundColor: '#eef2ff',
  border: '1px solid #c7d2fe',
  borderRadius: '8px',
  padding: '6px 10px',
  fontFamily: "'JetBrains Mono', 'Fira Code', 'SFMono-Regular', monospace",
  fontSize: '12px',
  color: '#1e3a8a',
};

const AN_FORM_PREFIX = 'https://actionnetwork.org/api/v2/forms/';
const AN_LIST_PREFIX = 'https://actionnetwork.org/api/v2/lists/';
const AN_TAG_PREFIX = 'https://actionnetwork.org/api/v2/tags/';
const AN_GROUP_PREFIX = 'https://actionnetwork.org/api/v2/groups/';

function extractIdFromHref(href: string | undefined, prefix: string) {
  if (!href) return '';
  if (href.startsWith(prefix)) return href.slice(prefix.length);
  const parts = href.split('/');
  return parts[parts.length - 1] || '';
}

function getSelectableValue(item: ActionNetworkItem, prefix: string) {
  const primary = item.id ?? '';
  if (primary) return primary;
  return extractIdFromHref(item.href, prefix);
}

function FormSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section style={sectionStyle}>
      <div style={sectionHeaderStyle}>
        <h2 style={sectionTitleStyle}>{title}</h2>
        {description ? <p style={sectionDescriptionStyle}>{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <label style={labelStyle}>
      {label}
      {required ? <span style={requiredBadgeStyle}>*</span> : null}
    </label>
  );
}

export default function CreateProject() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<CreateProjectData>({
    name: '',
    slug: '',
    description: '',
    council_email: '',
    council_name: '',
    google_doc_template_id: '',
    cover_template_id: '',
    grounds_template_id: '',
    council_subject_template: 'Development application submission opposing application number {{application_number}}',
    council_email_body_template: 'Dear {{council_name}},\n\nPlease find attached the development application submission for {{site_address}}.\n\nApplicant: {{applicant_full_name}}\nEmail: {{applicant_email}}\n{{application_number_line}}\n\nKind regards,\n{{sender_name}}',
    from_email: '',
    from_name: '',
    default_application_number: '',
    subject_template: 'Development Application Submission - {{site_address}}',
    default_pathway: 'review',
    enable_ai_generation: true,
    test_submission_email: '',
    action_network_api_key: '',
    action_network_config: {
      action_url: '',
      form_url: '',
      list_hrefs: [],
      tag_hrefs: [],
      group_hrefs: [],
      custom_fields: {},
    },
  });

  const createProjectMutation = useMutation({
    mutationFn: (data: CreateProjectData) => api.projects.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      navigate('/projects');
    },
  });

  const {
    data: formsResponse,
    isLoading: loadingForms,
    isError: formsError,
    refetch: refetchForms,
  } = useQuery({
    queryKey: ['action-network', 'forms'],
    queryFn: async () => {
      const { data } = await api.actionNetwork.listForms();
      return data.forms ?? [];
    },
  });

  const {
    data: listsResponse,
    isLoading: loadingLists,
    isError: listsError,
    refetch: refetchLists,
  } = useQuery({
    queryKey: ['action-network', 'lists'],
    queryFn: async () => {
      const { data } = await api.actionNetwork.listLists();
      return data.lists ?? [];
    },
  });

  const {
    data: tagsResponse,
    isLoading: loadingTags,
    isError: tagsError,
    refetch: refetchTags,
  } = useQuery({
    queryKey: ['action-network', 'tags'],
    queryFn: async () => {
      const { data } = await api.actionNetwork.listTags();
      return data.tags ?? [];
    },
  });

  const {
    data: groupsResponse,
    isLoading: loadingGroups,
    isError: groupsError,
    refetch: refetchGroups,
  } = useQuery({
    queryKey: ['action-network', 'groups'],
    queryFn: async () => {
      const { data } = await api.actionNetwork.listGroups();
      return data.groups ?? [];
    },
  });

  const forms = formsResponse ?? [];
  const lists = listsResponse ?? [];
  const tags = tagsResponse ?? [];
  const groups = groupsResponse ?? [];

  const [newTagName, setNewTagName] = useState('');
  const [newTagDescription, setNewTagDescription] = useState('');

  const selectedFormId = extractIdFromHref(formData.action_network_config?.action_url, AN_FORM_PREFIX);

  const selectedListIds = useMemo(
    () => (formData.action_network_config?.list_hrefs || []).map((href) => extractIdFromHref(href, AN_LIST_PREFIX)),
    [formData.action_network_config?.list_hrefs]
  );

  const selectedTagIds = useMemo(
    () => (formData.action_network_config?.tag_hrefs || []).map((href) => extractIdFromHref(href, AN_TAG_PREFIX)),
    [formData.action_network_config?.tag_hrefs]
  );

  const selectedGroupIds = useMemo(
    () => (formData.action_network_config?.group_hrefs || []).map((href) => extractIdFromHref(href, AN_GROUP_PREFIX)),
    [formData.action_network_config?.group_hrefs]
  );

  const createTagMutation = useMutation({
    mutationFn: (payload: { name: string; description?: string }) => api.actionNetwork.createTag(payload),
    onSuccess: () => {
      setNewTagName('');
      setNewTagDescription('');
      refetchTags();
    },
  });

  const handleInputChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = event.target;
    const checked = 'checked' in event.target ? event.target.checked : false;
    setFormData((previous) => ({
      ...previous,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    const name = event.target.value;
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    setFormData((previous) => ({
      ...previous,
      name,
      slug,
    }));
  };

  const handleSelectChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = event.target;
    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (createProjectMutation.isPending) {
      return;
    }

    const confirmed = window.confirm('Create a new project with these details?');
    if (!confirmed) {
      return;
    }

    createProjectMutation.mutate({
      ...formData,
    });
  };

  return (
    <div style={pageStyle}>
      <div style={contentStyle}>
        <header style={headerStyle}>
          <h1 style={titleStyle}>Create New Project</h1>
          <p style={subtitleStyle}>Set up a new DA submission project with council and workflow settings.</p>
        </header>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          <FormSection title="Basic Information" description="Project level details used throughout the submission experience.">
            <div style={twoColumnGridStyle}>
              <div style={fieldStyle}>
                <FieldLabel label="Project Name" required />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleNameChange}
                  required
                  placeholder="Southern Gold Caost development"
                  style={inputStyle}
                />
              </div>
              <div style={fieldStyle}>
                <FieldLabel label="URL Slug" required />
                <input
                  type="text"
                  name="slug"
                  value={formData.slug}
                  onChange={handleInputChange}
                  required
                  placeholder="central-park-development"
                  style={inputStyle}
                />
                <p style={helpTextStyle}>Used in URLs and Action Network links.</p>
              </div>
            </div>
            <div style={fieldStyle}>
              <FieldLabel label="Description" />
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Brief description of the project..."
                style={textareaStyle}
              />
            </div>
          </FormSection>

          <FormSection title="Council Information" description="Details used when contacting the council on behalf of supporters.">
            <div style={twoColumnGridStyle}>
              <div style={fieldStyle}>
                <FieldLabel label="Council Name" required />
                <input
                  type="text"
                  name="council_name"
                  value={formData.council_name}
                  onChange={handleInputChange}
                  required
                  placeholder="Gold Coast City Council"
                  style={inputStyle}
                />
              </div>
              <div style={fieldStyle}>
                <FieldLabel label="Attention Of" />
                <input
                  type="text"
                  name="council_attention_of"
                  value={formData.council_attention_of || ''}
                  onChange={handleInputChange}
                  placeholder="Tim Baker, CEO"
                  style={inputStyle}
                />
                <p style={helpTextStyle}>
                  Optional: specify a contact person or title for council correspondence.
                </p>
              </div>
              <div style={fieldStyle}>
                <FieldLabel label="Council Email" required />
                <input
                  type="email"
                  name="council_email"
                  value={formData.council_email}
                  onChange={handleInputChange}
                  required
                  placeholder="mail@goldcoast.qld.gov.au"
                  style={inputStyle}
                />
              </div>
              <div style={fieldStyle}>
                <FieldLabel label="Testing Email Override" />
                <input
                  type="email"
                  name="test_submission_email"
                  value={formData.test_submission_email || ''}
                  onChange={handleInputChange}
                  placeholder="qa@example.org"
                  style={inputStyle}
                />
                <p style={helpTextStyle}>Optional address for dry runs. When provided, Direct submissions go to this inbox instead of council.</p>
              </div>
              <div style={fieldStyle}>
                <FieldLabel label="Default Application Number" required />
                <input
                  type="text"
                  name="default_application_number"
                  value={formData.default_application_number || ''}
                  onChange={handleInputChange}
                  placeholder="COM/2025/271"
                  required
                  style={inputStyle}
                />
                <p style={helpTextStyle}>
                  Used as a fallback when a supporter does not provide an application number. Available in templates as {'{{application_number}}'}.
                </p>
              </div>
            </div>
          </FormSection>

          <FormSection
            title="Action Network Integration"
            description="Link this project to the corresponding Action Network resources so submissions sync automatically."
          >
            <div style={fieldStyle}>
              <FieldLabel label="Action Network API Key" />
              <input
                type="password"
                name="action_network_api_key"
                value={formData.action_network_api_key || ''}
                onChange={handleInputChange}
                placeholder="Your project-specific Action Network API key"
                style={monospaceInputStyle}
              />
              <p style={helpTextStyle}>
                Enter your Action Network API key for this project. This will be stored securely and used instead of the global environment variable. 
                Leave empty to use the global API key (if configured).
              </p>
            </div>

            <div style={fieldStyle}>
              <FieldLabel label="Where do I find these IDs?" />
              <p style={helpTextStyle}>
                Open the resource in Action Network (form, list, tag, or group) → copy the ID from the admin URL
                (e.g. everything after <code style={monospaceInputStyle}>/forms/</code>). Paste just the ID in each
                box below—we'll construct the full API URL for you.
              </p>
            </div>

            <div style={twoColumnGridStyle}>
              <div style={fieldStyle}>
                <FieldLabel label="Action Form" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <select
                    value={selectedFormId}
                    onChange={(event) => {
                      const selectedId = event.target.value;
                      const selectedForm = forms.find((form: ActionNetworkItem) => (form.id || '') === selectedId);
                      setFormData((previous) => ({
                        ...previous,
                        action_network_config: {
                          ...previous.action_network_config,
                          action_url: selectedId ? `${AN_FORM_PREFIX}${selectedId}` : undefined,
                          form_url: selectedForm?.browser_url || previous.action_network_config?.form_url,
                        },
                      }));
                    }}
                    style={inputStyle}
                  >
                    <option value="">Select a form…</option>
                    {forms.map((form: ActionNetworkItem) => {
                      const value = getSelectableValue(form, AN_FORM_PREFIX);
                      return (
                        <option key={value || form.href} value={value}>
                          {form.name} {value ? `(${value})` : ''}
                        </option>
                      );
                    })}
                  </select>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>
                    <button type="button" onClick={() => refetchForms()} style={{ marginRight: '8px' }}>Refresh list</button>
                    {loadingForms && <span>Loading forms…</span>}
                    {formsError && <span style={{ color: '#b91c1c' }}>Failed to load forms</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    <span style={prefixBadgeStyle}>{AN_FORM_PREFIX}</span>
                    <input
                      type="text"
                      value={selectedFormId}
                      onChange={(event) => {
                        const value = event.target.value.trim();
                        setFormData((previous) => ({
                          ...previous,
                          action_network_config: {
                            ...previous.action_network_config,
                            action_url: value ? `${AN_FORM_PREFIX}${value}` : undefined,
                          },
                        }));
                      }}
                      placeholder="c051c79fd89a73751790807c268f92b2"
                      style={monospaceInputStyle}
                    />
                  </div>
                </div>
                <p style={helpTextStyle}>Pick a form or paste the ID from Action Network (the hash after /forms/).</p>
              </div>
              <div style={fieldStyle}>
                <FieldLabel label="Public Form URL" />
                <input
                  type="url"
                  name="form_url"
                  value={formData.action_network_config?.form_url || ''}
                  onChange={(event) =>
                    setFormData((previous) => ({
                      ...previous,
                      action_network_config: {
                        ...previous.action_network_config,
                        form_url: event.target.value,
                      },
                    }))
                  }
                  placeholder="https://actionnetwork.org/forms/..."
                  style={monospaceInputStyle}
                />
                <p style={helpTextStyle}>Optional: used when linking back to Action Network-hosted experiences.</p>
              </div>
            </div>
            <div style={fieldStyle}>
              <FieldLabel label="Default Custom Field Overrides" />
              <p style={helpTextStyle}>
                Optional key/value pairs to attach to every supporter we sync to Action Network. Project metadata like
                `project_id`, `submission_id`, and `application_number` is added automatically.
              </p>
              <textarea
                style={{ ...textareaStyle, minHeight: '140px', fontFamily: 'monospace' }}
                placeholder={`{"campaign":"BeachFront"}`}
                value={JSON.stringify(formData.action_network_config?.custom_fields || {}, null, 2)}
                onChange={(event) => {
                  const raw = event.target.value;
                  setFormData((previous) => {
                    try {
                      const parsed = raw ? JSON.parse(raw) : {};
                      return {
                        ...previous,
                        action_network_config: {
                          ...previous.action_network_config,
                          custom_fields: parsed,
                        },
                      };
                    } catch {
                      return previous;
                    }
                  });
                }}
              />
              <p style={helpTextStyle}>Values must be valid JSON. Leave blank to skip extra fields.</p>
            </div>
            <div style={twoColumnGridStyle}>
              <div style={fieldStyle}>
                <FieldLabel label="List HREFs" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <select
                    multiple
                    value={selectedListIds}
                    onChange={(event) => {
                      const selected = Array.from(event.target.selectedOptions).map((option) => option.value);
                      setFormData((previous) => ({
                        ...previous,
                        action_network_config: {
                          ...previous.action_network_config,
                          list_hrefs: selected.map((id) => `${AN_LIST_PREFIX}${id}`),
                        },
                      }));
                    }}
                    style={{ ...textareaStyle, minHeight: '160px' }}
                  >
                    {lists.map((list: ActionNetworkItem) => {
                      const value = getSelectableValue(list, AN_LIST_PREFIX);
                      return (
                        <option key={value || list.href} value={value}>
                          {list.name} {value ? `(${value})` : ''}
                        </option>
                      );
                    })}
                  </select>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>
                    <button type="button" onClick={() => refetchLists()} style={{ marginRight: '8px' }}>Refresh lists</button>
                    {loadingLists && <span>Loading lists…</span>}
                    {listsError && <span style={{ color: '#b91c1c' }}>Failed to load lists</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'stretch', gap: '8px' }}>
                    <span style={{ ...prefixBadgeStyle, alignSelf: 'flex-start' }}>{AN_LIST_PREFIX}</span>
                    <textarea
                      name="list_hrefs"
                      value={selectedListIds.join('\n')}
                      onChange={(event) => {
                        const values = event.target.value
                          .split('\n')
                          .map((item) => item.trim())
                          .filter(Boolean);
                        setFormData((previous) => ({
                          ...previous,
                          action_network_config: {
                            ...previous.action_network_config,
                            list_hrefs: values.map((id) => `${AN_LIST_PREFIX}${id}`),
                          },
                        }));
                      }}
                      placeholder="{list_id}\n{another_list_id}"
                      style={{ ...textareaStyle, minHeight: '110px' }}
                    />
                  </div>
                </div>
                <p style={helpTextStyle}>Select or paste IDs. Supporters will be subscribed to each selected list.</p>
              </div>
              <div style={fieldStyle}>
                <FieldLabel label="Tag HREFs" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <select
                    multiple
                    value={selectedTagIds}
                    onChange={(event) => {
                      const selected = Array.from(event.target.selectedOptions).map((option) => option.value);
                      setFormData((previous) => ({
                        ...previous,
                        action_network_config: {
                          ...previous.action_network_config,
                          tag_hrefs: selected.map((id) => `${AN_TAG_PREFIX}${id}`),
                        },
                      }));
                    }}
                    style={{ ...textareaStyle, minHeight: '160px' }}
                  >
                    {tags.map((tag: ActionNetworkItem) => {
                      const value = getSelectableValue(tag, AN_TAG_PREFIX);
                      return (
                        <option key={value || tag.href} value={value}>
                          {tag.name} {value ? `(${value})` : ''}
                        </option>
                      );
                    })}
                  </select>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#6b7280' }}>
                    <div>
                      <button type="button" onClick={() => refetchTags()} style={{ marginRight: '8px' }}>Refresh tags</button>
                      {loadingTags && <span>Loading tags…</span>}
                      {tagsError && <span style={{ color: '#b91c1c' }}>Failed to load tags</span>}
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input
                        type="text"
                        value={newTagName}
                        onChange={(event) => setNewTagName(event.target.value)}
                        placeholder="New tag name"
                        style={{ ...inputStyle, fontSize: '12px', padding: '8px 10px' }}
                      />
                      <input
                        type="text"
                        value={newTagDescription}
                        onChange={(event) => setNewTagDescription(event.target.value)}
                        placeholder="Description (optional)"
                        style={{ ...inputStyle, fontSize: '12px', padding: '8px 10px' }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!newTagName.trim()) return;
                          createTagMutation.mutate({ name: newTagName.trim(), description: newTagDescription.trim() || undefined });
                        }}
                        style={{ ...secondaryButtonStyle, padding: '8px 12px' }}
                        disabled={createTagMutation.isPending}
                      >
                        {createTagMutation.isPending ? 'Creating…' : 'Create tag'}
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'stretch', gap: '8px' }}>
                    <span style={{ ...prefixBadgeStyle, alignSelf: 'flex-start' }}>{AN_TAG_PREFIX}</span>
                    <textarea
                      name="tag_hrefs"
                      value={selectedTagIds.join('\n')}
                      onChange={(event) => {
                        const values = event.target.value
                          .split('\n')
                          .map((item) => item.trim())
                          .filter(Boolean);
                        setFormData((previous) => ({
                          ...previous,
                          action_network_config: {
                            ...previous.action_network_config,
                            tag_hrefs: values.map((id) => `${AN_TAG_PREFIX}${id}`),
                          },
                        }));
                      }}
                      placeholder="{tag_id}\n{another_tag_id}"
                      style={{ ...textareaStyle, minHeight: '110px' }}
                    />
                  </div>
                </div>
                <p style={helpTextStyle}>Select or paste IDs. Applied to every supporter synced by this project.</p>
              </div>
            </div>
            <div style={fieldStyle}>
              <FieldLabel label="Group HREFs" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <select
                  multiple
                  value={selectedGroupIds}
                  onChange={(event) => {
                    const selected = Array.from(event.target.selectedOptions).map((option) => option.value);
                    setFormData((previous) => ({
                      ...previous,
                      action_network_config: {
                        ...previous.action_network_config,
                        group_hrefs: selected.map((id) => `${AN_GROUP_PREFIX}${id}`),
                      },
                    }));
                  }}
                  style={{ ...textareaStyle, minHeight: '160px' }}
                >
                  {groups.map((group: ActionNetworkItem) => {
                    const value = getSelectableValue(group, AN_GROUP_PREFIX);
                    return (
                      <option key={value || group.href} value={value}>
                        {group.name} {value ? `(${value})` : ''}
                      </option>
                    );
                  })}
                </select>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  <button type="button" onClick={() => refetchGroups()} style={{ marginRight: '8px' }}>Refresh groups</button>
                  {loadingGroups && <span>Loading groups…</span>}
                  {groupsError && <span style={{ color: '#b91c1c' }}>Failed to load groups</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'stretch', gap: '8px' }}>
                  <span style={{ ...prefixBadgeStyle, alignSelf: 'flex-start' }}>{AN_GROUP_PREFIX}</span>
                  <textarea
                    name="group_hrefs"
                    value={selectedGroupIds.join('\n')}
                    onChange={(event) => {
                      const values = event.target.value
                        .split('\n')
                        .map((item) => item.trim())
                        .filter(Boolean);
                      setFormData((previous) => ({
                        ...previous,
                        action_network_config: {
                          ...previous.action_network_config,
                          group_hrefs: values.map((id) => `${AN_GROUP_PREFIX}${id}`),
                        },
                      }));
                    }}
                    placeholder="{group_id}\n{another_group_id}"
                    style={{ ...textareaStyle, minHeight: '110px' }}
                  />
                </div>
              </div>
              <p style={helpTextStyle}>Optional: add supporters to additional Action Network groups.</p>
            </div>
          </FormSection>

          <FormSection title="Email Configuration" description="Control sender information and subject lines for outgoing emails.">
            <div style={twoColumnGridStyle}>
              <div style={fieldStyle}>
                <FieldLabel label="From Email" />
                <input
                  type="email"
                  name="from_email"
                  value={formData.from_email}
                  onChange={handleInputChange}
                  placeholder="noreply@yourorganisation.org"
                  style={inputStyle}
                />
              </div>
              <div style={fieldStyle}>
                <FieldLabel label="From Name" />
                <input
                  type="text"
                  name="from_name"
                  value={formData.from_name}
                  onChange={handleInputChange}
                  placeholder="DA Submission Manager"
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={fieldStyle}>
              <FieldLabel label="Council Email Subject Template" />
              <input
                type="text"
                name="council_subject_template"
                value={formData.council_subject_template}
                onChange={handleInputChange}
                style={monospaceInputStyle}
                placeholder="Development application submission opposing application number {{application_number}}"
              />
              <p style={helpTextStyle}>
                Used when emailing council directly in the Direct pathway. Supports {'{{site_address}}'}, {'{{application_number}}'}, {'{{applicant_name}}'}.
              </p>
              <SubjectPreview
                template={formData.council_subject_template || ''}
                defaultApplicationNumber={formData.default_application_number || ''}
              />
            </div>

            <div style={fieldStyle}>
              <FieldLabel label="Council Email Body Template" />
              <MergeFieldEditor
                value={formData.council_email_body_template || ''}
                onChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    council_email_body_template: value,
                  }))
                }
                suggestedFields={COVER_EMAIL_FIELDS}
              />
              <p style={helpTextStyle}>
                Default body for emails sent to council. Supports merge fields like {'{{council_name}}'}, {'{{site_address}}'}, {'{{applicant_full_name}}'}, {'{{applicant_email}}'}, {'{{application_number_line}}'}, {'{{sender_name}}'}.
              </p>
            </div>

            <div style={fieldStyle}>
              <FieldLabel label="Supporter Email Subject Template" />
              <input
                type="text"
                name="subject_template"
                value={formData.subject_template}
                onChange={handleInputChange}
                style={monospaceInputStyle}
                placeholder="Development Application Submission - {{site_address}}"
              />
              <p style={helpTextStyle}>
                Used when sending after supporter review or finalisation. Supports {'{{site_address}}'}, {'{{application_number}}'}, {'{{applicant_name}}'}.
              </p>
              <SubjectPreview
                template={formData.subject_template || ''}
                defaultApplicationNumber={formData.default_application_number || ''}
              />
            </div>
          </FormSection>

          <FormSection title="Workflow Settings" description="Choose how documents are generated and which templates power submissions.">
            <div style={twoColumnGridStyle}>
              <div style={fieldStyle}>
                <FieldLabel label="Default Pathway" required />
                <select
                  name="default_pathway"
                  value={formData.default_pathway}
                  onChange={handleSelectChange}
                  required
                  style={inputStyle}
                >
                  <option value="direct">Direct – send immediately to council</option>
                  <option value="review">Review – supporter reviews before sending</option>
                  <option value="draft">Draft – send draft with info pack</option>
                </select>
              </div>
              <div style={fieldStyle}>
                <FieldLabel label="Google Doc Template ID" />
                <input
                  type="text"
                  name="google_doc_template_id"
                  value={formData.google_doc_template_id}
                  onChange={handleInputChange}
                  placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                  style={inputStyle}
                />
                <p style={helpTextStyle}>Copy from the Google Doc URL. The document must be shared with the service account.</p>
              </div>
            </div>

            <div style={twoColumnGridStyle}>
              <div style={fieldStyle}>
                <FieldLabel label="Cover Letter Template ID" />
                <input
                  type="text"
                  name="cover_template_id"
                  value={formData.cover_template_id}
                  onChange={handleInputChange}
                  placeholder="Google Doc ID for cover letter"
                  style={inputStyle}
                />
              </div>
              <div style={fieldStyle}>
                <FieldLabel label="Grounds Template ID" />
                <input
                  type="text"
                  name="grounds_template_id"
                  value={formData.grounds_template_id}
                  onChange={handleInputChange}
                  placeholder="Google Doc ID for grounds"
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={toggleRowStyle}>
              <input
                id="enable_ai_generation"
                type="checkbox"
                name="enable_ai_generation"
                checked={formData.enable_ai_generation}
                onChange={handleInputChange}
                style={checkboxStyle}
              />
              <label htmlFor="enable_ai_generation" style={{ fontSize: '14px', color: '#1f2937' }}>
                Enable AI-generated submission content
              </label>
            </div>
          </FormSection>

          <div style={actionsRowStyle}>
            <button type="button" onClick={() => navigate('/projects')} style={secondaryButtonStyle}>
              Cancel
            </button>
            <button
              type="submit"
              style={createProjectMutation.isPending ? primaryButtonDisabledStyle : primaryButtonStyle}
            >
              {createProjectMutation.isPending ? 'Creating…' : 'Create Project'}
            </button>
          </div>

          {createProjectMutation.isSuccess ? (
            <div style={statusContainerStyle('success')}>
              <h3 style={{ ...statusTitleStyle, color: '#166534' }}>Project created successfully</h3>
              <p style={{ ...statusBodyStyle, color: '#166534' }}>
                You can now view and manage the project from the projects list.
              </p>
            </div>
          ) : null}

          {createProjectMutation.isError ? (
            <div style={statusContainerStyle('error')}>
              <h3 style={{ ...statusTitleStyle, color: '#991b1b' }}>Unable to create project</h3>
              <p style={{ ...statusBodyStyle, color: '#991b1b' }}>
                {createProjectMutation.error instanceof Error
                  ? createProjectMutation.error.message
                  : 'Something went wrong while creating the project. Please try again.'}
              </p>
            </div>
          ) : null}
        </form>
      </div>
    </div>
  );
}

function SubjectPreview({ template, defaultApplicationNumber }: { template: string; defaultApplicationNumber?: string }) {
  const samples: Record<string, string> = {
    site_address: '123 King St, Newtown NSW',
    application_number: defaultApplicationNumber?.trim() || 'DA/2025/1234',
    applicant_name: 'Alex Smith',
  };

  const resolved = template.replace(/{{(site_address|application_number|applicant_name)}}/g, (_match, key) => {
    return samples[key] || '';
  });

  return (
    <div style={previewContainerStyle}>
      <span style={previewLabelStyle}>Preview</span>
      <div style={previewValueStyle}>{resolved}</div>
    </div>
  );
}

const COVER_EMAIL_FIELDS = [
  { key: 'council_name', label: 'Council Name' },
  { key: 'site_address', label: 'Site Address' },
  { key: 'applicant_full_name', label: 'Applicant Full Name' },
  { key: 'applicant_email', label: 'Applicant Email' },
  { key: 'application_number_line', label: 'Application Number Line' },
  { key: 'sender_name', label: 'Sender Name' },
  { key: 'sender_email', label: 'Sender Email' },
  { key: 'project_name', label: 'Project Name' },
];





