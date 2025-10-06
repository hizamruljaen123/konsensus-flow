export const plantumlComponentDiagrams = {
  'Web Architecture': `@startuml
package "Frontend" {
  [React App]
  [Redux Store]
  [UI Components]
}
package "Backend" {
  [API Server]
  [Auth Service]
  [Business Logic]
}
package "Database" {
  [PostgreSQL]
  [Redis Cache]
}
[React App] --> [API Server] : HTTP
[Redux Store] --> [API Server] : HTTP
[API Server] --> [PostgreSQL] : SQL
[API Server] --> [Redis] : Key-Value
@enduml`,
  'Microservices': `@startuml
package "API Gateway" {
  [Gateway Service]
}
package "Services" {
  [User Service]
  [Order Service]
  [Payment Service]
  [Notification Service]
}
package "Infrastructure" {
  [Message Queue]
  [Database Cluster]
  [Cache Layer]
}
[Gateway Service] --> [User Service]
[Gateway Service] --> [Order Service]
[Gateway Service] --> [Payment Service]
[Order Service] --> [Message Queue]
[Payment Service] --> [Message Queue]
[Notification Service] --> [Message Queue]
@enduml`
} as const
