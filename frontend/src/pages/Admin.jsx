import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import ProfilePicture from "@/components/dashboard/ProfilePicture";
import SocialLinksRow from "@/components/providers/SocialLinksRow";

const experienceDescriptions = {
  "<1": "Less than 1 year",
  "1-3": "1-3 years",
  "3-5": "3-5 years",
  "5+": "More than 5 years",
};

const experienceLabel = (value) => experienceDescriptions[value] || value || "Not provided";

const defaultUserDraft = {
  id: "",
  name: "",
  email: "",
  phone: "",
  location: "",
  type: "customer",
  isActive: true,
  profileImageUrl: "",
  security: { twoFactorEnabled: false },
  preferences: { language: "en", currency: "INR", darkMode: false },
  notificationSettings: { bookingConfirm: true, messages: true, reviews: true, promotions: false },
  paymentMethods: [],
  password: "",
  confirmPassword: "",
};

const createEmptySubcategoryDraft = () => ({ name: "", description: "" });
const defaultNewCategory = {
  id: "",
  name: "",
  description: "",
  subcategoryDetails: [createEmptySubcategoryDraft()],
};

const defaultProviderDraft = {
  id: "",
  userId: "",
  name: "",
  category: "",
  subCategory: "",
  bio: "",
  location: "",
  billingType: "hourly",
  priceMin: "",
  experience: "",
  hourlyRate: "",
  skills: "",
  aadhaarNumber: "",
  certificateUrl: "",
  verificationNotes: "",
  applicationStatus: "pending",
  socialLinks: {
    website: "",
    instagram: "",
    facebook: "",
    linkedin: "",
  },
};

const toProviderDraft = (entry) => ({
  id: entry?.id || "",
  userId: entry?.userId || "",
  name: entry?.name || "",
  category: entry?.category || "",
  subCategory: entry?.subCategory || "",
  bio: entry?.bio || "",
  location: entry?.location || "",
  billingType: entry?.billingType || "hourly",
  priceMin: entry?.priceMin ?? "",
  experience: entry?.experience || "",
  hourlyRate: entry?.hourlyRate ?? "",
  skills: Array.isArray(entry?.skills) ? entry.skills.join(", ") : "",
  aadhaarNumber: entry?.aadhaarNumber || "",
  certificateUrl: entry?.certificateUrl || "",
  verificationNotes: entry?.verificationNotes || "",
  applicationStatus: entry?.applicationStatus || (entry?.isVerified ? "approved" : "pending"),
  socialLinks: {
    website: entry?.socialLinks?.website || "",
    instagram: entry?.socialLinks?.instagram || "",
    facebook: entry?.socialLinks?.facebook || "",
    linkedin: entry?.socialLinks?.linkedin || "",
  },
});

const providerStatusVariant = (status) => {
  if (status === "approved") return "default";
  if (status === "rejected") return "destructive";
  return "secondary";
};

const Admin = () => {
  const { isAuthenticated, user, signOut } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [providers, setProviders] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [contactMessages, setContactMessages] = useState([]);
  const [newCategory, setNewCategory] = useState(defaultNewCategory);
  const [activeSection, setActiveSection] = useState("categories");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [userDraft, setUserDraft] = useState(defaultUserDraft);
  const [providerDraft, setProviderDraft] = useState(defaultProviderDraft);
  const [savingUserProfile, setSavingUserProfile] = useState(false);
  const [savingUserSettings, setSavingUserSettings] = useState(false);
  const [savingUserPassword, setSavingUserPassword] = useState(false);
  const [savingProviderProfile, setSavingProviderProfile] = useState(false);
  const [newPaymentMethod, setNewPaymentMethod] = useState({ type: "upi", label: "", value: "" });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/auth");
      return;
    }
    if (user?.type !== "admin") {
      navigate("/");
      return;
    }

    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        const [overviewRes, categoriesRes, usersRes, providersRes, bookingsRes, messagesRes] = await Promise.all([
          api("/admin/overview"),
          api("/categories"),
          api("/admin/users"),
          api("/admin/providers"),
          api("/admin/bookings"),
          api("/admin/messages"),
        ]);

        if (!mounted) return;

        setOverview(overviewRes.overview);
        setCategories(categoriesRes.categories || []);
        setUsers(usersRes.users || []);
        setProviders(providersRes.providers || []);
        setBookings(bookingsRes.bookings || []);
        setContactMessages(messagesRes.contactMessages || []);
      } catch (err) {
        if (!mounted) return;
        toast({
          title: "Admin data load failed",
          description: err?.message || "Please try again.",
          variant: "destructive",
        });
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    if (!isAuthenticated) return;
    api("/notifications/messages/read-all", { method: "PATCH" }).catch(() => undefined);
  }, [isAuthenticated]);

  const sortedBookings = useMemo(() => [...bookings].slice(0, 20), [bookings]);
  const sortedContactMessages = useMemo(() => [...contactMessages].slice(0, 30), [contactMessages]);
  const directoryUsers = useMemo(() => users.filter((entry) => entry.type !== "admin"), [users]);
  const usersById = useMemo(() => new Map(users.map((entry) => [entry.id, entry])), [users]);
  const providersById = useMemo(() => new Map(providers.map((entry) => [entry.id, entry])), [providers]);
  const providerApplications = useMemo(
    () => providers.filter((entry) => (entry.applicationStatus || (entry.isVerified ? "approved" : "pending")) !== "approved"),
    [providers],
  );
  const navCards = useMemo(
    () => [
      { id: "categories", label: "Categories", value: overview?.categoriesCount || 0 },
      { id: "users", label: "User Directory", value: directoryUsers.length },
      { id: "providers", label: "Providers Application", value: providerApplications.length },
      { id: "bookings", label: "Bookings", value: overview?.bookingsCount || 0 },
      { id: "messages", label: "Messages", value: sortedContactMessages.length || 0 },
    ],
    [overview, directoryUsers.length, providerApplications.length, sortedContactMessages.length],
  );
  const selectedUser = useMemo(
    () => directoryUsers.find((entry) => entry.id === selectedUserId) || null,
    [directoryUsers, selectedUserId],
  );
  const selectedUserProvider = useMemo(
    () => providers.find((entry) => entry.userId === selectedUserId) || null,
    [providers, selectedUserId],
  );

  const toUserDraft = (entry) => ({
    id: entry.id,
    name: entry.name || "",
    email: entry.email || "",
    phone: entry.phone || "",
    location: entry.location || "",
    type: entry.type || "customer",
    isActive: entry.isActive !== false,
    profileImageUrl: entry.profileImageUrl || "",
    security: {
      twoFactorEnabled: entry.security?.twoFactorEnabled ?? false,
    },
    preferences: {
      language: entry.preferences?.language || "en",
      currency: entry.preferences?.currency || "INR",
      darkMode: entry.preferences?.darkMode ?? false,
    },
    notificationSettings: {
      bookingConfirm: entry.notificationSettings?.bookingConfirm ?? true,
      messages: entry.notificationSettings?.messages ?? true,
      reviews: entry.notificationSettings?.reviews ?? true,
      promotions: entry.notificationSettings?.promotions ?? false,
    },
    paymentMethods: Array.isArray(entry.paymentMethods) ? entry.paymentMethods : [],
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (!directoryUsers.length) {
      setSelectedUserId("");
      setUserDraft(defaultUserDraft);
      setProviderDraft(defaultProviderDraft);
      return;
    }
    if (!selectedUserId || !directoryUsers.some((entry) => entry.id === selectedUserId)) {
      setSelectedUserId(directoryUsers[0].id);
      setUserDraft(toUserDraft(directoryUsers[0]));
    }
  }, [directoryUsers, selectedUserId]);

  useEffect(() => {
    setProviderDraft(selectedUserProvider ? toProviderDraft(selectedUserProvider) : defaultProviderDraft);
  }, [selectedUserProvider]);

  const selectUserForEdit = (entry) => {
    setSelectedUserId(entry.id);
    setUserDraft(toUserDraft(entry));
  };

  const handleSignOut = () => {
    signOut();
    navigate("/");
  };

  const startEditingCategory = (category) => {
    setNewCategory({
      id: category.id,
      name: category.name || "",
      description: category.description || "",
      subcategoryDetails:
        Array.isArray(category.subcategoryDetails) && category.subcategoryDetails.length > 0
          ? category.subcategoryDetails.map((entry) => ({
              name: entry.name || "",
              description: entry.description || "",
            }))
          : [createEmptySubcategoryDraft()],
    });
  };

  const resetCategoryForm = () => {
    setNewCategory(defaultNewCategory);
  };

  const updateNewCategorySubcategory = (index, field, value) => {
    setNewCategory((prev) => ({
      ...prev,
      subcategoryDetails: prev.subcategoryDetails.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, [field]: value } : entry,
      ),
    }));
  };

  const addNewCategorySubcategory = () => {
    setNewCategory((prev) => ({
      ...prev,
      subcategoryDetails: [...prev.subcategoryDetails, createEmptySubcategoryDraft()],
    }));
  };

  const removeNewCategorySubcategory = (index) => {
    setNewCategory((prev) => ({
      ...prev,
      subcategoryDetails:
        prev.subcategoryDetails.length === 1
          ? [createEmptySubcategoryDraft()]
          : prev.subcategoryDetails.filter((_, entryIndex) => entryIndex !== index),
    }));
  };

  const saveCategory = async () => {
    if (!newCategory.name.trim()) return;

    try {
      const parsedSubcategoryDetails = newCategory.subcategoryDetails
        .map((entry) => ({
          name: entry.name.trim(),
          description: entry.description.trim(),
        }))
        .filter((entry) => entry.name);
      const payload = {
        name: newCategory.name.trim(),
        description: newCategory.description.trim(),
        subcategoryDetails: parsedSubcategoryDetails,
        isActive: true,
      };

      if (newCategory.id) {
        const response = await api(`/categories/${newCategory.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        setCategories((prev) => prev.map((item) => (item.id === response.category.id ? response.category : item)));
        resetCategoryForm();
        toast({ title: "Category updated", description: "Category changes saved successfully." });
      } else {
        const response = await api("/categories", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setCategories((prev) => [...prev, response.category]);
        resetCategoryForm();
        toast({ title: "Category created", description: "Category added successfully." });
      }
    } catch (err) {
      toast({
        title: newCategory.id ? "Update failed" : "Create failed",
        description: err?.message || `Could not ${newCategory.id ? "update" : "create"} category.`,
        variant: "destructive",
      });
    }
  };

  const toggleCategory = async (category) => {
    try {
      const response = await api(`/categories/${category.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !category.isActive }),
      });
      setCategories((prev) => prev.map((item) => (item.id === category.id ? { ...item, ...response.category } : item)));
    } catch (err) {
      toast({
        title: "Update failed",
        description: err?.message || "Could not update category.",
        variant: "destructive",
      });
    }
  };

  const updateProviderRecord = async (providerId, payload, successTitle, successDescription) => {
    try {
      const response = await api(`/admin/providers/${providerId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      setProviders((prev) => prev.map((item) => (item.id === providerId ? { ...response.provider, user: item.user || response.provider.user || null } : item)));
      toast({ title: successTitle, description: successDescription });
      return response.provider;
    } catch (err) {
      toast({
        title: "Update failed",
        description: err?.message || "Could not update provider.",
        variant: "destructive",
      });
      return null;
    }
  };

  const setProviderApplicationStatus = async (provider, status) => {
    if (!provider?.id) return;

    const updatedProvider = await updateProviderRecord(
      provider.id,
      {
        applicationStatus: status,
        verificationNotes: String(provider?.id === providerDraft.id ? providerDraft.verificationNotes : provider?.verificationNotes || "").trim(),
      },
      "Provider updated",
      status === "approved"
        ? "Application verified and moved to User Directory."
        : status === "rejected"
          ? "Application marked as not verified."
          : "Application moved back to pending review.",
    );

    if (!updatedProvider) {
      return;
    }

    if (status === "approved" && viewingProviderId === provider.id) {
      setViewingProviderId("");
    }
  };

  const [viewingProviderId, setViewingProviderId] = useState("");
  const viewingProvider = useMemo(
    () => providerApplications.find((entry) => entry.id === viewingProviderId) || null,
    [providerApplications, viewingProviderId],
  );

  useEffect(() => {
    if (viewingProviderId && !providerApplications.some((entry) => entry.id === viewingProviderId)) {
      setViewingProviderId("");
    }
  }, [providerApplications, viewingProviderId]);

  const saveProviderProfileDraft = async () => {
    if (!providerDraft.id) return;

    const payload = {
      name: providerDraft.name.trim(),
      category: providerDraft.category.trim(),
      subCategory: providerDraft.subCategory.trim(),
      bio: providerDraft.bio.trim(),
      location: providerDraft.location.trim(),
      billingType: providerDraft.billingType,
      priceMin: Number(providerDraft.priceMin) || 0,
      experience: providerDraft.experience,
      hourlyRate: Number(providerDraft.hourlyRate) || 0,
      skills: providerDraft.skills.split(",").map((item) => item.trim()).filter(Boolean),
      aadhaarNumber: providerDraft.aadhaarNumber.trim(),
      certificateUrl: providerDraft.certificateUrl.trim(),
      verificationNotes: providerDraft.verificationNotes.trim(),
      applicationStatus: providerDraft.applicationStatus,
      socialLinks: Object.fromEntries(
        Object.entries(providerDraft.socialLinks).filter(([, value]) => value.trim()),
      ),
    };

    if (!payload.name || !payload.category || !payload.subCategory || !payload.bio || !payload.location) {
      toast({
        title: "Missing fields",
        description: "Provider name, category, subcategory, bio, and location are required.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSavingProviderProfile(true);
      const updatedProvider = await updateProviderRecord(
        providerDraft.id,
        payload,
        "Provider profile saved",
        "Provider profile details were updated.",
      );
      if (updatedProvider) {
        setProviderDraft(toProviderDraft(updatedProvider));
      }
    } finally {
      setSavingProviderProfile(false);
    }
  };

  const deleteProvider = async (providerId) => {
    try {
      await api(`/admin/providers/${providerId}`, { method: "DELETE" });
      setProviders((prev) => prev.filter((item) => item.id !== providerId));
      toast({ title: "Provider deleted", description: "Provider removed from system." });
    } catch (err) {
      toast({
        title: "Delete failed",
        description: err?.message || "Could not delete provider.",
        variant: "destructive",
      });
    }
  };

  const syncUpdatedUser = (updatedUser) => {
    setUsers((prev) => prev.map((item) => (item.id === updatedUser.id ? updatedUser : item)));
    setUserDraft((prev) => ({ ...toUserDraft(updatedUser), password: prev.password, confirmPassword: prev.confirmPassword }));
  };

  const saveUserProfile = async () => {
    if (!userDraft.id) return;
    const name = userDraft.name.trim();
    const email = userDraft.email.trim().toLowerCase();
    const phone = userDraft.phone.trim();
    const location = userDraft.location.trim();
    const profileImageUrl = userDraft.profileImageUrl.trim();

    if (!name || !email) {
      toast({
        title: "Missing fields",
        description: "Name and email are required.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSavingUserProfile(true);
      const payload = {
        name,
        email,
        location,
        type: userDraft.type,
        isActive: userDraft.isActive,
        profileImageUrl,
      };
      if (phone) {
        payload.phone = phone;
      }
      const response = await api(`/admin/users/${userDraft.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      syncUpdatedUser(response.user);
      toast({ title: "User profile updated", description: "All profile details saved." });
    } catch (err) {
      toast({
        title: "Update failed",
        description: err?.message || "Could not update user profile.",
        variant: "destructive",
      });
    } finally {
      setSavingUserProfile(false);
    }
  };

  const saveUserSettings = async () => {
    if (!userDraft.id) return;
    try {
      setSavingUserSettings(true);
      const response = await api(`/admin/users/${userDraft.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          security: userDraft.security,
          preferences: userDraft.preferences,
          notificationSettings: userDraft.notificationSettings,
          paymentMethods: userDraft.paymentMethods,
        }),
      });
      syncUpdatedUser(response.user);
      toast({ title: "User settings updated", description: "Preferences and account settings saved." });
    } catch (err) {
      toast({
        title: "Update failed",
        description: err?.message || "Could not update user settings.",
        variant: "destructive",
      });
    } finally {
      setSavingUserSettings(false);
    }
  };

  const saveUserPassword = async () => {
    if (!userDraft.id) return;
    if (!userDraft.password.trim()) {
      toast({
        title: "Password required",
        description: "Enter a new password to update credentials.",
        variant: "destructive",
      });
      return;
    }
    if (userDraft.password !== userDraft.confirmPassword) {
      toast({
        title: "Password mismatch",
        description: "Confirm password must match.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSavingUserPassword(true);
      const response = await api(`/admin/users/${userDraft.id}`, {
        method: "PATCH",
        body: JSON.stringify({ password: userDraft.password }),
      });
      syncUpdatedUser(response.user);
      setUserDraft((prev) => ({ ...prev, password: "", confirmPassword: "" }));
      toast({ title: "Credentials updated", description: "Password updated successfully." });
    } catch (err) {
      toast({
        title: "Update failed",
        description: err?.message || "Could not update password.",
        variant: "destructive",
      });
    } finally {
      setSavingUserPassword(false);
    }
  };

  const onUserPhotoFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      setUserDraft((prev) => ({ ...prev, profileImageUrl: result }));
    };
    reader.readAsDataURL(file);
  };

  const addDraftPaymentMethod = () => {
    if (!newPaymentMethod.label.trim() || !newPaymentMethod.value.trim()) {
      toast({
        title: "Missing fields",
        description: "Payment method label and value are required.",
        variant: "destructive",
      });
      return;
    }

    const generatedId =
      globalThis.crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`;

    setUserDraft((prev) => ({
      ...prev,
      paymentMethods: [
        {
          id: `pay_${generatedId}`,
          type: newPaymentMethod.type,
          label: newPaymentMethod.label.trim(),
          value: newPaymentMethod.value.trim(),
          createdAt: new Date().toISOString(),
        },
        ...prev.paymentMethods,
      ],
    }));
    setNewPaymentMethod({ type: "upi", label: "", value: "" });
  };

  const removeDraftPaymentMethod = (paymentMethodId) => {
    setUserDraft((prev) => ({
      ...prev,
      paymentMethods: prev.paymentMethods.filter((item) => item.id !== paymentMethodId),
    }));
  };

  const editContactMessage = async (message) => {
    const subject = window.prompt("Edit subject", message.subject || "");
    if (subject === null) return;
    const text = window.prompt("Edit message", message.message || "");
    if (text === null) return;

    try {
      const response = await api(`/admin/messages/contact/${message.id}`, {
        method: "PATCH",
        body: JSON.stringify({ subject: subject.trim(), message: text.trim() }),
      });
      setContactMessages((prev) =>
        prev.map((item) => (item.id === message.id ? response.contactMessage : item)),
      );
      toast({ title: "Contact message updated", description: "Contact message edited." });
    } catch (err) {
      toast({
        title: "Update failed",
        description: err?.message || "Could not update contact message.",
        variant: "destructive",
      });
    }
  };

  const deleteContactMessage = async (messageId) => {
    try {
      await api(`/admin/messages/contact/${messageId}`, { method: "DELETE" });
      setContactMessages((prev) => prev.filter((item) => item.id !== messageId));
      toast({ title: "Contact message deleted", description: "Message removed." });
    } catch (err) {
      toast({
        title: "Delete failed",
        description: err?.message || "Could not delete contact message.",
        variant: "destructive",
      });
    }
  };

  const normalizePhone = (value) => (value || "").replace(/\D/g, "");

  const findContactUser = (message) => {
    const email = (message?.email || "").trim().toLowerCase();
    const phone = normalizePhone(message?.phone);

    return users.find((entry) => {
      const emailMatch = email && entry.email?.trim().toLowerCase() === email;
      const phoneMatch = phone && normalizePhone(entry.phone) === phone;
      return emailMatch || phoneMatch;
    });
  };

  const openContactChat = (message) => {
    const matchedUser = findContactUser(message);
    if (!matchedUser) {
      toast({
        title: "Chat unavailable",
        description: "No registered user found for this contact. Use Respond to email them.",
        variant: "destructive",
      });
      return;
    }

    navigate("/messages", {
      state: {
        toUserId: matchedUser.id,
        toUserName: matchedUser.name || message.name || "Conversation",
      },
    });
  };

  const respondToContact = (message) => {
    const matchedUser = findContactUser(message);
    if (matchedUser) {
      openContactChat(message);
      return;
    }

    const subject = encodeURIComponent(`Re: ${message.subject}`);
    const body = encodeURIComponent(
      `Hi ${message.name || ""},\n\nThanks for contacting us.\n\nRegarding your message:\n"${message.message}"\n\n`,
    );
    window.location.href = `mailto:${encodeURIComponent(message.email)}?subject=${subject}&body=${body}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="container mx-auto px-4 py-8 space-y-4">
          {Array.from({ length: 4 }).map((_, idx) => <Skeleton key={idx} className="h-24 w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 bg-muted/30 py-8">
        <div className="container mx-auto px-4 space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <ProfilePicture name={user?.name || "Admin"} type="admin" userId={user?.id} editable />
              <div>
                <h1 className="text-3xl font-bold">{user?.name || "Admin"}</h1>
                <p className="text-muted-foreground">{user?.email || "admin@locallink.com"}</p>
                <Badge className="mt-2">Admin Account</Badge>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold">Admin Console</h2>
              <Button variant="outline" onClick={handleSignOut}>Logout</Button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {navCards.map((card) => (
              <button key={card.id} type="button" onClick={() => setActiveSection(card.id)} className="text-left">
                <Card className={activeSection === card.id ? "border-primary bg-primary/5" : ""}>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">{card.label}</p>
                    <p className="text-2xl font-bold">{card.value}</p>
                  </CardContent>
                </Card>
              </button>
            ))}
          </div>

          <Tabs value={activeSection} onValueChange={setActiveSection} className="space-y-4">

            <TabsContent value="categories" className="space-y-4">
              <Card>
                <CardHeader><CardTitle>{newCategory.id ? "Edit Category" : "Create Category"}</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label>Name</Label>
                      <Input
                        value={newCategory.name}
                        onChange={(event) => setNewCategory((prev) => ({ ...prev, name: event.target.value }))}
                        placeholder="Category name"
                      />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Input
                        value={newCategory.description}
                        onChange={(event) => setNewCategory((prev) => ({ ...prev, description: event.target.value }))}
                        placeholder="Short description"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Subcategories</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addNewCategorySubcategory}>
                        Add Subcategory
                      </Button>
                    </div>

                    {newCategory.subcategoryDetails.map((entry, index) => (
                      <div key={index} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 border rounded-lg p-3">
                        <div>
                          <Label>Subcategory Name</Label>
                          <Input
                            value={entry.name}
                            onChange={(event) => updateNewCategorySubcategory(index, "name", event.target.value)}
                            placeholder="Subcategory name"
                          />
                        </div>
                        <div>
                          <Label>Subcategory Description</Label>
                          <Textarea
                            value={entry.description}
                            onChange={(event) =>
                              updateNewCategorySubcategory(index, "description", event.target.value)
                            }
                            placeholder="Short subcategory description"
                            rows={2}
                          />
                        </div>
                        <div className="flex items-end">
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => removeNewCategorySubcategory(index)}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                    <div className="flex justify-end gap-2">
                      {newCategory.id ? (
                        <Button variant="outline" onClick={resetCategoryForm}>Cancel</Button>
                      ) : null}
                      <Button onClick={saveCategory}>{newCategory.id ? "Save Changes" : "Create"}</Button>
                    </div>
                  </CardContent>
                </Card>

              <Card>
                <CardHeader><CardTitle>Category Listing</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {categories.map((category) => (
                    <div key={category.id} className="border rounded-lg p-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium">{category.name}</p>
                        <p className="text-sm text-muted-foreground">{category.description || "No description"}</p>
                        {Array.isArray(category.subcategoryDetails) && category.subcategoryDetails.length > 0 ? (
                          <div className="mt-2 space-y-1">
                            {category.subcategoryDetails.slice(0, 3).map((entry) => (
                              <p key={entry.name} className="text-xs text-muted-foreground">
                                <span className="font-medium text-foreground">{entry.name}</span>
                                {entry.description ? ` - ${entry.description}` : ""}
                              </p>
                            ))}
                            {category.subcategoryDetails.length > 3 ? (
                              <p className="text-xs text-muted-foreground">...</p>
                            ) : null}
                          </div>
                        ) : null}
                        </div>
                        <div className="flex gap-2">
                          <Badge variant={category.isActive ? "default" : "secondary"}>{category.isActive ? "Active" : "Inactive"}</Badge>
                          <Button variant="outline" size="sm" onClick={() => startEditingCategory(category)}>Edit</Button>
                          <Button variant="outline" size="sm" onClick={() => toggleCategory(category)}>{category.isActive ? "Disable" : "Enable"}</Button>
                        </div>
                      </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="users">
              <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
                <Card>
                  <CardHeader><CardTitle>User Directory</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {directoryUsers.map((entry) => (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => selectUserForEdit(entry)}
                        className={`w-full text-left rounded-lg border p-3 ${
                          selectedUserId === entry.id ? "border-primary bg-primary/5" : ""
                        }`}
                      >
                        <p className="font-medium">{entry.name}</p>
                        <p className="text-xs text-muted-foreground">{entry.email}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <Badge variant="outline">{entry.type}</Badge>
                          <Badge variant={entry.isActive === false ? "secondary" : "default"}>
                            {entry.isActive === false ? "Inactive" : "Active"}
                          </Badge>
                        </div>
                      </button>
                    ))}
                  </CardContent>
                </Card>

                {!selectedUser ? (
                  <Card>
                    <CardContent className="p-6 text-sm text-muted-foreground">
                      Select a user to open the profile card.
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    <Card>
                      <CardHeader><CardTitle>Profile Card</CardTitle></CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-16 w-16">
                            <AvatarImage src={userDraft.profileImageUrl} alt={userDraft.name} />
                            <AvatarFallback>
                              {(userDraft.name || "U")
                                .split(" ")
                                .map((item) => item[0])
                                .join("")
                                .toUpperCase()
                                .slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="space-y-2">
                            <Label htmlFor="profile-photo">Profile Picture</Label>
                            <Input id="profile-photo" type="file" accept="image/*" onChange={onUserPhotoFileChange} />
                            <Input
                              placeholder="Or paste image URL/data URL"
                              value={userDraft.profileImageUrl}
                              onChange={(event) =>
                                setUserDraft((prev) => ({ ...prev, profileImageUrl: event.target.value }))
                              }
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <Label>Name</Label>
                            <Input
                              value={userDraft.name}
                              onChange={(event) =>
                                setUserDraft((prev) => ({ ...prev, name: event.target.value }))
                              }
                            />
                          </div>
                          <div>
                            <Label>Email</Label>
                            <Input
                              type="email"
                              value={userDraft.email}
                              onChange={(event) =>
                                setUserDraft((prev) => ({ ...prev, email: event.target.value }))
                              }
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <Label>Phone</Label>
                            <Input
                              value={userDraft.phone}
                              onChange={(event) =>
                                setUserDraft((prev) => ({ ...prev, phone: event.target.value }))
                              }
                            />
                          </div>
                          <div>
                            <Label>Location</Label>
                            <Input
                              value={userDraft.location}
                              onChange={(event) =>
                                setUserDraft((prev) => ({ ...prev, location: event.target.value }))
                              }
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <Label>Role</Label>
                            <div className="mt-2 flex gap-2">
                              {["customer", "provider", "admin"].map((role) => (
                                <Button
                                  key={role}
                                  type="button"
                                  size="sm"
                                  variant={userDraft.type === role ? "default" : "outline"}
                                  onClick={() => setUserDraft((prev) => ({ ...prev, type: role }))}
                                >
                                  {role}
                                </Button>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                            <div>
                              <p className="font-medium text-sm">Active Account</p>
                              <p className="text-xs text-muted-foreground">Disable to block access</p>
                            </div>
                            <Switch
                              checked={userDraft.isActive}
                              onCheckedChange={(checked) =>
                                setUserDraft((prev) => ({ ...prev, isActive: checked }))
                              }
                            />
                          </div>
                        </div>

                        <Button onClick={saveUserProfile} disabled={savingUserProfile}>
                          {savingUserProfile ? "Saving..." : "Save Profile"}
                        </Button>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Provider Account</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {!selectedUserProvider ? (
                          <p className="text-sm text-muted-foreground">
                            This user does not have a provider profile yet.
                          </p>
                        ) : (
                          <>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant={providerStatusVariant(providerDraft.applicationStatus)}>
                                {providerDraft.applicationStatus === "approved"
                                  ? "Verified"
                                  : providerDraft.applicationStatus === "rejected"
                                    ? "Not Verified"
                                    : "Pending Review"}
                              </Badge>
                              <Badge variant={selectedUserProvider.isVerified ? "default" : "secondary"}>
                                {selectedUserProvider.isVerified ? "Visible in directory" : "Hidden from directory"}
                              </Badge>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <Label>Provider Name</Label>
                                <Input
                                  value={providerDraft.name}
                                  onChange={(event) => setProviderDraft((prev) => ({ ...prev, name: event.target.value }))}
                                />
                              </div>
                              <div>
                                <Label>Location</Label>
                                <Input
                                  value={providerDraft.location}
                                  onChange={(event) => setProviderDraft((prev) => ({ ...prev, location: event.target.value }))}
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <Label>Category</Label>
                                <Input
                                  value={providerDraft.category}
                                  onChange={(event) => setProviderDraft((prev) => ({ ...prev, category: event.target.value }))}
                                />
                              </div>
                              <div>
                                <Label>Subcategory</Label>
                                <Input
                                  value={providerDraft.subCategory}
                                  onChange={(event) => setProviderDraft((prev) => ({ ...prev, subCategory: event.target.value }))}
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <Label>Billing Type</Label>
                                <div className="mt-2 flex gap-2">
                                  {["hourly", "day"].map((type) => (
                                    <Button
                                      key={type}
                                      type="button"
                                      size="sm"
                                      variant={providerDraft.billingType === type ? "default" : "outline"}
                                      onClick={() => setProviderDraft((prev) => ({ ...prev, billingType: type }))}
                                    >
                                      {type}
                                    </Button>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <Label>Experience</Label>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {["<1", "1-3", "3-5", "5+"].map((value) => (
                                    <Button
                                      key={value}
                                      type="button"
                                      size="sm"
                                      variant={providerDraft.experience === value ? "default" : "outline"}
                                      onClick={() => setProviderDraft((prev) => ({ ...prev, experience: value }))}
                                    >
                                      {experienceLabel(value)}
                                    </Button>
                                  ))}
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <Label>Starting Price</Label>
                                <Input
                                  type="number"
                                  value={providerDraft.priceMin}
                                  onChange={(event) => setProviderDraft((prev) => ({ ...prev, priceMin: event.target.value }))}
                                />
                              </div>
                              <div>
                                <Label>Hourly Rate</Label>
                                <Input
                                  type="number"
                                  value={providerDraft.hourlyRate}
                                  onChange={(event) => setProviderDraft((prev) => ({ ...prev, hourlyRate: event.target.value }))}
                                />
                              </div>
                            </div>

                            <div>
                              <Label>Skills</Label>
                              <Input
                                value={providerDraft.skills}
                                onChange={(event) => setProviderDraft((prev) => ({ ...prev, skills: event.target.value }))}
                                placeholder="Comma separated skills"
                              />
                            </div>

                            <div>
                              <Label>About</Label>
                              <Textarea
                                rows={4}
                                value={providerDraft.bio}
                                onChange={(event) => setProviderDraft((prev) => ({ ...prev, bio: event.target.value }))}
                              />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <Label>Aadhaar Number</Label>
                                <Input
                                  value={providerDraft.aadhaarNumber}
                                  onChange={(event) => setProviderDraft((prev) => ({ ...prev, aadhaarNumber: event.target.value.replace(/\D/g, "").slice(0, 12) }))}
                                />
                              </div>
                              <div>
                                <Label>Certificate File</Label>
                                <Input
                                  value={providerDraft.certificateUrl}
                                  onChange={(event) => setProviderDraft((prev) => ({ ...prev, certificateUrl: event.target.value }))}
                                  placeholder="Certificate URL or data URL"
                                />
                                {providerDraft.certificateUrl ? (
                                  <a
                                    href={providerDraft.certificateUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-2 inline-block text-sm text-primary hover:underline"
                                  >
                                    View certificate
                                  </a>
                                ) : null}
                              </div>
                            </div>

                            <div className="rounded-lg border p-3 space-y-3">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="font-medium">Social Links</p>
                                  <p className="text-sm text-muted-foreground">Visible links saved on the provider dashboard.</p>
                                </div>
                                <SocialLinksRow socialLinks={providerDraft.socialLinks} />
                              </div>
                              {Object.values(providerDraft.socialLinks).some(Boolean) ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                                  {Object.entries(providerDraft.socialLinks)
                                    .filter(([, value]) => value)
                                    .map(([key, value]) => (
                                      <a key={key} href={value} target="_blank" rel="noreferrer" className="hover:text-primary hover:underline">
                                        {key}: {value}
                                      </a>
                                    ))}
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground">No social links added yet.</p>
                              )}
                            </div>

                            <div>
                              <Label>Verification Notes</Label>
                              <Textarea
                                rows={3}
                                value={providerDraft.verificationNotes}
                                onChange={(event) =>
                                  setProviderDraft((prev) => ({ ...prev, verificationNotes: event.target.value }))
                                }
                                placeholder="Reason for rejection or admin review notes"
                              />
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <Button onClick={saveProviderProfileDraft} disabled={savingProviderProfile}>
                                {savingProviderProfile ? "Saving..." : "Save Provider Profile"}
                              </Button>
                              <Button
                                type="button"
                                variant="default"
                                onClick={() => setProviderApplicationStatus(selectedUserProvider, "approved")}
                              >
                                Verify
                              </Button>
                              <Button
                                type="button"
                                variant="destructive"
                                onClick={() => setProviderApplicationStatus(selectedUserProvider, "rejected")}
                              >
                                Not Verify
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setProviderApplicationStatus(selectedUserProvider, "pending")}
                              >
                                Mark Pending
                              </Button>
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader><CardTitle>Credentials</CardTitle></CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <Label>New Password</Label>
                            <Input
                              type="password"
                              value={userDraft.password}
                              onChange={(event) =>
                                setUserDraft((prev) => ({ ...prev, password: event.target.value }))
                              }
                              placeholder="Minimum 8 characters"
                            />
                          </div>
                          <div>
                            <Label>Confirm Password</Label>
                            <Input
                              type="password"
                              value={userDraft.confirmPassword}
                              onChange={(event) =>
                                setUserDraft((prev) => ({ ...prev, confirmPassword: event.target.value }))
                              }
                            />
                          </div>
                        </div>
                        <Button variant="outline" onClick={saveUserPassword} disabled={savingUserPassword}>
                          {savingUserPassword ? "Updating..." : "Update Password"}
                        </Button>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader><CardTitle>User Settings</CardTitle></CardHeader>
                      <CardContent className="space-y-4">
                        <div className="rounded-lg border p-3 space-y-3">
                          <p className="font-medium">Preferences</p>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                              <Label>Language</Label>
                              <Input
                                value={userDraft.preferences.language}
                                onChange={(event) =>
                                  setUserDraft((prev) => ({
                                    ...prev,
                                    preferences: { ...prev.preferences, language: event.target.value.toLowerCase() },
                                  }))
                                }
                              />
                            </div>
                            <div>
                              <Label>Currency</Label>
                              <Input
                                value={userDraft.preferences.currency}
                                onChange={(event) =>
                                  setUserDraft((prev) => ({
                                    ...prev,
                                    preferences: { ...prev.preferences, currency: event.target.value.toUpperCase() },
                                  }))
                                }
                              />
                            </div>
                            <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                              <span className="text-sm">Dark Mode</span>
                              <Switch
                                checked={userDraft.preferences.darkMode}
                                onCheckedChange={(checked) =>
                                  setUserDraft((prev) => ({
                                    ...prev,
                                    preferences: { ...prev.preferences, darkMode: checked },
                                  }))
                                }
                              />
                            </div>
                          </div>
                        </div>

                        <div className="rounded-lg border p-3 space-y-3">
                          <p className="font-medium">Notifications</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {[
                              ["bookingConfirm", "Booking confirmations"],
                              ["messages", "Messages"],
                              ["reviews", "Reviews"],
                              ["promotions", "Promotions"],
                            ].map(([key, label]) => (
                              <div key={key} className="flex items-center justify-between rounded-lg border px-3 py-2">
                                <span className="text-sm">{label}</span>
                                <Switch
                                  checked={userDraft.notificationSettings[key]}
                                  onCheckedChange={(checked) =>
                                    setUserDraft((prev) => ({
                                      ...prev,
                                      notificationSettings: { ...prev.notificationSettings, [key]: checked },
                                    }))
                                  }
                                />
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="rounded-lg border p-3">
                          <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                            <div>
                              <p className="text-sm font-medium">Two Factor Authentication</p>
                              <p className="text-xs text-muted-foreground">Security setting</p>
                            </div>
                            <Switch
                              checked={userDraft.security.twoFactorEnabled}
                              onCheckedChange={(checked) =>
                                setUserDraft((prev) => ({
                                  ...prev,
                                  security: { ...prev.security, twoFactorEnabled: checked },
                                }))
                              }
                            />
                          </div>
                        </div>

                        <div className="rounded-lg border p-3 space-y-3">
                          <p className="font-medium">Payment Methods</p>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                            <div>
                              <Label>Type</Label>
                              <div className="mt-2 flex gap-2">
                                {["upi", "card", "bank"].map((type) => (
                                  <Button
                                    key={type}
                                    size="sm"
                                    type="button"
                                    variant={newPaymentMethod.type === type ? "default" : "outline"}
                                    onClick={() => setNewPaymentMethod((prev) => ({ ...prev, type }))}
                                  >
                                    {type}
                                  </Button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <Label>Label</Label>
                              <Input
                                value={newPaymentMethod.label}
                                onChange={(event) =>
                                  setNewPaymentMethod((prev) => ({ ...prev, label: event.target.value }))
                                }
                              />
                            </div>
                            <div>
                              <Label>Value</Label>
                              <Input
                                value={newPaymentMethod.value}
                                onChange={(event) =>
                                  setNewPaymentMethod((prev) => ({ ...prev, value: event.target.value }))
                                }
                              />
                            </div>
                            <div className="flex items-end">
                              <Button type="button" variant="outline" onClick={addDraftPaymentMethod}>
                                Add
                              </Button>
                            </div>
                          </div>

                          <div className="space-y-2">
                            {userDraft.paymentMethods.length === 0 ? (
                              <p className="text-sm text-muted-foreground">No payment methods.</p>
                            ) : (
                              userDraft.paymentMethods.map((method) => (
                                <div key={method.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                                  <div>
                                    <p className="text-sm font-medium">{method.label}</p>
                                    <p className="text-xs text-muted-foreground">{method.type} | {method.value}</p>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    type="button"
                                    onClick={() => removeDraftPaymentMethod(method.id)}
                                  >
                                    Remove
                                  </Button>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        <Button onClick={saveUserSettings} disabled={savingUserSettings}>
                          {savingUserSettings ? "Saving..." : "Save User Settings"}
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="providers">
              <Card>
                <CardHeader><CardTitle>Provider Applications</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {providerApplications.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No pending or rejected provider applications.
                    </p>
                  ) : (
                    providerApplications.map((provider) => {
                      const status = provider.applicationStatus || (provider.isVerified ? "approved" : "pending");
                      return (
                        <div key={provider.id} className="border rounded-lg p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                          <div>
                            <p className="font-medium">{provider.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {provider.category} | {provider.subCategory || "No subcategory"} | {provider.location}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {provider.user?.email || "No email"} | {provider.user?.phone || "No phone"}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={providerStatusVariant(status)}>
                              {status === "rejected" ? "Not Verified" : status === "approved" ? "Verified" : "Pending"}
                            </Badge>
                            <Button size="sm" variant="outline" onClick={() => setViewingProviderId(provider.id)}>
                              View Application
                            </Button>
                            <Button size="sm" onClick={() => setProviderApplicationStatus(provider, "approved")}>
                              Verify
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => setProviderApplicationStatus(provider, "rejected")}>
                              Not Verify
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => deleteProvider(provider.id)}>
                              Delete
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>

              {viewingProvider ? (
                <Card>
                  <CardHeader><CardTitle>Provider Application</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <p className="text-sm text-muted-foreground">Full Name</p>
                        <p className="font-medium">{viewingProvider.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="font-medium">{viewingProvider.user?.email || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <p className="font-medium">{viewingProvider.user?.phone || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Location</p>
                        <p className="font-medium">{viewingProvider.location}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Service Category</p>
                        <p className="font-medium">{viewingProvider.category}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Service Subcategory</p>
                        <p className="font-medium">{viewingProvider.subCategory || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Experience</p>
                        <p className="font-medium">{experienceLabel(viewingProvider.experience)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Hourly Rate</p>
                        <p className="font-medium">Rs {viewingProvider.hourlyRate || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Aadhaar Number</p>
                        <p className="font-medium">{viewingProvider.aadhaarNumber || "Not provided"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Skills</p>
                        <p className="font-medium">{(viewingProvider.skills || []).join(", ") || "Not provided"}</p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-sm text-muted-foreground">Description</p>
                        <p>{viewingProvider.bio}</p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-sm text-muted-foreground">Social Links</p>
                        <p className="font-medium">
                          {Object.values(viewingProvider.socialLinks || {}).filter(Boolean).length > 0
                            ? Object.entries(viewingProvider.socialLinks || {})
                                .filter(([, value]) => value)
                                .map(([key, value]) => `${key}: ${value}`)
                                .join(" | ")
                            : "Not provided"}
                        </p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-sm text-muted-foreground">Certificate</p>
                        {viewingProvider.certificateUrl ? (
                          <a href={viewingProvider.certificateUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                            View uploaded certificate
                          </a>
                        ) : (
                          <p className="font-medium">Not provided</p>
                        )}
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-sm text-muted-foreground">Verification Notes</p>
                        <p>{viewingProvider.verificationNotes || "No notes added yet."}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <p className="text-sm text-muted-foreground">Rating</p>
                        <p className="font-medium">{viewingProvider.rating || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Reviews</p>
                        <p className="font-medium">{viewingProvider.reviews || 0}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Applied On</p>
                        <p className="font-medium">{new Date(viewingProvider.createdAt).toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 items-center">
                      <Button size="sm" onClick={() => setProviderApplicationStatus(viewingProvider, "approved")}>
                        Verify Application
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => setProviderApplicationStatus(viewingProvider, "rejected")}>
                        Not Verify
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setProviderApplicationStatus(viewingProvider, "pending")}>
                        Mark Pending
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setViewingProviderId("")}>
                        Close
                      </Button>
                      <Badge variant={providerStatusVariant(viewingProvider.applicationStatus || "pending")}>
                        {(viewingProvider.applicationStatus || "pending").toUpperCase()}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ) : null}
            </TabsContent>

            <TabsContent value="bookings">
              <Card>
                <CardHeader><CardTitle>Recent Bookings</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {sortedBookings.map((booking) => (
                    <div key={booking.id} className="border rounded-lg p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div>
                      <p className="font-medium">{booking.service}</p>
                      <p className="text-sm text-muted-foreground">{new Date(booking.scheduledFor).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Customer: {usersById.get(booking.customerId)?.name || usersById.get(booking.customerId)?.email || "Unknown"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Provider: {providersById.get(booking.providerId)?.name || "Unknown"} (
                        {providersById.get(booking.providerId)?.user?.email || "N/A"})
                      </p>
                    </div>
                      <div className="flex items-center gap-2">
                        <Badge>{booking.status}</Badge>
                        <Badge variant="outline">{booking.id.slice(0, 12)}...</Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="messages" className="space-y-4">
              <Card>
                <CardHeader><CardTitle>Contact Form Messages</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {sortedContactMessages.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No contact messages yet.</p>
                  ) : (
                    sortedContactMessages.map((message) => (
                      <div key={message.id} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="font-medium">{message.subject}</p>
                            <p className="text-xs text-muted-foreground">
                              {message.name} ({message.email}) {message.phone ? `| ${message.phone}` : ""}
                            </p>
                          </div>
                          <Badge variant="outline">{new Date(message.createdAt).toLocaleString()}</Badge>
                        </div>
                        <p className="text-sm">{message.message}</p>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => editContactMessage(message)}>Edit</Button>
                          <Button size="sm" variant="outline" onClick={() => respondToContact(message)}>Respond</Button>
                          <Button size="sm" onClick={() => openContactChat(message)}>Open Chat</Button>
                          <Button size="sm" variant="destructive" onClick={() => deleteContactMessage(message.id)}>Delete</Button>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Admin;









