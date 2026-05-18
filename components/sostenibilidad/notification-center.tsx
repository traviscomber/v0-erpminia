'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, X, AlertCircle, CheckCircle, Info } from 'lucide-react';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  read: boolean;
}

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleNotification = (event: Event) => {
      const customEvent = event as CustomEvent;
      const newNotification: Notification = {
        id: Math.random().toString(36),
        ...customEvent.detail,
        read: false,
      };
      setNotifications(prev => [newNotification, ...prev].slice(0, 50));
    };

    window.addEventListener('notification', handleNotification);
    return () => window.removeEventListener('notification', handleNotification);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (priority: string) => {
    switch (priority) {
      case 'critical':
      case 'high':
        return <AlertCircle className="w-4 h-4 text-destructive" />;
      case 'medium':
        return <Info className="w-4 h-4 text-primary" />;
      default:
        return <CheckCircle className="w-4 h-4 text-secondary" />;
    }
  };

  const getBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'default';
      case 'medium':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-2 h-2 bg-destructive rounded-full" />
        )}
      </Button>

      {isOpen && (
        <Card className="absolute right-0 top-12 w-96 max-h-96 overflow-hidden z-50">
          <CardHeader className="border-b">
            <div className="flex justify-between items-center">
              <CardTitle>Notificaciones</CardTitle>
              <span className="text-sm text-muted-foreground">{unreadCount} nuevas</span>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-y-auto max-h-80">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                No hay notificaciones
              </div>
            ) : (
              notifications.map(notif => (
                <div
                  key={notif.id}
                  className="border-b p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex gap-3">
                    {getIcon(notif.priority)}
                    <div className="flex-1">
                      <div className="font-semibold text-sm">{notif.title}</div>
                      <div className="text-xs text-muted-foreground">{notif.message}</div>
                      <div className="mt-2 flex gap-2">
                        <Badge variant={getBadgeVariant(notif.priority)}>
                          {notif.priority}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
