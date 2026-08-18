import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FileText, LogOut, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth-context'

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-secondary/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <FileText className="h-5 w-5" />
            SimpleInvoice
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <Button asChild size="sm" variant="default">
              <Link to="/invoices/new">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">New Invoice</span>
              </Link>
            </Button>
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {user?.fullname}
            </span>
            <Button size="sm" variant="ghost" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  )
}
