import PlanGuard from '@/components/PlanGuard'
export default function Layout({ children }: { children: React.ReactNode }) {
  return <PlanGuard requiredPlan="plus">{children}</PlanGuard>
}
