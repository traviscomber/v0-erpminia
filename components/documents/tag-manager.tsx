'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Save, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface TagManagerProps {
  documentId: string;
  documentName: string;
  currentTags: string[];
  onTagsUpdated?: (tags: string[]) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TagManager({
  documentId,
  documentName,
  currentTags,
  onTagsUpdated,
  open,
  onOpenChange,
}: TagManagerProps) {
  const [tags, setTags] = useState<string[]>(currentTags);
  const [availableTags, setAvailableTags] = useState<{ systemTags: Record<string, string[]>; userTags: string[] }>({
    systemTags: {},
    userTags: [],
  });
  const [newTag, setNewTag] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch available tags
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const res = await fetch('/api/documents/tags?module=prevención');
        const data = await res.json();
        setAvailableTags(data);
      } catch (err) {
        console.error('[v0] Error fetching tags:', err);
      }
    };
    fetchTags();
  }, []);

  const handleAddTag = (tag: string) => {
    if (tags.includes(tag)) {
      setTags(tags.filter((t) => t !== tag));
    } else {
      setTags([...tags, tag]);
    }
  };

  const handleCreateTag = () => {
    if (!newTag.trim()) return;
    if (tags.includes(newTag)) {
      toast.error('Tag already exists');
      return;
    }
    setTags([...tags, newTag]);
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
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId,
          tags,
          module: 'prevención',
        }),
        credentials: 'include',
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Update failed');
      }

      toast.success('Tags updated successfully');
      onTagsUpdated?.(tags);
      onOpenChange(false);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Update failed';
      setError(errorMsg);
      console.error('[v0] Update tags error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gestionar Tags</DialogTitle>
          <DialogDescription>{documentName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="flex gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {/* Current Tags */}
          <div>
            <label className="text-sm font-medium mb-2 block">Tags Seleccionados</label>
            <div className="flex flex-wrap gap-2">
              {tags.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin tags asignados</p>
              ) : (
                tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="cursor-pointer gap-1"
                    onClick={() => handleRemoveTag(tag)}
                  >
                    {tag}
                    <X className="h-3 w-3" />
                  </Badge>
                ))
              )}
            </div>
          </div>

          {/* Add Tags from System */}
          <div>
            <label className="text-sm font-medium mb-2 block">Agregar Tags del Sistema</label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="w-full gap-2">
                  <Plus className="h-4 w-4" />
                  Seleccionar Tags
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                {Object.entries(availableTags.systemTags).map(([category, categoryTags]) => (
                  <div key={category}>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                      {category}
                    </div>
                    {categoryTags.map((tag) => (
                      <DropdownMenuCheckboxItem
                        key={tag}
                        checked={tags.includes(tag)}
                        onCheckedChange={() => handleAddTag(tag)}
                      >
                        {tag}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </div>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Create Custom Tag */}
          <div>
            <label className="text-sm font-medium mb-2 block">Crear Tag Personalizado</label>
            <div className="flex gap-2">
              <Input
                placeholder="Nuevo tag..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCreateTag()}
              />
              <Button onClick={handleCreateTag} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Save */}
          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleSave}
              disabled={loading || JSON.stringify(tags) === JSON.stringify(currentTags)}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {loading ? 'Guardando...' : 'Guardar Tags'}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
