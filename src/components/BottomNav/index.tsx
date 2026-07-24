import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutGrid, ListTodo, User } from 'lucide-react';

function HomeIcon({ className = '', strokeWidth = 1.8 }: { className?: string; strokeWidth?: number }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const tabs = [
    { id: '/', label: '首页', icon: HomeIcon },
    { id: '/category', label: '分类', icon: LayoutGrid },
    { id: '/todo', label: '待办', icon: ListTodo },
    { id: '/mine', label: '我的', icon: User },
  ];

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card z-40" style={{ borderTop: '0.5px solid var(--color-divider)' }}>
      <div className="max-w-lg mx-auto flex items-center justify-around h-[60px] px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab.id);
          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.id)}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                active ? 'text-accent' : 'text-secondary/70'
              }`}
            >
              <Icon className={`w-[22px] h-[22px] mb-0.5 transition-transform ${active ? 'scale-110' : ''}`} strokeWidth={active ? 2.2 : 1.8} />
              <span className={`text-[11px] ${active ? 'font-semibold text-accent' : 'font-normal'}`}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
