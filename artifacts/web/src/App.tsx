import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/auth";
import AppLayout from "@/components/layout/AppLayout";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home";
import AuthPage from "@/pages/auth";
import ChatPage from "@/pages/chat";
import ChatDetailPage from "@/pages/chat/detail";
import ListPage from "@/pages/list";
import ProfilePage from "@/pages/profile";
import PropertyPage from "@/pages/property";
import ContactReleasePage from "@/pages/contact-release";
import WizardStep1Preview from "@/pages/list/wizard/step1-preview";
import WizardStep2Location from "@/pages/list/wizard/step2-location";
import WizardStep3Photos from "@/pages/list/wizard/step3-photos";
import WizardStep4Review from "@/pages/list/wizard/step4-review";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function AppRoutes() {
  const { i18n } = useTranslation();

  useEffect(() => {
    const dir = i18n.language === "ar" ? "rtl" : "ltr";
    document.documentElement.dir = dir;
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/chat" component={ChatPage} />
      <Route path="/chat/:id" component={ChatDetailPage} />
      <Route path="/list/wizard/:id/preview" component={WizardStep1Preview} />
      <Route path="/list/wizard/:id/location" component={WizardStep2Location} />
      <Route path="/list/wizard/:id/photos" component={WizardStep3Photos} />
      <Route path="/list/wizard/:id/review" component={WizardStep4Review} />
      <Route path="/list" component={ListPage} />
      <Route path="/property/:id" component={PropertyPage} />
      <Route path="/profile" component={ProfilePage} />
      <Route path="/contact-release/:id" component={ContactReleasePage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AppLayout>
              <AppRoutes />
            </AppLayout>
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
