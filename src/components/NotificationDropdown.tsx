import { Link } from 'react-router-dom';
import { Bell, ExternalLink, AlertCircle } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';

export const NotificationDropdown = () => {
  const { notifications, pendingCount } = useNotifications();
  const { t } = useLanguage();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative p-2 text-foreground hover:text-primary transition-colors">
          <Bell className="h-5 w-5" />
          {pendingCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {pendingCount > 9 ? '9+' : pendingCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto bg-popover z-[100]">
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="py-0">{t('notifications.title') || 'Action Required'}</DropdownMenuLabel>
        </div>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">
            {t('notifications.empty') || 'No pending actions'}
          </div>
        ) : (
          notifications.map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              className="flex flex-col items-start gap-1 p-3 cursor-pointer bg-primary/5"
              asChild={!!notification.link}
            >
              {notification.link ? (
                <Link to={notification.link} className="w-full">
                  <div className="flex items-start gap-2 w-full">
                    <AlertCircle className="mt-0.5 h-4 w-4 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm break-words">{notification.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <ExternalLink className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                  </div>
                </Link>
              ) : (
                <div className="flex items-start gap-2 w-full">
                  <AlertCircle className="mt-0.5 h-4 w-4 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm break-words">{notification.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              )}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
