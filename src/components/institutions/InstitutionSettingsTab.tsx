import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface EditInstitution {
  name: string;
  slug: string;
  email_domain: string;
  description: string;
  is_active: boolean;
}

interface InstitutionSettingsTabProps {
  editInstitution: EditInstitution;
  setEditInstitution: (data: EditInstitution) => void;
  onSave: () => void;
  isSaving: boolean;
}

export const InstitutionSettingsTab = ({
  editInstitution,
  setEditInstitution,
  onSave,
  isSaving,
}: InstitutionSettingsTabProps) => {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h3 className="font-semibold mb-4">Institution Settings</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Edit your institution's details and configuration
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="edit-name">Institution Name *</Label>
          <Input
            id="edit-name"
            value={editInstitution.name}
            onChange={(e) => setEditInstitution({ ...editInstitution, name: e.target.value })}
            placeholder="e.g. University of Technology"
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="edit-slug">URL Slug *</Label>
          <Input
            id="edit-slug"
            value={editInstitution.slug}
            onChange={(e) => setEditInstitution({ ...editInstitution, slug: e.target.value })}
            placeholder="e.g. university-of-technology"
            className="mt-1"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Career centre URL: /career-centre/{editInstitution.slug || 'slug'}
          </p>
        </div>

        <div>
          <Label htmlFor="edit-email-domain">Email Domain (Optional)</Label>
          <Input
            id="edit-email-domain"
            value={editInstitution.email_domain}
            onChange={(e) => setEditInstitution({ ...editInstitution, email_domain: e.target.value })}
            placeholder="e.g. university.edu"
            className="mt-1"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Students with this email domain can auto-join
          </p>
        </div>

        <div>
          <Label htmlFor="edit-description">Description</Label>
          <Textarea
            id="edit-description"
            value={editInstitution.description}
            onChange={(e) => setEditInstitution({ ...editInstitution, description: e.target.value })}
            placeholder="Brief description of the institution..."
            className="mt-1"
            rows={3}
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Label htmlFor="edit-active" className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              id="edit-active"
              checked={editInstitution.is_active}
              onChange={(e) => setEditInstitution({ ...editInstitution, is_active: e.target.checked })}
              className="w-4 h-4 rounded border-border"
            />
            Active
          </Label>
          <span className="text-xs text-muted-foreground">
            Inactive institutions won't appear in the career centre
          </span>
        </div>
      </div>

      <div className="pt-4 border-t">
        <Button 
          onClick={onSave}
          disabled={!editInstitution.name || !editInstitution.slug || isSaving}
        >
          {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save Changes
        </Button>
      </div>
    </div>
  );
};
