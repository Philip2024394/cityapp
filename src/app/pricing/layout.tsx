import AppImageBackground from '@/components/layout/AppImageBackground'

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppImageBackground />
      {children}
    </>
  )
}
