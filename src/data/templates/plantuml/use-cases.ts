export const plantumlUseCaseDiagrams = {
  'Basic Use Case': `@startuml
actor User as "User"
actor Admin as "Admin"
rectangle "System" {
  User -- (Login)
  User -- (Register)
  User -- (View Profile)
  Admin -- (Manage Users)
  Admin -- (View Reports)
}
@enduml`,
  'E-Commerce': `@startuml
actor Customer
actor Admin
rectangle "E-Commerce System" {
  Customer -- (Browse Products)
  Customer -- (Add to Cart)
  Customer -- (Checkout)
  Customer -- (Track Order)
  Admin -- (Manage Products)
  Admin -- (Process Orders)
  Admin -- (View Analytics)
}
@enduml`
} as const
