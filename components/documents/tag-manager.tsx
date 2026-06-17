'use client';

import { useEffect, useState } from 'react';
import { X, Plus, Save, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

interface TagManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentName: string;
  currentTags: string[];
  onTagsUpdated: (tags: string[]) => void;
}

export function TagManager({
  open,
  onOpenChange,
  documentName,
  currentTags,
  onTagsUpdated,
}: TagManagerProps) {
  const [tags, setTags] = useState<string[]>(currentTags);
  const [availableTags, setAvailableTags] = useState<{ systemTags: Record<string, string[]>; userTags: string[] }>({
    systemTags: {},
    userTags: [],
  });
  const [newTag, setNewTag] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTags(currentTags);
  }, [currentTags]);

  useEffect(() => {
    if (!open) return;
    const fetchTags = async () => {
      try {
        const res = await fetch('/api/documents/tags', { credentials: 'include' });
        const data = await res.json();
        setAvailableTags(data);
      } catch (err) {
        console.error('[v0] Error fetching tags:', err);
      }
    };
    void fetchTags();
  }, [open]);

  const handleAddTag = (tag: string) => {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const handleCreateTag = () => {
    const value = newTag.trim();
    if (!value) return;
    if (tags.includes(value)) return;
    setTags([...tags, value]);
    setNewTag('');
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/documents/update-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ documentName, tags }),
      });
      const err = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(err?.error || 'La actualización falló');
      }
      toast.success('Etiquetas actualizadas correctamente');
      onTagsUpdated(tags);
      onOpenChange(false);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'La actualización falló';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Gestionar etiquetas</DialogTitle>
          <DialogDescription>{documentName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3">
              <AlertCircle className="mt-0.5 h-4 w-4 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-medium">Etiquetas seleccionadas</label>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm hover:bg-muted"
                >
                  {tag}
                  <X className="h-3 w-3" />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Etiquetas disponibles</label>
            <div className="space-y-3">
              {Object.entries(availableTags.systemTags).map(([category, categoryTags]) => (
                <div key={category} className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{category}</p>
                  <div className="flex flex-wrap gap-2">
                    {categoryTags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleAddTag(tag)}
                        className="rounded-full border px-3 py-1 text-sm hover:bg-muted"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateTag()}
              placeholder="Nueva etiqueta"
            />
            <Button type="button" size="sm" onClick={handleCreateTag}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleSave} disabled={loading || JSON.stringify(tags) === JSON.stringify(currentTags)}>
              <Save className="mr-2 h-4 w-4" />
              Guardar cambios
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
