# Navigation by role

The bottom bar is built per user type in `hooks/useNavigationAccess.ts`: Inicio, then the
role's modules in its own order (`TABS_BY_USER_TYPE`), then Más. Five tabs at most, so the
labels always fit. Whatever a role uses less often is a row under Más
(`MORE_ENTRIES_BY_USER_TYPE`), never a hidden tab.

| Role | Tabs | Under Más |
|---|---|---|
| administrator, superuser | Inicio · Documentos · Catálogo · Marketplace · Más | Rutas, Inventario |
| office | Inicio · Documentos · Catálogo · Marketplace · Más | Rutas, Inventario |
| manager | Inicio · Documentos · Rutas · Inventario · Más | — |
| seller | Inicio · Documentos · Más | Productos |
| accounting | Inicio · Documentos · Más | Productos |
| driver | Inicio · Carga · Entregas · Más | — |
| inventory | Inicio · Preparación · Inventario · Más | — |

A grouped module with a single section takes that section's name: Rutas with only
Entregas is titled "Entregas" (`components/navigation/moduleMeta.ts`).

## How a module is routed

Every module has a tab screen in `app/(tabs)/` and a copy under `app/(tabs)/more/`, both
rendering the same component from `components/modules/`. The tab screen redirects to the
Más copy when the module is not a tab for this role, so old links such as
`/(tabs)/routes?section=deliveries` keep working for everyone. The Más copy adds a back
header (`components/navigation/ModuleHeader.tsx`) and keeps the Más tab highlighted.

Modules not in the role's tab list are still registered on the `Tabs` navigator with
`href: null` so they stay routable.

## Carga (driver)

`app/(tabs)/loading.tsx` is `PickingRoutesScreen` in `loading` mode: only routes in
`lista_despacho`, each opening the existing truck-load screen. The Consumo API blocks
inventory pickers, not drivers, on the load endpoints.

## Order approval

Users whose role has the `pedidos.aprobar` permission (portal users screen; read through
`GET /consumo/Usuario/me`, superusers bypass) see Aprobar / Rechazar on a pending order and
a "Por aprobar" filter in Documentos. The app calls
`PUT /consumo/Documento/{noPedidoStr}/status` with `{ status }`; the server resolves the
transition against the business workflow and refuses anything else.

## Document types per user

`documentTypes { invoice, order, quote }` on the Firestore user profile (set from the
mseller-cloud user form) limits which types the seller may create; missing means all.
`hooks/useDocumentAccess.ts` also drops quotes when the business config has
`allowQuote: false`. A user with every type off still opens Documentos (list, detail,
approval); only capture is withheld. Price editing keeps using the user's `editPrice`.

## Checking every role

Development builds have "Ver como rol" under Más, which swaps the profile's `type` in
memory so each role's bar can be screenshotted from one account. The API token is
unchanged, so the data shown is still the real user's.
