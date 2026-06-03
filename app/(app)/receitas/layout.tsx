import PlanGuard from '@/components/PlanGuard'
export default function Layout({ children }: { children: React.ReactNode }) {
  return <PlanGuard requiredPlan="basic">{children}</PlanGuard>
}
