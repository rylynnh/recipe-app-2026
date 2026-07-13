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
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-divider z-40">
      <div className="max-w-lg mx-auto flex items-center justify-around h-16 px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab.id);
          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.id)}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                active ? 'text-accent' : 'text-secondary'
              }`}
            >
              <Icon className={`w-5 h-5 mb-1 transition-transform ${active ? 'scale-110' : ''}`} />
              <span className="text-xs">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
