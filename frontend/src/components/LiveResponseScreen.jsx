import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MapPin, Star, Clock, Zap, CheckCircle2, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const LiveResponseScreen = ({
  category,
  request,
  responses = [],
  secondsRemaining = 0,
  onProviderSelect,
  onCancel,
}) => {
  const progressValue = useMemo(() => {
    if (!request?.createdAt || !request?.expiresAt) return 0;
    const total = new Date(request.expiresAt) - new Date(request.createdAt);
    if (total <= 0) return 0;
    const elapsed = total - secondsRemaining * 1000;
    return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
  }, [request, secondsRemaining]);

  const acceptedProviders = responses.filter((item) => item.status !== "rejected");

  const handleSelectProvider = (provider) => {
    onProviderSelect?.(provider);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-6 w-6 text-orange-500 animate-pulse" />
              Live {category || "Service"} Responses
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onCancel}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="space-y-2 mt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {acceptedProviders.length} provider{acceptedProviders.length !== 1 ? "s" : ""} responding
              </span>
              <span className="font-mono font-semibold text-orange-500">{secondsRemaining}s remaining</span>
            </div>
            <Progress value={progressValue} className="h-2" />
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {acceptedProviders.length === 0 ? (
            <div className="text-center py-12">
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-orange-500/20 rounded-full animate-ping" />
                  <Zap className="h-16 w-16 text-orange-500 relative" />
                </div>
              </div>
              <p className="text-lg font-medium">Broadcasting to nearby providers...</p>
              <p className="text-sm text-muted-foreground mt-2">
                Providers will appear here as they accept the request.
              </p>
            </div>
          ) : (
            <>
              <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4">
                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                  Providers are responding to your request
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  Select the best match or wait for the live request to complete.
                </p>
              </div>

              {acceptedProviders.map((provider) => (
                <Card
                  key={provider.id}
                  className="transition-all hover:shadow-md cursor-pointer"
                  onClick={() => handleSelectProvider(provider)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {String(provider.name || "P")
                              .split(" ")
                              .map((part) => part[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold">{provider.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              <span className="text-sm font-medium">{provider.rating || "New"}</span>
                            </div>
                            <span className="text-sm text-muted-foreground">-</span>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              {provider.location || "Nearby"}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="mb-1">
                          <Clock className="h-3 w-3 mr-1" />
                          Live
                        </Badge>
                        <p className="text-xs text-muted-foreground">Response</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <span className="inline-flex items-center gap-1 text-green-600">
                        <CheckCircle2 className="h-4 w-4" />
                        Ready
                      </span>
                      <span className="text-muted-foreground">Rs {provider.priceMin || "—"}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}

              <div className="flex gap-2 pt-2">
                <Button
                  className="flex-1 bg-green-500 hover:bg-green-600"
                  size="lg"
                  onClick={() => handleSelectProvider(acceptedProviders[0])}
                >
                  Confirm {acceptedProviders[0].name}
                </Button>
                <Button variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LiveResponseScreen;
