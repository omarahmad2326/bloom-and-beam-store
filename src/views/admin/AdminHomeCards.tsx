'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, GripVertical, Bed, Ambulance, Armchair, Stethoscope, HeartPulse, Activity } from 'lucide-react';
import AdminLayout from './AdminLayout';
import { useAuth } from '@/hooks/useAuth';

interface ServiceCardItem {
  id: string;
  card_id: string;
  name: string;
  slug: string;
  sort_order: number;
}

interface ServiceCard {
  id: string;
  title: string;
  icon: string;
  color: string;
  sort_order: number;
  items?: ServiceCardItem[];
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

const iconOptions = [
  { value: 'Bed', label: 'Bed', icon: Bed },
  { value: 'Ambulance', label: 'Ambulance', icon: Ambulance },
  { value: 'Armchair', label: 'Armchair', icon: Armchair },
  { value: 'Stethoscope', label: 'Stethoscope', icon: Stethoscope },
  { value: 'HeartPulse', label: 'Heart Pulse', icon: HeartPulse },
  { value: 'Activity', label: 'Activity', icon: Activity },
];

const colorOptions = [
  { value: 'from-primary/20 to-primary/5', label: 'Primary (Blue)' },
  { value: 'from-secondary/20 to-secondary/5', label: 'Secondary (Orange)' },
  { value: 'from-accent/40 to-accent/10', label: 'Accent' },
  { value: 'from-green-500/20 to-green-500/5', label: 'Green' },
  { value: 'from-purple-500/20 to-purple-500/5', label: 'Purple' },
  { value: 'from-red-500/20 to-red-500/5', label: 'Red' },
];

const getIconComponent = (iconName: string) => {
  const option = iconOptions.find(o => o.value === iconName);
  return option ? option.icon : Bed;
};

export default function AdminHomeCards() {
  const { isAdmin } = useAuth();
  const [cards, setCards] = useState<ServiceCard[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [cardDialogOpen, setCardDialogOpen] = useState(false);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<ServiceCard | null>(null);
  const [editingItem, setEditingItem] = useState<ServiceCardItem | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [useExistingCategory, setUseExistingCategory] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  
  const [cardFormData, setCardFormData] = useState({
    title: '',
    icon: 'Bed',
    color: 'from-primary/20 to-primary/5',
    sort_order: 0
  });

  const [itemFormData, setItemFormData] = useState({
    name: '',
    slug: '',
    sort_order: 0
  });

  useEffect(() => {
    fetchCards();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, slug')
      .order('name', { ascending: true });

    if (!error && data) {
      setCategories(data);
    }
  };

  const fetchCards = async () => {
    const { data: cardsData, error: cardsError } = await supabase
      .from('home_service_cards')
      .select('*')
      .order('sort_order', { ascending: true });

    if (cardsError) {
      toast.error('Failed to fetch cards');
      setLoading(false);
      return;
    }

    const { data: itemsData, error: itemsError } = await supabase
      .from('home_service_card_items')
      .select('*')
      .order('sort_order', { ascending: true });

    if (itemsError) {
      toast.error('Failed to fetch card items');
      setLoading(false);
      return;
    }

    const cardsWithItems = (cardsData || []).map(card => ({
      ...card,
      items: (itemsData || []).filter(item => item.card_id === card.id)
    }));

    setCards(cardsWithItems);
    setLoading(false);
  };

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  };

  const resetCardForm = () => {
    setCardFormData({
      title: '',
      icon: 'Bed',
      color: 'from-primary/20 to-primary/5',
      sort_order: cards.length
    });
    setEditingCard(null);
  };

  const resetItemForm = () => {
    setItemFormData({
      name: '',
      slug: '',
      sort_order: 0
    });
    setEditingItem(null);
    setUseExistingCategory(true);
    setSelectedCategoryId('');
  };

  const handleEditCard = (card: ServiceCard) => {
    setEditingCard(card);
    setCardFormData({
      title: card.title,
      icon: card.icon,
      color: card.color,
      sort_order: card.sort_order
    });
    setCardDialogOpen(true);
  };

  const handleEditItem = (item: ServiceCardItem, cardId: string) => {
    setEditingItem(item);
    setSelectedCardId(cardId);
    setItemFormData({
      name: item.name,
      slug: item.slug,
      sort_order: item.sort_order
    });
    // Check if the item matches an existing category
    const matchingCategory = categories.find(c => c.slug === item.slug);
    if (matchingCategory) {
      setUseExistingCategory(true);
      setSelectedCategoryId(matchingCategory.id);
    } else {
      setUseExistingCategory(false);
      setSelectedCategoryId('');
    }
    setItemDialogOpen(true);
  };

  const handleAddItem = (cardId: string, itemCount: number) => {
    setSelectedCardId(cardId);
    setItemFormData({
      name: '',
      slug: '',
      sort_order: itemCount
    });
    setEditingItem(null);
    setUseExistingCategory(true);
    setSelectedCategoryId('');
    setItemDialogOpen(true);
  };

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    const category = categories.find(c => c.id === categoryId);
    if (category) {
      setItemFormData(prev => ({
        ...prev,
        name: category.name,
        slug: category.slug
      }));
    }
  };

  const handleSubmitCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      toast.error('Admin privileges required');
      return;
    }

    const cardData = {
      title: cardFormData.title,
      icon: cardFormData.icon,
      color: cardFormData.color,
      sort_order: cardFormData.sort_order
    };

    if (editingCard) {
      const { error } = await supabase
        .from('home_service_cards')
        .update(cardData)
        .eq('id', editingCard.id);

      if (error) {
        toast.error('Failed to update card');
      } else {
        toast.success('Card updated');
        fetchCards();
        setCardDialogOpen(false);
        resetCardForm();
      }
    } else {
      const { error } = await supabase
        .from('home_service_cards')
        .insert([cardData]);

      if (error) {
        toast.error('Failed to create card');
      } else {
        toast.success('Card created');
        fetchCards();
        setCardDialogOpen(false);
        resetCardForm();
      }
    }
  };

  const handleSubmitItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !selectedCardId) {
      toast.error('Admin privileges required');
      return;
    }

    const itemData = {
      card_id: selectedCardId,
      name: itemFormData.name,
      slug: itemFormData.slug || generateSlug(itemFormData.name),
      sort_order: itemFormData.sort_order
    };

    if (editingItem) {
      const { error } = await supabase
        .from('home_service_card_items')
        .update(itemData)
        .eq('id', editingItem.id);

      if (error) {
        toast.error('Failed to update item');
      } else {
        toast.success('Item updated');
        fetchCards();
        setItemDialogOpen(false);
        resetItemForm();
      }
    } else {
      const { error } = await supabase
        .from('home_service_card_items')
        .insert([itemData]);

      if (error) {
        toast.error('Failed to create item');
      } else {
        toast.success('Item created');
        fetchCards();
        setItemDialogOpen(false);
        resetItemForm();
      }
    }
  };

  const handleDeleteCard = async (id: string) => {
    if (!isAdmin) {
      toast.error('Admin privileges required');
      return;
    }

    if (!confirm('Delete this card and all its items? You can restore it from Dashboard → Recently Deleted for 7 days.')) return;

    const { error } = await supabase
      .from('home_service_cards')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete card');
    } else {
      toast.success('Card deleted');
      fetchCards();
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!isAdmin) {
      toast.error('Admin privileges required');
      return;
    }

    if (!confirm('Delete this item? You can restore it from Dashboard → Recently Deleted for 7 days.')) return;

    const { error } = await supabase
      .from('home_service_card_items')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete item');
    } else {
      toast.success('Item deleted');
      fetchCards();
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Home Service Cards</h1>
            <p className="text-muted-foreground">Manage the service cards displayed on the homepage</p>
          </div>
          <Dialog open={cardDialogOpen} onOpenChange={(open) => { setCardDialogOpen(open); if (!open) resetCardForm(); }}>
            <DialogTrigger asChild>
              <Button disabled={!isAdmin}>
                <Plus className="h-4 w-4 mr-2" />
                Add Card
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingCard ? 'Edit Card' : 'Add New Card'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmitCard} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={cardFormData.title}
                    onChange={(e) => setCardFormData({ ...cardFormData, title: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="icon">Icon</Label>
                  <Select value={cardFormData.icon} onValueChange={(value) => setCardFormData({ ...cardFormData, icon: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {iconOptions.map((option) => {
                        const IconComp = option.icon;
                        return (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center gap-2">
                              <IconComp className="h-4 w-4" />
                              {option.label}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="color">Color Theme</Label>
                  <Select value={cardFormData.color} onValueChange={(value) => setCardFormData({ ...cardFormData, color: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {colorOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sort_order">Sort Order</Label>
                  <Input
                    id="sort_order"
                    type="number"
                    value={cardFormData.sort_order}
                    onChange={(e) => setCardFormData({ ...cardFormData, sort_order: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => { setCardDialogOpen(false); resetCardForm(); }}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingCard ? 'Update Card' : 'Create Card'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Item Dialog */}
        <Dialog open={itemDialogOpen} onOpenChange={(open) => { setItemDialogOpen(open); if (!open) resetItemForm(); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Edit Item' : 'Add New Item'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmitItem} className="space-y-4">
              {/* Category Selection Mode Toggle */}
              <div className="space-y-2">
                <Label>Category Source</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={useExistingCategory ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setUseExistingCategory(true);
                      setSelectedCategoryId('');
                      setItemFormData(prev => ({ ...prev, name: '', slug: '' }));
                    }}
                  >
                    Select Existing
                  </Button>
                  <Button
                    type="button"
                    variant={!useExistingCategory ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setUseExistingCategory(false);
                      setSelectedCategoryId('');
                    }}
                  >
                    Custom Entry
                  </Button>
                </div>
              </div>

              {useExistingCategory ? (
                <div className="space-y-2">
                  <Label htmlFor="categorySelect">Select Category</Label>
                  <Select value={selectedCategoryId} onValueChange={handleCategorySelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a category..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.length === 0 ? (
                        <SelectItem value="none" disabled>No categories available</SelectItem>
                      ) : (
                        categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name} (/{category.slug})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {selectedCategoryId && (
                    <p className="text-xs text-muted-foreground">
                      Will link to: /{categories.find(c => c.id === selectedCategoryId)?.slug}
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="itemName">Name</Label>
                    <Input
                      id="itemName"
                      value={itemFormData.name}
                      onChange={(e) => {
                        const name = e.target.value;
                        setItemFormData({ 
                          ...itemFormData, 
                          name,
                          slug: itemFormData.slug || generateSlug(name)
                        });
                      }}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="itemSlug">URL Slug</Label>
                    <Input
                      id="itemSlug"
                      value={itemFormData.slug}
                      onChange={(e) => setItemFormData({ ...itemFormData, slug: e.target.value })}
                      placeholder="auto-generated-from-name"
                    />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="itemSortOrder">Sort Order</Label>
                <Input
                  id="itemSortOrder"
                  type="number"
                  value={itemFormData.sort_order}
                  onChange={(e) => setItemFormData({ ...itemFormData, sort_order: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => { setItemDialogOpen(false); resetItemForm(); }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={useExistingCategory && !selectedCategoryId}>
                  {editingItem ? 'Update Item' : 'Create Item'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : cards.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No service cards yet. Add your first card to get started.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {cards.map((card) => {
              const IconComponent = getIconComponent(card.icon);
              return (
                <Card key={card.id}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-lg bg-gradient-to-br ${card.color}`}>
                        <IconComponent className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">{card.title}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {card.items?.length || 0} items · Sort order: {card.sort_order}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleAddItem(card.id, card.items?.length || 0)} disabled={!isAdmin}>
                        <Plus className="h-4 w-4 mr-1" />
                        Add Item
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleEditCard(card)} disabled={!isAdmin}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteCard(card.id)} disabled={!isAdmin}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {card.items && card.items.length > 0 ? (
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {card.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg group"
                          >
                            <div className="flex items-center gap-2">
                              <GripVertical className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="font-medium text-sm">{item.name}</p>
                                <p className="text-xs text-muted-foreground">/{item.slug}</p>
                              </div>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditItem(item, card.id)} disabled={!isAdmin}>
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteItem(item.id)} disabled={!isAdmin}>
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm text-center py-4">No items yet. Add items to display in this card.</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}