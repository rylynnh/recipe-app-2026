import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Grid3X3, ListTodo, User } from 'lucide-react';

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const tabs = [
    { id: '/', label: '首页', icon: Home },
    { id: '/category', label: '分类', icon: Grid3X3 },
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
