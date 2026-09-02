/**
 * Status values for vault Items and their task checks.
 * Source of truth: base44/entities/Item.jsonc (status and task_checks[].status enums).
 */
export const ITEM_STATUS = Object.freeze({ OPEN: 'open', SUCCESS: 'success', FAILED: 'failed' });
export const TASK_CHECK_STATUS = Object.freeze({ ...ITEM_STATUS, RETRIED: 'retried' });
export const ITEM_STATUS_VALUES = Object.freeze(Object.values(ITEM_STATUS));
export const TASK_CHECK_STATUS_VALUES = Object.freeze(Object.values(TASK_CHECK_STATUS));
