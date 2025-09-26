import React, { useMemo } from 'react';

interface MergeField {
  key: string;
  label: string;
}

interface MergeFieldEditorProps {
  value: string;
  onChange: (value: string) => void;
  suggestedFields: MergeField[];
  readOnly?: boolean;
}

const buttonStyles = 'px-2 py-1 text-xs border rounded hover:bg-gray-100';

export function MergeFieldEditor({ value, onChange, suggestedFields, readOnly }: MergeFieldEditorProps) {
  const fields = useMemo(() => suggestedFields.map((field) => ({ ...field, token: `{{${field.key}}}` })), [suggestedFields]);

  const handleInsert = (token: string) => {
    onChange(`${value}${value.endsWith(' ') || value.length === 0 ? '' : ' '}${token}`);
  };

  return (
    <div className="space-y-2">
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={6}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
        readOnly={readOnly}
      />
      <div className="flex flex-wrap gap-2">
        {fields.map((field) => (
          <button
            key={field.key}
            type="button"
            className={buttonStyles}
            onClick={() => handleInsert(field.token)}
            disabled={readOnly}
          >
            {field.label}
          </button>
        ))}
      </div>
    </div>
  );
}
