export const plantumlClassDiagrams = {
  'Basic Classes': `@startuml
class Animal {
  +String name
  +int age
  +void eat()
  +void sleep()
}
class Dog {
  +String breed
  +void bark()
}
class Cat {
  +String color
  +void meow()
}
Animal <|-- Dog
Animal <|-- Cat
@enduml`,
  'System Architecture': `@startuml
class UserController {
  +login()
  +logout()
  +register()
}
class UserService {
  +authenticate()
  +createUser()
  +updateUser()
}
class UserRepository {
  +findById()
  +save()
  +delete()
}
UserController --> UserService
UserService --> UserRepository
@enduml`
} as const
