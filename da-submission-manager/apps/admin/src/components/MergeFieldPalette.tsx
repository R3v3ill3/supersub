import React from 'react';

interface MergeField {
  key: string;
  label: string;
}

interface MergeFieldPaletteProps {
  fields: MergeField[];
  onInsert: (token: string) => void;
  disabled?: boolean;
}

export function MergeFieldPalette({ fields, onInsert, disabled }: MergeFieldPaletteProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {fields.map((field) => (
        <button
          key={field.key}
          type="button"
          className="px-2 py-1 text-xs border rounded hover:bg-gray-100"
          onClick={() => onInsert(`{{${field.key}}}`)}
          disabled={disabled}
        >
          {field.label}
        </button>
      ))}
    </div>
  );
}
