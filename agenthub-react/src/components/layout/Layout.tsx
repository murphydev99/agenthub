import { Outlet } from 'react-router-dom';
import { Header } from './Header';

export function Layout() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="h-[calc(100vh-4rem)]">
        <main className="h-full overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}