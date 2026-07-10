import React from "react";

interface SchemaFormProps {
  schema: Record<string, any>;
  value?: Record<string, any>;
  onChange?: (values: Record<string, any>) => void;
}

export function SchemaForm({ schema, value = {}, onChange }: SchemaFormProps) {
  const renderField = (key: string, prop: any) => {
    const current = value[key];
    
    switch (prop.type) {
      case "string":
        if (prop.enum) {
          return (
            <select
              key={key}
              value={current || ""}
              onChange={(e) => onChange?.({ ...value, [key]: e.target.value })}
            >
              <option value="">Select {key}</option>
              {prop.enum.map((opt: string) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          );
        }
        return (
          <input
            key={key}
            type="text"
            value={current || ""}
            onChange={(e) => onChange?.({ ...value, [key]: e.target.value })}
            placeholder={key}
          />
        );
      case "number":
        return (
          <input
            key={key}
            type="number"
            min={prop.minimum}
            max={prop.maximum}
            value={current ?? prop.default ?? ""}
            onChange={(e) => onChange?.({ ...value, [key]: Number(e.target.value) })}
            placeholder={key}
          />
        );
      case "array":
        return (
          <textarea
            key={key}
            value={JSON.stringify(current || prop.default || [])}
            onChange={(e) => {
              try {
                onChange?.({ ...value, [key]: JSON.parse(e.target.value) });
              } catch {}
            }}
            placeholder={`[${key}]`}
          />
        );
      default:
        return null;
    }
  };

  const properties = schema?.properties || {};
  
  return (
    <div className="schema-form">
      {Object.entries(properties).map(([key, prop]) => renderField(key, prop))}
    </div>
  );
}