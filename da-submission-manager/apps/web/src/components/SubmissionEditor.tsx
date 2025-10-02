import { useState, useEffect } from 'react';

interface EditableSection {
  type: 'header' | 'label' | 'value' | 'grounds' | 'declaration' | 'text';
  content: string;
  editable: boolean;
  key: string;
}

interface SubmissionEditorProps {
  value: string;
  onChange: (newValue: string) => void;
}

/**
 * Structured editor that allows editing only specific parts of the submission
 * - Applicant details (values only)
 * - Grounds content
 * - Greys out non-editable structure
 */
export default function SubmissionEditor({ value, onChange }: SubmissionEditorProps) {
  const [sections, setSections] = useState<EditableSection[]>([]);

  useEffect(() => {
    // Parse the markdown into editable and non-editable sections
    const parsed = parseSubmission(value);
    setSections(parsed);
  }, [value]);

  const handleSectionChange = (key: string, newContent: string) => {
    const updated = sections.map(section => 
      section.key === key ? { ...section, content: newContent } : section
    );
    setSections(updated);
    
    // Reconstruct the full text
    const reconstructed = reconstructSubmission(updated);
    onChange(reconstructed);
  };

  return (
    <div className="border border-gray-300 rounded-md bg-white">
      <div className="px-6 py-4 space-y-3" style={{ minHeight: '500px', maxHeight: '700px', overflowY: 'auto' }}>
        {sections.map((section, idx) => {
          if (section.type === 'header') {
            return (
              <div key={section.key} className={getHeaderClassName(section.content)}>
                {section.content.replace(/^#+\s*/, '')}
              </div>
            );
          }

          if (section.type === 'label') {
            return (
              <span key={section.key} className="text-sm font-medium text-gray-500">
                {section.content}
              </span>
            );
          }

          if (section.type === 'value') {
            if (section.editable) {
              return (
                <div key={section.key} className="mb-2">
                  <input
                    type="text"
                    value={section.content}
                    onChange={(e) => handleSectionChange(section.key, e.target.value)}
                    className="w-full border border-blue-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
              );
            } else {
              return (
                <div key={section.key} className="text-sm text-gray-500 mb-2">
                  {section.content}
                </div>
              );
            }
          }

          if (section.type === 'grounds') {
            if (section.editable) {
              return (
                <div key={section.key} className="mb-4">
                  <textarea
                    value={section.content}
                    onChange={(e) => handleSectionChange(section.key, e.target.value)}
                    rows={15}
                    className="w-full border border-blue-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-sans"
                    placeholder="Enter your grounds for submission..."
                  />
                </div>
              );
            } else {
              // This shouldn't happen, but fallback to grey text
              return (
                <div key={section.key} className="text-sm text-gray-500 italic whitespace-pre-wrap mb-4">
                  {section.content}
                </div>
              );
            }
          }

          if (section.type === 'declaration') {
            if (section.editable) {
              return (
                <div key={section.key} className="mb-4">
                  <textarea
                    value={section.content}
                    onChange={(e) => handleSectionChange(section.key, e.target.value)}
                    rows={8}
                    className="w-full border border-blue-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-sans"
                    placeholder="Declaration text..."
                  />
                </div>
              );
            } else {
              return (
                <div key={section.key} className="text-sm text-gray-500 italic whitespace-pre-wrap">
                  {section.content}
                </div>
              );
            }
          }

          if (section.type === 'text') {
            return (
              <div key={section.key} className="text-sm text-gray-500 italic whitespace-pre-wrap">
                {section.content}
              </div>
            );
          }

          return (
            <div key={section.key} className="text-sm text-gray-600">
              {section.content}
            </div>
          );
        })}
      </div>
      
      <div className="px-6 py-3 bg-blue-50 border-t border-blue-100">
        <div className="flex items-center text-xs text-blue-700">
          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <span>
            <strong>Editable:</strong> White fields with blue border. 
            <strong className="ml-3">Protected:</strong> Grey text (structure & labels).
          </span>
        </div>
      </div>
    </div>
  );
}

function getHeaderClassName(content: string): string {
  if (content.startsWith('# ')) {
    return 'text-2xl font-bold text-gray-700 mb-4 mt-6';
  }
  if (content.startsWith('## ')) {
    return 'text-xl font-bold text-gray-700 mb-3 mt-5';
  }
  if (content.startsWith('### ')) {
    return 'text-lg font-semibold text-gray-700 mb-2 mt-4';
  }
  return 'text-base font-semibold text-gray-700 mb-2';
}

/**
 * Parse the submission markdown into structured sections
 */
function parseSubmission(text: string): EditableSection[] {
  const sections: EditableSection[] = [];
  const lines = text.split('\n');
  let currentKey = 0;
  let inGrounds = false;
  let groundsContent: string[] = [];
  let inDeclaration = false;
  let declarationContent: string[] = [];
  let currentSection: 'property' | 'submitter' | 'grounds' | 'declaration' | 'other' = 'other';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Headers
    if (line.match(/^#{1,3}\s+/)) {
      // If we were collecting grounds, save them first
      if (inGrounds) {
        sections.push({
          type: 'grounds',
          content: groundsContent.join('\n').trim(),
          editable: true,
          key: `grounds-${currentKey++}`
        });
        groundsContent = [];
        inGrounds = false;
      }
      
      sections.push({
        type: 'header',
        content: line,
        editable: false,
        key: `header-${currentKey++}`
      });
      
      // Determine which section we're in based on the header
      // ACTUAL headers from SubmissionFormatterService:
      // ## Application details (property - NOT editable)
      // ## Submitter details (submitter - editable)
      // ## Submission details (form position)
      // ## Grounds of submission: (grounds - editable)
      // ## Declaration (declaration - editable)
      
      if (line.includes('Application details')) {
        currentSection = 'property';
      } else if (line.includes('Submitter details')) {
        currentSection = 'submitter';
      } else if (line.includes('Grounds of submission')) {
        currentSection = 'grounds';
        inGrounds = true;
      } else if (line.includes('Declaration')) {
        currentSection = 'declaration';
        inDeclaration = true;
      } else if (line.includes('Submission details')) {
        // This is just the position (Objecting/Supporting), treat as property
        currentSection = 'property';
      }
      
      continue;
    }

    // If we're in declaration section, collect and make editable
    if (inDeclaration) {
      declarationContent.push(line);
      continue;
    }

    // If we're in grounds section, collect all content
    if (inGrounds) {
      // Stop collecting if we hit the footer text that starts with "The above grounds focus on"
      // This comes after a --- separator in the formatter
      if (line.includes('The above grounds focus on')) {
        // Save the grounds content (but don't include the trailing ---)
        const content = groundsContent.join('\n').trim();
        // Remove trailing --- if present
        const cleanContent = content.replace(/\n*---\n*$/, '').trim();
        
        sections.push({
          type: 'grounds',
          content: cleanContent,
          editable: true,
          key: `grounds-${currentKey++}`
        });
        groundsContent = [];
        inGrounds = false;
        
        // Add this line as non-editable text
        sections.push({
          type: 'text',
          content: line,
          editable: false,
          key: `text-${currentKey++}`
        });
        continue;
      }
      groundsContent.push(line);
      continue;
    }

    // Field patterns: **Label:** value
    const fieldMatch = line.match(/^(\*\*[^*]+\*\*:?\s*)(.*)/);
    if (fieldMatch) {
      const [, label, valueText] = fieldMatch;
      
      sections.push({
        type: 'label',
        content: label,
        editable: false,
        key: `label-${currentKey++}`
      });
      
      // Property Details fields are NOT editable, Submitter Details ARE editable
      const isEditable = currentSection === 'submitter';
      
      sections.push({
        type: 'value',
        content: valueText,
        editable: isEditable,
        key: `value-${currentKey++}`
      });
      continue;
    }

    // Regular text lines (non-editable)
    if (line.trim()) {
      sections.push({
        type: 'text',
        content: line,
        editable: false,
        key: `text-${currentKey++}`
      });
    } else {
      // Empty line
      sections.push({
        type: 'text',
        content: '',
        editable: false,
        key: `empty-${currentKey++}`
      });
    }
  }

  // Don't forget to add any remaining grounds or declaration content
  if (groundsContent.length > 0) {
    sections.push({
      type: 'grounds',
      content: groundsContent.join('\n').trim(),
      editable: true,
      key: `grounds-${currentKey++}`
    });
  }

  if (declarationContent.length > 0) {
    sections.push({
      type: 'declaration',
      content: declarationContent.join('\n').trim(),
      editable: true, // Make declaration editable
      key: `declaration-${currentKey++}`
    });
  }

  return sections;
}

/**
 * Reconstruct the full submission text from sections
 */
function reconstructSubmission(sections: EditableSection[]): string {
  const lines: string[] = [];
  
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const nextSection = sections[i + 1];

    if (section.type === 'header') {
      lines.push(section.content);
    } else if (section.type === 'label') {
      // Label and value should be on the same line
      if (nextSection && nextSection.type === 'value') {
        lines.push(section.content + nextSection.content);
        i++; // Skip the next section since we've already processed it
      } else {
        lines.push(section.content);
      }
    } else if (section.type === 'grounds') {
      lines.push(section.content);
    } else if (section.type === 'declaration') {
      lines.push(section.content);
    } else if (section.type === 'text') {
      lines.push(section.content);
    }
  }

  return lines.join('\n');
}

