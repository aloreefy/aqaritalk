import { AlertTriangle, Home } from "lucide-react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";

export default function NotFound() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
      <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center">
        <AlertTriangle className="w-10 h-10 text-muted-foreground opacity-50" />
      </div>
      
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{t('notFound.title')}</h1>
        <p className="text-muted-foreground">{t('notFound.subtitle')}</p>
      </div>
      
      <Link href="/" className="inline-flex items-center justify-center gap-2 h-10 px-4 py-2 bg-primary text-primary-foreground font-medium rounded-md hover:bg-primary/90 transition-colors">
        <Home className="w-4 h-4" />
        {t('notFound.returnButton')}
      </Link>
    </div>
  );
}
