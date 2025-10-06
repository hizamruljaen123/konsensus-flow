export const plantumlSequenceDiagrams = {
  'API Flow': `@startuml
actor User as "User"
participant "Frontend" as FE
participant "API" as API
participant "Database" as DB

User -> FE : Login Request
FE -> API : POST /auth/login
API -> DB : Validate User
DB --> API : User Data
API --> FE : JWT Token
FE --> User : Login Success
@enduml`,
  'Microservices': `@startuml
participant "Client" as C
participant "API Gateway" as GW
participant "Auth Service" as AS
participant "User Service" as US
participant "Database" as DB

C -> GW : Request
GW -> AS : Validate Token
AS --> GW : Token Valid
GW -> US : Get User Data
US -> DB : Query User
DB --> US : User Info
US --> GW : Response
GW --> C : Final Response
@enduml`
} as const
