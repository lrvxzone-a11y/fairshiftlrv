import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  AlertTriangle,
  FileCheck2,
  FileText,
  ShieldCheck,
  Check,
  Clock,
  Sparkles,
  X,
  ExternalLink
} from 'lucide-react';
import { Tenant } from '../types';

export interface SystemNotification {
  id: string;
  tenantId: string | 'all';
  title: string;
  message: string;
  type: 'policy' | 'site_alert' | 'shift_approval' | 'fatigue';
  timestamp: string;
  read: boolean;
}

interface Props {
  currentTenant: Tenant;
}

export const NotificationPopover: React.FC<Props> = ({ currentTenant }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'policy' | 'site_alert' | 'shift_approval'>('all');
  const popoverRef = useRef<HTMLDivElement>(null);

  const [notifications, setNotifications] = useState<SystemNotification[]>([
    {
      id: 'notif_1',
      tenantId: 'buildright',
      title: 'High Wind Staging Alert: Tower 4 External Periphery',
      message: 'Wind speeds exceeding 38 km/h. Scaffolding operations above Floor 8 temporarily paused per site safety mandate.',
      type: 'site_alert',
      timestamp: '14 mins ago',
      read: false,
    },
    {
      id: 'notif_2',
      tenantId: 'buildright',
      title: 'Overtime Shift Approved (+3.0h)',
      message: 'Supervisor Rajesh Sharma approved emergency pour scaffolding tie-in for Ramesh Kumar and team.',
      type: 'shift_approval',
      timestamp: '1 hour ago',
      read: false,
    },
    {
      id: 'notif_3',
      tenantId: 'all',
      title: 'Decent Work Policy Update: Transparent Audio Payslips',
      message: 'All worker earnings breakdowns now require instant multilingual speech playback in Hindi and Tamil to eliminate wage opacity.',
      type: 'policy',
      timestamp: '3 hours ago',
      read: false,
    },
    {
      id: 'notif_4',
      tenantId: 'citycare',
      title: 'Biohazard Spill Remediation Confirmed',
      message: 'ICU Corridor 3 chemical sanitization verified by Sister Mary Joseph. Yellow waste bin overflow resolved.',
      type: 'site_alert',
      timestamp: '5 hours ago',
      read: true,
    },
    {
      id: 'notif_5',
      tenantId: 'citycare',
      title: 'Shift Approval: Night Critical Care Roster',
      message: 'Staff Nurse Sunita Devi assigned to ICU ventilator monitoring with mandatory 11-hour rest safeguard.',
      type: 'shift_approval',
      timestamp: 'Yesterday',
      read: true,
    },
    {
      id: 'notif_6',
      tenantId: 'citycare',
      title: 'Hospital Fatigue Policy: Minimum 11h Rest Mandate',
      message: 'CityCare General Hospital updated standard rotation policy to prevent back-to-back shift exhaustion under SDG 8 health protocols.',
      type: 'policy',
      timestamp: '2 days ago',
      read: true,
    },
  ]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Keyboard Escape to close
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Filter notifications for current tenant or global 'all'
  const tenantNotifs = notifications.filter(
    (n) => n.tenantId === 'all' || n.tenantId === currentTenant.id
  );

  const filteredNotifs = filter === 'all'
    ? tenantNotifs
    : tenantNotifs.filter((n) => n.type === filter);

  const unreadCount = tenantNotifs.filter((n) => !n.read).length;

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markItemAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  return (
    <div className="relative inline-block text-left" ref={popoverRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Open system notifications"
        aria-expanded={isOpen}
        className={`relative p-2 rounded-xl transition-all cursor-pointer flex items-center justify-center border ${
          isOpen
            ? 'bg-sky-600 text-white border-sky-400 shadow-md'
            : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800'
        }`}
      >
        <Bell className="w-4 h-4" />

        {/* Unread Badge Indicator */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-extrabold text-white shadow-md animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Popover Card */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl z-50 overflow-hidden animate-scaleUp">
          {/* Header */}
          <div className="p-3.5 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-sky-950 border border-sky-800/60 flex items-center justify-center text-sky-400">
                <Bell className="w-3.5 h-3.5" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-slate-100">System Notifications & Alerts</h4>
                <p className="text-[10px] text-slate-400">
                  {currentTenant.name.split(' (')[0]} • {unreadCount} unread
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="text-[10px] text-sky-400 hover:text-sky-300 font-semibold px-2 py-1 rounded bg-slate-900 border border-slate-800 cursor-pointer transition-colors"
                >
                  Mark read
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white p-1 text-xs cursor-pointer"
                aria-label="Close notifications popover"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="px-3 py-2 bg-slate-950/40 border-b border-slate-800 flex items-center gap-1 overflow-x-auto text-[10px]">
            {[
              { id: 'all', label: 'All' },
              { id: 'site_alert', label: 'Site Alerts' },
              { id: 'shift_approval', label: 'Approvals' },
              { id: 'policy', label: 'Policy Updates' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id as any)}
                className={`px-2 py-0.5 rounded-full font-medium whitespace-nowrap transition-all cursor-pointer ${
                  filter === f.id
                    ? 'bg-sky-600 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 bg-slate-900/60'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Notification Items List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60">
            {filteredNotifs.length === 0 ? (
              <div className="p-8 text-center text-slate-500 italic text-xs">
                No notifications matching this filter.
              </div>
            ) : (
              filteredNotifs.map((item) => {
                const isAlert = item.type === 'site_alert';
                const isApproval = item.type === 'shift_approval';
                const isPolicy = item.type === 'policy';

                return (
                  <div
                    key={item.id}
                    onClick={() => markItemAsRead(item.id)}
                    className={`p-3 transition-colors cursor-pointer flex items-start gap-2.5 text-xs ${
                      !item.read
                        ? 'bg-slate-950/70 hover:bg-slate-950'
                        : 'bg-slate-900/40 hover:bg-slate-900/80 opacity-80'
                    }`}
                  >
                    {/* Icon by Type */}
                    <div
                      className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center border mt-0.5 ${
                        isAlert
                          ? 'bg-rose-950/80 border-rose-800/60 text-rose-400'
                          : isApproval
                          ? 'bg-emerald-950/80 border-emerald-800/60 text-emerald-400'
                          : 'bg-indigo-950/80 border-indigo-800/60 text-indigo-400'
                      }`}
                    >
                      {isAlert && <AlertTriangle className="w-3.5 h-3.5" />}
                      {isApproval && <FileCheck2 className="w-3.5 h-3.5" />}
                      {isPolicy && <Sparkles className="w-3.5 h-3.5" />}
                    </div>

                    {/* Content */}
                    <div className="flex-1 space-y-1">
                      <div className="flex items-start justify-between gap-1">
                        <h5
                          className={`font-semibold text-xs leading-snug ${
                            !item.read ? 'text-slate-100' : 'text-slate-300'
                          }`}
                        >
                          {item.title}
                        </h5>
                        {!item.read && (
                          <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0 mt-1" />
                        )}
                      </div>

                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        {item.message}
                      </p>

                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5 font-mono">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{item.timestamp}</span>
                        </span>
                        <span className="capitalize text-slate-400">
                          {item.type.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-slate-950 border-t border-slate-800 text-center">
            <span className="text-[10px] text-slate-500 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>FairShift Decent Work Dispatch • Active 24/7 Monitoring</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
