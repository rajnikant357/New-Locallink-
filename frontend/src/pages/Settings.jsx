import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { User, Bell, Lock, CreditCard, Globe, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { api } from "@/lib/api";

const Settings = () => {
  const { isAuthenticated, signOut, user, updateCurrentUser } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
    location: "",
  });

  const [notifications, setNotifications] = useState({
    bookingConfirm: true,
    messages: true,
    reviews: true,
    promotions: false,
  });

  const getInitialDarkMode = () => {
    if (typeof localStorage !== "undefined" && localStorage.getItem("locallink-theme") === "dark") return true;
    if (typeof document !== "undefined" && document.documentElement.classList.contains("dark")) return true;
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches) return true;
    return false;
  };

  const [preferences, setPreferences] = useState({
    language: "en",
    currency: "INR",
    darkMode: getInitialDarkMode(),
  });

  const [security, setSecurity] = useState({
    twoFactorEnabled: false,
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [paymentMethods, setPaymentMethods] = useState([]);
  const [newPaymentMethod, setNewPaymentMethod] = useState({
    type: "upi",
    label: "",
    value: "",
  });

  const [saving, setSaving] = useState({
    profile: false,
    notifications: false,
    preferences: false,
    security: false,
    payment: false,
  });

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      if (!isAuthenticated) return;
      try {
        const response = await api("/users/me");
        if (!mounted) return;

        setProfile({
          name: response.user.name || "",
          email: response.user.email || "",
          phone: response.user.phone || "",
          location: response.user.location || "",
        });

        setNotifications({
          bookingConfirm: response.user.notificationSettings?.bookingConfirm ?? true,
          messages: response.user.notificationSettings?.messages ?? true,
          reviews: response.user.notificationSettings?.reviews ?? true,
          promotions: response.user.notificationSettings?.promotions ?? false,
        });

        setPreferences({
          language: response.user.preferences?.language || "en",
          currency: response.user.preferences?.currency || "INR",
          darkMode: response.user.preferences?.darkMode ?? false,
        });

        setSecurity((prev) => ({
          ...prev,
          twoFactorEnabled: response.user.security?.twoFactorEnabled ?? false,
        }));

        setPaymentMethods(Array.isArray(response.user.paymentMethods) ? response.user.paymentMethods : []);
      } catch {
        if (!mounted) return;
        setProfile({
          name: user?.name || "",
          email: user?.email || "",
          phone: user?.phone || "",
          location: user?.location || "",
        });
      }
    };

    loadProfile();
    return () => {
      mounted = false;
    };
  }, [isAuthenticated, user]);

  useEffect(() => {
    const isDark = !!preferences.darkMode;
    document.documentElement.classList.toggle("dark", isDark);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("locallink-theme", isDark ? "dark" : "light");
    }
  }, [preferences.darkMode]);

  const handleSaveProfile = async () => {
    try {
      setSaving((prev) => ({ ...prev, profile: true }));
      const response = await api("/users/me", {
        method: "PATCH",
        body: JSON.stringify({
          name: profile.name,
          email: profile.email,
          phone: profile.phone,
          location: profile.location,
        }),
      });

      updateCurrentUser(response.user);

      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
    } catch (err) {
      toast({
        title: "Update failed",
        description: err?.message || "Could not update profile.",
        variant: "destructive",
      });
    } finally {
      setSaving((prev) => ({ ...prev, profile: false }));
    }
  };

  const handleSaveNotifications = async () => {
    try {
      setSaving((prev) => ({ ...prev, notifications: true }));
      await api("/users/me/notifications", {
        method: "PATCH",
        body: JSON.stringify(notifications),
      });
      toast({
        title: "Preferences Saved",
        description: "Your notification preferences have been updated.",
      });
    } catch (err) {
      toast({
        title: "Save failed",
        description: err?.message || "Could not save notification settings.",
        variant: "destructive",
      });
    } finally {
      setSaving((prev) => ({ ...prev, notifications: false }));
    }
  };

  const handleSavePreferences = async () => {
    try {
      setSaving((prev) => ({ ...prev, preferences: true }));
      await api("/users/me/preferences", {
        method: "PATCH",
        body: JSON.stringify(preferences),
      });
      toast({
        title: "Preferences Saved",
        description: "Your app preferences have been updated.",
      });
    } catch (err) {
      toast({
        title: "Save failed",
        description: err?.message || "Could not save app preferences.",
        variant: "destructive",
      });
    } finally {
      setSaving((prev) => ({ ...prev, preferences: false }));
    }
  };

  const handleUpdatePassword = async () => {
    if (!security.currentPassword || !security.newPassword) {
      toast({
        title: "Missing fields",
        description: "Please fill current and new password.",
        variant: "destructive",
      });
      return;
    }

    if (security.newPassword !== security.confirmPassword) {
      toast({
        title: "Passwords do not match",
        description: "Confirm password must match new password.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving((prev) => ({ ...prev, security: true }));
      await api("/users/me/password", {
        method: "PATCH",
        body: JSON.stringify({
          currentPassword: security.currentPassword,
          newPassword: security.newPassword,
        }),
      });

      setSecurity((prev) => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }));

      toast({
        title: "Password updated",
        description: "Your password has been changed successfully.",
      });
    } catch (err) {
      toast({
        title: "Password update failed",
        description: err?.message || "Could not update password.",
        variant: "destructive",
      });
    } finally {
      setSaving((prev) => ({ ...prev, security: false }));
    }
  };

  const handleToggle2FA = async () => {
    const nextValue = !security.twoFactorEnabled;

    try {
      setSaving((prev) => ({ ...prev, security: true }));
      await api("/users/me/security", {
        method: "PATCH",
        body: JSON.stringify({ twoFactorEnabled: nextValue }),
      });

      setSecurity((prev) => ({ ...prev, twoFactorEnabled: nextValue }));

      toast({
        title: nextValue ? "2FA enabled" : "2FA disabled",
        description: "Two-factor authentication setting updated.",
      });
    } catch (err) {
      toast({
        title: "Security update failed",
        description: err?.message || "Could not update security setting.",
        variant: "destructive",
      });
    } finally {
      setSaving((prev) => ({ ...prev, security: false }));
    }
  };

  const handleAddPaymentMethod = async () => {
    if (!newPaymentMethod.label.trim() || !newPaymentMethod.value.trim()) {
      toast({
        title: "Missing fields",
        description: "Please enter payment label and details.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving((prev) => ({ ...prev, payment: true }));
      const response = await api("/users/me/payment-methods", {
        method: "POST",
        body: JSON.stringify({
          type: newPaymentMethod.type,
          label: newPaymentMethod.label.trim(),
          value: newPaymentMethod.value.trim(),
        }),
      });

      setPaymentMethods((prev) => [response.paymentMethod, ...prev]);
      setNewPaymentMethod({ type: "upi", label: "", value: "" });

      toast({
        title: "Payment method added",
        description: "Your payment method has been saved.",
      });
    } catch (err) {
      toast({
        title: "Add failed",
        description: err?.message || "Could not add payment method.",
        variant: "destructive",
      });
    } finally {
      setSaving((prev) => ({ ...prev, payment: false }));
    }
  };

  const handleRemovePaymentMethod = async (paymentMethodId) => {
    try {
      setSaving((prev) => ({ ...prev, payment: true }));
      await api(`/users/me/payment-methods/${paymentMethodId}`, { method: "DELETE" });
      setPaymentMethods((prev) => prev.filter((item) => item.id !== paymentMethodId));

      toast({
        title: "Payment method removed",
        description: "The payment method has been removed.",
      });
    } catch (err) {
      toast({
        title: "Remove failed",
        description: err?.message || "Could not remove payment method.",
        variant: "destructive",
      });
    } finally {
      setSaving((prev) => ({ ...prev, payment: false }));
    }
  };

  const handleSignOut = () => {
    signOut();
    toast({
      title: "Signed out",
      description: "You have been signed out successfully.",
    });
    navigate("/");
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 py-12 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle>Sign In Required</CardTitle>
                  <CardDescription>
                    You need to sign in to access and manage your settings.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link to="/auth">
                    <Button className="w-full">Sign In</Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <div className="flex-1 py-12 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl font-bold mb-8">Settings</h1>

            <Tabs defaultValue="profile" className="space-y-6">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="profile">
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </TabsTrigger>
                <TabsTrigger value="notifications">
                  <Bell className="h-4 w-4 mr-2" />
                  Notifications
                </TabsTrigger>
                <TabsTrigger value="security">
                  <Lock className="h-4 w-4 mr-2" />
                  Security
                </TabsTrigger>
                <TabsTrigger value="payment">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Payment
                </TabsTrigger>
                <TabsTrigger value="preferences">
                  <Globe className="h-4 w-4 mr-2" />
                  Preferences
                </TabsTrigger>
              </TabsList>

              <TabsContent value="profile">
                <Card>
                  <CardContent className="p-6 space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold mb-4">Profile Information</h2>
                      <p className="text-muted-foreground mb-6">
                        Update your personal information and contact details
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                          id="name"
                          value={profile.name}
                          onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={profile.email}
                          onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                          id="phone"
                          value={profile.phone}
                          onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="location">Location</Label>
                        <Input
                          id="location"
                          value={profile.location}
                          onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                        />
                      </div>
                    </div>

                    <Button onClick={handleSaveProfile} disabled={saving.profile}>
                      {saving.profile ? "Saving..." : "Save Changes"}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="notifications">
                <Card>
                  <CardContent className="p-6 space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold mb-4">Notification Preferences</h2>
                      <p className="text-muted-foreground mb-6">
                        Manage how you receive notifications
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="booking-notif">Booking Confirmations</Label>
                          <p className="text-sm text-muted-foreground">
                            Get notified when bookings are confirmed
                          </p>
                        </div>
                        <Switch
                          id="booking-notif"
                          checked={notifications.bookingConfirm}
                          onCheckedChange={(checked) =>
                            setNotifications({ ...notifications, bookingConfirm: checked })
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="message-notif">Messages</Label>
                          <p className="text-sm text-muted-foreground">
                            Get notified about new messages
                          </p>
                        </div>
                        <Switch
                          id="message-notif"
                          checked={notifications.messages}
                          onCheckedChange={(checked) =>
                            setNotifications({ ...notifications, messages: checked })
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="review-notif">Review Requests</Label>
                          <p className="text-sm text-muted-foreground">
                            Get notified to leave reviews
                          </p>
                        </div>
                        <Switch
                          id="review-notif"
                          checked={notifications.reviews}
                          onCheckedChange={(checked) =>
                            setNotifications({ ...notifications, reviews: checked })
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="promo-notif">Promotions</Label>
                          <p className="text-sm text-muted-foreground">
                            Receive promotional offers and updates
                          </p>
                        </div>
                        <Switch
                          id="promo-notif"
                          checked={notifications.promotions}
                          onCheckedChange={(checked) =>
                            setNotifications({ ...notifications, promotions: checked })
                          }
                        />
                      </div>
                    </div>

                    <Button onClick={handleSaveNotifications} disabled={saving.notifications}>
                      {saving.notifications ? "Saving..." : "Save Preferences"}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="security">
                <Card>
                  <CardContent className="p-6 space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold mb-4">Security Settings</h2>
                      <p className="text-muted-foreground mb-6">
                        Manage your password and security preferences
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="current-password">Current Password</Label>
                        <Input
                          id="current-password"
                          type="text"
                          placeholder="Enter current password"
                          value={security.currentPassword}
                          onChange={(event) =>
                            setSecurity({ ...security, currentPassword: event.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="new-password">New Password</Label>
                        <Input
                          id="new-password"
                          type="text"
                          placeholder="Enter new password"
                          value={security.newPassword}
                          onChange={(event) =>
                            setSecurity({ ...security, newPassword: event.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="confirm-password">Confirm New Password</Label>
                        <Input
                          id="confirm-password"
                          type="text"
                          placeholder="Confirm new password"
                          value={security.confirmPassword}
                          onChange={(event) =>
                            setSecurity({ ...security, confirmPassword: event.target.value })
                          }
                        />
                      </div>
                    </div>

                    <Button onClick={handleUpdatePassword} disabled={saving.security}>
                      {saving.security ? "Updating..." : "Update Password"}
                    </Button>

                    <div className="border-t pt-6">
                      <h3 className="font-semibold mb-4">Two-Factor Authentication</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Add an extra layer of security to your account
                      </p>
                      <Button variant="outline" onClick={handleToggle2FA} disabled={saving.security}>
                        {security.twoFactorEnabled ? "Disable 2FA" : "Enable 2FA"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="payment">
                <Card>
                  <CardContent className="p-6 space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold mb-4">Payment Methods</h2>
                      <p className="text-muted-foreground mb-6">
                        Manage your payment methods and billing information
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label>Type</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {["upi", "card", "bank"].map((type) => (
                            <Button
                              key={type}
                              type="button"
                              variant={newPaymentMethod.type === type ? "default" : "outline"}
                              onClick={() => setNewPaymentMethod({ ...newPaymentMethod, type })}
                            >
                              {type.toUpperCase()}
                            </Button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="payment-label">Label</Label>
                          <Input
                            id="payment-label"
                            value={newPaymentMethod.label}
                            onChange={(event) =>
                              setNewPaymentMethod({ ...newPaymentMethod, label: event.target.value })
                            }
                            placeholder="Personal account"
                          />
                        </div>
                        <div>
                          <Label htmlFor="payment-value">Details</Label>
                          <Input
                            id="payment-value"
                            value={newPaymentMethod.value}
                            onChange={(event) =>
                              setNewPaymentMethod({ ...newPaymentMethod, value: event.target.value })
                            }
                            placeholder="name@upi or masked card"
                          />
                        </div>
                      </div>

                      <Button onClick={handleAddPaymentMethod} disabled={saving.payment}>
                        {saving.payment ? "Adding..." : "Add Payment Method"}
                      </Button>

                      {paymentMethods.length === 0 ? (
                        <div className="text-center py-8">
                          <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">No payment methods added yet</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {paymentMethods.map((method) => (
                            <div
                              key={method.id}
                              className="border rounded-md p-3 flex items-center justify-between gap-3"
                            >
                              <div>
                                <p className="font-medium">{method.label}</p>
                                <p className="text-sm text-muted-foreground">
                                  {method.type.toUpperCase()} - {method.value}
                                </p>
                              </div>
                              <Button
                                variant="outline"
                                onClick={() => handleRemovePaymentMethod(method.id)}
                                disabled={saving.payment}
                              >
                                Remove
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="preferences">
                <Card>
                  <CardContent className="p-6 space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold mb-4">App Preferences</h2>
                      <p className="text-muted-foreground mb-6">
                        Customize your app experience
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Dark Mode</Label>
                          <p className="text-sm text-muted-foreground">
                            Switch to dark theme
                          </p>
                        </div>
                        <Switch
                          checked={preferences.darkMode}
                          onCheckedChange={(checked) =>
                            setPreferences({ ...preferences, darkMode: checked })
                          }
                        />
                      </div>

                      <div>
                        <Label htmlFor="language">Language</Label>
                        <Input
                          id="language"
                          value={preferences.language}
                          onChange={(event) =>
                            setPreferences({ ...preferences, language: event.target.value.toLowerCase() })
                          }
                          placeholder="en or hi"
                        />
                      </div>

                      <div>
                        <Label htmlFor="currency">Currency</Label>
                        <Input
                          id="currency"
                          value={preferences.currency}
                          onChange={(event) =>
                            setPreferences({ ...preferences, currency: event.target.value.toUpperCase() })
                          }
                        />
                      </div>
                    </div>

                    <Button onClick={handleSavePreferences} disabled={saving.preferences}>
                      {saving.preferences ? "Saving..." : "Save Preferences"}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <div className="mt-8 flex justify-end">
              <Button
                onClick={handleSignOut}
                variant="default"
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 w-auto min-w-0"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Settings;
