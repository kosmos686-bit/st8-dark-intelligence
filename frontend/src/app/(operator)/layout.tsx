import OperatorLayoutClient from './OperatorLayoutClient'

export default function OperatorLayout({ children }: { children: React.ReactNode }) {
  return <OperatorLayoutClient>{children}</OperatorLayoutClient>
}
