# Security Specification for Cartia

## Data Invariants
1. A user cannot access or modify another user's private inventory or profile.
2. A shopping list item must belong to a valid shopping list that the user has access to.
3. Inventory items must always have a valid userId matching the creator.
4. Receipts are private and tied to the user who uploaded them.
5. Critical fields like `userId`, `ownerId`, and `createdAt` are immutable after creation.
6. Email addresses in the user profile must be verified (if app requires it, which we should enforce for sensitive data).

## The "Dirty Dozen" Payloads (Adversarial Tests)

1. **Identity Theft (Profile)**: Attempt to update another user's `users/{uid}` document.
2. **Ghost Item Injection**: Create an `inventory` item with a different `userId` than the authenticated user.
3. **Privilege Escalation (List)**: Add oneself to a `collaborators` list of a `shoppingLists` document owned by someone else.
4. **Unauthorized Extraction**: Read `receipts` of another user.
5. **Shadow Update (Inventory)**: Update an inventory item adding a `isVerified: true` field not in the schema.
6. **Orphaned Item**: Create a `shoppingItems` entry for a `listId` that doesn't exist.
7. **Bypassing Ownership**: Update a `shoppingItem` record in a list the user doesn't belong to.
8. **Resource Exhaustion**: Use a 1MB string as a document ID for an inventory item.
9. **Timestamp Spoofing**: Provide a future `createdAt` date from the client instead of `serverTimestamp()`.
10. **State Shortcut**: Change a list item to `checked: true` without being a collaborator.
11. **PII Leak**: A list query that doesn't filter by `userId` attempting to scrape all user profiles.
12. **Immutable Swapping**: Change the `userId` of an existing `inventory` item to another user's ID.

## Test Runner (Planned)
We will use `firestore.rules.test.ts` to verify these rules (Conceptual in this environment as we don't have a full test runner, but we will write the logic).
