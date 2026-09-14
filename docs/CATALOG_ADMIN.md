# Catálogo (admin master data)

The **Catálogo** tab (en: "Catalog") lets administrators look up and edit the customer and
product master records from the phone. Ticket: MSE-239.

## Who sees it

| User type | Catálogo |
|---|---|
| `administrator`, `superuser` | Yes: Clientes and Productos |
| `manager`, `office`, `seller`, `driver`, `inventory`, `accounting` | No, the tab is hidden |

The menu is shaped by `SECTIONS_BY_USER_TYPE` in `hooks/useNavigationAccess.ts` (sections
`catalogCustomers` and `catalogProducts`). The mapping is pinned by
`hooks/__tests__/useNavigationAccess.test.ts`. Hiding the tab is only a convenience; the
Consumo API enforces access and answers 403 to every other role. The app shows a lock
message if that happens, for example when a role changes mid-session.

Administrators get six tabs. Every other role still gets five at most.

## Screens

`app/(tabs)/catalog.tsx` is a `GroupedTabScreen` with a section switcher (Clientes /
Productos) in the list header, like Inventario.

| Screen | Component |
|---|---|
| Searchable list: debounced search, pull-to-refresh, infinite paging, empty, error and locked states | `components/catalog/CatalogList.tsx` |
| Customers: list rows, detail, edit | `CustomersCatalogScreen.tsx`, `CustomerDetail.tsx`, `CustomerEditForm.tsx` |
| Products: list rows, detail, edit | `ProductsCatalogScreen.tsx`, `ProductDetail.tsx`, `ProductEditForm.tsx` |
| Catalog detail frame, edit frame (discard prompt, save bar, error summary and snackbar, fields locked while saving), card inputs | `CatalogDetailView.tsx`, `CatalogEditScaffold.tsx`, `CatalogFields.tsx` |

The catalog reuses the app's shared pieces rather than keeping its own copies:

| Shared piece | Also used by |
|---|---|
| `hooks/usePagedSearch.ts` (debounced, paged search) | document form `CustomerPickerModal`, `ProductPickerModal` |
| `components/ui/StatusChip.tsx` | `DocumentStatusChip` |
| `components/ui/EmptyState.tsx` | `GroupedTabScreen` (nothing offered for this user type) |
| `components/ui/FormField.tsx` (outlined input and its message) | `SignUpScreen` |
| `components/ui/SelectField.tsx` (field that opens a picker) | `OnboardingScreen` |
| `OptionPickerModal` | onboarding wizard |
| `isValidEmail` (`utils/account.ts`), `parseStrictNumericInput` (`utils/documentFormat.ts`) | sign up; document form number parsing |

Types build on the existing models: `ProductoEditable` is a `Pick` of `Product`, and
`ClienteEditable` extends `CustomerBase`, which `CustomerSummary` also extends.

After a save, the detail shows the record the server returned and the list row is updated in
place. Leaving a form with unsaved changes asks first, whether through the app bar back
button or Android's back button.

## Endpoints

| Use | Call |
|---|---|
| Customer list | `GET /consumo/Cliente/buscar?query=&soloMisClientes=false&incluirInactivos=true&pageNumber=1&pageSize=20` (1-based `PagedResult`) |
| Product list | `GET /consumo/Producto/buscar-productos?query=&pageNumber=0&pageSize=20` (0-based, 404 means empty) |
| Customer detail / save | `GET /consumo/Cliente/{codigo}/editable`, `PUT /consumo/Cliente/{codigo}` (body: `ClienteEditable` without `codigo` and `balance`) |
| Product detail / save | `GET /consumo/Producto/{codigo}/editable`, `PUT /consumo/Producto/{codigo}` (body: `ProductoEditable` without `codigo`; 409 when the barcode is taken) |
| Payment conditions (picker) | `GET /consumo/CondicionPago` |

`codigo` is URL-encoded. Errors are `{ message }` with 400/403/404/409, and the app shows
the server's message. Types are in `types/catalog.ts`.

## Validation

`utils/catalogValidation.ts` does the same checks as the server so bad input is caught before
saving:

- `nombre` is required
- `email` must be a valid format (the same check as sign up)
- credit limit, prices and cost must be >= 0
- invoice limit must be a whole number >= 0
- discount and tax must be between 0 and 100
- product `factor` must be > 0
- status must be `A` or `I`

The server is still the authority. For example, it also checks that the payment condition
exists in the tenant and that a kit is not marked as a service. The app shows those messages
as they come back. Tests: `utils/__tests__/catalogValidation.test.ts`.
