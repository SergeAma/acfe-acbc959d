import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, Trash2, Search, Users, Tag } from 'lucide-react';
import { Navigate } from 'react-router-dom';

interface Contact {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  source: string | null;
  created_at: string;
  tags?: { id: string; name: string; color: string }[];
}

interface Tag {
  id: string;
  name: string;
  color: string;
}

export const AdminContacts = () => {
  const { profile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isTagDialogOpen, setIsTagDialogOpen] = useState(false);
  const [newContact, setNewContact] = useState({ email: '', first_name: '', last_name: '', phone: '', source: '' });
  const [newTag, setNewTag] = useState({ name: '', color: '#3b82f6' });
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchContacts();
      fetchTags();
    }
  }, [profile]);

  const fetchContacts = async () => {
    setLoading(true);
    const { data: contactsData, error: contactsError } = await supabase
      .from('contacts')
      .select('*')
      .order('created_at', { ascending: false });

    if (contactsError) {
      toast({ title: "Error fetching contacts", description: contactsError.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    // Fetch tags for each contact
    if (contactsData && contactsData.length > 0) {
      const { data: contactTags } = await supabase
        .from('contact_tags')
        .select('contact_id, tags(id, name, color)')
        .in('contact_id', contactsData.map(c => c.id));

      const enrichedContacts = contactsData.map(contact => ({
        ...contact,
        tags: contactTags?.filter(ct => ct.contact_id === contact.id).map(ct => ct.tags as unknown as Tag) || []
      }));
      setContacts(enrichedContacts);
    } else {
      setContacts([]);
    }
    setLoading(false);
  };

  const fetchTags = async () => {
    const { data } = await supabase.from('tags').select('*').order('name');
    if (data) setTags(data);
  };

  const handleAddContact = async () => {
    if (!newContact.email) {
      toast({ title: "Email required", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from('contacts').insert([newContact]);
    if (error) {
      toast({ title: "Error adding contact", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Contact added successfully" });
      setNewContact({ email: '', first_name: '', last_name: '', phone: '', source: '' });
      setIsAddDialogOpen(false);
      fetchContacts();
    }
  };

  const handleDeleteContact = async (id: string) => {
    const { error } = await supabase.from('contacts').delete().eq('id', id);
    if (error) {
      toast({ title: "Error deleting contact", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Contact deleted" });
      fetchContacts();
    }
  };

  const handleAddTag = async () => {
    if (!newTag.name) {
      toast({ title: "Tag name required", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from('tags').insert([newTag]);
    if (error) {
      toast({ title: "Error adding tag", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Tag created successfully" });
      setNewTag({ name: '', color: '#3b82f6' });
      setIsTagDialogOpen(false);
      fetchTags();
    }
  };

  const handleAssignTag = async (contactId: string, tagId: string) => {
    const { error } = await supabase.from('contact_tags').insert([{ contact_id: contactId, tag_id: tagId }]);
    if (error && !error.message.includes('duplicate')) {
      toast({ title: "Error assigning tag", description: error.message, variant: "destructive" });
    } else {
      fetchContacts();
    }
  };

  const handleRemoveTag = async (contactId: string, tagId: string) => {
    const { error } = await supabase.from('contact_tags').delete().match({ contact_id: contactId, tag_id: tagId });
    if (error) {
      toast({ title: "Error removing tag", description: error.message, variant: "destructive" });
    } else {
      fetchContacts();
    }
  };

  const filteredContacts = contacts.filter(contact =>
    contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.last_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (profile?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Contacts</h1>
            <p className="text-muted-foreground">Manage your newsletter subscribers</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={isTagDialogOpen} onOpenChange={setIsTagDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline"><Tag className="h-4 w-4 mr-2" />Manage Tags</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Tag</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label>Tag Name</Label>
                    <Input value={newTag.name} onChange={(e) => setNewTag({ ...newTag, name: e.target.value })} placeholder="e.g., Newsletter Subscriber" />
                  </div>
                  <div>
                    <Label>Color</Label>
                    <Input type="color" value={newTag.color} onChange={(e) => setNewTag({ ...newTag, color: e.target.value })} />
                  </div>
                  <Button onClick={handleAddTag} className="w-full">Create Tag</Button>
                  <div className="border-t pt-4">
                    <p className="text-sm font-medium mb-2">Existing Tags:</p>
                    <div className="flex flex-wrap gap-2">
                      {tags.map(tag => (
                        <Badge key={tag.id} style={{ backgroundColor: tag.color }}>{tag.name}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />Add Contact</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Contact</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label>Email *</Label>
                    <Input value={newContact.email} onChange={(e) => setNewContact({ ...newContact, email: e.target.value })} placeholder="email@example.com" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>First Name</Label>
                      <Input value={newContact.first_name} onChange={(e) => setNewContact({ ...newContact, first_name: e.target.value })} />
                    </div>
                    <div>
                      <Label>Last Name</Label>
                      <Input value={newContact.last_name} onChange={(e) => setNewContact({ ...newContact, last_name: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input value={newContact.phone} onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })} />
                  </div>
                  <div>
                    <Label>Source</Label>
                    <Input value={newContact.source} onChange={(e) => setNewContact({ ...newContact, source: e.target.value })} placeholder="e.g., Website Signup" />
                  </div>
                  <Button onClick={handleAddContact} className="w-full">Add Contact</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Contacts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold flex items-center gap-2">
                <Users className="h-6 w-6 text-primary" />
                {contacts.length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Tags</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold flex items-center gap-2">
                <Tag className="h-6 w-6 text-primary" />
                {tags.length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {contacts.filter(c => new Date(c.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredContacts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No contacts found.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="bg-card rounded-lg border overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-medium">Contact</th>
                  <th className="text-left p-4 font-medium">Tags</th>
                  <th className="text-left p-4 font-medium">Source</th>
                  <th className="text-left p-4 font-medium">Added</th>
                  <th className="text-right p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredContacts.map((contact) => (
                  <tr key={contact.id} className="border-t">
                    <td className="p-4">
                      <div>
                        <p className="font-medium">{contact.first_name} {contact.last_name}</p>
                        <p className="text-sm text-muted-foreground">{contact.email}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {contact.tags?.map(tag => (
                          <Badge 
                            key={tag.id} 
                            style={{ backgroundColor: tag.color }}
                            className="cursor-pointer"
                            onClick={() => handleRemoveTag(contact.id, tag.id)}
                          >
                            {tag.name} ×
                          </Badge>
                        ))}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 px-2">
                              <Plus className="h-3 w-3" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Assign Tag</DialogTitle>
                            </DialogHeader>
                            <div className="flex flex-wrap gap-2 mt-4">
                              {tags.map(tag => (
                                <Badge
                                  key={tag.id}
                                  style={{ backgroundColor: tag.color }}
                                  className="cursor-pointer"
                                  onClick={() => handleAssignTag(contact.id, tag.id)}
                                >
                                  {tag.name}
                                </Badge>
                              ))}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground">{contact.source || '-'}</td>
                    <td className="p-4 text-muted-foreground">{new Date(contact.created_at).toLocaleDateString()}</td>
                    <td className="p-4 text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteContact(contact.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
