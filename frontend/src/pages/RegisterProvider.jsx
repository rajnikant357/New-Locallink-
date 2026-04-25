import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { Shield, TrendingUp, Calendar, Award } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

const RegisterProvider = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    category: "",
    experience: "",
    billingType: "hourly",
    hourlyRate: "",
    description: "",
    skills: "",
    location: "",
    aadhaarNumber: "",
    certificateUrl: "",
    termsAccepted: false,
  });

  useEffect(() => {
    let mounted = true;

    const hydrateFromProfile = async () => {
      if (!isAuthenticated) {
        return;
      }

      try {
        const response = await api("/users/me");
        if (!mounted) return;
        const profile = response.user || {};

        setFormData((prev) => ({
          ...prev,
          name: prev.name || profile.name || user?.name || "",
          email: prev.email || profile.email || user?.email || "",
          phone: prev.phone || profile.phone || user?.phone || "",
          location: prev.location || profile.location || user?.location || "",
        }));
      } catch {
        if (!mounted) return;
        setFormData((prev) => ({
          ...prev,
          name: prev.name || user?.name || "",
          email: prev.email || user?.email || "",
          phone: prev.phone || user?.phone || "",
          location: prev.location || user?.location || "",
        }));
      }
    };

    hydrateFromProfile();
    return () => {
      mounted = false;
    };
  }, [isAuthenticated, user?.id, user?.name, user?.email, user?.phone, user?.location]);

  useEffect(() => {
    let mounted = true;

    const loadCategories = async () => {
      try {
        const response = await api("/categories");
        if (mounted) {
          setCategories((response.categories || []).filter((item) => item.isActive !== false));
        }
      } catch {
        if (mounted) {
          setCategories([]);
        }
      }
    };

    loadCategories();
    return () => {
      mounted = false;
    };
  }, []);

  const categoryNames = useMemo(() => categories.map((item) => item.name), [categories]);

  const handleCertificateChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (file.size > 350 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a certificate smaller than 350 KB.",
        variant: "destructive",
      });
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      setFormData((prev) => ({ ...prev, certificateUrl: result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isAuthenticated) {
      toast({
        title: "Sign in required",
        description: "Please sign in to register as provider.",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    if (!formData.termsAccepted) {
      toast({
        title: "Terms Required",
        description: "Please accept the terms and conditions",
        variant: "destructive",
      });
      return;
    }

    if (!formData.category) {
      toast({
        title: "Category required",
        description: "Please select a service category.",
        variant: "destructive",
      });
      return;
    }

    if (!/^\d{12}$/.test(formData.aadhaarNumber)) {
      toast({
        title: "Aadhaar required",
        description: "Please enter a valid 12 digit Aadhaar number.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      await api("/providers", {
        method: "POST",
        body: JSON.stringify({
          name: formData.name,
          category: formData.category,
          bio: formData.description,
          location: formData.location,
          billingType: formData.billingType,
          priceMin: Number(formData.hourlyRate),
          experience: formData.experience,
          hourlyRate: Number(formData.hourlyRate),
          skills: formData.skills.split(",").map((item) => item.trim()).filter(Boolean),
          aadhaarNumber: formData.aadhaarNumber,
          certificateUrl: formData.certificateUrl,
        }),
      });

      await api("/users/me", {
        method: "PATCH",
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          location: formData.location,
        }),
      });

      toast({
        title: "Application Submitted",
        description: "Your provider profile has been submitted for review.",
      });

      navigate("/dashboard");
    } catch (err) {
      toast({
        title: "Submission failed",
        description: err?.message || "Could not submit provider registration.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <div className="flex-1">
        <section className="bg-gradient-to-r from-[#467ae9ff] to-[#1d4ed8] text-primary-foreground py-16">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Join LocalLink as a Service Provider</h1>
            <p className="text-lg md:text-xl opacity-90 max-w-2xl mx-auto">Grow your business by connecting with customers in your area</p>
          </div>
        </section>

        <section className="py-12 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <Card>
                <CardContent className="p-8">
                  <h2 className="text-2xl font-bold mb-6">Provider Registration Form</h2>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Full Name *</Label>
                        <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required placeholder="Your full name" />
                      </div>
                      <div>
                        <Label htmlFor="email">Email Address *</Label>
                        <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required placeholder="your@email.com" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="phone">Phone Number *</Label>
                        <Input id="phone" type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} required placeholder="+91 9876543210" />
                      </div>
                      <div>
                        <Label htmlFor="location">Location *</Label>
                        <Input id="location" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} required placeholder="Sikandarpur, Ballia" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="category">Service Category *</Label>
                        <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                          <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                          <SelectContent>
                            {categoryNames.map((cat) => (
                              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="experience">Years of Experience *</Label>
                        <Select value={formData.experience} onValueChange={(value) => setFormData({ ...formData, experience: value })}>
                          <SelectTrigger><SelectValue placeholder="Select experience" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="<1">Less than 1 year</SelectItem>
                            <SelectItem value="1-3">1-3 years</SelectItem>
                            <SelectItem value="3-5">3-5 years</SelectItem>
                            <SelectItem value="5+">5+ years</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="billingType">Charging Type *</Label>
                        <Select value={formData.billingType} onValueChange={(value) => setFormData({ ...formData, billingType: value })}>
                          <SelectTrigger><SelectValue placeholder="Select charging type" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="hourly">Per Hour</SelectItem>
                            <SelectItem value="day">Per Day</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="hourlyRate">
                          {formData.billingType === "day" ? "Daily Rate (Rs) *" : "Hourly Rate (Rs) *"}
                        </Label>
                        <Input
                          id="hourlyRate"
                          type="number"
                          value={formData.hourlyRate}
                          onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                          required
                          placeholder={formData.billingType === "day" ? "2000" : "500"}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="skills">Skills (comma separated) *</Label>
                      <Input id="skills" value={formData.skills} onChange={(e) => setFormData({ ...formData, skills: e.target.value })} required placeholder="e.g., Wiring, Repairs, Installation" />
                    </div>

                    <div>
                      <Label htmlFor="description">About Your Services *</Label>
                      <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} required rows={4} placeholder="Describe your experience and services..." />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="aadhaarNumber">Aadhaar Verification *</Label>
                        <Input
                          id="aadhaarNumber"
                          value={formData.aadhaarNumber}
                          onChange={(e) => setFormData({ ...formData, aadhaarNumber: e.target.value.replace(/\D/g, "").slice(0, 12) })}
                          required
                          placeholder="12 digit Aadhaar number"
                        />
                        <p className="text-xs text-muted-foreground mt-2">
                          This is used during admin verification and is not shown publicly.
                        </p>
                      </div>
                      <div className="rounded-lg border p-4 space-y-4">
                        <div>
                          <Label htmlFor="certificate">Certificate Upload (Optional)</Label>
                          <Input id="certificate" type="file" accept=".pdf,image/*" onChange={handleCertificateChange} />
                          <p className="text-xs text-muted-foreground mt-2">
                            Upload a trade certificate, training proof, or any supporting document under 350 KB.
                          </p>
                        </div>
                        {formData.certificateUrl ? (
                          <div className="flex flex-wrap items-center gap-3 text-sm">
                            <a href={formData.certificateUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                              Preview uploaded certificate
                            </a>
                            <Button type="button" variant="outline" size="sm" onClick={() => setFormData((prev) => ({ ...prev, certificateUrl: "" }))}>
                              Remove certificate
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex items-start space-x-2">
                      <Checkbox id="terms" checked={formData.termsAccepted} onCheckedChange={(checked) => setFormData({ ...formData, termsAccepted: !!checked })} />
                      <Label htmlFor="terms" className="text-sm leading-relaxed">I agree to the Terms of Service and Privacy Policy. I understand that LocalLink will verify my Aadhaar and supporting details before approving my application.</Label>
                    </div>

                    <Button type="submit" size="lg" className="w-full" disabled={submitting}>{submitting ? "Submitting..." : "Submit Application"}</Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
        <section className="py-12 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-6xl mx-auto">
              <Card><CardContent className="p-6 text-center"><div className="w-12 h-12 mx-auto mb-3 bg-primary/10 rounded-full flex items-center justify-center"><Shield className="h-6 w-6 text-primary" /></div><h3 className="font-semibold mb-2">Verified Badge</h3><p className="text-sm text-muted-foreground">Get a verified badge to build trust</p></CardContent></Card>
              <Card><CardContent className="p-6 text-center"><div className="w-12 h-12 mx-auto mb-3 bg-primary/10 rounded-full flex items-center justify-center"><TrendingUp className="h-6 w-6 text-primary" /></div><h3 className="font-semibold mb-2">More Clients</h3><p className="text-sm text-muted-foreground">Reach thousands of potential customers</p></CardContent></Card>
              <Card><CardContent className="p-6 text-center"><div className="w-12 h-12 mx-auto mb-3 bg-primary/10 rounded-full flex items-center justify-center"><Calendar className="h-6 w-6 text-primary" /></div><h3 className="font-semibold mb-2">Easy Scheduling</h3><p className="text-sm text-muted-foreground">Manage your bookings efficiently</p></CardContent></Card>
              <Card><CardContent className="p-6 text-center"><div className="w-12 h-12 mx-auto mb-3 bg-primary/10 rounded-full flex items-center justify-center"><Award className="h-6 w-6 text-primary" /></div><h3 className="font-semibold mb-2">Build Reputation</h3><p className="text-sm text-muted-foreground">Get reviews and grow your profile</p></CardContent></Card>
            </div>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
};

export default RegisterProvider;
