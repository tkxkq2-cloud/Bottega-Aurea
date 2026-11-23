/**
 * Security TDD Specification for Firestore Rules (Dirty Dozen Verification)
 * Verifies all 12 adversarial payloads against the Eight Pillars constraints.
 */
export interface DirtyDozenCase {
  id: number;
  name: string;
  collection: 'products' | 'teams' | 'orders';
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  expected: 'PERMISSION_DENIED';
  payloadSummary: string;
}

export const DIRTY_DOZEN_CASES: DirtyDozenCase[] = [
  {
    id: 1,
    name: 'Unauthenticated Product Read',
    collection: 'products',
    operation: 'get',
    expected: 'PERMISSION_DENIED',
    payloadSummary: 'auth == null attempting to read /products/prod_1',
  },
  {
    id: 2,
    name: 'Unverified Email Admin Spoofing',
    collection: 'products',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    payloadSummary: 'email == tkxkq2@gmail.com with email_verified == false',
  },
  {
    id: 3,
    name: 'Cross-Tenant OwnerId Spoofing',
    collection: 'products',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    payloadSummary: 'incoming().ownerId != request.auth.uid',
  },
  {
    id: 4,
    name: 'Shadow Field Injection on Create',
    collection: 'products',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    payloadSummary: 'extra ghost field isVerified: true rejected by keys().hasOnly()',
  },
  {
    id: 5,
    name: 'Document ID Poisoning',
    collection: 'products',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    payloadSummary: 'invalid path variable failing isValidId() regex/length check',
  },
  {
    id: 6,
    name: 'Negative Stock / Value Poisoning on Update',
    collection: 'products',
    operation: 'update',
    expected: 'PERMISSION_DENIED',
    payloadSummary: 'stock: -1 or non-integer stock rejected by isValidProduct()',
  },
  {
    id: 7,
    name: 'Backdated Client Timestamp Injection',
    collection: 'products',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    payloadSummary: 'createdAt != request.time rejected by temporal integrity guard',
  },
  {
    id: 8,
    name: 'Immutable CreatedAt / OwnerId Mutation',
    collection: 'products',
    operation: 'update',
    expected: 'PERMISSION_DENIED',
    payloadSummary: 'update attempting to change createdAt or ownerId',
  },
  {
    id: 9,
    name: 'Oversized String Resource Exhaustion',
    collection: 'products',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    payloadSummary: 'name.size() > 80 or description.size() > 240 rejected',
  },
  {
    id: 10,
    name: 'Orphaned Order Without Atomic Team Doc',
    collection: 'orders',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    payloadSummary: 'existsAfter(/teams/$(teamDocId)) fails without parent team document',
  },
  {
    id: 11,
    name: 'Unbounded / Malformed Order Items Array',
    collection: 'orders',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    payloadSummary: 'items.size() == 0, items.size() > 50, or items[0] not a map',
  },
  {
    id: 12,
    name: 'Post-Checkout Order Mutation or Deletion',
    collection: 'orders',
    operation: 'update',
    expected: 'PERMISSION_DENIED',
    payloadSummary: 'immutable order ledger denies all updates and deletes',
  },
];
