export const mermaidClassDiagrams = {
  'Basic Class': `classDiagram
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
    Animal <|-- Dog`,
  'Complex Class': `classDiagram
    class Vehicle {
        +String brand
        +String model
        +int year
        +void start()
        +void stop()
    }
    class Car {
        +int doors
        +void drive()
    }
    class Motorcycle {
        +bool hasSidecar
        +void wheelie()
    }
    Vehicle <|-- Car
    Vehicle <|-- Motorcycle`,
  'Relationships': `classDiagram
    class User {
        +String username
        +String email
        +login()
        +logout()
    }
    class Order {
        +String orderId
        +Date date
        +float total
    }
    class Product {
        +String productId
        +String name
        +float price
    }
    User "1" --> "*" Order : places
    Order "*" --> "*" Product : contains`
} as const
