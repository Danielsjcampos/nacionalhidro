import React from 'react';

interface WorkflowField {
  id: string;
  nome: string;
  label: string;
  tipo: 'TEXT' | 'NUMBER' | 'SELECT' | 'DATE' | 'FILE' | 'CHECKBOX' | string;
  obrigatorio: boolean;
  opcoes?: any; // Pode ser array de strings ou objeto
}

interface FormRendererProps {
  fields: WorkflowField[];
  values: Record<string, any>;
  onChange: (nome: string, value: any) => void;
  disabled?: boolean;
}

/**
 * Renderizador dinâmico de formulários baseado nos campos do Workflow.
 */
const FormRenderer: React.FC<FormRendererProps> = ({ fields, values, onChange, disabled }) => {
  const renderField = (field: WorkflowField) => {
    const value = values[field.nome] || '';
    
    switch (field.tipo) {
      case 'SELECT':
        const options = Array.isArray(field.opcoes) ? field.opcoes : [];
        return (
          <select
            title={field.label}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            value={value}
            onChange={(e) => onChange(field.nome, e.target.value)}
            disabled={disabled}
          >
            <option value="">Selecione...</option>
            {options.map((opt: string) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        );

      case 'DATE':
        return (
          <input
            type="date"
            title={field.label}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            value={value}
            onChange={(e) => onChange(field.nome, e.target.value)}
            disabled={disabled}
          />
        );

      case 'NUMBER':
        return (
          <input
            type="number"
            title={field.label}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            value={value}
            onChange={(e) => onChange(field.nome, e.target.value)}
            disabled={disabled}
            placeholder="0"
          />
        );

      case 'CHECKBOX':
        return (
          <div className="flex items-center mt-2">
            <input
              type="checkbox"
              id={field.id}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
              checked={!!value}
              onChange={(e) => onChange(field.nome, e.target.checked)}
              disabled={disabled}
            />
            <label htmlFor={field.id} className="ml-2 text-sm text-gray-700">
              {field.label}
            </label>
          </div>
        );

      default:
        return (
          <input
            type="text"
            title={field.label}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            value={value}
            onChange={(e) => onChange(field.nome, e.target.value)}
            disabled={disabled}
            placeholder={field.label}
          />
        );
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {fields.map((field) => (
        <div key={field.id} className={`flex flex-col ${field.tipo === 'TEXTAREA' ? 'md:col-span-2' : ''}`}>
          {field.tipo !== 'CHECKBOX' && (
            <label className="text-sm font-semibold text-gray-600 mb-1">
              {field.label} {field.obrigatorio && <span className="text-red-500">*</span>}
            </label>
          )}
          {renderField(field)}
        </div>
      ))}
    </div>
  );
};

export default FormRenderer;
