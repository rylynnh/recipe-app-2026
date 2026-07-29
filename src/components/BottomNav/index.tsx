import { useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, Heart, User } from 'lucide-react';

function HomeIcon({ className = '', strokeWidth = 1.8 }: { className?: string; strokeWidth?: number }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const tabs = [
    { id: '/', label: '首页', icon: HomeIcon },
    { id: '/category', label: '菜谱', icon: BookOpen },
    { id: '/favorites', label: '收藏', icon: Heart },
    { id: '/mine', label: '我的', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur" style={{ borderTop: '0.5px solid var(--color-divider)' }}>
      <div className="mx-auto flex h-[64px] max-w-lg items-center justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = tab.id === '/' ? location.pathname === '/' : location.pathname.startsWith(tab.id);
          return (
            <button key={tab.id} type="button" onClick={() => navigate(tab.id)} className={`flex h-full flex-1 flex-col items-center justify-center transition-colors ${active ? 'text-accent' : 'text-secondary/70'}`}>
              <Icon className={`mb-0.5 h-[22px] w-[22px] transition-transform ${active ? 'scale-110' : ''}`} strokeWidth={active ? 2.1 : 1.7} />
              <span className={`text-[11px] ${active ? 'font-semibold' : 'font-normal'}`}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
