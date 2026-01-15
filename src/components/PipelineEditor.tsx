'use client';

import React, { useState, useCallback } from 'react';
import {
  X,
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronRight,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePipelineStore } from '@/stores/pipelineStore';
import { PIPELINE_TEMPLATES } from '@/types/pipeline';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface PipelineEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PipelineEditor({ open, onOpenChange }: PipelineEditorProps) {
  const {
    pipeline,
    addVariable,
    updateVariable,
    removeVariable,
    addVariableValue,
    removeVariableValue,
    addLayer,
    updateLayer,
    removeLayer,
    reorderLayers,
    createFromTemplate,
  } = usePipelineStore();

  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['variables', 'layers'])
  );
  const [newVariableName, setNewVariableName] = useState('');
  const [newLayerName, setNewLayerName] = useState('');

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const handleAddVariable = useCallback(() => {
    if (!newVariableName.trim()) return;
    const key = newVariableName.toLowerCase().replace(/\s+/g, '-');
    addVariable({
      name: newVariableName.trim(),
      key,
      values: [],
    });
    setNewVariableName('');
  }, [newVariableName, addVariable]);

  const handleAddLayer = useCallback(() => {
    if (!newLayerName.trim()) return;
    addLayer({
      name: newLayerName.trim(),
      variables: [],
      required: true,
    });
    setNewLayerName('');
  }, [newLayerName, addLayer]);

  const handleAddValueToVariable = useCallback(
    (variableId: string) => {
      const value = prompt('Enter new value:');
      if (value?.trim()) {
        addVariableValue(variableId, value.trim());
      }
    },
    [addVariableValue]
  );

  const handleToggleLayerVariable = useCallback(
    (layerId: string, variableKey: string, currentVariables: string[]) => {
      const hasVariable = currentVariables.includes(variableKey);
      const newVariables = hasVariable
        ? currentVariables.filter((v) => v !== variableKey)
        : [...currentVariables, variableKey];
      updateLayer(layerId, { variables: newVariables });
    },
    [updateLayer]
  );

  const sortedLayers = [...pipeline.layers].sort((a, b) => a.order - b.order);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Pipeline Configuration</DialogTitle>
          <DialogDescription>
            Configure variables and layers for your token build pipeline.
            Layers are merged in order - bottom layers override top layers.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4 py-4">
          {/* Templates */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Start from Template
              </span>
            </div>
            <Select onValueChange={(value) => createFromTemplate(parseInt(value))}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a template..." />
              </SelectTrigger>
              <SelectContent>
                {PIPELINE_TEMPLATES.map((template, index) => (
                  <SelectItem key={index} value={index.toString()}>
                    <div className="flex flex-col">
                      <span>{template.name}</span>
                      <span className="text-xs text-gray-500">
                        {template.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Variables Section */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              onClick={() => toggleSection('variables')}
            >
              <span className="font-medium text-gray-700 dark:text-gray-300">
                Variables ({pipeline.variables.length})
              </span>
              {expandedSections.has('variables') ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )}
            </button>

            {expandedSections.has('variables') && (
              <div className="p-4 space-y-3">
                {pipeline.variables.map((variable) => (
                  <div
                    key={variable.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-md p-3"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Input
                          value={variable.name}
                          onChange={(e) =>
                            updateVariable(variable.id, { name: e.target.value })
                          }
                          className="w-32 h-8 text-sm"
                        />
                        <span className="text-xs text-gray-500 font-mono">
                          ${variable.key}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeVariable(variable.id)}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {variable.values.map((value) => (
                        <span
                          key={value}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs"
                        >
                          {value}
                          <button
                            onClick={() => removeVariableValue(variable.id, value)}
                            className="hover:text-red-500"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                      <button
                        onClick={() => handleAddValueToVariable(variable.id)}
                        className="inline-flex items-center gap-1 px-2 py-1 border border-dashed border-gray-300 dark:border-gray-600 rounded text-xs text-gray-500 hover:text-gray-700 hover:border-gray-400"
                      >
                        <Plus className="w-3 h-3" />
                        Add
                      </button>
                    </div>
                  </div>
                ))}

                {/* Add new variable */}
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="New variable name..."
                    value={newVariableName}
                    onChange={(e) => setNewVariableName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddVariable()}
                    className="flex-1 h-8 text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddVariable}
                    disabled={!newVariableName.trim()}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Variable
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Layers Section */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              onClick={() => toggleSection('layers')}
            >
              <span className="font-medium text-gray-700 dark:text-gray-300">
                Layers ({pipeline.layers.length})
              </span>
              {expandedSections.has('layers') ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )}
            </button>

            {expandedSections.has('layers') && (
              <div className="p-4 space-y-2">
                <div className="text-xs text-gray-500 mb-3">
                  Drag to reorder. Bottom layers override top layers.
                </div>

                {sortedLayers.map((layer, index) => (
                  <div
                    key={layer.id}
                    className="flex items-center gap-2 border border-gray-200 dark:border-gray-700 rounded-md p-2 bg-white dark:bg-gray-800"
                  >
                    <GripVertical className="w-4 h-4 text-gray-400 cursor-grab" />
                    <span className="text-xs text-gray-400 w-4">{index + 1}</span>
                    <Input
                      value={layer.name}
                      onChange={(e) =>
                        updateLayer(layer.id, { name: e.target.value })
                      }
                      className="flex-1 h-7 text-sm"
                    />

                    {/* Variable toggles */}
                    <div className="flex items-center gap-1">
                      {pipeline.variables.map((variable) => (
                        <button
                          key={variable.id}
                          onClick={() =>
                            handleToggleLayerVariable(
                              layer.id,
                              variable.key,
                              layer.variables
                            )
                          }
                          className={cn(
                            'px-2 py-0.5 text-xs rounded border transition-colors',
                            layer.variables.includes(variable.key)
                              ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                              : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500'
                          )}
                        >
                          ${variable.key}
                        </button>
                      ))}
                    </div>

                    {/* Required toggle */}
                    <button
                      onClick={() =>
                        updateLayer(layer.id, { required: !layer.required })
                      }
                      className={cn(
                        'px-2 py-0.5 text-xs rounded border transition-colors',
                        layer.required
                          ? 'bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400'
                          : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400'
                      )}
                    >
                      {layer.required ? 'Required' : 'Optional'}
                    </button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeLayer(layer.id)}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50 h-7 w-7 p-0"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}

                {/* Add new layer */}
                <div className="flex items-center gap-2 mt-3">
                  <Input
                    placeholder="New layer name..."
                    value={newLayerName}
                    onChange={(e) => setNewLayerName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddLayer()}
                    className="flex-1 h-8 text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddLayer}
                    disabled={!newLayerName.trim()}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Layer
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
