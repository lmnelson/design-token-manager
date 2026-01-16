'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTeamStore } from '@/stores/teamStore';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { PIPELINE_TEMPLATES } from '@/types/pipeline';
import { cn } from '@/lib/utils';
import { Check, Layers, Palette, Building2, ArrowLeft, Settings2, Sparkles } from 'lucide-react';

interface CreateProjectDialogProps {
  open: boolean;
  onClose: () => void;
}

// Template icons and colors
const templateConfig = [
  {
    icon: Palette,
    color: 'bg-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    borderColor: 'border-blue-200 dark:border-blue-800',
    selectedBorder: 'ring-2 ring-blue-500',
  },
  {
    icon: Layers,
    color: 'bg-purple-500',
    bgColor: 'bg-purple-50 dark:bg-purple-950/30',
    borderColor: 'border-purple-200 dark:border-purple-800',
    selectedBorder: 'ring-2 ring-purple-500',
  },
  {
    icon: Building2,
    color: 'bg-amber-500',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    borderColor: 'border-amber-200 dark:border-amber-800',
    selectedBorder: 'ring-2 ring-amber-500',
  },
];

// Available layers for custom setup
const AVAILABLE_LAYERS = [
  { id: 'primitives', name: 'Primitives', description: 'Base color scales, spacing, typography values' },
  { id: 'semantic', name: 'Semantic', description: 'Purpose-based tokens (e.g., background, text, border)' },
  { id: 'components', name: 'Components', description: 'Component-specific tokens (e.g., button, card)' },
  { id: 'platform', name: 'Platform', description: 'Platform-specific overrides (web, iOS, Android)' },
  { id: 'theme', name: 'Theme', description: 'Theme variations (compact, comfortable, spacious)' },
];

type Step = 'template' | 'custom' | 'details';
type TemplateSelection = number | 'custom' | 'skip';

export function CreateProjectDialog({ open, onClose }: CreateProjectDialogProps) {
  const router = useRouter();
  const { currentTeamId, createProject } = useTeamStore();
  const [step, setStep] = useState<Step>('template');
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateSelection>(0);
  const [selectedLayers, setSelectedLayers] = useState<string[]>(['primitives', 'semantic', 'components']);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [includeSeedData, setIncludeSeedData] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim() || !currentTeamId) return;

    setIsCreating(true);
    setError(null);

    try {
      let templateIndex: number | undefined;
      let customLayers: string[] | undefined;

      if (selectedTemplate === 'skip') {
        // Minimal setup - just primitives
        customLayers = ['primitives'];
      } else if (selectedTemplate === 'custom') {
        customLayers = selectedLayers;
      } else {
        templateIndex = selectedTemplate;
      }

      const project = await createProject(
        currentTeamId,
        name.trim(),
        description.trim() || undefined,
        templateIndex,
        customLayers,
        includeSeedData
      );
      handleClose();
      // Navigate to the new project
      router.push(`/tokens/${project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    if (!isCreating) {
      setStep('template');
      setSelectedTemplate(0);
      setSelectedLayers(['primitives', 'semantic', 'components']);
      setName('');
      setDescription('');
      setIncludeSeedData(true);
      setError(null);
      onClose();
    }
  };

  const handleNext = () => {
    if (selectedTemplate === 'custom') {
      setStep('custom');
    } else {
      setStep('details');
    }
  };

  const handleBack = () => {
    if (step === 'custom') {
      setStep('template');
    } else if (step === 'details') {
      if (selectedTemplate === 'custom') {
        setStep('custom');
      } else {
        setStep('template');
      }
    }
  };

  const handleSkip = () => {
    setSelectedTemplate('skip');
    setStep('details');
  };

  const toggleLayer = (layerId: string) => {
    setSelectedLayers(prev => {
      if (prev.includes(layerId)) {
        // Don't allow removing the last layer
        if (prev.length === 1) return prev;
        return prev.filter(id => id !== layerId);
      }
      return [...prev, layerId];
    });
  };

  const getTemplateSummary = () => {
    if (selectedTemplate === 'skip') {
      return 'Minimal (Primitives only)';
    }
    if (selectedTemplate === 'custom') {
      const layerNames = selectedLayers
        .map(id => AVAILABLE_LAYERS.find(l => l.id === id)?.name)
        .filter(Boolean);
      return `Custom (${layerNames.join(', ')})`;
    }
    return PIPELINE_TEMPLATES[selectedTemplate]?.name || 'Unknown';
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {step === 'template' && 'Choose a Template'}
            {step === 'custom' && 'Select Layers'}
            {step === 'details' && 'Project Details'}
          </DialogTitle>
          <DialogDescription>
            {step === 'template' && 'Select a pipeline template to get started, or create a custom setup.'}
            {step === 'custom' && 'Choose which layers to include in your token pipeline.'}
            {step === 'details' && 'Give your project a name and description.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'template' ? (
          <div className="py-4">
            <div className="space-y-3">
              {/* Predefined templates */}
              {PIPELINE_TEMPLATES.map((template, index) => {
                const config = templateConfig[index];
                const Icon = config.icon;
                const isSelected = selectedTemplate === index;

                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setSelectedTemplate(index)}
                    className={cn(
                      'w-full p-4 rounded-lg border text-left transition-all',
                      config.bgColor,
                      config.borderColor,
                      isSelected && config.selectedBorder,
                      'hover:shadow-md'
                    )}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={cn(
                          'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                          config.color
                        )}
                      >
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {template.name}
                          </h3>
                          {isSelected && (
                            <Check className="w-4 h-4 text-green-600" />
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                          {template.description}
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {template.layers.map((layer) => (
                            <span
                              key={layer.id}
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-200/80 dark:bg-gray-700/80 text-gray-600 dark:text-gray-300"
                            >
                              {layer.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}

              {/* Custom option */}
              <button
                type="button"
                onClick={() => setSelectedTemplate('custom')}
                className={cn(
                  'w-full p-4 rounded-lg border text-left transition-all',
                  'bg-gray-50 dark:bg-gray-800/50',
                  'border-gray-200 dark:border-gray-700',
                  selectedTemplate === 'custom' && 'ring-2 ring-gray-500',
                  'hover:shadow-md'
                )}
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-gray-500">
                    <Settings2 className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        Custom
                      </h3>
                      {selectedTemplate === 'custom' && (
                        <Check className="w-4 h-4 text-green-600" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                      Choose your own layers and build a custom pipeline
                    </p>
                  </div>
                </div>
              </button>
            </div>

            {/* Skip link */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={handleSkip}
                className="w-full flex items-center justify-center gap-2 py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                Skip and start with a blank canvas
              </button>
            </div>
          </div>
        ) : step === 'custom' ? (
          <div className="py-4">
            <div className="space-y-2">
              {AVAILABLE_LAYERS.map((layer) => {
                const isSelected = selectedLayers.includes(layer.id);
                return (
                  <button
                    key={layer.id}
                    type="button"
                    onClick={() => toggleLayer(layer.id)}
                    className={cn(
                      'w-full p-3 rounded-lg border text-left transition-all flex items-center gap-3',
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800'
                        : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 opacity-60',
                      'hover:opacity-100'
                    )}
                  >
                    <div
                      className={cn(
                        'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                        isSelected
                          ? 'bg-blue-500 border-blue-500'
                          : 'border-gray-300 dark:border-gray-600'
                      )}
                    >
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                        {layer.name}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {layer.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
              Select at least one layer. You can add or remove layers later.
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                placeholder="My Design System"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && name.trim() && handleCreate()}
                disabled={isCreating}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="Design tokens for..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isCreating}
                rows={3}
              />
            </div>

            {/* Show selected template/layers summary */}
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500">Setup:</span>
                <span className="font-medium">{getTemplateSummary()}</span>
              </div>
            </div>

            {/* Include sample tokens option */}
            <div className="flex items-center gap-3">
              <Checkbox
                id="includeSeedData"
                checked={includeSeedData}
                onCheckedChange={(checked) => setIncludeSeedData(checked === true)}
                disabled={isCreating}
              />
              <div className="flex flex-col">
                <Label htmlFor="includeSeedData" className="cursor-pointer">
                  Include sample tokens
                </Label>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Start with example colors, spacing, and typography values
                </span>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}
          </div>
        )}

        <DialogFooter>
          {step === 'template' ? (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleNext}>
                Next
              </Button>
            </>
          ) : step === 'custom' ? (
            <>
              <Button
                variant="outline"
                onClick={handleBack}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <Button onClick={() => setStep('details')} disabled={selectedLayers.length === 0}>
                Next
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={isCreating}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!name.trim() || isCreating}
              >
                {isCreating ? 'Creating...' : 'Create Project'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
