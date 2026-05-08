import CourierLayoutClient from './CourierLayoutClient'

export default function CourierLayout({ children }: { children: React.ReactNode }) {
  return <CourierLayoutClient>{children}</CourierLayoutClient>
}
