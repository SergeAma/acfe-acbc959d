import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Edit, Trash2, Save, Globe, RefreshCw, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { translations, Language } from '@/lib/translations';

interface TranslationOverride {
  id: string;
  language: string;
  translation_key: string;
  translation_value: string;
  created_at: string;
  updated_at: string;
}

export const AdminTranslations = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('en');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showEditDialog, setShowEditDialog] = useState(false);
  const queryClient = useQueryClient();

  // Fetch all overrides
  const { data: overrides = [], isLoading } = useQuery({
    queryKey: ['admin-translation-overrides'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('translation_overrides')
        .select('*')
        .order('translation_key');

      if (error) throw error;
      return data as TranslationOverride[];
    },
  });

  // Save override mutation
  const saveMutation = useMutation({
    mutationFn: async ({ language, key, value }: { language: string; key: string; value: string }) => {
      const { error } = await supabase
        .from('translation_overrides')
        .upsert(
          {
            language,
            translation_key: key,
            translation_value: value,
          },
          {
            onConflict: 'language,translation_key',
          }
        );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-translation-overrides'] });
      queryClient.invalidateQueries({ queryKey: ['translation-overrides'] });
      toast.success('Translation saved');
      setShowEditDialog(false);
      setEditingKey(null);
    },
    onError: (error) => {
      console.error('Error saving translation:', error);
      toast.error('Failed to save translation');
    },
  });

  // Delete override mutation
  const deleteMutation = useMutation({
    mutationFn: async ({ language, key }: { language: string; key: string }) => {
      const { error } = await supabase
        .from('translation_overrides')
        .delete()
        .eq('language', language)
        .eq('translation_key', key);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-translation-overrides'] });
      queryClient.invalidateQueries({ queryKey: ['translation-overrides'] });
      toast.success('Override deleted, default restored');
    },
    onError: (error) => {
      console.error('Error deleting override:', error);
      toast.error('Failed to delete override');
    },
  });

  // Get all translation keys and their values
  const allKeys = Object.keys(translations.en);
  const overrideMap = new Map(
    overrides
      .filter(o => o.language === selectedLanguage)
      .map(o => [o.translation_key, o])
  );

  // Filter keys based on search
  const filteredKeys = allKeys.filter(key =>
    key.toLowerCase().includes(searchQuery.toLowerCase()) ||
    translations[selectedLanguage]?.[key]?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group keys by category
  const groupedKeys = filteredKeys.reduce((acc, key) => {
    const category = key.split('.')[0] || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(key);
    return acc;
  }, {} as Record<string, string[]>);

  const handleEdit = (key: string) => {
    const override = overrideMap.get(key);
    const currentValue = override?.translation_value || translations[selectedLanguage]?.[key] || '';
    setEditingKey(key);
    setEditValue(currentValue);
    setShowEditDialog(true);
  };

  const handleSave = () => {
    if (!editingKey) return;
    saveMutation.mutate({
      language: selectedLanguage,
      key: editingKey,
      value: editValue,
    });
  };

  const handleDelete = (key: string) => {
    deleteMutation.mutate({ language: selectedLanguage, key });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 pt-20">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Globe className="h-8 w-8" />
              Translation Manager
            </h1>
            <p className="text-muted-foreground mt-1">
              Edit and override translations for the platform
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['admin-translation-overrides'] });
              toast.success('Translations refreshed');
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>All Translations</CardTitle>
                <CardDescription>
                  {overrides.length} custom overrides active
                </CardDescription>
              </div>
              <Tabs value={selectedLanguage} onValueChange={(v) => setSelectedLanguage(v as Language)}>
                <TabsList>
                  <TabsTrigger value="en">🇬🇧 English</TabsTrigger>
                  <TabsTrigger value="fr">🇫🇷 Français</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search translations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <ScrollArea className="h-[600px]">
              <div className="space-y-6">
                {Object.entries(groupedKeys).map(([category, keys]) => (
                  <div key={category}>
                    <h3 className="font-semibold text-lg capitalize mb-3 sticky top-0 bg-background py-2 z-10">
                      {category}
                      <Badge variant="secondary" className="ml-2">
                        {keys.length}
                      </Badge>
                    </h3>
                    <div className="space-y-2">
                      {keys.map((key) => {
                        const override = overrideMap.get(key);
                        const defaultValue = translations[selectedLanguage]?.[key] || '';
                        const displayValue = override?.translation_value || defaultValue;
                        const isOverridden = !!override;

                        return (
                          <div
                            key={key}
                            className={`p-3 rounded-lg border ${
                              isOverridden ? 'border-primary/50 bg-primary/5' : 'border-border'
                            } hover:border-primary/30 transition-colors`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <code className="text-xs bg-muted px-2 py-0.5 rounded">
                                    {key}
                                  </code>
                                  {isOverridden && (
                                    <Badge variant="default" className="text-xs">
                                      Custom
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-foreground truncate">
                                  {displayValue || <span className="text-muted-foreground italic">No translation</span>}
                                </p>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEdit(key)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                {isOverridden && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDelete(key)}
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Translation</DialogTitle>
            <DialogDescription>
              Editing translation for <code className="bg-muted px-2 py-0.5 rounded">{editingKey}</code>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-muted-foreground text-sm">Default Value</Label>
              <p className="text-sm bg-muted p-3 rounded-md mt-1">
                {translations[selectedLanguage]?.[editingKey || ''] || 'No default'}
              </p>
            </div>

            <div>
              <Label>Custom Value ({selectedLanguage === 'en' ? 'English' : 'French'})</Label>
              <Textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                rows={4}
                className="mt-1"
                placeholder="Enter custom translation..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              Save Translation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminTranslations;
