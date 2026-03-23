import { useEffect, useMemo, useState } from "react";
import { Zap, MapPin, Clock, DollarSign, CheckCircle2, X } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { useRealtimeEvents } from "@/hooks/use-realtime-events";

const HurryModeDemo = () => {
  const [form, setForm] = useState({
    service: "Electrician",
    location: "Near me",
    budgetMin: "500",
    budgetMax: "1000",
    notes: "",
    durationSeconds: 30,
  });
  const [request, setRequest] = useState(null);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);

  useRealtimeEvents((event, payload) => {
    if (!request) return;
    if (["hurry.accepted", "hurry.cancelled"].includes(event) && payload?.request?.id === request.id) {
      setRequest(payload.request);
      if (payload.provider) {
        setResponses((prev) => {
          const exists = prev.some((entry) => entry.providerId === payload.provider.id);
          return exists ? prev : [...prev, { providerId: payload.provider.id, provider: payload.provider }];
        });
      }
    }
    if (event === "hurry.created" && payload?.request?.id === request.id) {
      setRequest(payload.request);
    }
  });

  useEffect(() => {
    if (!request) return undefined;
    const timer = setInterval(async () => {
      try {
        const res = await api(`/hurry/${request.id}`);
        setRequest(res.hurry);
        setResponses(res.responses || []);
        setTick((prev) => prev + 1);
      } catch {
        // ignore transient errors
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [request]);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setResponses([]);
    setTick(0);
    try {
      const res = await api("/hurry", {
        method: "POST",
        body: JSON.stringify({
          service: form.service.trim(),
          location: form.location.trim(),
          budgetMin: form.budgetMin ? Number(form.budgetMin) : undefined,
          budgetMax: form.budgetMax ? Number(form.budgetMax) : undefined,
          notes: form.notes.trim(),
          durationSeconds: Number(form.durationSeconds) || 30,
        }),
      });
      setRequest(res.hurry);
      toast({ title: "Request sent", description: "Broadcasting to nearby providers." });
    } catch (err) {
      toast({
        title: "Could not start Hurry Mode",
        description: err?.message || "Try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const cancel = async () => {
    if (!request) return;
    try {
      await api(`/hurry/${request.id}/cancel`, { method: "POST" });
      setRequest(null);
      setResponses([]);
      toast({ title: "Cancelled" });
    } catch (err) {
      toast({ title: "Cancel failed", description: err?.message || "Try again.", variant: "destructive" });
    }
  };

  const elapsedPct = useMemo(() => {
    if (!request?.expiresAt) return 0;
    const total = (new Date(request.expiresAt) - new Date(request.createdAt)) / 1000;
    if (total <= 0) return 0;
    const elapsed = Math.min(total, tick * 3);
    return Math.min(100, Math.round((elapsed / total) * 100));
  }, [request, tick]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <div className="flex-1 py-10 bg-muted/20">
        <div className="container mx-auto px-4 max-w-4xl space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold flex items-center justify-center gap-3">
              <Zap className="h-10 w-10 text-orange-500" />
              Hurry Mode
            </h1>
            <p className="text-muted-foreground">
              Send an urgent service request and let nearby providers race to accept.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Start an urgent request</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={submit}>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Service</label>
                  <Input value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Location</label>
                  <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Budget Min (optional)</label>
                  <Input
                    type="number"
                    value={form.budgetMin}
                    onChange={(e) => setForm({ ...form, budgetMin: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Budget Max (optional)</label>
                  <Input
                    type="number"
                    value={form.budgetMax}
                    onChange={(e) => setForm({ ...form, budgetMax: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Duration (seconds)</label>
                  <Input
                    type="number"
                    min={10}
                    max={180}
                    value={form.durationSeconds}
                    onChange={(e) => setForm({ ...form, durationSeconds: e.target.value })}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">Notes (optional)</label>
                  <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
                <div className="md:col-span-2 flex gap-3">
                  <Button type="submit" disabled={loading}>{loading ? "Sending..." : "Start Hurry Mode"}</Button>
                  {request ? (
                    <Button type="button" variant="outline" onClick={cancel}>
                      Cancel
                    </Button>
                  ) : null}
                </div>
              </form>
            </CardContent>
          </Card>

          {request ? (
            <Card>
              <CardHeader className="space-y-1">
                <div className="flex items-center justify-between">
                  <CardTitle>Live responses</CardTitle>
                  <Badge>{request.status}</Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" /> {request.location}
                  <Clock className="h-4 w-4" /> Expires {request.expiresAt ? new Date(request.expiresAt).toLocaleTimeString() : ""}
                </div>
                <Progress value={elapsedPct} className="h-2" />
              </CardHeader>
              <CardContent className="space-y-3">
                {responses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Waiting for providers to respond...</p>
                ) : (
                  responses.map((response) => (
                    <div
                      key={response.id || response.providerId}
                      className="border rounded-lg p-3 flex items-center justify-between"
                    >
                      <div className="space-y-1">
                        <p className="font-semibold flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          {response.provider?.name || "Provider"}
                        </p>
                        <div className="flex gap-3 text-sm text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <DollarSign className="h-3 w-3" /> {response.provider?.priceMin || "—"}
                          </span>
                          <span>{response.provider?.location || ""}</span>
                        </div>
                      </div>
                      <Badge variant="outline">Accepted</Badge>
                    </div>
                  ))
                )}
                {request.matchedProviderId && (
                  <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" /> A provider accepted. Check your bookings for details.
                  </div>
                )}
                {request.status === "cancelled" || request.status === "expired" ? (
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <X className="h-4 w-4" /> Request {request.status}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default HurryModeDemo;
