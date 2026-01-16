'use client';

import React, { useState } from 'react';
import { usePipelineStore } from '@/stores/pipelineStore';
import { PIPELINE_TEMPLATES } from '@/types/pipeline';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Plus,
  Trash2,
  X,
  GripVertical,
  Layers,
  ChevronDown,
  ChevronRight,
  Lightbulb,
  Palette,
  Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Icons for example templates
const TEMPLATE_ICONS = [Palette, Layers, Building2];

export function LayersVariablesTab() {
  const {
    pipeline,
    addLayer,
    updateLayer,
    removeLayer,
    getLayerVariants,
    addVariantToLayer,
    removeVariantFromLayer,
  } = usePipelineStore();

  // New layer form
  const [newLayerName, setNewLayerName] = useState('');
  const [newLayerDesc, setNewLayerDesc] = useState('');

  // Add variant state per layer
  const [addingVariantTo, setAddingVariantTo] = useState<string | null>(null);
  const [newVariantName, setNewVariantName] = useState('');

  // Examples section
  const [showExamples, setShowExamples] = useState(false);
  const [expandedExample, setExpandedExample] = useState<number | null>(null);

  const handleAddLayer = () => {
    if (!newLayerName.trim()) return;

    addLayer({
      name: newLayerName.trim(),
      variables: [],
      required: false,
      description: newLayerDesc.trim() || undefined,
    });

    setNewLayerName('');
    setNewLayerDesc('');
  };

  const handleAddVariant = (layerId: string) => {
    if (!newVariantName.trim()) return;
    addVariantToLayer(layerId, newVariantName.trim());
    setNewVariantName('');
    setAddingVariantTo(null);
  };

  const sortedLayers = [...pipeline.layers].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-6">
      {/* Examples Section */}
      <div className="border border-amber-200 dark:border-amber-800 rounded-lg bg-amber-50/50 dark:bg-amber-900/10">
        <button
          onClick={() => setShowExamples(!showExamples)}
          className="w-full flex items-center gap-2 p-3 text-left"
        >
          <Lightbulb className="w-4 h-4 text-amber-600" />
          <span className="flex-1 text-sm font-medium text-amber-800 dark:text-amber-200">
            Example Pipeline Structures
          </span>
          {showExamples ? (
            <ChevronDown className="w-4 h-4 text-amber-600" />
          ) : (
            <ChevronRight className="w-4 h-4 text-amber-600" />
          )}
        </button>

        {showExamples && (
          <div className="px-3 pb-3 space-y-2">
            <p className="text-xs text-amber-700 dark:text-amber-300 mb-3">
              Reference these examples to see common pipeline structures. Click to expand details.
            </p>

            {PIPELINE_TEMPLATES.map((template, index) => {
              const Icon = TEMPLATE_ICONS[index] || Layers;
              const isExpanded = expandedExample === index;

              return (
                <div
                  key={index}
                  className="border border-amber-200 dark:border-amber-700 rounded-lg bg-white dark:bg-gray-800 overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedExample(isExpanded ? null : index)}
                    className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <Icon className="w-5 h-5 text-amber-600" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{template.name}</div>
                      <div className="text-xs text-gray-500">{template.description}</div>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="px-3 pb-3 border-t border-gray-100 dark:border-gray-700">
                      {/* Variables */}
                      {template.variables && template.variables.length > 0 && (
                        <div className="mt-3">
                          <p className="text-[10px] uppercase font-medium text-gray-500 mb-1.5">
                            Variables
                          </p>
                          <div className="space-y-1">
                            {template.variables.map((variable, vIndex) => (
                              <div
                                key={vIndex}
                                className="flex items-center justify-between text-xs p-2 bg-gray-50 dark:bg-gray-700/50 rounded"
                              >
                                <span className="font-medium">{variable.name}</span>
                                <div className="flex gap-1">
                                  {variable.values.map((value) => (
                                    <span
                                      key={value}
                                      className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-[10px]"
                                    >
                                      {value}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Layers */}
                      <div className="mt-3">
                        <p className="text-[10px] uppercase font-medium text-gray-500 mb-1.5">
                          Layers
                        </p>
                        <div className="space-y-1">
                          {template.layers.map((layer, lIndex) => (
                            <div
                              key={lIndex}
                              className="flex items-center justify-between text-xs p-2 bg-gray-50 dark:bg-gray-700/50 rounded"
                            >
                              <div>
                                <span className="font-medium">{layer.name}</span>
                                {layer.description && (
                                  <span className="text-gray-500 ml-1">- {layer.description}</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {(layer.variables || []).length > 0 ? (
                                  <span className="text-[10px] px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 rounded">
                                    {(layer.variables || []).join(', ')}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-gray-400">static</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Current Layers */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Layers className="w-5 h-5 text-green-500" />
          <h3 className="text-sm font-semibold">Your Layers</h3>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          Add variants to create different versions of a layer (e.g., light/dark modes, brand variations).
        </p>

        {/* Layers list */}
        <div className="space-y-3">
          {sortedLayers.length === 0 ? (
            <p className="text-sm text-gray-400 italic py-4 text-center">
              No layers yet. Add a layer to get started.
            </p>
          ) : (
            sortedLayers.map((layer) => {
              const variants = getLayerVariants(layer.id);
              const isAddingVariant = addingVariantTo === layer.id;

              return (
                <div
                  key={layer.id}
                  className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  {/* Layer header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <GripVertical className="w-4 h-4 text-gray-400" />
                      <div>
                        <span className="font-medium text-sm">{layer.name}</span>
                        {layer.description && (
                          <span className="text-xs text-gray-500 ml-2">- {layer.description}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Checkbox
                          checked={layer.required}
                          onCheckedChange={(checked) =>
                            updateLayer(layer.id, { required: checked === true })
                          }
                        />
                        Required
                      </label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLayer(layer.id)}
                        className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Variants */}
                  <div>
                    <p className="text-xs text-gray-500 mb-2">Variants:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {variants.length === 0 && !isAddingVariant && (
                        <span className="text-xs text-gray-400 italic">
                          No variants (static layer)
                        </span>
                      )}

                      {variants.map((variant) => (
                        <span
                          key={variant}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded text-xs"
                        >
                          {variant}
                          <button
                            onClick={() => removeVariantFromLayer(layer.id, variant)}
                            className="hover:text-red-500"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}

                      {isAddingVariant ? (
                        <div className="flex items-center gap-1">
                          <Input
                            value={newVariantName}
                            onChange={(e) => setNewVariantName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleAddVariant(layer.id);
                              if (e.key === 'Escape') {
                                setNewVariantName('');
                                setAddingVariantTo(null);
                              }
                            }}
                            placeholder="e.g., dark"
                            className="h-6 w-24 text-xs"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            onClick={() => handleAddVariant(layer.id)}
                            disabled={!newVariantName.trim()}
                            className="h-6 px-2 text-xs"
                          >
                            Add
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setNewVariantName('');
                              setAddingVariantTo(null);
                            }}
                            className="h-6 w-6 p-0"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setAddingVariantTo(layer.id)}
                          className="inline-flex items-center gap-1 px-2 py-1 border border-dashed border-gray-300 dark:border-gray-600 text-gray-500 rounded text-xs hover:border-indigo-400 hover:text-indigo-500"
                        >
                          <Plus className="w-3 h-3" />
                          Add variant
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Add new layer form */}
      <div className="p-3 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
        <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
          Add New Layer
        </p>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div>
            <Label className="text-xs">Name</Label>
            <Input
              value={newLayerName}
              onChange={(e) => setNewLayerName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddLayer()}
              placeholder="Semantic"
              className="h-8 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs">Description (optional)</Label>
            <Input
              value={newLayerDesc}
              onChange={(e) => setNewLayerDesc(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddLayer()}
              placeholder="Semantic tokens"
              className="h-8 text-sm"
            />
          </div>
        </div>
        <Button
          onClick={handleAddLayer}
          disabled={!newLayerName.trim()}
          size="sm"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Layer
        </Button>
      </div>
    </div>
  );
}
