'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Save, Plus, Trash2 } from 'lucide-react';
import AdminLayout from './AdminLayout';
import { useAuth } from '@/hooks/useAuth';
import ImageUpload from '@/components/admin/ImageUpload';

interface HeroSettings {
  badge: string;
  title_line1: string;
  title_line2: string;
  title_line3: string;
  description: string;
  hero_image_url: string;
  /** null/undefined = not set (fallback text), '' = decorative */
  hero_image_alt?: string | null;
  stats: { value: string; label: string }[];
  trust_badges: { icon: string; text: string }[];
}

interface Testimonial {
  name: string;
  role: string;
  organization: string;
  quote: string;
  image_url: string;
}

interface Partner {
  name: string;
  logo_url: string;
}

export default function AdminSettings() {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [heroSettings, setHeroSettings] = useState<HeroSettings>({
    badge: '',
    title_line1: '',
    title_line2: '',
    title_line3: '',
    description: '',
    hero_image_url: '',
    stats: [],
    trust_badges: []
  });
  
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from('site_settings')
      .select('*');

    if (error) {
      toast.error('Failed to fetch settings');
      setLoading(false);
      return;
    }

    data?.forEach((setting: { key: string; value: unknown }) => {
      if (setting.key === 'hero') {
        setHeroSettings(setting.value as HeroSettings);
      } else if (setting.key === 'testimonials') {
        setTestimonials((setting.value as { items: Testimonial[] }).items || []);
      } else if (setting.key === 'partners') {
        setPartners((setting.value as { items: Partner[] }).items || []);
      }
    });

    setLoading(false);
  };

  const saveHeroSettings = async () => {
    if (!isAdmin) {
      toast.error('Admin privileges required');
      return;
    }
    
    setSaving(true);
    const { error } = await supabase
      .from('site_settings')
      .update({ value: JSON.parse(JSON.stringify(heroSettings)) })
      .eq('key', 'hero');

    if (error) {
      toast.error('Failed to save hero settings');
    } else {
      toast.success('Hero settings saved');
    }
    setSaving(false);
  };

  const saveTestimonials = async () => {
    if (!isAdmin) {
      toast.error('Admin privileges required');
      return;
    }
    
    setSaving(true);
    const { error } = await supabase
      .from('site_settings')
      .update({ value: JSON.parse(JSON.stringify({ items: testimonials })) })
      .eq('key', 'testimonials');

    if (error) {
      toast.error('Failed to save testimonials');
    } else {
      toast.success('Testimonials saved');
    }
    setSaving(false);
  };

  const savePartners = async () => {
    if (!isAdmin) {
      toast.error('Admin privileges required');
      return;
    }
    
    setSaving(true);
    const { error } = await supabase
      .from('site_settings')
      .update({ value: JSON.parse(JSON.stringify({ items: partners })) })
      .eq('key', 'partners');

    if (error) {
      toast.error('Failed to save partners');
    } else {
      toast.success('Partners saved');
    }
    setSaving(false);
  };

  const addTestimonial = () => {
    setTestimonials([...testimonials, { name: '', role: '', organization: '', quote: '', image_url: '' }]);
  };

  const removeTestimonial = (index: number) => {
    setTestimonials(testimonials.filter((_, i) => i !== index));
  };

  const updateTestimonial = (index: number, field: keyof Testimonial, value: string) => {
    const updated = [...testimonials];
    updated[index] = { ...updated[index], [field]: value };
    setTestimonials(updated);
  };

  const addPartner = () => {
    setPartners([...partners, { name: '', logo_url: '' }]);
  };

  const removePartner = (index: number) => {
    setPartners(partners.filter((_, i) => i !== index));
  };

  const updatePartner = (index: number, field: keyof Partner, value: string) => {
    const updated = [...partners];
    updated[index] = { ...updated[index], [field]: value };
    setPartners(updated);
  };

  const updateStat = (index: number, field: 'value' | 'label', value: string) => {
    const updated = [...heroSettings.stats];
    updated[index] = { ...updated[index], [field]: value };
    setHeroSettings({ ...heroSettings, stats: updated });
  };

  const updateTrustBadge = (index: number, field: 'icon' | 'text', value: string) => {
    const updated = [...heroSettings.trust_badges];
    updated[index] = { ...updated[index], [field]: value };
    setHeroSettings({ ...heroSettings, trust_badges: updated });
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="text-center py-12">Loading settings...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Site Settings</h1>
          <p className="text-muted-foreground">Manage homepage content, hero section, testimonials, and more</p>
        </div>

        <Tabs defaultValue="hero" className="space-y-6">
          <TabsList>
            <TabsTrigger value="hero">Hero Section</TabsTrigger>
            <TabsTrigger value="testimonials">Testimonials</TabsTrigger>
            <TabsTrigger value="partners">Partners</TabsTrigger>
          </TabsList>

          {/* Hero Section Tab */}
          <TabsContent value="hero" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Hero Content</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Badge Text</Label>
                  <Input
                    value={heroSettings.badge}
                    onChange={(e) => setHeroSettings({ ...heroSettings, badge: e.target.value })}
                    placeholder="Trusted by 500+ Healthcare Facilities"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Title Line 1</Label>
                    <Input
                      value={heroSettings.title_line1}
                      onChange={(e) => setHeroSettings({ ...heroSettings, title_line1: e.target.value })}
                      placeholder="Premium Medical"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Title Line 2 (Highlighted)</Label>
                    <Input
                      value={heroSettings.title_line2}
                      onChange={(e) => setHeroSettings({ ...heroSettings, title_line2: e.target.value })}
                      placeholder="Equipment"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Title Line 3</Label>
                    <Input
                      value={heroSettings.title_line3}
                      onChange={(e) => setHeroSettings({ ...heroSettings, title_line3: e.target.value })}
                      placeholder="Modern Healthcare"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={heroSettings.description}
                    onChange={(e) => setHeroSettings({ ...heroSettings, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <ImageUpload
                  bucket="site-images"
                  currentUrl={heroSettings.hero_image_url}
                  onImageChange={(url) => setHeroSettings({ ...heroSettings, hero_image_url: url })}
                  alt={heroSettings.hero_image_alt ?? null}
                  onAltChange={(hero_image_alt) => setHeroSettings({ ...heroSettings, hero_image_alt })}
                  allowDecorative
                  fileNameBase="hospital-bed-stretcher-hero"
                  label="Hero Image"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Stats (Below Hero Image)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {heroSettings.stats.map((stat, index) => (
                  <div key={index} className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Value</Label>
                      <Input
                        value={stat.value}
                        onChange={(e) => updateStat(index, 'value', e.target.value)}
                        placeholder="25+"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Label</Label>
                      <Input
                        value={stat.label}
                        onChange={(e) => updateStat(index, 'label', e.target.value)}
                        placeholder="Years Experience"
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Trust Badges</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {heroSettings.trust_badges.map((badge, index) => (
                  <div key={index} className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Icon (CheckCircle, Truck, Shield)</Label>
                      <Input
                        value={badge.icon}
                        onChange={(e) => updateTrustBadge(index, 'icon', e.target.value)}
                        placeholder="CheckCircle"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Text</Label>
                      <Input
                        value={badge.text}
                        onChange={(e) => updateTrustBadge(index, 'text', e.target.value)}
                        placeholder="5-Year Warranty"
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Button onClick={saveHeroSettings} disabled={saving || !isAdmin}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Hero Settings'}
            </Button>
          </TabsContent>

          {/* Testimonials Tab */}
          <TabsContent value="testimonials" className="space-y-6">
            {testimonials.map((testimonial, index) => (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">Testimonial {index + 1}</CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => removeTestimonial(index)} disabled={!isAdmin}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input
                        value={testimonial.name}
                        onChange={(e) => updateTestimonial(index, 'name', e.target.value)}
                        placeholder="Dr. Sarah Johnson"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Input
                        value={testimonial.role}
                        onChange={(e) => updateTestimonial(index, 'role', e.target.value)}
                        placeholder="Chief Medical Officer"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Organization</Label>
                    <Input
                      value={testimonial.organization}
                      onChange={(e) => updateTestimonial(index, 'organization', e.target.value)}
                      placeholder="Metro General Hospital"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Quote</Label>
                    <Textarea
                      value={testimonial.quote}
                      onChange={(e) => updateTestimonial(index, 'quote', e.target.value)}
                      rows={3}
                    />
                  </div>
                  <ImageUpload
                    bucket="site-images"
                    currentUrl={testimonial.image_url}
                    onImageChange={(url) => updateTestimonial(index, 'image_url', url)}
                    label="Photo (optional)"
                  />
                </CardContent>
              </Card>
            ))}

            <div className="flex gap-4">
              <Button variant="outline" onClick={addTestimonial} disabled={!isAdmin}>
                <Plus className="h-4 w-4 mr-2" />
                Add Testimonial
              </Button>
              <Button onClick={saveTestimonials} disabled={saving || !isAdmin}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Testimonials'}
              </Button>
            </div>
          </TabsContent>

          {/* Partners Tab */}
          <TabsContent value="partners" className="space-y-6">
            <div className="grid gap-4">
              {partners.map((partner, index) => (
                <Card key={index}>
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-lg font-medium">Partner {index + 1}</Label>
                      <Button variant="ghost" size="icon" onClick={() => removePartner(index)} disabled={!isAdmin}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <Label>Partner Name</Label>
                      <Input
                        value={partner.name}
                        onChange={(e) => updatePartner(index, 'name', e.target.value)}
                        placeholder="Hospital Network Name"
                      />
                    </div>
                    <ImageUpload
                      bucket="site-images"
                      currentUrl={partner.logo_url}
                      onImageChange={(url) => updatePartner(index, 'logo_url', url)}
                      label="Logo"
                    />
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex gap-4">
              <Button variant="outline" onClick={addPartner} disabled={!isAdmin}>
                <Plus className="h-4 w-4 mr-2" />
                Add Partner
              </Button>
              <Button onClick={savePartners} disabled={saving || !isAdmin}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Partners'}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
