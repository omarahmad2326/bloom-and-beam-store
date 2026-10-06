import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Phone, Mail, MapPin, Clock, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useContactInfo } from '@/hooks/useContactInfo';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';

const Contact = () => {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { contactInfo } = useContactInfo();

  useEffect(() => {
    const productName = searchParams.get('product');
    if (productName) {
      setSubject(`Quote Request: ${productName}`);
      setMessage(`I am interested in getting a quote for the "${productName}". Please provide pricing and availability information.\n\nAdditional details:\n`);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const { error } = await supabase
      .from('contact_messages')
      .insert({ name, email, subject, message });

    if (error) {
      toast({ title: 'Error', description: 'Failed to send message. Please try again.', variant: 'destructive' });
    } else {
      toast({ title: 'Message Sent!', description: "We'll get back to you within 24 hours." });
      // Send email notification (fire-and-forget)
      supabase.functions.invoke('send-email', {
        body: { type: 'contact', data: { name, email, subject, message } }
      }).catch(console.error);
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
    }
    setIsSubmitting(false);
  };

  const contactItems = [
    { icon: Phone, title: 'Phone', content: contactInfo.phone },
    { icon: Mail, title: 'Email', content: contactInfo.email },
    { icon: MapPin, title: 'Address', content: `${contactInfo.address_line1}, ${contactInfo.address_line2}` },
    { icon: Clock, title: 'Hours', content: contactInfo.working_hours },
  ];

  return (
    <Layout>
      <BreadcrumbSchema items={[{ name: 'Contact Us', path: '/contact-us' }]} />
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="text-center mb-16">
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">Contact Us</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">Have questions? We'd love to hear from you.</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12">
            <div className="space-y-8">
              {contactItems.map((item, i) => (
                <div key={i} className="flex items-start gap-4 p-6 bg-card rounded-xl border card-hover">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center"><item.icon className="h-6 w-6 text-primary" /></div>
                  <div><h3 className="font-display font-bold">{item.title}</h3><p className="text-muted-foreground">{item.content}</p></div>
                </div>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="bg-card p-8 rounded-2xl border space-y-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Name</label>
                  <Input placeholder="Your name" required value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Email</label>
                  <Input type="email" placeholder="your@email.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Subject</label>
                <Input 
                  placeholder="How can we help?" 
                  required 
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Message</label>
                <Textarea 
                  placeholder="Tell us more..." 
                  rows={5} 
                  required 
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full btn-shine" size="lg" disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</> : 'Send Message'}
              </Button>
            </form>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Contact;
