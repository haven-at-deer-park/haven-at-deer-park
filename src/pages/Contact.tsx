
import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { MapPin, Phone, Mail, Clock, Send, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

// Contact form validation schema
const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  email: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters"),
  phone: z.string().max(20, "Phone number must be less than 20 characters").optional(),
  subject: z.string().trim().min(1, "Subject is required").max(100, "Subject must be less than 100 characters"),
  message: z.string().trim().min(1, "Message is required").max(1000, "Message must be less than 1000 characters"),
});

export default function Contact() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: ""
  });
  
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  useEffect(() => {
    // Scroll to top when component mounts
    window.scrollTo(0, 0);
  }, []);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data
    const validation = contactSchema.safeParse(formData);
    if (!validation.success) {
      const errors = validation.error.errors.map(err => err.message).join(", ");
      toast({
        title: "Validation Error",
        description: errors,
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Call the secure edge function
      const { error } = await supabase.functions.invoke('contact-form', {
        body: validation.data,
      });
      
      if (error) throw error;
      
      setIsSubmitted(true);
      
      toast({
        title: "Message Sent",
        description: "We'll get back to you as soon as possible.",
      });
      
      // Reset form after 3 seconds
      setTimeout(() => {
        setIsSubmitted(false);
        setFormData({
          name: "",
          email: "",
          phone: "",
          subject: "",
          message: ""
        });
      }, 3000);
      
    } catch (error) {
      console.error("Error submitting contact form:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 pt-20">
        {/* Header Section */}
        <section className="relative py-20 bg-gradient-to-r from-sea-light to-white dark:from-sea-dark dark:to-background overflow-hidden">
          <div className="container relative z-10">
            <div className="max-w-3xl mx-auto text-center animate-fade-in">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
                {t.contact.title}
              </h1>
              <p className="text-muted-foreground text-lg mb-6">
                {t.contact.subtitle}
              </p>
            </div>
          </div>
          
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-1/3 h-full opacity-10">
            <div className="absolute top-10 right-10 w-64 h-64 rounded-full bg-primary/50 blur-3xl" />
            <div className="absolute bottom-10 right-40 w-48 h-48 rounded-full bg-sea-light blur-3xl" />
          </div>
        </section>
        
        {/* Contact Information & Form */}
        <section className="section">
          <div className="container">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Contact Information */}
              <div className="animate-fade-in [animation-delay:100ms]">
                <h2 className="text-2xl font-bold mb-6">{t.contact.getInTouch}</h2>
                
                <div className="glass-card p-6 space-y-6 mb-8">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mr-4">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">{t.contact.address}</h3>
                      <p className="text-muted-foreground">
                        9194 Tronson Road<br />
                        Vernon, BC, V1H1E2<br />
                        Canada
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mr-4">
                      <Phone className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">{t.contact.phone}</h3>
                      <p className="text-muted-foreground">778-773-9915</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mr-4">
                      <Mail className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">{t.contact.email}</h3>
                      <p className="text-muted-foreground">info@havenatdeerpark.com</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mr-4">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">{t.contact.receptionHours}</h3>
                      <p className="text-muted-foreground">
                        Monday - Sunday: 24 hours<br />
                        {t.contact.checkInTime}<br />
                        {t.contact.checkOutTime}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="aspect-video rounded-xl overflow-hidden">
                  <iframe 
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2593.9876543!2d-119.3847!3d50.2608!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x537dd6e8c3d1c1a1%3A0x1c8c8c8c8c8c8c8c!2s9194%20Tronson%20Rd%2C%20Vernon%2C%20BC%20V1H%201E2%2C%20Canada!5e0!3m2!1sen!2sca!4v1628613152777!5m2!1sen!2sca" 
                    width="100%" 
                    height="100%" 
                    style={{ border: 0 }} 
                    allowFullScreen 
                    loading="lazy"
                    title="9194 Tronson Road, Vernon BC Location Map"
                  />
                </div>
              </div>
              
              {/* Contact Form */}
              <div className="animate-fade-in [animation-delay:300ms]">
                <h2 className="text-2xl font-bold mb-6">{t.contact.sendMessage}</h2>
                
                <div className="glass-card p-6">
                  {!isSubmitted ? (
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">{t.contact.fullName}</Label>
                          <Input 
                            id="name" 
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            placeholder="John Doe" 
                            required 
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="email">{t.contact.email}</Label>
                          <Input 
                            id="email" 
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            placeholder="john@example.com" 
                            required 
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="phone">{t.contact.phoneNumber}</Label>
                          <Input 
                            id="phone" 
                            name="phone"
                            value={formData.phone}
                            onChange={handleInputChange}
                            placeholder="+1 234 567 8900" 
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="subject">{t.contact.subject}</Label>
                          <Input 
                            id="subject" 
                            name="subject"
                            value={formData.subject}
                            onChange={handleInputChange}
                            placeholder="Reservation Inquiry" 
                            required 
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="message">{t.contact.message}</Label>
                        <textarea 
                          id="message" 
                          name="message"
                          value={formData.message}
                          onChange={handleInputChange}
                          placeholder={t.contact.howCanWeHelp} 
                          className="w-full min-h-[150px] p-3 rounded-md border border-input bg-background"
                          required 
                        />
                      </div>
                      
                      <Button type="submit" className="w-full btn-primary" disabled={isSubmitting}>
                        <Send className="mr-2 h-4 w-4" />
                        {isSubmitting ? "Sending..." : t.contact.send}
                      </Button>
                    </form>
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2">{t.contact.messageSent}</h3>
                      <p className="text-muted-foreground mb-6">
                        {t.contact.thankYou}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
        
        {/* FAQ Section */}
        <section className="section bg-muted">
          <div className="container">
            <div className="max-w-3xl mx-auto text-center mb-12 animate-fade-in">
              <h2 className="text-3xl font-bold mb-4">{t.contact.faq}</h2>
              <p className="text-muted-foreground">
                {t.contact.faqSubtitle}
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in [animation-delay:200ms]">
              {[
                {
                  questionKey: "checkInOut",
                  icon: <Clock className="h-5 w-5 text-primary" />
                },
                {
                  questionKey: "parking",
                  icon: <MapPin className="h-5 w-5 text-primary" />
                },
                {
                  questionKey: "pets",
                  icon: <MapPin className="h-5 w-5 text-primary" />
                },
                {
                  questionKey: "grocery",
                  icon: <MapPin className="h-5 w-5 text-primary" />
                },
                {
                  questionKey: "transfers",
                  icon: <MapPin className="h-5 w-5 text-primary" />
                },
                {
                  questionKey: "amenities",
                  icon: <MapPin className="h-5 w-5 text-primary" />
                },
              ].map((faq, index) => (
                <div key={index} className="glass-card p-6">
                  <h3 className="font-semibold text-lg mb-2">
                    {t.contact.questions[faq.questionKey].question}
                  </h3>
                  <p className="text-muted-foreground">
                    {t.contact.questions[faq.questionKey].answer}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}
