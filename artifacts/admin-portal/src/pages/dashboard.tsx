import { useGetAdminStats, getGetAdminStatsQueryKey } from "@workspace/api-client-react";
import { 
  Users, 
  Building2, 
  Clock, 
  Key, 
  Activity,
  ArrowUpRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export default function Dashboard() {
  const { t } = useTranslation();
  const { data: stats, isLoading, isError } = useGetAdminStats({
    query: {
      queryKey: getGetAdminStatsQueryKey()
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded-md mb-8"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-card border rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (isError || !stats) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center text-muted-foreground">
        <Activity className="w-12 h-12 mb-4 opacity-20" />
        <p>{t('dashboard.error')}</p>
      </div>
    );
  }

  const statCards = [
    {
      title: t('dashboard.cards.totalUsers'),
      value: stats.totalUsers,
      icon: Users,
      trend: "+12.5%",
      description: t('dashboard.cards.totalUsersDesc'),
      color: "text-blue-500",
      bgColor: "bg-blue-500/10"
    },
    {
      title: t('dashboard.cards.activeProperties'),
      value: stats.activeListings,
      icon: Building2,
      trend: "+4.1%",
      description: t('dashboard.cards.activePropertiesDesc'),
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10"
    },
    {
      title: t('dashboard.cards.pendingReviews'),
      value: stats.pendingReview,
      icon: Clock,
      trend: "-2.3%",
      description: t('dashboard.cards.pendingReviewsDesc'),
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
      alert: stats.pendingReview > 10
    },
    {
      title: t('dashboard.cards.contactReleases'),
      value: stats.contactReleasesThisMonth,
      icon: Key,
      trend: "+18.2%",
      description: t('dashboard.cards.contactReleasesDesc'),
      color: "text-purple-500",
      bgColor: "bg-purple-500/10"
    }
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{t('dashboard.title')}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t('dashboard.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <div key={i} className={cn(
            "bg-card border rounded-lg p-5 flex flex-col justify-between relative overflow-hidden transition-all hover:shadow-md",
            card.alert && "border-amber-500/50 shadow-[0_0_15px_-3px_rgba(245,158,11,0.1)]"
          )}>
            {card.alert && (
              <div className="absolute top-0 end-0 w-12 h-12 bg-amber-500/10 rounded-es-full flex items-start justify-end p-2">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
              </div>
            )}
            
            <div className="flex justify-between items-start mb-4">
              <div className={cn("p-2.5 rounded-md", card.bgColor)}>
                <card.icon className={cn("w-5 h-5", card.color)} />
              </div>
              <div className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                <ArrowUpRight className="w-3 h-3" />
                {card.trend}
              </div>
            </div>
            
            <div>
              <div className="text-3xl font-bold font-mono tracking-tight text-foreground">
                {card.value.toLocaleString()}
              </div>
              <div className="text-sm font-semibold text-muted-foreground mt-1">
                {card.title}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {card.description}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="col-span-1 bg-card border rounded-lg overflow-hidden">
          <div className="p-5 border-b bg-muted/20">
            <h3 className="font-semibold">{t('dashboard.distribution.title')}</h3>
            <p className="text-xs text-muted-foreground mt-1">{t('dashboard.distribution.subtitle')}</p>
          </div>
          <div className="p-5">
            <div className="space-y-4">
              {[
                { label: t('dashboard.distribution.buyers'),  value: stats.usersByRole?.buyer  || 0, color: "bg-blue-500" },
                { label: t('dashboard.distribution.sellers'), value: stats.usersByRole?.seller || 0, color: "bg-emerald-500" },
                { label: t('dashboard.distribution.brokers'), value: stats.usersByRole?.broker || 0, color: "bg-purple-500" }
              ].map((role) => (
                <div key={role.label} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-muted-foreground">{role.label}</span>
                    <span className="font-mono font-semibold">{role.value.toLocaleString()}</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div 
                      className={cn("h-full rounded-full", role.color)} 
                      style={{ width: `${Math.max(2, (role.value / ((stats.usersByRole?.buyer||0) + (stats.usersByRole?.seller||0) + (stats.usersByRole?.broker||0) || 1)) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="col-span-1 lg:col-span-2 bg-card border rounded-lg overflow-hidden flex flex-col items-center justify-center p-8 text-center">
          <Activity className="w-8 h-8 text-muted-foreground/30 mb-3" />
          <h3 className="text-sm font-semibold text-muted-foreground">{t('dashboard.analytics.title')}</h3>
          <p className="text-xs text-muted-foreground/70 mt-1 max-w-sm">
            {t('dashboard.analytics.offline')}
          </p>
        </div>
      </div>
    </div>
  );
}
