export const plantumlActivityDiagrams = {
  'User Flow': `@startuml
start
:User visits website;
if (Logged in?) then (yes)
  :Show Dashboard;
else (no)
  :Show Login Page;
  :Authenticate User;
endif
:Process Request;
stop
@enduml`,
  'Order Process': `@startuml
start
:Customer places order;
:Validate inventory;
if (Items available?) then (yes)
  :Process payment;
  if (Payment successful?) then (yes)
    :Ship order;
    :Send confirmation;
  else (no)
    :Notify payment failed;
  endif
else (no)
  :Notify out of stock;
endif
stop
@enduml`
} as const
